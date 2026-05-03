"""
clinical.py — Treatment pathway engine

Strategy (3-tier):
  1. Static cache  — hand-verified pathways for ~30 common ICD-10 codes (instant)
  2. LLM-generated — for any ICD-10 not in cache, ask the LLM to generate a
                     structured pathway, then price each step from the CGHS DB
  3. Generic fallback — if LLM also fails, return a sensible generic pathway

Free data sources used:
  - CGHS Rate List (already in your cghs_procedures table) — official Indian govt costs
  - NLM MedlinePlus Connect API — treatment summaries per ICD-10 (free, no key needed)
  - LLM (Groq/llama) — generates step-by-step treatment plans from medical knowledge
"""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from backend.auth import get_current_user
from backend.database import get_db

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(ENV_PATH)

LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "").strip()
LLM_API_KEY      = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL        = os.getenv("LLM_MODEL", "").strip()
LLM_TIMEOUT      = float(os.getenv("LLM_TIMEOUT", "25"))

MEDLINEPLUS_URL  = "https://connect.medlineplus.gov/service"

router = APIRouter(prefix="/api/v1/clinical", tags=["clinical"])
logger = logging.getLogger("backend.clinical")

# ── CGHS cost tiers (₹) used when DB lookup finds no exact match ──────────────
# Based on published CGHS 2023 rate schedule ranges
CGHS_COST_TIERS = {
    "consultation":      {"low": 500,   "high": 2000},
    "blood_basic":       {"low": 500,   "high": 2000},
    "blood_advanced":    {"low": 2000,  "high": 8000},
    "xray":              {"low": 300,   "high": 1500},
    "ultrasound":        {"low": 800,   "high": 3000},
    "ecg":               {"low": 200,   "high": 800},
    "echo":              {"low": 1500,  "high": 4000},
    "mri":               {"low": 5000,  "high": 14000},
    "ct":                {"low": 3000,  "high": 10000},
    "endoscopy":         {"low": 3000,  "high": 10000},
    "biopsy":            {"low": 2000,  "high": 8000},
    "medication_short":  {"low": 500,   "high": 3000},
    "medication_long":   {"low": 1500,  "high": 8000},
    "iv_fluids":         {"low": 500,   "high": 2000},
    "ward_per_day":      {"low": 1500,  "high": 8000},
    "icu_per_day":       {"low": 8000,  "high": 25000},
    "minor_procedure":   {"low": 5000,  "high": 25000},
    "major_surgery":     {"low": 50000, "high": 400000},
    "physiotherapy":     {"low": 3000,  "high": 15000},
    "vaccination":       {"low": 300,   "high": 2000},
    "dialysis":          {"low": 1500,  "high": 5000},
    "chemotherapy":      {"low": 20000, "high": 150000},
    "radiation":         {"low": 30000, "high": 200000},
    "dental":            {"low": 500,   "high": 15000},
    "ophthalmology":     {"low": 1000,  "high": 80000},
}

# Step name → cost tier mapping (keyword matching)
STEP_TIER_MAP = [
    (["icu", "intensive care", "critical care"],          "icu_per_day"),
    (["ward", "hospital stay", "admission", "inpatient"], "ward_per_day"),
    (["mri", "magnetic resonance"],                       "mri"),
    (["ct scan", "computed tomography", "hrct"],          "ct"),
    (["echocardiogram", "echo"],                          "echo"),
    (["ecg", "electrocardiogram"],                        "ecg"),
    (["ultrasound", "usg", "sonography"],                 "ultrasound"),
    (["x-ray", "xray", "radiograph"],                     "xray"),
    (["endoscopy", "colonoscopy", "bronchoscopy"],        "endoscopy"),
    (["biopsy", "fnac", "histopathology"],                "biopsy"),
    (["dialysis", "haemodialysis"],                       "dialysis"),
    (["chemotherapy", "chemo"],                           "chemotherapy"),
    (["radiation", "radiotherapy"],                       "radiation"),
    (["surgery", "operation", "surgical", "resection",
      "replacement", "repair", "bypass", "transplant"],   "major_surgery"),
    (["procedure", "intervention", "catheter",
      "angioplasty", "stent", "scope"],                   "minor_procedure"),
    (["physiotherapy", "rehabilitation", "physio"],       "physiotherapy"),
    (["vaccination", "vaccine", "immunisation"],          "vaccination"),
    (["iv fluid", "intravenous", "drip", "saline"],       "iv_fluids"),
    (["blood test", "cbc", "haematology", "serology",
      "dengue ns1", "malaria", "widal", "culture",
      "platelet", "liver function", "renal function",
      "lipid", "hba1c", "thyroid", "tsh", "t3", "t4"],   "blood_advanced"),
    (["blood", "lab", "test", "panel", "profile"],        "blood_basic"),
    (["medication", "medicine", "drug", "tablet",
      "antibiotic", "antiviral", "steroid", "paracetamol",
      "ibuprofen", "prescription"],                       "medication_short"),
    (["consultation", "visit", "review", "follow-up",
      "specialist", "physician", "doctor"],               "consultation"),
]


# ── LLM pathway generation prompt ─────────────────────────────────────────────
PATHWAY_SYSTEM = (
    "You are a clinical pathway expert for the Indian healthcare system. "
    "Generate evidence-based treatment pathways with realistic Indian cost estimates. "
    "Use CGHS (Central Government Health Scheme) rates as the baseline. "
    "Return ONLY valid JSON, no markdown."
)

PATHWAY_USER_TEMPLATE = """Generate treatment pathways for: {condition} (ICD-10: {icd10_code})

Return JSON with this exact structure:
{{
  "condition": "Full condition name",
  "pathways": [
    {{
      "id": "unique_id",
      "name": "Pathway name",
      "type": "surgical | non_surgical",
      "recommended": true,
      "note": "When this pathway is appropriate (optional)",
      "steps": [
        {{
          "seq": 1,
          "name": "Step name (be specific, e.g. 'Dengue NS1 Antigen + IgM/IgG Test')",
          "cost_low": 500,
          "cost_high": 2000,
          "description": "Why this step is needed"
        }}
      ],
      "total_cost_low": 5000,
      "total_cost_high": 25000
    }}
  ]
}}

Rules:
- Provide 2-3 pathways ranked from most to least recommended
- Steps must be specific clinical actions (not generic "treatment as advised")
- Costs in Indian Rupees (₹), based on CGHS rates
- total_cost_low/high must equal the sum of step costs
- Include all standard-of-care steps: consultation, diagnostics, treatment, follow-up
- For infectious diseases: include specific diagnostic tests (e.g. NS1 for dengue, Widal for typhoid)
- For surgical conditions: include pre-op tests, surgery, hospital stay, post-op care
- For chronic conditions: include initial workup + ongoing management costs
"""


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*", "", cleaned).strip().strip("`").strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


def _infer_cost_tier(step_name: str) -> Dict[str, int]:
    """Map a step name to a CGHS cost tier via keyword matching."""
    lower = step_name.lower()
    for keywords, tier in STEP_TIER_MAP:
        if any(kw in lower for kw in keywords):
            return CGHS_COST_TIERS[tier]
    return CGHS_COST_TIERS["consultation"]


def _lookup_cghs_cost(step_name: str, db) -> Optional[Dict[str, int]]:
    """Try to find a matching procedure in the CGHS DB for real cost data."""
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT rate_non_nabh, rate_nabh, rate_super_speciality
                   FROM public.cghs_procedures
                   WHERE LOWER(procedure_name) ILIKE %s
                   ORDER BY rate_non_nabh DESC NULLS LAST
                   LIMIT 1""",
                (f"%{step_name.lower()[:40]}%",),
            )
            row = cur.fetchone()
            if row:
                base = float(row["rate_non_nabh"] or row["rate_nabh"] or row["rate_super_speciality"] or 0)
                if base > 0:
                    return {"low": int(base * 0.8), "high": int(base * 2.5)}
    except Exception:
        pass
    return None


def _price_steps(steps: List[Dict], db) -> List[Dict]:
    """Enrich each step with real CGHS costs where available."""
    priced = []
    for step in steps:
        name = step.get("name", "")
        # Try DB first
        db_cost = _lookup_cghs_cost(name, db)
        if db_cost:
            step["cost_low"]  = db_cost["low"]
            step["cost_high"] = db_cost["high"]
            step["cost_source"] = "cghs_db"
        elif not (step.get("cost_low") and step.get("cost_high")):
            # LLM didn't provide costs — infer from tier
            tier = _infer_cost_tier(name)
            step["cost_low"]  = tier["low"]
            step["cost_high"] = tier["high"]
            step["cost_source"] = "cghs_tier"
        else:
            step["cost_source"] = "llm_estimate"
        priced.append(step)
    return priced


def _recalculate_totals(pathway: Dict) -> Dict:
    """Recalculate total_cost_low/high from actual step costs."""
    steps = pathway.get("steps", [])
    pathway["total_cost_low"]  = sum(s.get("cost_low", 0)  for s in steps)
    pathway["total_cost_high"] = sum(s.get("cost_high", 0) for s in steps)
    return pathway


async def _generate_pathway_llm(icd10_code: str, condition_name: str) -> Optional[Dict]:
    """Ask the LLM to generate a treatment pathway for any ICD-10 code."""
    if not (LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL):
        return None

    prompt = PATHWAY_USER_TEMPLATE.format(
        condition=condition_name or icd10_code,
        icd10_code=icd10_code,
    )
    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            res = await client.post(
                f"{LLM_API_BASE_URL.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
                json={
                    "model": LLM_MODEL,
                    "temperature": 0.1,
                    "messages": [
                        {"role": "system", "content": PATHWAY_SYSTEM},
                        {"role": "user",   "content": prompt},
                    ],
                },
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            return _extract_json(content)
    except Exception:
        logger.exception("LLM pathway generation failed for %s", icd10_code)
        return None


async def _fetch_medlineplus_summary(icd10_code: str) -> Optional[str]:
    """
    Fetch a plain-language treatment summary from NLM MedlinePlus Connect API.
    Free, no API key required.
    Docs: https://medlineplus.gov/connect/service.html
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                MEDLINEPLUS_URL,
                params={
                    "mainSearchCriteria.v.cs": "2.16.840.1.113883.6.90",  # ICD-10-CM
                    "mainSearchCriteria.v.c": icd10_code,
                    "knowledgeResponseType": "application/json",
                    "informationRecipient.languageCode.c": "en",
                },
            )
            res.raise_for_status()
            data = res.json()
            # Extract first summary entry
            entries = (data.get("feed", {}).get("entry") or [])
            if entries:
                summary = entries[0].get("summary", {}).get("_value", "")
                if summary:
                    # Strip HTML tags
                    return re.sub(r"<[^>]+>", " ", summary).strip()[:500]
    except Exception:
        pass
    return None


# ── In-memory LLM pathway cache (avoids re-generating same condition) ─────────
_pathway_cache: Dict[str, Dict] = {}


async def _get_or_generate_pathway(icd10_code: str, condition_name: str, db) -> Dict:
    """
    Main pathway resolution:
    1. Check in-memory cache
    2. Generate via LLM + price steps from CGHS DB
    3. Generic fallback
    """
    cache_key = icd10_code[:3].upper()

    if cache_key in _pathway_cache:
        return _pathway_cache[cache_key]

    llm_result = await _generate_pathway_llm(icd10_code, condition_name)

    if llm_result and llm_result.get("pathways"):
        # Price each step using CGHS DB
        for pathway in llm_result["pathways"]:
            pathway["steps"] = _price_steps(pathway.get("steps", []), db)
            pathway = _recalculate_totals(pathway)
            # Ensure required fields
            pathway.setdefault("id", f"{cache_key}_{pathway.get('type','gen')}")
            pathway.setdefault("recommended", False)
        # Mark first as recommended
        if llm_result["pathways"]:
            llm_result["pathways"][0]["recommended"] = True

        result = {
            "condition": llm_result.get("condition", condition_name),
            "pathways": llm_result["pathways"],
            "source": "llm_generated",
        }
        _pathway_cache[cache_key] = result
        return result

    # Generic fallback with CGHS-priced steps
    fallback_steps = [
        {"seq": 1, "name": f"Specialist Consultation for {condition_name}", "cost_low": 700, "cost_high": 2000},
        {"seq": 2, "name": "Diagnostic Tests (Blood, Imaging as required)", "cost_low": 2000, "cost_high": 8000},
        {"seq": 3, "name": "Prescribed Treatment / Medications", "cost_low": 1500, "cost_high": 15000},
        {"seq": 4, "name": "Follow-up Consultation", "cost_low": 500, "cost_high": 1500},
    ]
    fallback_steps = _price_steps(fallback_steps, db)
    return {
        "condition": condition_name or "Medical Condition",
        "pathways": [_recalculate_totals({
            "id": f"{cache_key}_generic",
            "name": "Standard Medical Management",
            "type": "non_surgical",
            "recommended": True,
            "steps": fallback_steps,
            "total_cost_low": 0,
            "total_cost_high": 0,
        })],
        "source": "generic_fallback",
    }


# ── Static cache for ~30 most common conditions (instant, no LLM call) ────────
# These are pre-verified with actual CGHS 2023 rates
STATIC_PATHWAYS: Dict[str, Dict] = {

  "A90": {  # Dengue fever
    "condition": "Dengue Fever",
    "source": "static",
    "pathways": [
      {
        "id": "A90_outpatient", "name": "Outpatient Management (Mild Dengue)",
        "type": "non_surgical", "recommended": True,
        "note": "For dengue without warning signs — platelet >100k, no bleeding, tolerating fluids",
        "steps": [
          {"seq": 1, "name": "General Physician Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "Dengue NS1 Antigen Test", "cost_low": 600, "cost_high": 1200},
          {"seq": 3, "name": "Dengue IgM / IgG Serology", "cost_low": 700, "cost_high": 1500},
          {"seq": 4, "name": "CBC with Platelet Count (daily x3)", "cost_low": 900, "cost_high": 2400},
          {"seq": 5, "name": "Liver Function Test (SGOT/SGPT)", "cost_low": 500, "cost_high": 1200},
          {"seq": 6, "name": "Paracetamol + ORS + Supportive Medications", "cost_low": 300, "cost_high": 800},
          {"seq": 7, "name": "Follow-up Consultation (Day 3 & Day 7)", "cost_low": 500, "cost_high": 1500},
        ],
        "total_cost_low": 4000, "total_cost_high": 10100,
      },
      {
        "id": "A90_inpatient", "name": "Inpatient Management (Dengue with Warning Signs)",
        "type": "non_surgical", "recommended": False,
        "note": "For dengue with warning signs — platelet <100k, abdominal pain, persistent vomiting, bleeding",
        "steps": [
          {"seq": 1, "name": "Emergency Physician Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Dengue NS1 + IgM/IgG Panel", "cost_low": 1200, "cost_high": 2500},
          {"seq": 3, "name": "CBC + LFT + RFT + Coagulation Profile", "cost_low": 2000, "cost_high": 5000},
          {"seq": 4, "name": "IV Fluid Therapy (Ringer's Lactate / NS)", "cost_low": 1500, "cost_high": 4000},
          {"seq": 5, "name": "Hospital Ward Stay (4–7 days)", "cost_low": 8000, "cost_high": 35000},
          {"seq": 6, "name": "Daily Platelet Monitoring + Medications", "cost_low": 2000, "cost_high": 6000},
          {"seq": 7, "name": "Platelet Transfusion (if <20k)", "cost_low": 5000, "cost_high": 20000},
        ],
        "total_cost_low": 20400, "total_cost_high": 74500,
      },
    ],
  },

  "A91": {  # Dengue haemorrhagic fever
    "condition": "Dengue Haemorrhagic Fever",
    "source": "static",
    "pathways": [
      {
        "id": "A91_icu", "name": "ICU Management (Severe Dengue / DSS)",
        "type": "non_surgical", "recommended": True,
        "note": "Dengue Shock Syndrome — requires ICU monitoring",
        "steps": [
          {"seq": 1, "name": "Emergency Admission + ICU", "cost_low": 5000, "cost_high": 15000},
          {"seq": 2, "name": "Dengue NS1 + Full Serology Panel", "cost_low": 1500, "cost_high": 3000},
          {"seq": 3, "name": "CBC + Coagulation + ABG + LFT + RFT", "cost_low": 3000, "cost_high": 8000},
          {"seq": 4, "name": "IV Fluid Resuscitation + Vasopressors", "cost_low": 3000, "cost_high": 10000},
          {"seq": 5, "name": "ICU Stay (5–10 days)", "cost_low": 40000, "cost_high": 150000},
          {"seq": 6, "name": "Platelet + FFP Transfusions", "cost_low": 10000, "cost_high": 40000},
          {"seq": 7, "name": "Medications + Monitoring", "cost_low": 5000, "cost_high": 15000},
        ],
        "total_cost_low": 67500, "total_cost_high": 241000,
      },
    ],
  },

  "A01": {  # Typhoid
    "condition": "Typhoid Fever",
    "source": "static",
    "pathways": [
      {
        "id": "A01_outpatient", "name": "Outpatient Antibiotic Therapy",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "General Physician Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "Widal Test", "cost_low": 200, "cost_high": 600},
          {"seq": 3, "name": "Blood Culture & Sensitivity", "cost_low": 800, "cost_high": 2000},
          {"seq": 4, "name": "CBC + LFT", "cost_low": 600, "cost_high": 1500},
          {"seq": 5, "name": "Cefixime / Azithromycin Course (14 days)", "cost_low": 400, "cost_high": 1200},
          {"seq": 6, "name": "Follow-up Consultation", "cost_low": 300, "cost_high": 800},
        ],
        "total_cost_low": 2800, "total_cost_high": 7600,
      },
      {
        "id": "A01_inpatient", "name": "Inpatient IV Antibiotic Therapy",
        "type": "non_surgical", "recommended": False,
        "note": "For severe typhoid with complications or inability to take oral medications",
        "steps": [
          {"seq": 1, "name": "Physician Consultation + Admission", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Blood Culture + Widal + CBC + LFT", "cost_low": 1500, "cost_high": 4000},
          {"seq": 3, "name": "IV Ceftriaxone (7–14 days)", "cost_low": 3000, "cost_high": 8000},
          {"seq": 4, "name": "Hospital Ward Stay (7 days)", "cost_low": 7000, "cost_high": 28000},
          {"seq": 5, "name": "Supportive IV Fluids + Medications", "cost_low": 1500, "cost_high": 4000},
        ],
        "total_cost_low": 13700, "total_cost_high": 46000,
      },
    ],
  },

  "B50": {  # Malaria (Plasmodium falciparum)
    "condition": "Malaria",
    "source": "static",
    "pathways": [
      {
        "id": "B50_uncomplicated", "name": "Uncomplicated Malaria Treatment",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "General Physician Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "Malaria RDT (Rapid Diagnostic Test)", "cost_low": 200, "cost_high": 600},
          {"seq": 3, "name": "Peripheral Blood Smear (Thick & Thin)", "cost_low": 300, "cost_high": 800},
          {"seq": 4, "name": "CBC + LFT + RFT", "cost_low": 800, "cost_high": 2000},
          {"seq": 5, "name": "Artemether-Lumefantrine / Chloroquine Course", "cost_low": 300, "cost_high": 1000},
          {"seq": 6, "name": "Follow-up Blood Smear (Day 3 & Day 28)", "cost_low": 400, "cost_high": 1000},
        ],
        "total_cost_low": 2500, "total_cost_high": 6900,
      },
      {
        "id": "B50_severe", "name": "Severe Malaria — IV Artesunate",
        "type": "non_surgical", "recommended": False,
        "note": "For cerebral malaria, severe anaemia, or multi-organ involvement",
        "steps": [
          {"seq": 1, "name": "Emergency Admission", "cost_low": 1000, "cost_high": 3000},
          {"seq": 2, "name": "Malaria RDT + Blood Smear + PCR", "cost_low": 1500, "cost_high": 4000},
          {"seq": 3, "name": "IV Artesunate (3 days)", "cost_low": 3000, "cost_high": 8000},
          {"seq": 4, "name": "ICU / HDU Stay (3–5 days)", "cost_low": 15000, "cost_high": 60000},
          {"seq": 5, "name": "Blood Transfusion (if severe anaemia)", "cost_low": 3000, "cost_high": 10000},
          {"seq": 6, "name": "Supportive Medications", "cost_low": 2000, "cost_high": 6000},
        ],
        "total_cost_low": 25500, "total_cost_high": 91000,
      },
    ],
  },

  "E11": {  # Type 2 Diabetes
    "condition": "Type 2 Diabetes Mellitus",
    "source": "static",
    "pathways": [
      {
        "id": "E11_oral", "name": "Oral Medication Management",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Diabetologist / Physician Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "HbA1c + Fasting & PP Blood Glucose", "cost_low": 600, "cost_high": 1500},
          {"seq": 3, "name": "Lipid Profile + Kidney Function Test", "cost_low": 800, "cost_high": 2000},
          {"seq": 4, "name": "Urine Microalbumin + ECG", "cost_low": 500, "cost_high": 1500},
          {"seq": 5, "name": "Metformin / Glipizide (monthly)", "cost_low": 200, "cost_high": 800},
          {"seq": 6, "name": "Quarterly HbA1c Monitoring", "cost_low": 1200, "cost_high": 3000},
          {"seq": 7, "name": "Annual Eye + Foot Examination", "cost_low": 500, "cost_high": 2000},
        ],
        "total_cost_low": 4300, "total_cost_high": 12300,
        "note": "Annual ongoing cost approximately ₹15,000–₹50,000",
      },
      {
        "id": "E11_insulin", "name": "Insulin Therapy",
        "type": "non_surgical", "recommended": False,
        "note": "For poorly controlled diabetes or HbA1c >9%",
        "steps": [
          {"seq": 1, "name": "Diabetologist Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "HbA1c + Glucose Profile + C-Peptide", "cost_low": 1200, "cost_high": 3000},
          {"seq": 3, "name": "Insulin (Basal-Bolus, monthly)", "cost_low": 1500, "cost_high": 4000},
          {"seq": 4, "name": "Glucometer + Strips (monthly)", "cost_low": 800, "cost_high": 2000},
          {"seq": 5, "name": "Quarterly Monitoring + Dose Adjustment", "cost_low": 1500, "cost_high": 4000},
        ],
        "total_cost_low": 5700, "total_cost_high": 15000,
      },
    ],
  },

  "J18": {  # Pneumonia
    "condition": "Pneumonia",
    "source": "static",
    "pathways": [
      {
        "id": "J18_outpatient", "name": "Outpatient Antibiotic Therapy (Mild CAP)",
        "type": "non_surgical", "recommended": True,
        "note": "Community-acquired pneumonia without hypoxia or comorbidities",
        "steps": [
          {"seq": 1, "name": "Physician Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "Chest X-Ray (PA view)", "cost_low": 300, "cost_high": 1000},
          {"seq": 3, "name": "CBC + CRP + Sputum Culture", "cost_low": 800, "cost_high": 2500},
          {"seq": 4, "name": "Amoxicillin-Clavulanate / Azithromycin (7 days)", "cost_low": 400, "cost_high": 1200},
          {"seq": 5, "name": "Follow-up Chest X-Ray (Day 14)", "cost_low": 300, "cost_high": 800},
        ],
        "total_cost_low": 2300, "total_cost_high": 7000,
      },
      {
        "id": "J18_inpatient", "name": "Inpatient IV Antibiotic Therapy (Moderate-Severe)",
        "type": "non_surgical", "recommended": False,
        "steps": [
          {"seq": 1, "name": "Emergency Physician Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Chest X-Ray + CT Chest (if needed)", "cost_low": 1500, "cost_high": 6000},
          {"seq": 3, "name": "CBC + CRP + Procalcitonin + Blood Culture", "cost_low": 2000, "cost_high": 5000},
          {"seq": 4, "name": "IV Piperacillin-Tazobactam / Ceftriaxone", "cost_low": 3000, "cost_high": 8000},
          {"seq": 5, "name": "Oxygen Therapy + Nebulisation", "cost_low": 1000, "cost_high": 3000},
          {"seq": 6, "name": "Hospital Ward Stay (5–7 days)", "cost_low": 7500, "cost_high": 35000},
        ],
        "total_cost_low": 15700, "total_cost_high": 59000,
      },
    ],
  },

  "J45": {  # Asthma
    "condition": "Bronchial Asthma",
    "source": "static",
    "pathways": [
      {
        "id": "J45_controller", "name": "Controller Therapy (Persistent Asthma)",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Pulmonologist / Physician Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Spirometry / Peak Flow Measurement", "cost_low": 500, "cost_high": 1500},
          {"seq": 3, "name": "Chest X-Ray + CBC + IgE", "cost_low": 800, "cost_high": 2500},
          {"seq": 4, "name": "Inhaled Corticosteroid + LABA (monthly)", "cost_low": 600, "cost_high": 2000},
          {"seq": 5, "name": "Salbutamol Rescue Inhaler", "cost_low": 150, "cost_high": 400},
          {"seq": 6, "name": "Quarterly Review + Spirometry", "cost_low": 1200, "cost_high": 3000},
        ],
        "total_cost_low": 3950, "total_cost_high": 11400,
      },
      {
        "id": "J45_acute", "name": "Acute Exacerbation Management",
        "type": "non_surgical", "recommended": False,
        "note": "For acute severe asthma attack",
        "steps": [
          {"seq": 1, "name": "Emergency Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Nebulised Salbutamol + Ipratropium", "cost_low": 500, "cost_high": 1500},
          {"seq": 3, "name": "IV Hydrocortisone / Oral Prednisolone", "cost_low": 300, "cost_high": 1000},
          {"seq": 4, "name": "Oxygen Therapy + SpO2 Monitoring", "cost_low": 500, "cost_high": 2000},
          {"seq": 5, "name": "Hospital Stay (2–3 days, if needed)", "cost_low": 4000, "cost_high": 15000},
        ],
        "total_cost_low": 6000, "total_cost_high": 21500,
      },
    ],
  },

  "K21": {  # GERD
    "condition": "Gastro-Oesophageal Reflux Disease (GERD)",
    "source": "static",
    "pathways": [
      {
        "id": "K21_medical", "name": "PPI Therapy + Lifestyle Modification",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Gastroenterologist Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "Upper GI Endoscopy (OGD Scopy)", "cost_low": 3000, "cost_high": 8000},
          {"seq": 3, "name": "H. pylori Test (Urea Breath / Stool Antigen)", "cost_low": 500, "cost_high": 1500},
          {"seq": 4, "name": "Proton Pump Inhibitor — Omeprazole/Pantoprazole (monthly)", "cost_low": 150, "cost_high": 500},
          {"seq": 5, "name": "Follow-up Consultation (8 weeks)", "cost_low": 500, "cost_high": 1500},
        ],
        "total_cost_low": 4850, "total_cost_high": 13500,
      },
    ],
  },

  "N39": {  # UTI
    "condition": "Urinary Tract Infection (UTI)",
    "source": "static",
    "pathways": [
      {
        "id": "N39_uncomplicated", "name": "Outpatient Antibiotic Therapy",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Physician Consultation", "cost_low": 400, "cost_high": 1200},
          {"seq": 2, "name": "Urine Routine + Microscopy", "cost_low": 150, "cost_high": 400},
          {"seq": 3, "name": "Urine Culture & Sensitivity", "cost_low": 400, "cost_high": 1000},
          {"seq": 4, "name": "Nitrofurantoin / Trimethoprim Course (5–7 days)", "cost_low": 100, "cost_high": 400},
          {"seq": 5, "name": "Follow-up Urine Test (if recurrent)", "cost_low": 200, "cost_high": 600},
        ],
        "total_cost_low": 1250, "total_cost_high": 3600,
      },
    ],
  },

  "G43": {  # Migraine
    "condition": "Migraine",
    "source": "static",
    "pathways": [
      {
        "id": "G43_acute", "name": "Acute Attack + Preventive Therapy",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Neurologist Consultation", "cost_low": 800, "cost_high": 2500},
          {"seq": 2, "name": "MRI Brain (to rule out secondary causes)", "cost_low": 5000, "cost_high": 12000},
          {"seq": 3, "name": "CBC + Thyroid Function Test", "cost_low": 700, "cost_high": 2000},
          {"seq": 4, "name": "Sumatriptan / Rizatriptan (acute attack)", "cost_low": 200, "cost_high": 800},
          {"seq": 5, "name": "Topiramate / Propranolol (preventive, monthly)", "cost_low": 300, "cost_high": 1000},
          {"seq": 6, "name": "Follow-up Consultation (6 weeks)", "cost_low": 600, "cost_high": 1500},
        ],
        "total_cost_low": 7600, "total_cost_high": 19800,
      },
    ],
  },

  "E05": {  # Hyperthyroidism
    "condition": "Hyperthyroidism",
    "source": "static",
    "pathways": [
      {
        "id": "E05_medical", "name": "Anti-thyroid Drug Therapy",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Endocrinologist Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "TSH + Free T3 + Free T4", "cost_low": 800, "cost_high": 2000},
          {"seq": 3, "name": "Thyroid Ultrasound", "cost_low": 800, "cost_high": 2500},
          {"seq": 4, "name": "Carbimazole / Methimazole (monthly)", "cost_low": 200, "cost_high": 600},
          {"seq": 5, "name": "Quarterly TFT Monitoring", "cost_low": 1600, "cost_high": 4000},
        ],
        "total_cost_low": 4100, "total_cost_high": 11100,
      },
    ],
  },

  "E03": {  # Hypothyroidism
    "condition": "Hypothyroidism",
    "source": "static",
    "pathways": [
      {
        "id": "E03_medical", "name": "Levothyroxine Replacement Therapy",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "Physician / Endocrinologist Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "TSH + Free T4 + Anti-TPO Antibody", "cost_low": 800, "cost_high": 2000},
          {"seq": 3, "name": "Levothyroxine (monthly, lifelong)", "cost_low": 100, "cost_high": 400},
          {"seq": 4, "name": "6-monthly TSH Monitoring", "cost_low": 600, "cost_high": 1500},
        ],
        "total_cost_low": 2000, "total_cost_high": 5400,
        "note": "Lifelong therapy. Annual cost approximately ₹3,000–₹10,000",
      },
    ],
  },

  "J06": {  # Viral URTI / Common Cold / Flu
    "condition": "Viral Upper Respiratory Tract Infection",
    "source": "static",
    "pathways": [
      {
        "id": "J06_symptomatic", "name": "Symptomatic / Supportive Treatment",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "General Physician Consultation", "cost_low": 300, "cost_high": 1000},
          {"seq": 2, "name": "CBC (if fever >3 days)", "cost_low": 300, "cost_high": 800},
          {"seq": 3, "name": "Paracetamol + Antihistamine + Decongestant", "cost_low": 150, "cost_high": 500},
          {"seq": 4, "name": "Steam Inhalation + Saline Nasal Drops", "cost_low": 50, "cost_high": 200},
        ],
        "total_cost_low": 800, "total_cost_high": 2500,
      },
    ],
  },

  "R50": {  # Fever unspecified
    "condition": "Fever (Unspecified)",
    "source": "static",
    "pathways": [
      {
        "id": "R50_workup", "name": "Fever Workup & Symptomatic Management",
        "type": "non_surgical", "recommended": True,
        "steps": [
          {"seq": 1, "name": "General Physician Consultation", "cost_low": 400, "cost_high": 1200},
          {"seq": 2, "name": "CBC + ESR + CRP", "cost_low": 500, "cost_high": 1500},
          {"seq": 3, "name": "Dengue NS1 + Malaria RDT (if endemic area)", "cost_low": 700, "cost_high": 1800},
          {"seq": 4, "name": "Widal Test + Blood Culture (if >5 days)", "cost_low": 800, "cost_high": 2500},
          {"seq": 5, "name": "Paracetamol + Supportive Care", "cost_low": 150, "cost_high": 500},
          {"seq": 6, "name": "Follow-up if no improvement in 48 hours", "cost_low": 300, "cost_high": 800},
        ],
        "total_cost_low": 2850, "total_cost_high": 8300,
      },
    ],
  },
}


# Merge static pathways into the LLM cache so they're served instantly
_pathway_cache.update(STATIC_PATHWAYS)

# Also keep the old PATHWAY_DATABASE entries in cache
PATHWAY_DATABASE: Dict[str, Dict] = {
  "I10": {"condition": "Hypertension", "source": "static", "pathways": [{"id": "I10_medical", "name": "Medical Management", "type": "non_surgical", "recommended": True, "steps": [{"seq": 1, "name": "Physician / Cardiologist Consultation", "cost_low": 500, "cost_high": 1500}, {"seq": 2, "name": "Blood Tests + ECG", "cost_low": 1000, "cost_high": 3000}, {"seq": 3, "name": "Antihypertensive Medications (monthly)", "cost_low": 300, "cost_high": 1500}, {"seq": 4, "name": "Regular BP Monitoring (quarterly)", "cost_low": 500, "cost_high": 1000}], "total_cost_low": 2300, "total_cost_high": 7000, "note": "Lifelong medication required. Annual cost ₹8,000–₹25,000."}]},
  "I20": {"condition": "Stable Angina / CAD", "source": "static", "pathways": [{"id": "I20_angioplasty", "name": "Coronary Angioplasty (PTCA)", "type": "surgical", "recommended": True, "steps": [{"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "ECG + Stress Test + Echo", "cost_low": 2500, "cost_high": 6500}, {"seq": 3, "name": "Coronary Angiography", "cost_low": 8000, "cost_high": 18000}, {"seq": 4, "name": "PTCA + Drug Eluting Stent", "cost_low": 95000, "cost_high": 220000}, {"seq": 5, "name": "Hospital Stay (3 days)", "cost_low": 21000, "cost_high": 75000}, {"seq": 6, "name": "Cardiac Rehabilitation", "cost_low": 5000, "cost_high": 15000}], "total_cost_low": 132200, "total_cost_high": 336000}, {"id": "I20_cabg", "name": "Bypass Surgery (CABG)", "type": "surgical", "recommended": False, "steps": [{"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "Pre-operative Tests", "cost_low": 8000, "cost_high": 18000}, {"seq": 3, "name": "CABG Surgery", "cost_low": 250000, "cost_high": 600000}, {"seq": 4, "name": "ICU + Ward Stay (8 days)", "cost_low": 71000, "cost_high": 190000}, {"seq": 5, "name": "Cardiac Rehab", "cost_low": 8000, "cost_high": 20000}], "total_cost_low": 337700, "total_cost_high": 829500}]},
  "I21": {"condition": "Acute Myocardial Infarction", "source": "static", "pathways": [{"id": "I21_pci", "name": "Emergency Primary PCI", "type": "surgical", "recommended": True, "steps": [{"seq": 1, "name": "Emergency Admission + CCU", "cost_low": 15000, "cost_high": 40000}, {"seq": 2, "name": "Emergency Angiography", "cost_low": 12000, "cost_high": 25000}, {"seq": 3, "name": "Primary PTCA + Stent", "cost_low": 120000, "cost_high": 280000}, {"seq": 4, "name": "CCU Stay (5 days)", "cost_low": 75000, "cost_high": 175000}, {"seq": 5, "name": "Medications + Monitoring", "cost_low": 20000, "cost_high": 50000}], "total_cost_low": 242000, "total_cost_high": 570000}]},
  "M17": {"condition": "Osteoarthritis of the Knee", "source": "static", "pathways": [{"id": "M17_tkr", "name": "Total Knee Replacement (TKR)", "type": "surgical", "recommended": True, "steps": [{"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "X-Ray + MRI Knee", "cost_low": 3000, "cost_high": 8000}, {"seq": 3, "name": "Pre-operative Tests", "cost_low": 4000, "cost_high": 8000}, {"seq": 4, "name": "Total Knee Replacement Surgery", "cost_low": 180000, "cost_high": 380000}, {"seq": 5, "name": "Hospital Stay (6 days)", "cost_low": 36000, "cost_high": 90000}, {"seq": 6, "name": "Physiotherapy (10 sessions)", "cost_low": 5000, "cost_high": 15000}], "total_cost_low": 228700, "total_cost_high": 502500}, {"id": "M17_physio", "name": "Physiotherapy + Medical Management", "type": "non_surgical", "recommended": False, "steps": [{"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "X-Ray Knee", "cost_low": 500, "cost_high": 1500}, {"seq": 3, "name": "Physiotherapy (20 sessions)", "cost_low": 8000, "cost_high": 20000}, {"seq": 4, "name": "Medications (monthly)", "cost_low": 800, "cost_high": 2000}], "total_cost_low": 10000, "total_cost_high": 25000}]},
  "M54": {"condition": "Low Back Pain", "source": "static", "pathways": [{"id": "M54_conservative", "name": "Conservative Management", "type": "non_surgical", "recommended": True, "steps": [{"seq": 1, "name": "Orthopaedic / Neurology Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "MRI Spine", "cost_low": 5000, "cost_high": 12000}, {"seq": 3, "name": "Physiotherapy (15 sessions)", "cost_low": 6000, "cost_high": 18000}, {"seq": 4, "name": "Pain Management Medications", "cost_low": 500, "cost_high": 2000}], "total_cost_low": 12200, "total_cost_high": 33500}]},
  "K35": {"condition": "Acute Appendicitis", "source": "static", "pathways": [{"id": "K35_lap", "name": "Laparoscopic Appendectomy", "type": "surgical", "recommended": True, "steps": [{"seq": 1, "name": "Emergency Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "Blood Tests + Ultrasound", "cost_low": 2000, "cost_high": 5000}, {"seq": 3, "name": "Laparoscopic Appendectomy", "cost_low": 35000, "cost_high": 80000}, {"seq": 4, "name": "Hospital Stay (2 days)", "cost_low": 10000, "cost_high": 30000}, {"seq": 5, "name": "Medications", "cost_low": 2000, "cost_high": 5000}], "total_cost_low": 49700, "total_cost_high": 121500}]},
  "K80": {"condition": "Gallstones", "source": "static", "pathways": [{"id": "K80_lap", "name": "Laparoscopic Cholecystectomy", "type": "surgical", "recommended": True, "steps": [{"seq": 1, "name": "Gastroenterology Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "Ultrasound Abdomen", "cost_low": 800, "cost_high": 2000}, {"seq": 3, "name": "Pre-operative Tests", "cost_low": 3000, "cost_high": 7000}, {"seq": 4, "name": "Laparoscopic Cholecystectomy", "cost_low": 40000, "cost_high": 100000}, {"seq": 5, "name": "Hospital Stay (2 days)", "cost_low": 10000, "cost_high": 30000}], "total_cost_low": 54500, "total_cost_high": 140500}]},
  "N20": {"condition": "Kidney Stones", "source": "static", "pathways": [{"id": "N20_eswl", "name": "ESWL Lithotripsy", "type": "non_surgical", "recommended": True, "steps": [{"seq": 1, "name": "Urology Consultation", "cost_low": 700, "cost_high": 1500}, {"seq": 2, "name": "CT KUB / Ultrasound", "cost_low": 2000, "cost_high": 5000}, {"seq": 3, "name": "ESWL Lithotripsy (1–3 sessions)", "cost_low": 15000, "cost_high": 40000}, {"seq": 4, "name": "Follow-up Tests", "cost_low": 1000, "cost_high": 3000}], "total_cost_low": 18700, "total_cost_high": 49500}]},
  "R51": {"condition": "Headache", "source": "static", "pathways": [{"id": "R51_medical", "name": "Neurological Evaluation", "type": "non_surgical", "recommended": True, "steps": [{"seq": 1, "name": "Neurologist Consultation", "cost_low": 800, "cost_high": 2000}, {"seq": 2, "name": "MRI Brain (if chronic/severe)", "cost_low": 6000, "cost_high": 12000}, {"seq": 3, "name": "Blood Tests (CBC, Thyroid)", "cost_low": 1000, "cost_high": 3000}, {"seq": 4, "name": "Prescription Medications", "cost_low": 500, "cost_high": 2000}], "total_cost_low": 8300, "total_cost_high": 19000}]},
  "R42": {"condition": "Dizziness", "source": "static", "pathways": [{"id": "R42_medical", "name": "Vestibular & ENT Evaluation", "type": "non_surgical", "recommended": True, "steps": [{"seq": 1, "name": "ENT / Neurologist Consultation", "cost_low": 800, "cost_high": 2000}, {"seq": 2, "name": "Vestibular Function Tests", "cost_low": 2000, "cost_high": 5000}, {"seq": 3, "name": "Vestibular Rehabilitation Therapy", "cost_low": 3000, "cost_high": 8000}, {"seq": 4, "name": "Medications", "cost_low": 500, "cost_high": 1500}], "total_cost_low": 6300, "total_cost_high": 16500}]},
}
_pathway_cache.update(PATHWAY_DATABASE)


def _find_static(icd10_code: str) -> Optional[Dict]:
    code = icd10_code.strip().upper().replace(" ", "")
    for prefix_len in (3, 2):
        prefix = code[:prefix_len]
        if prefix in _pathway_cache:
            return _pathway_cache[prefix]
    return None


@router.get("/pathway/{icd10_code}")
async def get_pathway(
    icd10_code: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    # 1. Try static / cached pathway first (instant)
    static = _find_static(icd10_code)
    if static:
        logger.info("Static pathway served for %s: %s", icd10_code, static["condition"])
        return {
            "icd10_code": icd10_code,
            "condition": static["condition"],
            "pathways": static["pathways"],
            "matched": True,
            "source": static.get("source", "static"),
        }

    # 2. Fetch condition name from NLM MedlinePlus (free, no key)
    condition_name = await _fetch_medlineplus_summary(icd10_code) or icd10_code

    # 3. Generate via LLM + price from CGHS DB
    logger.info("Generating LLM pathway for %s (%s)", icd10_code, condition_name[:50])
    generated = await _get_or_generate_pathway(icd10_code, condition_name, db)

    return {
        "icd10_code": icd10_code,
        "condition": generated["condition"],
        "pathways": generated["pathways"],
        "matched": generated.get("source") != "generic_fallback",
        "source": generated.get("source", "llm_generated"),
    }


@router.get("/pathway/debug/{icd10_code}")
async def debug_pathway(icd10_code: str):
    code = icd10_code.strip().upper()
    static = _find_static(code)
    return {
        "input": icd10_code,
        "normalised": code,
        "static_match": static["condition"] if static else None,
        "cached_keys": list(_pathway_cache.keys()),
    }

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

ENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(ENV_PATH)

ICD10_BASE_URL = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"

LLM_API_BASE_URL = os.getenv("LLM_API_BASE_URL", "").strip()
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "").strip()
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "25"))
ICD_TIMEOUT = float(os.getenv("ICD_TIMEOUT", "12"))

router = APIRouter(prefix="/api/v1/diagnosis", tags=["diagnosis"])
logger = logging.getLogger("backend.diagnosis")

SYSTEM_PROMPT = (
    "You are a clinical decision support AI (NOT a doctor). "
    "Your job is to map user symptoms to possible medical conditions using structured reasoning.\n\n"
    "STRICT RULES:\n"
    "- Do NOT give a final diagnosis.\n"
    "- Always provide multiple possible conditions ranked by likelihood.\n"
    "- Ask for clarification when symptoms are ambiguous.\n"
    "- Reduce confidence if key diagnostic criteria are missing.\n"
    "- Distinguish similar terms (e.g., dizziness vs vertigo, chest pain vs heartburn).\n"
    "- Consider patient context: age, location, existing conditions, duration, severity.\n\n"
    "CRITICAL SYMPTOM WEIGHTING RULES (apply these before scoring confidence):\n"
    "- Retro-orbital pain (pain behind the eyes) is a strong indicator for dengue fever — raise dengue confidence significantly.\n"
    "- Rash + fever + body ache together → increase dengue probability, include it as primary or top differential.\n"
    "- Patient location in endemic regions (Mumbai, Delhi, Chennai, Kolkata, Hyderabad, Pune, or any tropical/subtropical Indian city) → boost mosquito-borne diseases (dengue, malaria, chikungunya) in the differential.\n"
    "- Do NOT require explicit mention of mosquito exposure to suspect dengue or malaria.\n"
    "- High fever (>102°F / 39°C) + severe headache + joint/muscle pain → consider dengue, malaria, chikungunya.\n"
    "- Platelet drop concern or bleeding gums mentioned → dengue hemorrhagic fever, raise risk_level to high.\n"
    "- Chest pain + exertion → consider cardiac causes first (angina, ACS) before musculoskeletal.\n"
    "- Chest pain + burning + lying down → consider GERD before cardiac.\n"
    "- Dizziness + positional change → BPPV before central causes.\n"
    "- Dizziness + hearing loss + tinnitus → Meniere's disease.\n"
    "- Knee pain + age >50 + stiffness → osteoarthritis before inflammatory arthritis.\n\n"
    "Return ONLY valid JSON. No markdown, no explanation outside the JSON."
)

USER_PROMPT_TEMPLATE = (
    "Analyze the following patient input and return a JSON object with this EXACT structure.\n\n"
    "IMPORTANT CONFIDENCE RULES:\n"
    "- primary_condition.confidence: integer 0-100 for the most likely condition\n"
    "- Each differential must have a DIFFERENT, LOWER confidence than the primary\n"
    "- Spread confidence meaningfully: e.g. primary=78, differentials=[45, 30, 18]\n"
    "- If symptoms are vague or incomplete, primary confidence must be below 60\n"
    "- Never assign the same confidence to two different conditions\n"
    "- Apply the critical symptom weighting rules from your system instructions before scoring\n\n"
    "JSON structure:\n"
    "{{\n"
    '  "primary_condition": {{\n'
    '    "name": "condition name",\n'
    '    "icd10": "X00.0",\n'
    '    "confidence": 75,\n'
    '    "reasoning": "one sentence why this is most likely"\n'
    "  }},\n"
    '  "differential_diagnoses": [\n'
    '    {{"name": "second most likely", "icd10": "X00.1", "confidence": 45, "reasoning": "brief reason"}},\n'
    '    {{"name": "third possibility", "icd10": "X00.2", "confidence": 25, "reasoning": "brief reason"}}\n'
    "  ],\n"
    '  "key_features_detected": ["feature1", "feature2"],\n'
    '  "missing_critical_information": ["what info would help narrow diagnosis"],\n'
    '  "recommended_questions": ["question to ask patient"],\n'
    '  "risk_level": "low",\n'
    '  "specialist_type": "Specialty Name",\n'
    '  "next_steps": ["step 1", "step 2"]\n'
    "}}\n\n"
    "Patient input:\n"
    "- Symptoms: {symptoms}\n"
    "- Known diagnosis: {diagnosis}\n"
    "- Age: {age}\n"
    "- Location: {location}\n"
    "- Existing conditions: {comorbidities}\n"
)


# ── Pydantic models ────────────────────────────────────────────────────────────

class DiagnosisMatchRequest(BaseModel):
    symptoms: Optional[str] = Field(None, max_length=2000)
    diagnosis: Optional[str] = Field(None, max_length=2000)
    age: Optional[int] = None
    location: Optional[str] = None
    comorbidities: Optional[List[str]] = Field(default_factory=list)


class Icd10Match(BaseModel):
    code: str
    name: str


class ConditionEntry(BaseModel):
    name: str
    icd10: str
    confidence: int
    reasoning: str


class DiagnosisMatchResponse(BaseModel):
    # Primary result (maps to existing frontend fields)
    condition_name: Optional[str] = None
    specialty: Optional[str] = None
    confidence: Optional[int] = None
    keywords: List[str] = Field(default_factory=list)
    icd10: Optional[Icd10Match] = None
    source: str = "unknown"
    warnings: List[str] = Field(default_factory=list)
    all_matches: List[Icd10Match] = Field(default_factory=list)
    reasoning: Optional[str] = None

    # Enriched structured fields
    primary_condition: Optional[ConditionEntry] = None
    differential_diagnoses: List[ConditionEntry] = Field(default_factory=list)
    key_features_detected: List[str] = Field(default_factory=list)
    missing_critical_information: List[str] = Field(default_factory=list)
    recommended_questions: List[str] = Field(default_factory=list)
    risk_level: Optional[str] = None
    specialist_type: Optional[str] = None
    next_steps: List[str] = Field(default_factory=list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean_text(value: Optional[str]) -> str:
    if not value:
        return ""
    return " ".join(value.strip().split())


def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*", "", cleaned).strip()
        cleaned = cleaned.strip("`").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    block = cleaned[start: end + 1]
    try:
        return json.loads(block)
    except json.JSONDecodeError:
        return None


def _safe_int(val: Any, lo: int = 0, hi: int = 100) -> Optional[int]:
    try:
        return max(lo, min(hi, int(val)))
    except (TypeError, ValueError):
        return None


def _parse_condition_entry(raw: Any) -> Optional[ConditionEntry]:
    if not isinstance(raw, dict):
        return None
    name = str(raw.get("name", "")).strip()
    icd10 = str(raw.get("icd10", "")).strip()
    raw_conf = _safe_int(raw.get("confidence"), 0, 100)
    confidence = raw_conf if raw_conf is not None else 50
    reasoning = str(raw.get("reasoning", "")).strip()
    if not name:
        return None
    return ConditionEntry(name=name, icd10=icd10, confidence=confidence, reasoning=reasoning)


def _parse_llm_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    primary = _parse_condition_entry(payload.get("primary_condition"))
    differentials = [
        e for e in (_parse_condition_entry(d) for d in payload.get("differential_diagnoses", []))
        if e is not None
    ]

    # Enforce: differentials must have strictly lower confidence than primary
    # and each differential must be unique
    if primary and differentials:
        seen_conf = {primary.confidence}
        fixed = []
        # Start stepping down from primary confidence
        step_conf = primary.confidence - 15
        for diff in differentials:
            # If confidence is same as primary or already seen, assign a stepped-down value
            if diff.confidence >= primary.confidence or diff.confidence in seen_conf:
                diff = ConditionEntry(
                    name=diff.name,
                    icd10=diff.icd10,
                    confidence=max(5, step_conf),
                    reasoning=diff.reasoning,
                )
            seen_conf.add(diff.confidence)
            fixed.append(diff)
            step_conf = diff.confidence - 12
        differentials = fixed

    def _str_list(key: str) -> List[str]:
        raw = payload.get(key, [])
        if isinstance(raw, list):
            return [str(x).strip() for x in raw if str(x).strip()]
        return []

    risk_level = str(payload.get("risk_level", "")).strip().lower()
    if risk_level not in ("low", "moderate", "high"):
        risk_level = "moderate"

    return {
        "primary_condition": primary,
        "differential_diagnoses": differentials,
        "key_features_detected": _str_list("key_features_detected"),
        "missing_critical_information": _str_list("missing_critical_information"),
        "recommended_questions": _str_list("recommended_questions"),
        "risk_level": risk_level,
        "specialist_type": str(payload.get("specialist_type", "")).strip(),
        "next_steps": _str_list("next_steps"),
    }


async def _call_llm(
    symptoms: str,
    diagnosis: str,
    age: Optional[int],
    location: Optional[str],
    comorbidities: List[str],
) -> Optional[Dict[str, Any]]:
    if not (LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL):
        return None

    url = f"{LLM_API_BASE_URL.rstrip('/')}/chat/completions"
    user_prompt = USER_PROMPT_TEMPLATE.format(
        symptoms=symptoms or "not provided",
        diagnosis=diagnosis or "not provided",
        age=str(age) if age else "not provided",
        location=location or "not provided",
        comorbidities=", ".join(comorbidities) if comorbidities else "none",
    )

    payload = {
        "model": LLM_MODEL,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            res = await client.post(
                url, json=payload,
                headers={"Authorization": f"Bearer {LLM_API_KEY}"}
            )
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError:
        logger.exception("LLM request failed")
        return None

    choices = data.get("choices") if isinstance(data, dict) else None
    if not choices:
        return None
    content = choices[0].get("message", {}).get("content", "")
    if not content:
        return None

    parsed = _extract_json(content)
    if not parsed:
        logger.warning("LLM returned non-JSON content: %s", content[:200])
        return None

    return _parse_llm_response(parsed)


def _parse_icd_response(data: Any) -> List[Icd10Match]:
    if not isinstance(data, list) or len(data) < 4:
        return []
    results: List[Icd10Match] = []
    for item in (data[3] or []):
        if isinstance(item, list) and len(item) >= 2:
            code, name = str(item[0]).strip(), str(item[1]).strip()
            if code and name:
                results.append(Icd10Match(code=code, name=name))
    return results


async def _search_icd10(terms: str, limit: int = 7) -> List[Icd10Match]:
    query = _clean_text(terms)
    if not query:
        return []
    try:
        async with httpx.AsyncClient(timeout=ICD_TIMEOUT) as client:
            res = await client.get(
                ICD10_BASE_URL,
                params={"terms": query, "sf": "code,name", "df": "code,name", "maxList": str(limit)},
            )
            res.raise_for_status()
            return _parse_icd_response(res.json())
    except httpx.HTTPError:
        logger.exception("ICD-10 search failed")
        return []


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/match", response_model=DiagnosisMatchResponse)
async def match_diagnosis(payload: DiagnosisMatchRequest) -> DiagnosisMatchResponse:
    symptoms = _clean_text(payload.symptoms)
    diagnosis = _clean_text(payload.diagnosis)

    if not symptoms and not diagnosis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide symptoms or diagnosis to match.",
        )

    warnings: List[str] = []

    # ── LLM call ──────────────────────────────────────────────────────────────
    llm = await _call_llm(
        symptoms, diagnosis,
        payload.age,
        payload.location,
        payload.comorbidities or [],
    )
    if llm is None and not (LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL):
        warnings.append("LLM not configured; using ICD-10 search only.")

    primary: Optional[ConditionEntry] = (llm or {}).get("primary_condition")
    differentials: List[ConditionEntry] = (llm or {}).get("differential_diagnoses", [])

    # ── ICD-10 lookup ─────────────────────────────────────────────────────────
    # Use LLM primary ICD-10 code first, then fall back to name search
    icd_results: List[Icd10Match] = []

    if primary and primary.icd10:
        # Search by the LLM-suggested code to get the canonical name
        icd_results = await _search_icd10(primary.icd10, limit=1)
        if not icd_results:
            # Code not found in NLM — construct from LLM data
            icd_results = [Icd10Match(code=primary.icd10, name=primary.name)]

    if not icd_results:
        search_term = (primary.name if primary else None) or diagnosis or symptoms
        icd_results = await _search_icd10(search_term, limit=7)

    # Add differential ICD-10 codes as additional matches
    all_matches: List[Icd10Match] = list(icd_results)
    for diff in differentials:
        if diff.icd10 and not any(m.code == diff.icd10 for m in all_matches):
            all_matches.append(Icd10Match(code=diff.icd10, name=diff.name))

    # Fallback for common terms when everything fails
    if not all_matches:
        lower = (symptoms + " " + diagnosis).lower()
        if "headache" in lower and ("dizziness" in lower or "vertigo" in lower):
            all_matches = [Icd10Match(code="R51", name="Headache with dizziness")]
        elif "headache" in lower:
            all_matches = [Icd10Match(code="R51", name="Headache")]
        elif "dizziness" in lower or "vertigo" in lower:
            all_matches = [Icd10Match(code="R42", name="Dizziness and giddiness")]
        elif "chest pain" in lower:
            all_matches = [Icd10Match(code="R07.9", name="Chest pain, unspecified")]
        elif "fever" in lower:
            all_matches = [Icd10Match(code="R50.9", name="Fever, unspecified")]

    icd10 = all_matches[0] if all_matches else None

    # ── Build response ────────────────────────────────────────────────────────
    condition_name = (primary.name if primary else None) or (icd10.name if icd10 else None) or diagnosis or symptoms
    confidence = (primary.confidence if primary else None) or (72 if icd10 else 50)
    reasoning = (primary.reasoning if primary else None) or f"Matched based on reported symptoms."
    specialty = (llm or {}).get("specialist_type") or None
    keywords = (llm or {}).get("key_features_detected", [])
    risk_level = (llm or {}).get("risk_level", "moderate")

    source = "llm+icd" if llm and icd10 else "llm" if llm else "icd" if icd10 else "local"

    return DiagnosisMatchResponse(
        # Legacy flat fields (frontend compatibility)
        condition_name=condition_name,
        specialty=specialty,
        confidence=confidence,
        keywords=keywords,
        icd10=icd10,
        source=source,
        warnings=warnings,
        all_matches=all_matches,
        reasoning=reasoning,

        # Enriched structured fields
        primary_condition=primary,
        differential_diagnoses=differentials,
        key_features_detected=keywords,
        missing_critical_information=(llm or {}).get("missing_critical_information", []),
        recommended_questions=(llm or {}).get("recommended_questions", []),
        risk_level=risk_level,
        specialist_type=specialty,
        next_steps=(llm or {}).get("next_steps", []),
    )

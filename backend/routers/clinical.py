import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends
from backend.auth import get_current_user

router = APIRouter(prefix="/api/v1/clinical", tags=["clinical"])
logger = logging.getLogger("backend.clinical")

PATHWAY_DATABASE = {
  # ── CARDIAC ────────────────────────────────────────────────────────────
  "I10": {
    "condition": "Hypertension (High Blood Pressure)",
    "pathways": [
      {
        "id": "I10_medical",
        "name": "Medical Management",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Physician / Cardiologist Consultation", "cost_low": 500, "cost_high": 1500},
          {"seq": 2, "name": "Blood Tests + ECG", "cost_low": 1000, "cost_high": 3000},
          {"seq": 3, "name": "Antihypertensive Medications (monthly)", "cost_low": 300, "cost_high": 1500},
          {"seq": 4, "name": "Regular BP Monitoring (quarterly)", "cost_low": 500, "cost_high": 1000}
        ],
        "total_cost_low": 2300,
        "total_cost_high": 7000,
        "note": "Lifelong medication typically required. Annual cost approximately Rs. 8,000 - Rs. 25,000."
      }
    ]
  },

  "I20": {
    "condition": "Stable Angina / Coronary Artery Disease",
    "pathways": [
      {
        "id": "I20_angioplasty",
        "name": "Coronary Angioplasty (PTCA)",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "ECG + Stress Test", "cost_low": 1000, "cost_high": 3000},
          {"seq": 3, "name": "Echocardiogram", "cost_low": 1500, "cost_high": 3500},
          {"seq": 4, "name": "Coronary Angiography", "cost_low": 8000, "cost_high": 18000},
          {"seq": 5, "name": "PTCA + Drug Eluting Stent", "cost_low": 95000, "cost_high": 220000},
          {"seq": 6, "name": "Hospital Stay (3 days)", "cost_low": 21000, "cost_high": 75000},
          {"seq": 7, "name": "Cardiac Rehabilitation", "cost_low": 5000, "cost_high": 15000}
        ],
        "total_cost_low": 132200,
        "total_cost_high": 336000
      },
      {
        "id": "I20_cabg",
        "name": "Bypass Surgery (CABG)",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Pre-operative Tests", "cost_low": 8000, "cost_high": 18000},
          {"seq": 3, "name": "Coronary Angiography", "cost_low": 8000, "cost_high": 18000},
          {"seq": 4, "name": "CABG Surgery", "cost_low": 250000, "cost_high": 600000},
          {"seq": 5, "name": "ICU Stay (3 days)", "cost_low": 36000, "cost_high": 90000},
          {"seq": 6, "name": "Ward Stay (5 days)", "cost_low": 35000, "cost_high": 100000},
          {"seq": 7, "name": "Cardiac Rehabilitation", "cost_low": 8000, "cost_high": 20000}
        ],
        "total_cost_low": 345700,
        "total_cost_high": 847500
      },
      {
        "id": "I20_medical",
        "name": "Medical Management",
        "type": "non_surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "ECG + Echo", "cost_low": 2000, "cost_high": 5000},
          {"seq": 3, "name": "Medications (monthly)", "cost_low": 1500, "cost_high": 4000},
          {"seq": 4, "name": "Regular Monitoring", "cost_low": 700, "cost_high": 1500}
        ],
        "total_cost_low": 4900,
        "total_cost_high": 12000,
        "note": "Suitable for stable patients with mild blockage."
      }
    ]
  },

  "I21": {
    "condition": "Acute Myocardial Infarction (Heart Attack)",
    "pathways": [
      {
        "id": "I21_primary_pci",
        "name": "Emergency Primary PCI",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Emergency Admission + CCU", "cost_low": 15000, "cost_high": 40000},
          {"seq": 2, "name": "Emergency Angiography", "cost_low": 12000, "cost_high": 25000},
          {"seq": 3, "name": "Primary PTCA + Stent", "cost_low": 120000, "cost_high": 280000},
          {"seq": 4, "name": "CCU Stay (5 days)", "cost_low": 75000, "cost_high": 175000},
          {"seq": 5, "name": "Medications + Monitoring", "cost_low": 20000, "cost_high": 50000}
        ],
        "total_cost_low": 242000,
        "total_cost_high": 570000
      }
    ]
  },

  "I25": {
    "condition": "Chronic Ischaemic Heart Disease",
    "pathways": [
      {
        "id": "I25_angioplasty",
        "name": "Coronary Angioplasty (PTCA)",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Stress Test + Echo", "cost_low": 3000, "cost_high": 7000},
          {"seq": 3, "name": "Coronary Angiography", "cost_low": 8000, "cost_high": 18000},
          {"seq": 4, "name": "PTCA + Stent", "cost_low": 95000, "cost_high": 220000},
          {"seq": 5, "name": "Hospital Stay (3 days)", "cost_low": 21000, "cost_high": 75000},
          {"seq": 6, "name": "Cardiac Rehab", "cost_low": 5000, "cost_high": 15000}
        ],
        "total_cost_low": 132700,
        "total_cost_high": 336500
      },
      {
        "id": "I25_cabg",
        "name": "Bypass Surgery (CABG)",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Pre-operative Tests", "cost_low": 8000, "cost_high": 18000},
          {"seq": 3, "name": "CABG Surgery", "cost_low": 250000, "cost_high": 600000},
          {"seq": 4, "name": "ICU + Ward Stay (8 days)", "cost_low": 71000, "cost_high": 190000},
          {"seq": 5, "name": "Cardiac Rehab", "cost_low": 8000, "cost_high": 20000}
        ],
        "total_cost_low": 337700,
        "total_cost_high": 829500
      }
    ]
  },

  "I50": {
    "condition": "Heart Failure",
    "pathways": [
      {
        "id": "I50_medical",
        "name": "Medical Management",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Cardiologist Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Echo + BNP Test", "cost_low": 3000, "cost_high": 7000},
          {"seq": 3, "name": "Medications (monthly)", "cost_low": 2000, "cost_high": 6000},
          {"seq": 4, "name": "Regular Monitoring", "cost_low": 700, "cost_high": 1500}
        ],
        "total_cost_low": 6400,
        "total_cost_high": 16000
      }
    ]
  },

  # ── ORTHOPAEDICS ───────────────────────────────────────────────────────
  "M16": {
    "condition": "Osteoarthritis of the Hip",
    "pathways": [
      {
        "id": "M16_thr",
        "name": "Total Hip Replacement (THR)",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "X-Ray + MRI Hip", "cost_low": 3000, "cost_high": 8000},
          {"seq": 3, "name": "Pre-operative Tests", "cost_low": 4000, "cost_high": 8000},
          {"seq": 4, "name": "Total Hip Replacement Surgery", "cost_low": 200000, "cost_high": 450000},
          {"seq": 5, "name": "Hospital Stay (7 days)", "cost_low": 42000, "cost_high": 105000},
          {"seq": 6, "name": "Physiotherapy (15 sessions)", "cost_low": 7500, "cost_high": 20000}
        ],
        "total_cost_low": 257200,
        "total_cost_high": 592500
      },
      {
        "id": "M16_physio",
        "name": "Physiotherapy + Pain Management",
        "type": "non_surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "X-Ray Hip", "cost_low": 500, "cost_high": 1500},
          {"seq": 3, "name": "Physiotherapy (20 sessions)", "cost_low": 8000, "cost_high": 20000},
          {"seq": 4, "name": "Medications (monthly)", "cost_low": 800, "cost_high": 2000}
        ],
        "total_cost_low": 10000,
        "total_cost_high": 25000
      }
    ]
  },

  "M17": {
    "condition": "Osteoarthritis of the Knee",
    "pathways": [
      {
        "id": "M17_tkr",
        "name": "Total Knee Replacement (TKR)",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "X-Ray + MRI Knee", "cost_low": 3000, "cost_high": 8000},
          {"seq": 3, "name": "Pre-operative Tests", "cost_low": 4000, "cost_high": 8000},
          {"seq": 4, "name": "Total Knee Replacement Surgery", "cost_low": 180000, "cost_high": 380000},
          {"seq": 5, "name": "Hospital Stay (6 days)", "cost_low": 36000, "cost_high": 90000},
          {"seq": 6, "name": "Physiotherapy (10 sessions)", "cost_low": 5000, "cost_high": 15000}
        ],
        "total_cost_low": 228700,
        "total_cost_high": 502500
      },
      {
        "id": "M17_arthroscopy",
        "name": "Knee Arthroscopy",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "MRI Knee", "cost_low": 3000, "cost_high": 7000},
          {"seq": 3, "name": "Knee Arthroscopy", "cost_low": 40000, "cost_high": 100000},
          {"seq": 4, "name": "Hospital Stay (1 day)", "cost_low": 5000, "cost_high": 15000},
          {"seq": 5, "name": "Physiotherapy (8 sessions)", "cost_low": 4000, "cost_high": 10000}
        ],
        "total_cost_low": 52700,
        "total_cost_high": 133500
      },
      {
        "id": "M17_physio",
        "name": "Physiotherapy + Medical Management",
        "type": "non_surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "X-Ray Knee", "cost_low": 500, "cost_high": 1500},
          {"seq": 3, "name": "Physiotherapy (20 sessions)", "cost_low": 8000, "cost_high": 20000},
          {"seq": 4, "name": "Medications (monthly)", "cost_low": 800, "cost_high": 2000}
        ],
        "total_cost_low": 10000,
        "total_cost_high": 25000
      }
    ]
  },

  "M54": {
    "condition": "Low Back Pain / Lumbar Disc Disease",
    "pathways": [
      {
        "id": "M54_conservative",
        "name": "Conservative Management",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Orthopaedic / Neurology Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "MRI Spine", "cost_low": 5000, "cost_high": 12000},
          {"seq": 3, "name": "Physiotherapy (15 sessions)", "cost_low": 6000, "cost_high": 18000},
          {"seq": 4, "name": "Pain Management Medications", "cost_low": 500, "cost_high": 2000}
        ],
        "total_cost_low": 12200,
        "total_cost_high": 33500
      },
      {
        "id": "M54_surgical",
        "name": "Spinal Decompression Surgery",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Neurosurgery Consultation", "cost_low": 700, "cost_high": 2000},
          {"seq": 2, "name": "MRI Spine", "cost_low": 5000, "cost_high": 12000},
          {"seq": 3, "name": "Spinal Decompression / Discectomy", "cost_low": 100000, "cost_high": 300000},
          {"seq": 4, "name": "Hospital Stay (5 days)", "cost_low": 30000, "cost_high": 80000},
          {"seq": 5, "name": "Post-op Physiotherapy", "cost_low": 8000, "cost_high": 20000}
        ],
        "total_cost_low": 143700,
        "total_cost_high": 414000
      }
    ]
  },

  "M75": {
    "condition": "Shoulder Lesion / Rotator Cuff",
    "pathways": [
      {
        "id": "M75_conservative",
        "name": "Physiotherapy + Injections",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "MRI Shoulder", "cost_low": 4000, "cost_high": 10000},
          {"seq": 3, "name": "Physiotherapy (15 sessions)", "cost_low": 6000, "cost_high": 18000},
          {"seq": 4, "name": "Steroid Injection (if needed)", "cost_low": 2000, "cost_high": 5000}
        ],
        "total_cost_low": 12700,
        "total_cost_high": 34500
      },
      {
        "id": "M75_surgical",
        "name": "Shoulder Arthroscopy",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Orthopaedic Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "MRI Shoulder", "cost_low": 4000, "cost_high": 10000},
          {"seq": 3, "name": "Shoulder Arthroscopy", "cost_low": 60000, "cost_high": 150000},
          {"seq": 4, "name": "Hospital Stay (1 day)", "cost_low": 5000, "cost_high": 15000},
          {"seq": 5, "name": "Physiotherapy (12 sessions)", "cost_low": 5000, "cost_high": 15000}
        ],
        "total_cost_low": 74700,
        "total_cost_high": 191500
      }
    ]
  },

  # ── GENERAL SURGERY ────────────────────────────────────────────────────
  "K35": {
    "condition": "Acute Appendicitis",
    "pathways": [
      {
        "id": "K35_laparoscopic",
        "name": "Laparoscopic Appendectomy",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Emergency Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Blood Tests + Ultrasound", "cost_low": 2000, "cost_high": 5000},
          {"seq": 3, "name": "Laparoscopic Appendectomy", "cost_low": 35000, "cost_high": 80000},
          {"seq": 4, "name": "Hospital Stay (2 days)", "cost_low": 10000, "cost_high": 30000},
          {"seq": 5, "name": "Medications", "cost_low": 2000, "cost_high": 5000}
        ],
        "total_cost_low": 49700,
        "total_cost_high": 121500
      },
      {
        "id": "K35_open",
        "name": "Open Appendectomy",
        "type": "surgical",
        "recommended": False,
        "steps": [
          {"seq": 1, "name": "Emergency Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Blood Tests + CT Abdomen", "cost_low": 4000, "cost_high": 8000},
          {"seq": 3, "name": "Open Appendectomy", "cost_low": 25000, "cost_high": 60000},
          {"seq": 4, "name": "Hospital Stay (3 days)", "cost_low": 15000, "cost_high": 45000},
          {"seq": 5, "name": "Medications", "cost_low": 2000, "cost_high": 5000}
        ],
        "total_cost_low": 46700,
        "total_cost_high": 119500
      }
    ]
  },

  "K40": {
    "condition": "Inguinal Hernia",
    "pathways": [
      {
        "id": "K40_laparoscopic",
        "name": "Laparoscopic Hernia Repair",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Surgical Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Ultrasound Abdomen", "cost_low": 800, "cost_high": 2000},
          {"seq": 3, "name": "Pre-operative Tests", "cost_low": 3000, "cost_high": 7000},
          {"seq": 4, "name": "Laparoscopic Hernia Repair (Mesh)", "cost_low": 30000, "cost_high": 80000},
          {"seq": 5, "name": "Hospital Stay (1 day)", "cost_low": 5000, "cost_high": 15000}
        ],
        "total_cost_low": 39500,
        "total_cost_high": 105500
      }
    ]
  },

  "K80": {
    "condition": "Gallstones / Cholelithiasis",
    "pathways": [
      {
        "id": "K80_laparoscopic",
        "name": "Laparoscopic Cholecystectomy",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Gastroenterology Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Ultrasound Abdomen", "cost_low": 800, "cost_high": 2000},
          {"seq": 3, "name": "Pre-operative Tests", "cost_low": 3000, "cost_high": 7000},
          {"seq": 4, "name": "Laparoscopic Cholecystectomy", "cost_low": 40000, "cost_high": 100000},
          {"seq": 5, "name": "Hospital Stay (2 days)", "cost_low": 10000, "cost_high": 30000}
        ],
        "total_cost_low": 54500,
        "total_cost_high": 140500
      }
    ]
  },

  "K92": {
    "condition": "Gastrointestinal Bleeding",
    "pathways": [
      {
        "id": "K92_endoscopy",
        "name": "Endoscopy + Treatment",
        "type": "surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Emergency Gastroenterology Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "Blood Tests", "cost_low": 2000, "cost_high": 5000},
          {"seq": 3, "name": "Upper GI Endoscopy + Haemostasis", "cost_low": 15000, "cost_high": 40000},
          {"seq": 4, "name": "Hospital Stay (3 days)", "cost_low": 15000, "cost_high": 45000},
          {"seq": 5, "name": "Medications", "cost_low": 3000, "cost_high": 8000}
        ],
        "total_cost_low": 35700,
        "total_cost_high": 99500
      }
    ]
  },

  # ── NEPHROLOGY / UROLOGY ───────────────────────────────────────────────
  "N20": {
    "condition": "Kidney Stones (Urolithiasis)",
    "pathways": [
      {
        "id": "N20_eswl",
        "name": "ESWL Lithotripsy (Non-surgical)",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Urology Consultation", "cost_low": 700, "cost_high": 1500},
          {"seq": 2, "name": "CT KUB / Ultrasound", "cost_low": 2000, "cost_high": 5000},
          {"seq": 3, "name": "ESWL Lithotripsy (1-3 sessions)", "cost_low": 15000, "cost_high": 40000},
          {"seq": 4, "name": "Follow-up Tests", "cost_low": 1000, "cost_high": 3000}
        ],
        "total_cost_low": 18700,
        "total_cost_high": 49500
      }
    ]
  },

  # ── NEUROLOGY / GENERAL ───────────────────────────────────────────────
  "R51": {
    "condition": "Headache",
    "pathways": [
      {
        "id": "R51_medical",
        "name": "Neurological Evaluation & Medical Management",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "Neurologist Consultation", "cost_low": 800, "cost_high": 2000},
          {"seq": 2, "name": "MRI Brain (if chronic/severe)", "cost_low": 6000, "cost_high": 12000},
          {"seq": 3, "name": "Blood Tests (CBC, Thyroid)", "cost_low": 1000, "cost_high": 3000},
          {"seq": 4, "name": "Prescription Medications", "cost_low": 500, "cost_high": 2000}
        ],
        "total_cost_low": 8300,
        "total_cost_high": 19000
      }
    ]
  },
  
  "R42": {
    "condition": "Dizziness and Giddiness",
    "pathways": [
      {
        "id": "R42_medical",
        "name": "Vestibular & ENT Evaluation",
        "type": "non_surgical",
        "recommended": True,
        "steps": [
          {"seq": 1, "name": "ENT / Neurologist Consultation", "cost_low": 800, "cost_high": 2000},
          {"seq": 2, "name": "Vestibular Function Tests", "cost_low": 2000, "cost_high": 5000},
          {"seq": 3, "name": "Vestibular Rehabilitation Therapy", "cost_low": 3000, "cost_high": 8000},
          {"seq": 4, "name": "Medications (Symptomatic Relief)", "cost_low": 500, "cost_high": 1500}
        ],
        "total_cost_low": 6300,
        "total_cost_high": 16500
      }
    ]
  }
}

def find_pathway(icd10_code: str) -> Optional[Dict[str, Any]]:
    if not icd10_code or not isinstance(icd10_code, str):
        return None
    
    code = icd10_code.strip().upper().replace(" ", "")
    
    # Try from most specific to least specific
    # 3-char prefix first (e.g. "M17", "I20", "K35")
    prefix_3 = code[:3]
    if prefix_3 in PATHWAY_DATABASE:
        return PATHWAY_DATABASE[prefix_3]
    
    # 2-char prefix (e.g. "M1", "I2")
    prefix_2 = code[:2]
    if prefix_2 in PATHWAY_DATABASE:
        return PATHWAY_DATABASE[prefix_2]
    
    # Single char ONLY for C (cancer) and Z (preventive)
    # Do NOT do single char fallback for I, M, K, N etc
    # because it would match wrong conditions
    prefix_1 = code[:1]
    if prefix_1 in ("C", "Z", "D"):
        if prefix_1 in PATHWAY_DATABASE:
            return PATHWAY_DATABASE[prefix_1]
    
    return None

@router.get("/pathway/{icd10_code}")
async def get_pathway(icd10_code: str, current_user = Depends(get_current_user)):
    result = find_pathway(icd10_code)
    
    if result:
        logger.info(f"Pathway found for ICD-10 {icd10_code}: {result['condition']}")
        return {
            "icd10_code": icd10_code,
            "condition": result["condition"],
            "pathways": result["pathways"],
            "matched": True
        }
    else:
        logger.warning(f"No pathway found for ICD-10 {icd10_code} — returning generic")
        return {
            "icd10_code": icd10_code,
            "condition": "Medical Condition",
            "pathways": [
                {
                    "id": "generic_consultation",
                    "name": "Specialist Consultation",
                    "type": "non_surgical",
                    "recommended": True,
                    "steps": [
                        {"seq": 1, "name": "Specialist Consultation", "cost_low": 700, "cost_high": 2000},
                        {"seq": 2, "name": "Diagnostic Tests", "cost_low": 2000, "cost_high": 10000},
                        {"seq": 3, "name": "Treatment as advised", "cost_low": 10000, "cost_high": 100000}
                    ],
                    "total_cost_low": 12700,
                    "total_cost_high": 112000
                }
            ],
            "matched": False
        }

@router.get("/pathway/debug/{icd10_code}")
async def debug_pathway(icd10_code: str):
    code = icd10_code.strip().upper()
    return {
        "input": icd10_code,
        "normalised": code,
        "prefix_3": code[:3],
        "prefix_2": code[:2],
        "prefix_1": code[:1],
        "matched_3": code[:3] in PATHWAY_DATABASE,
        "matched_2": code[:2] in PATHWAY_DATABASE,
        "matched_1": code[:1] in PATHWAY_DATABASE,
        "result_condition": find_pathway(code)["condition"] if find_pathway(code) else None,
        "available_prefixes": list(PATHWAY_DATABASE.keys())
    }

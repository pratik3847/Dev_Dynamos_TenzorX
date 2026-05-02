import logging
import math
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from backend.auth import get_current_user
from backend.database import get_db
from backend.schemas import UserResponse

router = APIRouter(prefix="/api/v1/procedures", tags=["procedures"])
logger = logging.getLogger("backend.procedures")

class EstimateRequest(BaseModel):
    cghs_code: str
    hospital_tier: str
    nabh_accredited: bool
    age: Optional[int] = None
    comorbidities: Optional[List[str]] = []
    los_override: Optional[int] = None

@router.get("/search")
def search_procedures(
    q: str,
    specialty: Optional[str] = None,
    limit: int = 20,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[Dict[str, Any]]:
    if len(q) < 2:
        return []
    limit = min(limit, 100)

    query = """
        SELECT id, cghs_code, procedure_name, rate_non_nabh, rate_nabh,
               rate_super_speciality, specialty_classification
        FROM public.cghs_procedures
        WHERE LOWER(procedure_name) ILIKE %s
    """
    params = [f"%{q.lower()}%"]

    if specialty:
        query += " AND LOWER(specialty_classification) ILIKE %s"
        params.append(f"%{specialty.lower()}%")

    query += """
        ORDER BY
          CASE WHEN LOWER(procedure_name) ILIKE %s THEN 0 ELSE 1 END,
          procedure_name ASC
        LIMIT %s
    """
    params.extend([f"{q.lower()}%", limit])

    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    except Exception:
        logger.exception("Procedure search failed")
        return []


@router.get("/specialties")
def get_procedure_specialties(
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[str]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT DISTINCT specialty_classification FROM public.cghs_procedures WHERE specialty_classification IS NOT NULL ORDER BY specialty_classification ASC")
            rows = cur.fetchall()
            return [row["specialty_classification"] for row in rows]
    except Exception:
        logger.exception("Get procedure specialties failed")
        return []


@router.get("/{cghs_code}")
def get_procedure(
    cghs_code: str,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM public.cghs_procedures WHERE cghs_code = %s", (cghs_code,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Procedure not found")
            return dict(row)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Get procedure failed")
        raise HTTPException(status_code=500, detail="Unexpected error")


@router.post("/estimate")
def estimate_cost(
    payload: EstimateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM public.cghs_procedures WHERE cghs_code = %s", (payload.cghs_code,))
            procedure = cur.fetchone()
            if not procedure:
                raise HTTPException(status_code=404, detail="Procedure not found")

        # Base rate
        base_rate = None
        if payload.nabh_accredited:
            base_rate = procedure.get("rate_nabh")
        else:
            base_rate = procedure.get("rate_non_nabh")

        if not base_rate or base_rate == 0:
            base_rate = procedure.get("rate_non_nabh") or procedure.get("rate_nabh") or procedure.get("rate_super_speciality")
        
        if not base_rate or base_rate == 0:
            raise HTTPException(status_code=422, detail="No rate data available for this procedure")

        base_rate = float(base_rate)

        # Tier multiplier
        multiplier = 1.0
        if payload.hospital_tier == "mid_tier":
            multiplier = 2.5
        elif payload.hospital_tier == "premium":
            multiplier = 4.0
        
        procedure_cost = base_rate * multiplier

        # Estimated LOS
        specialty = procedure.get("specialty_classification") or ""
        specialty_norm = specialty.strip()
        
        default_los = 3
        if specialty_norm == "Consultation" or specialty_norm == "Diagnostics":
            default_los = 0
        elif specialty_norm in ["Cardiology", "General Surgery", "Urology", "Gynaecology", "Obstetrics", "Paediatrics"]:
            default_los = 3
        elif specialty_norm in ["Cardiac Surgery", "Neurosurgery", "Psychiatry"]:
            default_los = 7
        elif specialty_norm == "Orthopaedics":
            default_los = 6
        elif specialty_norm in ["Neurology", "Nephrology"]:
            default_los = 4
        elif specialty_norm == "Oncology":
            default_los = 5
        elif specialty_norm == "Ophthalmology":
            default_los = 1
        
        los_days = default_los
        if payload.los_override is not None:
            los_days = payload.los_override
            
        # Room costs
        if payload.hospital_tier == "budget":
            gw_low, gw_high = 800, 1500
            priv_low, priv_high = 1500, 1500 # Budget fallback
        elif payload.hospital_tier == "mid_tier":
            gw_low, gw_high = 2000, 4000
            priv_low, priv_high = 6000, 12000
        else: # premium
            gw_low, gw_high = 4000, 8000
            priv_low, priv_high = 12000, 20000

        stay_cost_low = gw_low * los_days
        stay_cost_high = priv_high * los_days
        if los_days == 0:
            stay_cost_low = 0
            stay_cost_high = 0

        # Diagnostics
        if specialty_norm in ["Cardiology", "Cardiac Surgery"]:
            diag_low, diag_high = 8000, 18000
        elif specialty_norm == "Orthopaedics":
            diag_low, diag_high = 5000, 12000
        elif specialty_norm == "Oncology":
            diag_low, diag_high = 10000, 25000
        elif specialty_norm in ["Neurology", "Neurosurgery"]:
            diag_low, diag_high = 8000, 20000
        elif specialty_norm == "General Surgery":
            diag_low, diag_high = 4000, 10000
        elif specialty_norm == "Ophthalmology":
            diag_low, diag_high = 2000, 5000
        elif specialty_norm == "Consultation":
            diag_low, diag_high = 0, 0
        else:
            diag_low, diag_high = 3000, 8000

        # Medicines
        if payload.hospital_tier == "budget":
            med_low = procedure_cost * 0.05
            med_high = procedure_cost * 0.10
        elif payload.hospital_tier == "mid_tier":
            med_low = procedure_cost * 0.08
            med_high = procedure_cost * 0.15
        else: # premium
            med_low = procedure_cost * 0.10
            med_high = procedure_cost * 0.20
        
        med_low = round(med_low / 100) * 100
        med_high = round(med_high / 100) * 100

        # Comorbidity
        contingency_pct = 0.15
        applied_flags = []
        
        comorbidities = [c.lower() for c in payload.comorbidities] if payload.comorbidities else []
        if "diabetes" in comorbidities:
            contingency_pct += 0.08
            applied_flags.append("diabetes_adjustment")
        if "hypertension" in comorbidities:
            contingency_pct += 0.05
            applied_flags.append("hypertension_adjustment")
        if "ckd" in comorbidities:
            contingency_pct += 0.12
            applied_flags.append("ckd_adjustment")
        if "cardiac" in comorbidities:
            contingency_pct += 0.10
            applied_flags.append("cardiac_adjustment")
        if "obesity" in comorbidities:
            contingency_pct += 0.05
            applied_flags.append("obesity_adjustment")
        if "asthma" in comorbidities:
            contingency_pct += 0.03
            applied_flags.append("asthma_adjustment")
            
        if payload.age:
            if payload.age >= 75:
                contingency_pct += 0.10
                applied_flags.append("age_adjustment")
            elif payload.age >= 65:
                contingency_pct += 0.05
                applied_flags.append("age_adjustment")
                
        contingency_pct = min(contingency_pct, 0.40)
        
        if payload.los_override is not None:
            applied_flags.append("custom_los")
        if payload.nabh_accredited:
            applied_flags.append("nabh_rates_applied")

        subtotal_low = procedure_cost + stay_cost_low + diag_low + med_low
        subtotal_high = procedure_cost + stay_cost_high + diag_high + med_high

        contingency_low = round(subtotal_low * contingency_pct)
        contingency_high = round(subtotal_high * contingency_pct)

        total_low = subtotal_low + contingency_low
        total_high = subtotal_high + contingency_high

        return {
            "cghs_code": procedure["cghs_code"],
            "procedure_name": procedure["procedure_name"],
            "hospital_tier": payload.hospital_tier,
            "nabh_accredited": payload.nabh_accredited,
            "base_rate": base_rate,
            "tier_multiplier": multiplier,
            "los_days": los_days,
            "procedure_cost": round(procedure_cost, 2),
            "stay_cost_low": round(stay_cost_low, 2),
            "stay_cost_high": round(stay_cost_high, 2),
            "diagnostics_low": round(diag_low, 2),
            "diagnostics_high": round(diag_high, 2),
            "medicines_low": round(med_low, 2),
            "medicines_high": round(med_high, 2),
            "contingency_pct": round(contingency_pct, 4),
            "contingency_low": round(contingency_low, 2),
            "contingency_high": round(contingency_high, 2),
            "total_low": round(total_low, 2),
            "total_high": round(total_high, 2),
            "applied_flags": applied_flags,
            "specialty_classification": specialty,
            "disclaimer": "Cost estimates based on CGHS benchmark rates. Actual costs may vary. For planning purposes only."
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Estimate calculation failed")
        raise HTTPException(status_code=500, detail="Unexpected error during estimation")

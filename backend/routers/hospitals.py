import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from backend.auth import get_current_user
from backend.database import get_db
from backend.schemas import UserResponse

router = APIRouter(prefix="/api/v1/hospitals", tags=["hospitals"])
logger = logging.getLogger("backend.hospitals")

class NearbyRequest(BaseModel):
    lat: float
    lng: float
    radius_km: float = 50.0
    specialty: Optional[str] = None
    tier: Optional[str] = None
    nabh_only: Optional[bool] = False
    limit: Optional[int] = 20

@router.get("/search")
def search_hospitals(
    district: Optional[str] = None,
    state: Optional[str] = None,
    name: Optional[str] = None,
    specialty: Optional[str] = None,
    tier: Optional[str] = None,
    nabh_only: Optional[bool] = False,
    limit: int = 20,
    offset: int = 0,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[Dict[str, Any]]:
    limit = min(limit, 50)
    query = """
        SELECT id, hospital_name, hospital_category, care_type, discipline,
               address, state, district, subdistrict, town, pincode,
               telephone, mobile, emergency_num, ambulance_phone, bloodbank_phone,
               email_primary, website, specialties, facilities, accreditation,
               total_beds, private_wards, num_doctors, established_year,
               emergency_services, tariff_range, empanelment,
               lat, lng, tier, nabh_accredited, state_id, district_id
        FROM public.hospitals
        WHERE 1=1
    """
    params = []

    if district:
        query += " AND LOWER(district) ILIKE %s"
        params.append(f"%{district.lower()}%")
    if state:
        query += " AND LOWER(state) ILIKE %s"
        params.append(f"%{state.lower()}%")
    if name:
        query += " AND LOWER(hospital_name) ILIKE %s"
        params.append(f"%{name.lower()}%")
    if specialty:
        query += " AND (LOWER(specialties) ILIKE %s OR LOWER(discipline) ILIKE %s OR LOWER(facilities) ILIKE %s)"
        specialty_param = f"%{specialty.lower()}%"
        params.extend([specialty_param, specialty_param, specialty_param])
    if tier:
        query += " AND tier = %s"
        params.append(tier)
    if nabh_only:
        query += " AND nabh_accredited = TRUE"

    query += " ORDER BY nabh_accredited DESC, total_beds DESC NULLS LAST LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    except Exception:
        logger.exception("Hospital search failed")
        return []


@router.get("/states")
def get_states(
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[str]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT DISTINCT state FROM public.hospitals WHERE state IS NOT NULL ORDER BY state ASC")
            rows = cur.fetchall()
            return [row["state"] for row in rows]
    except Exception:
        logger.exception("Get states failed")
        return []


@router.get("/districts")
def get_districts(
    state: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[str]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            if state:
                cur.execute(
                    "SELECT DISTINCT district FROM public.hospitals WHERE state ILIKE %s AND district IS NOT NULL ORDER BY district ASC",
                    (f"{state}",),
                )
            else:
                cur.execute("SELECT DISTINCT district FROM public.hospitals WHERE district IS NOT NULL ORDER BY district ASC")
            rows = cur.fetchall()
            return [row["district"] for row in rows]
    except Exception:
        logger.exception("Get districts failed")
        return []


@router.get("/{hospital_id}")
def get_hospital(
    hospital_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> Dict[str, Any]:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM public.hospitals WHERE id = %s", (hospital_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Hospital not found")
            return dict(row)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Get hospital failed")
        raise HTTPException(status_code=500, detail="Unexpected error")


@router.post("/nearby")
def search_hospitals_nearby(
    payload: NearbyRequest,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> List[Dict[str, Any]]:
    query = """
        SELECT id, hospital_name, hospital_category, care_type, discipline,
               address, state, district, subdistrict, town, pincode,
               telephone, mobile, emergency_num,
               email_primary, website, specialties, facilities, accreditation,
               total_beds, private_wards, num_doctors,
               emergency_services, tariff_range,
               lat, lng, tier, nabh_accredited,
               ROUND(
                 (ST_Distance(
                   location::geography,
                   ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
                 ) / 1000)::numeric, 1
               ) AS distance_km
        FROM public.hospitals
        WHERE location IS NOT NULL
          AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
          )
    """
    
    radius_meters = payload.radius_km * 1000
    params = [
        payload.lng, payload.lat,
        payload.lng, payload.lat,
        radius_meters
    ]

    if payload.specialty:
        query += " AND (LOWER(specialties) ILIKE %s OR LOWER(discipline) ILIKE %s)"
        specialty_param = f"%{payload.specialty.lower()}%"
        params.extend([specialty_param, specialty_param])
    if payload.tier:
        query += " AND tier = %s"
        params.append(payload.tier)
    if payload.nabh_only:
        query += " AND nabh_accredited = TRUE"

    query += " ORDER BY distance_km ASC LIMIT %s"
    params.append(payload.limit)

    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            return [dict(row) for row in rows]
    except Exception:
        logger.exception("Nearby hospitals search failed")
        return []

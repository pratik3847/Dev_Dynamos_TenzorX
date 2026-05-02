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
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "20"))
ICD_TIMEOUT = float(os.getenv("ICD_TIMEOUT", "12"))

router = APIRouter(prefix="/api/v1/diagnosis", tags=["diagnosis"])
logger = logging.getLogger("backend.diagnosis")


class DiagnosisMatchRequest(BaseModel):
    symptoms: Optional[str] = Field(None, max_length=2000)
    diagnosis: Optional[str] = Field(None, max_length=2000)


class Icd10Match(BaseModel):
    code: str
    name: str


class DiagnosisMatchResponse(BaseModel):
    condition_name: Optional[str] = None
    specialty: Optional[str] = None
    confidence: Optional[int] = None
    keywords: List[str] = Field(default_factory=list)
    icd10: Optional[Icd10Match] = None
    source: str
    warnings: List[str] = Field(default_factory=list)


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
    block = cleaned[start : end + 1]
    try:
        return json.loads(block)
    except json.JSONDecodeError:
        return None


def _normalize_llm_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    condition_name = str(payload.get("condition_name", "")).strip()
    specialty = str(payload.get("specialty", "")).strip()
    severity = str(payload.get("severity", "")).strip().lower()
    keywords = payload.get("keywords") if isinstance(payload.get("keywords"), list) else []
    confidence_raw = payload.get("confidence")
    confidence = None
    if confidence_raw is not None:
        try:
            confidence = max(0, min(100, int(confidence_raw)))
        except (TypeError, ValueError):
            confidence = None
    return {
        "condition_name": condition_name,
        "specialty": specialty,
        "severity": severity,
        "keywords": [str(k).strip() for k in keywords if str(k).strip()],
        "confidence": confidence,
    }


async def _call_llm(symptoms: str, diagnosis: str) -> Optional[Dict[str, Any]]:
    if not (LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL):
        return None

    url = f"{LLM_API_BASE_URL.rstrip('/')}/chat/completions"
    prompt = (
        "You are a clinical coding assistant. Return ONLY valid JSON with fields: "
        "condition_name, specialty, severity, keywords, confidence. "
        "severity must be one of low, moderate, high. "
        "If unsure, leave condition_name empty and set confidence low.\n\n"
        f"Symptoms: {symptoms or 'n/a'}\n"
        f"Diagnosis: {diagnosis or 'n/a'}"
    )

    payload = {
        "model": LLM_MODEL,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "Return JSON only. No markdown."},
            {"role": "user", "content": prompt},
        ],
    }

    headers = {"Authorization": f"Bearer {LLM_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
            res = await client.post(url, json=payload, headers=headers)
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
        return None
    return _normalize_llm_payload(parsed)


def _parse_icd_response(data: Any) -> List[Icd10Match]:
    if not isinstance(data, list) or len(data) < 4:
        return []
    display = data[3] or []
    results: List[Icd10Match] = []
    for item in display:
        if not isinstance(item, list) or len(item) < 2:
            continue
        code = str(item[0]).strip()
        name = str(item[1]).strip()
        if code and name:
            results.append(Icd10Match(code=code, name=name))
    return results


async def _search_icd10(terms: str, limit: int = 7) -> List[Icd10Match]:
    query = _clean_text(terms)
    if not query:
        return []

    params = {"terms": query, "sf": "code,name", "df": "code,name", "maxList": str(limit)}

    try:
        async with httpx.AsyncClient(timeout=ICD_TIMEOUT) as client:
            res = await client.get(ICD10_BASE_URL, params=params)
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError:
        logger.exception("ICD-10 search failed")
        return []

    return _parse_icd_response(data)


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
    llm_result = await _call_llm(symptoms, diagnosis)
    if not llm_result and (symptoms or diagnosis) and not (LLM_API_BASE_URL and LLM_API_KEY and LLM_MODEL):
        warnings.append("LLM not configured; using ICD-10 search only.")

    primary_query = _clean_text((llm_result or {}).get("condition_name")) or diagnosis or symptoms
    combined_query = _clean_text(" ".join([diagnosis, symptoms]))

    icd_results = await _search_icd10(primary_query)
    if not icd_results and combined_query and combined_query != primary_query:
        icd_results = await _search_icd10(combined_query)

    icd10 = icd_results[0] if icd_results else None

    condition_name = (
        (llm_result or {}).get("condition_name")
        or (icd10.name if icd10 else "")
        or diagnosis
        or symptoms
    )

    confidence = (llm_result or {}).get("confidence")
    if confidence is None:
        confidence = 72 if icd10 else 55

    source = "llm+icd" if llm_result and icd10 else "llm" if llm_result else "icd" if icd10 else "local"

    return DiagnosisMatchResponse(
        condition_name=condition_name or None,
        specialty=(llm_result or {}).get("specialty") or None,
        confidence=confidence,
        keywords=(llm_result or {}).get("keywords") or [],
        icd10=icd10,
        source=source,
        warnings=warnings,
    )

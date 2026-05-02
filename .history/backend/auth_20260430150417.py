import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from psycopg2.extras import RealDictCursor

from backend.database import get_db
from backend.schemas import UserResponse

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: Dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def map_user_row(row: Dict[str, Any]) -> UserResponse:
    return UserResponse(
        user_id=row["user_id"],
        name=row["name"],
        email=row["email"],
        age=row.get("age"),
        gender=row.get("gender"),
        phone=row.get("phone"),
        city=row.get("city"),
        pincode=row.get("pincode"),
        blood_group=row.get("blood_group"),
        height_cm=row.get("height_cm"),
        weight_kg=row.get("weight_kg"),
        allergies=row.get("allergies") or [],
        comorbidities=row.get("comorbidities") or [],
        medications=row.get("medications") or [],
        emergency_contact_name=row.get("emergency_contact_name"),
        emergency_contact_phone=row.get("emergency_contact_phone"),
        insurance_provider=row.get("insurance_provider"),
        insurance_id=row.get("insurance_id"),
        budget_pref=row.get("budget_pref"),
        search_history=row.get("search_history") or [],
        created_at=row["created_at"],
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
) -> UserResponse:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing token")
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT user_id, name, email, age, gender, phone, city, pincode, blood_group,
                   height_cm, weight_kg, allergies, comorbidities, medications,
                   emergency_contact_name, emergency_contact_phone, insurance_provider,
                   insurance_id, budget_pref, search_history, created_at
            FROM public.users
            WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return map_user_row(row)

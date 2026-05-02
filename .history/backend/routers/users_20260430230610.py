yping import Any, Dict
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.extras import RealDictCursor

from backend.auth import create_access_token, get_current_user, hash_password, map_user_row, verify_password
from backend.database import get_db
from backend.schemas import LoginRequest, ProfileUpdateRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
logger = logging.getLogger("backend.users")


USER_COLUMNS = (
    "user_id, name, email, age, gender, phone, city, pincode, blood_group, "
    "height_cm, weight_kg, allergies, comorbidities, medications, emergency_contact_name, "
    "emergency_contact_phone, insurance_provider, insurance_id, budget_pref, search_history, created_at"
)


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db=Depends(get_db)) -> TokenResponse:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT 1 FROM public.users WHERE email = %s", (payload.email.lower(),))
            if cur.fetchone():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

            hashed = hash_password(payload.password)
            allergies = payload.allergies or []
            comorbidities = payload.conditions or []
            medications = payload.medications or []

            cur.execute(
                """
                INSERT INTO public.users (
                    name, email, password, age, gender, phone, city, pincode, blood_group,
                    height_cm, weight_kg, allergies, comorbidities, medications,
                    emergency_contact_name, emergency_contact_phone, insurance_provider,
                    insurance_id, budget_pref
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING """
                + USER_COLUMNS,
                (
                    payload.name.strip(),
                    payload.email.lower(),
                    hashed,
                    payload.age,
                    payload.gender,
                    payload.phone,
                    payload.city,
                    payload.pincode,
                    payload.blood_group,
                    payload.height_cm,
                    payload.weight_kg,
                    allergies,
                    comorbidities,
                    medications,
                    payload.emergency_contact_name,
                    payload.emergency_contact_phone,
                    payload.insurance_provider,
                    payload.insurance_id,
                    payload.budget_pref,
                ),
            )
            row = cur.fetchone()

        token = create_access_token({"sub": str(row["user_id"]), "email": row["email"]})
        return TokenResponse(access_token=token, user=map_user_row(row))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Signup failed")
        print(f"Signup failed: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected server error")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db=Depends(get_db)) -> TokenResponse:
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT " + USER_COLUMNS + ", password FROM public.users WHERE email = %s",
                (payload.email.lower(),),
            )
            row = cur.fetchone()

        if not row or not verify_password(payload.password, row.get("password", "")):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        token = create_access_token({"sub": str(row["user_id"]), "email": row["email"]})
        return TokenResponse(access_token=token, user=map_user_row(row))
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Login failed")
        print(f"Login failed: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected server error")


@router.get("/me", response_model=UserResponse)
def me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db=Depends(get_db),
) -> UserResponse:
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return current_user

    mapped: Dict[str, Any] = {}
    for key, value in updates.items():
        column = "comorbidities" if key == "conditions" else key
        mapped[column] = value

    set_clause = ", ".join([col + " = %s" for col in mapped.keys()])
    values = list(mapped.values()) + [str(current_user.user_id)]

    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "UPDATE public.users SET " + set_clause + " WHERE user_id = %s RETURNING " + USER_COLUMNS,
                values,
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return map_user_row(row)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Profile update failed")
        print(f"Profile update failed: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected server error")

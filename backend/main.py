from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import test_connection
from backend.routers import diagnosis, users, hospitals, procedures, clinical
app = FastAPI(title="Healthcare Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(diagnosis.router)
app.include_router(hospitals.router)
app.include_router(procedures.router)
app.include_router(clinical.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Healthcare Navigator API"}


@app.on_event("startup")
def on_startup() -> None:
    test_connection()
    print("Healthcare Navigator API is running")

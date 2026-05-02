from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import test_connection
from backend.routers import diagnosis, users

app = FastAPI(title="Healthcare Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(diagnosis.router)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Healthcare Navigator API"}


@app.on_event("startup")
def on_startup() -> None:
    test_connection()
    print("Healthcare Navigator API is running")

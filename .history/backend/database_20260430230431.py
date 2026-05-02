import os

import psycopg2
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(ENV_PATH)

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

if not SUPABASE_DB_URL:
    raise RuntimeError("SUPABASE_DB_URL is not set")


def get_db():
    conn = psycopg2.connect(SUPABASE_DB_URL)
    conn.autocommit = True
    try:
        yield conn
    finally:
        conn.close()


def test_connection() -> None:
    conn = psycopg2.connect(SUPABASE_DB_URL)
    conn.close()
    print("Database connection successful")

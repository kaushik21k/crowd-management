from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Use Supabase URL if provided, otherwise default to local SQLite.
# If the Postgres host is unreachable in the current environment, fall back to SQLite
# so the app can still start and be tested locally.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is not set. "
        "Set it to a PostgreSQL connection string (e.g., from Supabase)."
    )
ALLOW_SQLITE_FALLBACK = os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() in {"1", "true", "yes", "on"}

if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    # Fix for Heroku/Supabase postgres:// vs postgresql://
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)


def _make_engine(database_url: str):
    kwargs = {"pool_pre_ping": True}
    if "sqlite" in database_url:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_recycle"] = 300
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
        kwargs["pool_timeout"] = 30
    return create_engine(database_url, **kwargs)


engine = _make_engine(SQLALCHEMY_DATABASE_URL)

try:
    with engine.connect():
        print(f"Database connected: {SQLALCHEMY_DATABASE_URL}")
except OperationalError as exc:
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite") and ALLOW_SQLITE_FALLBACK:
        print(
            "WARNING: Supabase database unreachable. "
            f"Falling back to local SQLite crowdflow.db for this session. Reason: {exc}"
        )
        SQLALCHEMY_DATABASE_URL = "sqlite:///./crowdflow.db"
        engine = _make_engine(SQLALCHEMY_DATABASE_URL)
    else:
        raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

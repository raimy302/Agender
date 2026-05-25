from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("agender.db")

BACKEND_DIR = Path(__file__).resolve().parents[1]
# Carga local .env (para dev). En Render/Vercel los env vars suelen venir ya inyectados.
load_dotenv(BACKEND_DIR / ".env")


def _clean_env_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip().replace("\ufeff", "")


DATABASE_URL = _clean_env_value(os.getenv("DATABASE_URL"))

# Base para que los modelos puedan declararse sin depender del engine.
Base = declarative_base()

# engine/SessionLocal se inicializan de forma perezosa para no romper startup.
engine = None
SessionLocal = None


def _make_engine(db_url: str):
    # Import tardío: evita efectos colaterales en import time.
    from sqlalchemy import create_engine

    connect_args = {}
    if db_url.startswith("postgresql://"):
        connect_args = {"sslmode": "require"}

    return create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


def init_engine_if_needed() -> None:
    """Inicializa engine y SessionLocal si aún no existen.

    No debe lanzar excepciones fatales (FastAPI debe levantar).
    """
    global engine, SessionLocal

    if engine is not None and SessionLocal is not None:
        return

    if not DATABASE_URL:
        logger.error("Missing DATABASE_URL env var; DB mode degradado (sin crash).")
        engine = None
        SessionLocal = None
        return

    try:
        engine = _make_engine(DATABASE_URL)
        SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
        )
        logger.info("DB engine inicializado.")
    except Exception:
        logger.exception("Error creando engine (DB mode degradado).")
        engine = None
        SessionLocal = None


def can_connect(attempts: int = 2, delay_seconds: float = 0.5) -> bool:
    """Valida conexión a PostgreSQL (no rompe startup)."""
    init_engine_if_needed()
    if engine is None:
        return False

    last_exc: Exception | None = None
    for _ in range(attempts):
        try:
            from sqlalchemy import text

            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as exc:
            last_exc = exc
            time.sleep(delay_seconds)

    logger.error("No se pudo conectar a la DB tras reintentos: %s", last_exc)
    return False


def get_db():
    """Dependency de FastAPI.

    Si la DB no está lista, lanza 503.
    """
    init_engine_if_needed()

    from fastapi import HTTPException

    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="DB no disponible (startup degradado)")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


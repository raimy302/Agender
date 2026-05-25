from datetime import date

from .database import SessionLocal
from .models import User
from .auth import hash_password


DEMO_ADMIN_EMAIL = "admin@test.com"
DEMO_ADMIN_PASSWORD = "123456"


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_ADMIN_EMAIL).first()
        if existing:
            return

        admin = User(
            email=DEMO_ADMIN_EMAIL,
            password=hash_password(DEMO_ADMIN_PASSWORD),
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


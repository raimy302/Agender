from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Appointment
from ..utils import generate_slots, is_valid_future_slot_for_today


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/slots/{user_id}")
def get_available_slots(user_id: int, db: Session = Depends(get_db)):
    today = date.today()
    all_slots = generate_slots()

    taken = (
        db.query(Appointment.time_slot)
        .filter(
            Appointment.user_id == user_id,
            Appointment.appointment_date == today,
        )
        .all()
    )

    taken_slots = {t[0] for t in taken}
    available = [
        slot
        for slot in all_slots
        if slot not in taken_slots and is_valid_future_slot_for_today(slot)
    ]


    return {
        "ok": True,
        "date": str(today),
        "slots": available,
    }





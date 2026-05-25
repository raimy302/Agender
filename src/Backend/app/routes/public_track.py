from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc, desc, func

from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Appointment
from ..utils import generate_slots, is_valid_future_slot_for_today

router = APIRouter(prefix="")



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _appointment_info(a: Appointment) -> dict:
    return {
        "id": a.id,
        "client_name": a.client_name,
        "time_slot": a.time_slot,
    }


def _validate_turn_number(turn_number: int) -> None:
    # FastAPI ya intenta convertir a int, pero validamos rango.
    if not isinstance(turn_number, int):
        raise HTTPException(status_code=400, detail="turn_number inválido")
    if turn_number <= 0:
        raise HTTPException(status_code=400, detail="turn_number inválido")


@router.get("/track/{turn_number}")
def track_turn(turn_number: int, db: Session = Depends(get_db)):
    _validate_turn_number(turn_number)



    today = date.today()

    # Solo turnos del día actual.
    base_today_pending = (
        db.query(Appointment.turn_number)
        .filter(
            Appointment.appointment_date == today,
            Appointment.status == "pending",
        )
    )

    # current_turn se deriva del pending más bajo del día
    current_turn_row = base_today_pending.order_by(asc(Appointment.turn_number)).first()
    current_turn = current_turn_row[0] if current_turn_row else None

    # Métrica opcional para UX
    total_pending_today_row = base_today_pending.with_entities(func.count()).first()
    total_pending_today = (
        int(total_pending_today_row[0])
        if total_pending_today_row and total_pending_today_row[0] is not None
        else 0
    )

    # Info del turno solicitado (solo del día actual)

    my = (
        db.query(Appointment)
        .filter(
            Appointment.appointment_date == today,
            Appointment.turn_number == turn_number,
        )
        .order_by(desc(Appointment.id))
        .first()
    )

    my_status = my.status if my else None
    appointment_date = str(today)

    # remaining_turns: turnos pendientes desde tu turno hasta el turno actual.
    if current_turn is None:
        remaining_turns = 0
    else:
        remaining_turns = turn_number - current_turn
        if remaining_turns < 0:
            remaining_turns = 0

    # pending_turns_before_current_user ("personas delante" vistas por tu turno)
    # Recomendación: contar turnos pending con número menor a tu turno respecto al current_turn.
    # Si no hay current_turn, asumimos 0.
    if current_turn is None:
        pending_turns_before_current_user = 0
    else:
        pending_turns_before_current_user = turn_number - current_turn
        if pending_turns_before_current_user < 0:
            pending_turns_before_current_user = 0

    return {
        "turn_number": turn_number,
        "current_turn": current_turn,
        "remaining_turns": remaining_turns,
        "pending_turns_before_current_user": pending_turns_before_current_user,
        "status": my_status,
        "appointment_date": appointment_date,
        "appointment": _appointment_info(my) if my else None,
        "total_pending_today": total_pending_today,
    }



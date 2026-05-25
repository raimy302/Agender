from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Appointment
from ..schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate

# NOTE: MVP hardening: este router público se mantiene pero NO se monta en main.py.
# Se deja el archivo para compatibilidad futura, pero en producción no debe exponer CRUD público.
router = APIRouter(prefix="/public")



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


VALID_STATUSES = {"waiting", "in_progress", "completed"}


def _appointment_to_out(a: Appointment) -> AppointmentOut:
    # Reutiliza el esquema del backend (MVP)
    return AppointmentOut(
        id=a.id,
        client_name=a.client_name,
        phone=a.phone,
        time_slot=a.time_slot,
        turn_number=a.turn_number,
        appointment_date=str(a.appointment_date),
        status=a.status,
        user_id=a.user_id,
    )


@router.get("/appointments/{user_id}", response_model=list[AppointmentOut])
def list_appointments_public(user_id: int, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).filter(Appointment.user_id == user_id).all()
    return [_appointment_to_out(a) for a in appointments]


@router.put("/appointments/{id}", response_model=AppointmentOut)
def update_appointment_public(id: int, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Status inválido")

    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita inexistente")

    appointment.status = payload.status
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return _appointment_to_out(appointment)


@router.delete("/appointments/{id}")
def delete_appointment_public(id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita inexistente")

    db.delete(appointment)
    db.commit()

    return {"ok": True, "deleted_id": id}


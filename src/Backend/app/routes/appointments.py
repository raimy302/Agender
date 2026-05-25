from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..auth import get_current_user
from ..models import Appointment
from ..schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate

from ..utils import generate_slots, is_valid_future_slot_for_today


def _assert_time_slot_future_with_buffer(slot: str) -> None:
    if not is_valid_future_slot_for_today(slot):
        raise HTTPException(status_code=400, detail="Horario inválido")


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


VALID_STATUSES = {"pending", "completed", "cancelled"}



def _appointment_to_out(a: Appointment) -> AppointmentOut:
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


@router.post("/book/{user_id}")
def book_appointment(
    user_id: int,
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
):
    # Validaciones base
    payload.validate_phone()

    today = date.today()
    valid_slots = set(generate_slots())

    if payload.time_slot not in valid_slots:
        raise HTTPException(status_code=400, detail="Horario inválido")

    _assert_time_slot_future_with_buffer(payload.time_slot)


    # turn_number reinicia por día
    existing = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == user_id,
            Appointment.appointment_date == today,
            Appointment.time_slot == payload.time_slot,
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Horario ocupado")

    taken_today_count = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == user_id,
            Appointment.appointment_date == today,
        )
        .count()
    )

    appointment = Appointment(
        client_name=payload.client_name.strip(),
        phone=payload.phone.strip(),
        time_slot=payload.time_slot,
        appointment_date=today,
        turn_number=taken_today_count + 1,
        status="pending",
        user_id=user_id,
    )

    db.add(appointment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Horario ocupado")

    db.refresh(appointment)

    return {
        "ok": True,
        "appointment": _appointment_to_out(appointment),
        "turn_number": appointment.turn_number,
    }




@router.get("/appointments", response_model=list[AppointmentOut])
def get_my_appointments(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.user_id == user.id,
            Appointment.appointment_date == today,
        )
        .all()
    )
    return [_appointment_to_out(a) for a in appointments]



@router.put("/appointments/{id}", response_model=AppointmentOut)
def update_appointment(
    id: int,
    payload: AppointmentUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ownership
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == id, Appointment.user_id == user.id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita inexistente")

    # Status
    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Status inválido")
        appointment.status = payload.status

    # Name
    if payload.client_name is not None:
        clean_name = payload.client_name.strip()
        if len(clean_name) < 1:
            raise HTTPException(status_code=400, detail="Nombre inválido")
        appointment.client_name = clean_name

    # Phone
    if payload.phone is not None:
        # Reutiliza validación pydantic del Create
        from ..schemas import AppointmentCreate as _AppointmentCreate

        _payload = _AppointmentCreate(
            client_name=appointment.client_name,
            phone=payload.phone,
            time_slot=appointment.time_slot,
        )
        _payload.validate_phone()
        appointment.phone = payload.phone.strip()


    # Time slot (MVP: solo valida/evita duplicados en el día de hoy)
    if payload.time_slot is not None:
        valid_slots = set(generate_slots())
        if payload.time_slot not in valid_slots:
            raise HTTPException(status_code=400, detail="Horario inválido")

        today = date.today()
        # Si el slot cambia, evitar que el owner tenga otro turno en el mismo slot hoy
        dup = (
            db.query(Appointment)
            .filter(
                Appointment.user_id == user.id,
                Appointment.appointment_date == today,
                Appointment.time_slot == payload.time_slot,
                Appointment.id != appointment.id,
            )
            .first()
        )
        if dup:
            raise HTTPException(status_code=400, detail="Horario ocupado")

        appointment.time_slot = payload.time_slot
        _assert_time_slot_future_with_buffer(payload.time_slot)


    db.add(appointment)
    db.commit()

    db.refresh(appointment)

    return _appointment_to_out(appointment)



@router.delete("/appointments/{id}")
def delete_appointment(
    id: int,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == id, Appointment.user_id == user.id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Cita inexistente")

    db.delete(appointment)
    db.commit()

    return {"ok": True, "deleted_id": id}


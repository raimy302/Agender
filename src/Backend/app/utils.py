from datetime import date, datetime, time, timedelta


SLOT_BUFFER_MINUTES = 15


def generate_slots(start_hour=8, end_hour=19, interval=15):
    slots = []

    for hour in range(start_hour, end_hour):
        for minutes in range(0, 60, interval):
            slots.append(f"{hour:02d}:{minutes:02d}")

    return slots


def _parse_time_slot_to_time(slot: str) -> time:
    # Espera formato HH:MM
    hour_str, minute_str = slot.split(":", 1)
    return time(hour=int(hour_str), minute=int(minute_str))


def is_valid_future_slot_for_today(slot: str, *, now: datetime | None = None, buffer_minutes: int = SLOT_BUFFER_MINUTES) -> bool:
    """Valida que el slot (HH:MM) sea futuro para HOY aplicando buffer.

    Regla:
      - Convierte slot a datetime de hoy
      - Slot válido si dt_slot >= now + buffer

    No se usa para fechas distintas (este MVP solo maneja hoy), pero queda encapsulado.
    """
    if now is None:
        now = datetime.now()

    try:
        slot_t = _parse_time_slot_to_time(slot)
    except Exception:
        return False

    dt_slot = datetime.combine(now.date(), slot_t)
    min_dt = now + timedelta(minutes=buffer_minutes)
    return dt_slot >= min_dt


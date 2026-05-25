import re

from pydantic import BaseModel, Field


# 👤 USER
class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# 🔐 TOKEN
class Token(BaseModel):
    access_token: str
    token_type: str


# 📅 APPOINTMENT
class AppointmentCreate(BaseModel):
    client_name: str = Field(min_length=1)
    phone: str
    time_slot: str

    @staticmethod
    def _phone_is_valid(phone: str) -> bool:
        # MVP: acepta +? y dígitos (mínimo 7)
        return bool(re.fullmatch(r"\+?[0-9]{7,15}", phone.strip()))

    def validate_phone(self) -> None:
        if not self._phone_is_valid(self.phone):
            raise ValueError("Teléfono inválido")


class AppointmentUpdate(BaseModel):
    client_name: str | None = None
    phone: str | None = None
    time_slot: str | None = None
    status: str | None = None




class AppointmentOut(BaseModel):

    id: int
    client_name: str
    phone: str
    time_slot: str
    turn_number: int
    appointment_date: str
    status: str
    user_id: int

    class Config:
        from_attributes = True


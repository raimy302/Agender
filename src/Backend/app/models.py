from datetime import date

from sqlalchemy import (
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)

from .database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "appointment_date",
            "time_slot",
            name="uq_owner_day_timeslot",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    client_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)

    time_slot = Column(String, nullable=False)

    turn_number = Column(Integer, nullable=False)

    appointment_date = Column(Date, default=date.today, nullable=False)

    status = Column(String, nullable=False, default="pending")


    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


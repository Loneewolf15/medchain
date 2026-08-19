import asyncio
from app.database import engine, Base, SessionLocal
from app.models import Appointment
from sqlalchemy.exc import IntegrityError
import uuid

session = SessionLocal()
try:
    a = Appointment(
        id=str(uuid.uuid4()),
        patient_id="some-patient",
        doctor_id="",  # Empty string!
        reason="Test",
        status="requested"
    )
    session.add(a)
    session.commit()
    print("Success")
except Exception as e:
    print("Error:", type(e).__name__)

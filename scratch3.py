from pydantic import BaseModel
from datetime import datetime
try:
    class AppointmentCreate(BaseModel):
        doctor_id: str | None = None
        scheduled_at: datetime | None = None
        reason: str
    
    a = AppointmentCreate(doctor_id="", scheduled_at="", reason="Test")
    print("Parsed:", a)
except Exception as e:
    print("Error:", repr(e))

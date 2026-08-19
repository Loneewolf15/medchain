from pydantic import BaseModel, EmailStr
class M(BaseModel):
    e: EmailStr
M(e='johnkennedy@patient.medchain.com')
print("Valid!")

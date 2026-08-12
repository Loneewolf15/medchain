from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import AccessScope, ClinicalRecordType, DiagnosticKind, Role

# --- Auth ---------------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Role


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: Role

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Patients (administrative) ------------------------------------------
class PatientCreate(BaseModel):
    full_name: str
    date_of_birth: str
    gender: str
    address: str | None = None
    emergency_contact: str | None = None
    blood_type: str | None = None
    user_id: str | None = None


class PatientOut(BaseModel):
    id: str
    patient_code: str
    full_name: str
    date_of_birth: str
    gender: str
    address: str | None
    emergency_contact: str | None
    blood_type: str | None

    model_config = ConfigDict(from_attributes=True)


# --- Clinical -------------------------------------------------------------
class ClinicalRecordCreate(BaseModel):
    record_type: ClinicalRecordType
    data: dict = Field(..., description="e.g. {'systolic':120,'diastolic':80,'heart_rate':72}")
    source: str = "manual"


class ClinicalRecordOut(BaseModel):
    id: str
    patient_id: str
    record_type: ClinicalRecordType
    data: dict
    source: str
    created_at: datetime
    record_hash: str | None
    ledger_tx_id: str | None

    model_config = ConfigDict(from_attributes=True)


# --- Diagnostic -------------------------------------------------------------
class DiagnosticRecordCreate(BaseModel):
    kind: DiagnosticKind
    summary: str
    result_data: dict | None = None


class DiagnosticRecordOut(BaseModel):
    id: str
    patient_id: str
    kind: DiagnosticKind
    summary: str
    result_data: dict | None
    created_at: datetime
    record_hash: str | None
    ledger_tx_id: str | None

    model_config = ConfigDict(from_attributes=True)


class PrescriptionCreate(BaseModel):
    medication: str
    dosage: str
    instructions: str | None = None


class PrescriptionOut(BaseModel):
    id: str
    patient_id: str
    medication: str
    dosage: str
    instructions: str | None
    created_at: datetime
    record_hash: str | None
    ledger_tx_id: str | None

    model_config = ConfigDict(from_attributes=True)


# --- Access control -------------------------------------------------------
class AccessGrantCreate(BaseModel):
    grantee_user_id: str
    scope: AccessScope


class AccessGrantOut(BaseModel):
    id: str
    patient_id: str
    grantee_user_id: str
    scope: AccessScope
    granted_at: datetime
    revoked_at: datetime | None
    ledger_tx_id: str | None

    model_config = ConfigDict(from_attributes=True)


# --- Ledger status ----------------------------------------------------------
class LedgerStatusOut(BaseModel):
    ledger_mode: str
    simulated: bool
    enforces_access_onchain: bool

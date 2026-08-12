import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    Boolean,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Role(str, enum.Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    LAB_SCIENTIST = "lab_scientist"
    PATIENT = "patient"


# ---------------------------------------------------------------------------
# Administrative / Operational data
# ---------------------------------------------------------------------------
class User(Base):
    """Identity + login for anyone who can act in the system (staff or patient)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    full_name: Mapped[str] = mapped_column(String)
    role: Mapped[Role] = mapped_column(Enum(Role))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient_profile: Mapped["Patient | None"] = relationship(back_populates="user", uselist=False)


class Patient(Base):
    """Administrative identity record for a patient (separate from clinical data)."""

    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_code: Mapped[str] = mapped_column(String, unique=True, index=True)  # public-safe ID
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    full_name: Mapped[str] = mapped_column(String)
    date_of_birth: Mapped[str] = mapped_column(String)  # ISO date
    gender: Mapped[str] = mapped_column(String)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String, nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    user: Mapped["User | None"] = relationship(back_populates="patient_profile")
    clinical_records: Mapped[list["ClinicalRecord"]] = relationship(back_populates="patient")
    diagnostic_records: Mapped[list["DiagnosticRecord"]] = relationship(back_populates="patient")
    prescriptions: Mapped[list["Prescription"]] = relationship(back_populates="patient")
    access_grants: Mapped[list["AccessGrant"]] = relationship(back_populates="patient")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="patient")


class AccessScope(str, enum.Enum):
    CLINICAL = "clinical"
    DIAGNOSTIC = "diagnostic"
    ADMINISTRATIVE = "administrative"
    ALL = "all"


class AccessGrant(Base):
    """Who (grantee) may access which scope of a patient's data, and why.

    In HCS mode this row IS the source of truth; it's just also logged
    on-chain for audit. In smart_contract mode this row is a local mirror
    of what the on-chain AccessControl contract says — the contract is
    the source of truth, this table is a fast-read cache.
    """

    __tablename__ = "access_grants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    grantee_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    granted_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    scope: Mapped[AccessScope] = mapped_column(Enum(AccessScope))

    granted_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    ledger_tx_id: Mapped[str | None] = mapped_column(String, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="access_grants")

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    reason: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)

    patient: Mapped["Patient"] = relationship(back_populates="appointments")


# ---------------------------------------------------------------------------
# Clinical data
# ---------------------------------------------------------------------------
class ClinicalRecordType(str, enum.Enum):
    VITALS = "vitals"
    BIOMETRICS = "biometrics"
    HISTORY = "history"
    ALLERGY = "allergy"


class ClinicalRecord(Base):
    __tablename__ = "clinical_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    recorded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    record_type: Mapped[ClinicalRecordType] = mapped_column(Enum(ClinicalRecordType))
    data: Mapped[dict] = mapped_column(JSON)  # e.g. {"systolic":120,"diastolic":80,"heart_rate":72,...}
    source: Mapped[str] = mapped_column(String, default="manual")  # "manual" | "iot_simulator"
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    record_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    ledger_tx_id: Mapped[str | None] = mapped_column(String, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="clinical_records")


# ---------------------------------------------------------------------------
# Diagnostic data
# ---------------------------------------------------------------------------
class DiagnosticKind(str, enum.Enum):
    BLOOD_SAMPLE = "blood_sample"
    CELL_SAMPLE = "cell_sample"
    SCAN = "scan"
    OTHER = "other"


class DiagnosticRecord(Base):
    __tablename__ = "diagnostic_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    ordered_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    kind: Mapped[DiagnosticKind] = mapped_column(Enum(DiagnosticKind))
    summary: Mapped[str] = mapped_column(Text)
    result_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    record_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    ledger_tx_id: Mapped[str | None] = mapped_column(String, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="diagnostic_records")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id"))
    prescribed_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    medication: Mapped[str] = mapped_column(String)
    dosage: Mapped[str] = mapped_column(String)
    instructions: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    record_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    ledger_tx_id: Mapped[str | None] = mapped_column(String, nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="prescriptions")


# ---------------------------------------------------------------------------
# Ledger bookkeeping (mirrors what's on Hedera so we can query fast)
# ---------------------------------------------------------------------------
class LedgerAnchor(Base):
    """One row per thing we anchored to Hedera: a record hash, an access
    grant/revoke event, or an access-view event."""

    __tablename__ = "ledger_anchors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    resource_type: Mapped[str] = mapped_column(String)  # "clinical_record" | "diagnostic_record" | ...
    resource_id: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)  # "CREATE" | "GRANT" | "REVOKE" | "VIEW"
    payload_hash: Mapped[str] = mapped_column(String)
    ledger_mode: Mapped[str] = mapped_column(String)  # "hcs" | "smart_contract"
    topic_id: Mapped[str | None] = mapped_column(String, nullable=True)
    sequence_number: Mapped[int | None] = mapped_column(nullable=True)
    consensus_timestamp: Mapped[str | None] = mapped_column(String, nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String, nullable=True)
    simulated: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

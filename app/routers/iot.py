from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.config import Settings, get_settings
from app.database import get_db
from app.deps import get_access_service
from app.iot_simulator import create_and_anchor_vitals, iot_manager
from app.models import AccessScope, Patient, Role, User
from app.schemas import ClinicalRecordOut
from app.security import get_current_user
from app.services.access_service import AccessService

router = APIRouter(prefix="/patients/{patient_id}/iot", tags=["iot"])

class IoTSettingsUpdate(BaseModel):
    hr_base: int
    sys_base: int
    dia_base: int
    spo2_base: int


def _require_clinical_write(db: Session, patient_id: str, current_user: User, access: AccessService) -> None:
    if not db.get(Patient, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")
    if current_user.role not in (Role.ADMIN, Role.DOCTOR, Role.NURSE):
        raise HTTPException(status_code=403, detail="Only clinical staff can operate simulated devices")
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.CLINICAL):
        raise HTTPException(status_code=403, detail="No clinical access for this patient")


@router.post("/reading", response_model=ClinicalRecordOut)
def trigger_reading(
    patient_id: str,
    force_alert: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    """Simulate one device reading right now (good for demos/tests instead
    of waiting for the background interval)."""
    _require_clinical_write(db, patient_id, current_user, access)
    return create_and_anchor_vitals(patient_id, force_alert=force_alert)

class IngestPayload(BaseModel):
    payload: dict
    signature: str

@router.post("/ingest", response_model=ClinicalRecordOut)
def ingest_external_reading(
    patient_id: str,
    data: IngestPayload,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Ingest a reading from a real external IoT hardware device via webhook.
    Requires a valid HMAC SHA-256 signature to prevent spoofing. No user auth required."""
    import hmac
    import hashlib
    import json
    from app.iot_simulator import DEVICE_SECRET_KEY
    from app.models import ClinicalRecord, ClinicalRecordType
    from app.services.record_service import RecordService
    from app.ledger.factory import get_ledger_service

    if not db.get(Patient, patient_id):
        raise HTTPException(status_code=404, detail="Patient not found")

    payload_str = json.dumps(data.payload, sort_keys=True).encode('utf-8')
    expected_signature = hmac.new(DEVICE_SECRET_KEY, payload_str, hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(expected_signature, data.signature):
        raise HTTPException(status_code=401, detail="Invalid IoT Device Signature! Spoofing detected.")

    reading = data.payload
    row = ClinicalRecord(
        patient_id=patient_id,
        record_type=ClinicalRecordType.VITALS,
        data=reading,
        source="external_iot_device",
    )
    db.add(row)
    db.flush()

    # Anchor to Hedera if alert
    if reading.get("is_alert", False):
        ledger = get_ledger_service()
        record_service = RecordService(db, ledger, settings.LEDGER_MODE.value)
        record_hash, tx_id = record_service.anchor(
            resource_type="clinical_record", resource_id=row.id, payload={"record_type": "vitals", "data": reading}
        )
        row.record_hash = record_hash
        row.ledger_tx_id = tx_id

    db.commit()
    db.refresh(row)
    return row


@router.post("/start")
async def start_continuous(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
    settings: Settings = Depends(get_settings),
):
    _require_clinical_write(db, patient_id, current_user, access)
    iot_manager.start(patient_id, settings.IOT_SIMULATION_INTERVAL_SECONDS)
    return {"status": "started", "interval_seconds": settings.IOT_SIMULATION_INTERVAL_SECONDS}


@router.post("/stop")
async def stop_continuous(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _require_clinical_write(db, patient_id, current_user, access)
    stopped = iot_manager.stop(patient_id)
    return {"status": "stopped" if stopped else "was not running"}


@router.post("/settings")
async def update_simulation_settings(
    patient_id: str,
    payload: IoTSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    """Update the targets (BPM, BP) for an actively running simulator."""
    _require_clinical_write(db, patient_id, current_user, access)
        
    iot_manager.update_settings(
        patient_id,
        hr_base=payload.hr_base,
        sys_base=payload.sys_base,
        dia_base=payload.dia_base,
        spo2_base=payload.spo2_base
    )
    return {"status": "settings_updated", "settings": payload.dict()}

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

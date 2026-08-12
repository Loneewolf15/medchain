from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service, get_record_service
from app.models import AccessScope, ClinicalRecord, Patient, User
from app.schemas import ClinicalRecordCreate, ClinicalRecordOut
from app.security import get_current_user
from app.services.access_service import AccessService
from app.services.record_service import RecordService

router = APIRouter(prefix="/patients/{patient_id}/clinical-records", tags=["clinical"])


def _get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("", response_model=ClinicalRecordOut, status_code=status.HTTP_201_CREATED)
def create_clinical_record(
    patient_id: str,
    payload: ClinicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
    records: RecordService = Depends(get_record_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.CLINICAL):
        raise HTTPException(status_code=403, detail="No clinical access for this patient")

    row = ClinicalRecord(
        patient_id=patient_id,
        recorded_by_user_id=current_user.id,
        record_type=payload.record_type,
        data=payload.data,
        source=payload.source,
    )
    db.add(row)
    db.flush()  # assigns row.id without committing yet

    record_hash, tx_id = records.anchor(
        resource_type="clinical_record",
        resource_id=row.id,
        payload={"record_type": payload.record_type.value, "data": payload.data},
    )
    row.record_hash = record_hash
    row.ledger_tx_id = tx_id

    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=list[ClinicalRecordOut])
def list_clinical_records(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.CLINICAL):
        raise HTTPException(status_code=403, detail="No clinical access for this patient")

    rows = db.query(ClinicalRecord).filter(ClinicalRecord.patient_id == patient_id).all()
    access.log_view(
        patient_id=patient_id, resource_type="clinical_record", resource_id="list", viewer=current_user
    )
    return rows

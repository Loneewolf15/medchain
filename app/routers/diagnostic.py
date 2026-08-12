from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service, get_record_service
from app.models import AccessScope, DiagnosticRecord, Patient, Prescription, User
from app.schemas import (
    DiagnosticRecordCreate,
    DiagnosticRecordOut,
    PrescriptionCreate,
    PrescriptionOut,
)
from app.security import get_current_user
from app.services.access_service import AccessService
from app.services.record_service import RecordService

router = APIRouter(prefix="/patients/{patient_id}", tags=["diagnostic"])


def _get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post(
    "/diagnostic-records", response_model=DiagnosticRecordOut, status_code=status.HTTP_201_CREATED
)
def create_diagnostic_record(
    patient_id: str,
    payload: DiagnosticRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
    records: RecordService = Depends(get_record_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.DIAGNOSTIC):
        raise HTTPException(status_code=403, detail="No diagnostic access for this patient")

    row = DiagnosticRecord(
        patient_id=patient_id,
        ordered_by_user_id=current_user.id,
        kind=payload.kind,
        summary=payload.summary,
        result_data=payload.result_data,
    )
    db.add(row)
    db.flush()

    record_hash, tx_id = records.anchor(
        resource_type="diagnostic_record",
        resource_id=row.id,
        payload={"kind": payload.kind.value, "summary": payload.summary, "result_data": payload.result_data},
    )
    row.record_hash = record_hash
    row.ledger_tx_id = tx_id

    db.commit()
    db.refresh(row)
    return row


@router.get("/diagnostic-records", response_model=list[DiagnosticRecordOut])
def list_diagnostic_records(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.DIAGNOSTIC):
        raise HTTPException(status_code=403, detail="No diagnostic access for this patient")

    rows = db.query(DiagnosticRecord).filter(DiagnosticRecord.patient_id == patient_id).all()
    access.log_view(
        patient_id=patient_id, resource_type="diagnostic_record", resource_id="list", viewer=current_user
    )
    return rows


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(
    patient_id: str,
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
    records: RecordService = Depends(get_record_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.DIAGNOSTIC):
        raise HTTPException(status_code=403, detail="No diagnostic access for this patient")

    row = Prescription(
        patient_id=patient_id,
        prescribed_by_user_id=current_user.id,
        medication=payload.medication,
        dosage=payload.dosage,
        instructions=payload.instructions,
    )
    db.add(row)
    db.flush()

    record_hash, tx_id = records.anchor(
        resource_type="prescription",
        resource_id=row.id,
        payload={"medication": payload.medication, "dosage": payload.dosage, "instructions": payload.instructions},
    )
    row.record_hash = record_hash
    row.ledger_tx_id = tx_id

    db.commit()
    db.refresh(row)
    return row


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)
    if not access.is_authorized(patient_id=patient_id, user=current_user, scope=AccessScope.DIAGNOSTIC):
        raise HTTPException(status_code=403, detail="No diagnostic access for this patient")
    return db.query(Prescription).filter(Prescription.patient_id == patient_id).all()

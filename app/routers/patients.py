import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service
from app.models import AccessScope, Patient, Role, User
from app.schemas import PatientCreate, PatientOut
from app.security import get_current_user
from app.services.access_service import AccessService

router = APIRouter(prefix="/patients", tags=["patients"])


def _require_staff(user: User) -> None:
    if user.role not in (Role.ADMIN, Role.DOCTOR, Role.NURSE):
        raise HTTPException(status_code=403, detail="Staff only")


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _require_staff(current_user)
    patient = Patient(
        patient_code=f"PT-{uuid.uuid4().hex[:8].upper()}",
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        gender=payload.gender,
        address=payload.address,
        emergency_contact=payload.emergency_contact,
        blood_type=payload.blood_type,
        user_id=payload.user_id,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Whoever admits the patient becomes the default full-access holder
    # (the "attending"), and is free to grant/revoke others from there.
    # Admins skip this — they already pass every access check unconditionally.
    if current_user.role != Role.ADMIN:
        access.grant(
            patient_id=patient.id,
            grantee_user_id=current_user.id,
            granted_by=current_user,
            scope=AccessScope.ALL,
        )

    return patient


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if not access.has_any_grant(patient_id=patient_id, user=current_user):
        raise HTTPException(status_code=403, detail="Not authorized to view this patient")

    return patient


@router.get("", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _require_staff(current_user)
    return db.query(Patient).all()

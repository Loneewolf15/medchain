from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service
from app.models import Appointment, Patient, Role, User
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.security import get_current_user
from app.services.access_service import AccessService

router = APIRouter(prefix="/patients/{patient_id}/appointments", tags=["appointments"])


def _get_patient_or_404(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


def _require_staff_or_admin(user: User):
    if user.role not in (Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.LAB_SCIENTIST):
        raise HTTPException(status_code=403, detail="Staff only")


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    patient_id: str,
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Only administrative staff can schedule appointments")

    if not access.has_any_grant(patient_id=patient_id, user=current_user):
        raise HTTPException(status_code=403, detail="Not authorized for this patient")

    row = Appointment(
        patient_id=patient_id,
        doctor_id=payload.doctor_id,
        scheduled_at=payload.scheduled_at,
        reason=payload.reason,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    access.log_view(
        patient_id=patient_id,
        resource_type="appointment",
        resource_id=row.id,
        viewer=current_user,
    )

    return row


@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)

    if not access.has_any_grant(patient_id=patient_id, user=current_user):
        raise HTTPException(status_code=403, detail="Not authorized for this patient")

    rows = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
    
    access.log_view(
        patient_id=patient_id,
        resource_type="appointment",
        resource_id="list",
        viewer=current_user,
    )

    return rows


@router.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(
    patient_id: str,
    appointment_id: str,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    _get_patient_or_404(db, patient_id)
    
    if not access.has_any_grant(patient_id=patient_id, user=current_user):
        raise HTTPException(status_code=403, detail="Not authorized for this patient")
    
    row = db.get(Appointment, appointment_id)
    if not row or row.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Only admin or the doctor assigned to the appointment can update it
    if current_user.role != Role.ADMIN and current_user.id != row.doctor_id:
        raise HTTPException(status_code=403, detail="Only assigned doctor or admin can update appointment status")

    row.status = payload.status
    db.commit()
    db.refresh(row)

    access.log_view(
        patient_id=patient_id,
        resource_type="appointment",
        resource_id=row.id,
        viewer=current_user,
    )

    return row

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service
from app.models import Appointment, Patient, Role, User, AppointmentStatus
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
    # Enforce constraints based on role
    status_to_set = AppointmentStatus.REQUESTED
    final_doctor_id = payload.doctor_id
    final_scheduled_at = payload.scheduled_at

    if current_user.role == Role.PATIENT:
        # Patients always create REQUESTED appointments
        status_to_set = AppointmentStatus.REQUESTED

    elif current_user.role == Role.DOCTOR:
        final_doctor_id = current_user.id
        if not final_scheduled_at:
             raise HTTPException(status_code=400, detail="Doctors must specify a scheduled time")
        status_to_set = AppointmentStatus.SCHEDULED

    elif current_user.role in (Role.ADMIN, Role.SECRETARY):
        # Admins and secretaries can schedule completely or leave requested
        if final_doctor_id and final_scheduled_at:
            status_to_set = AppointmentStatus.SCHEDULED
        else:
            status_to_set = AppointmentStatus.REQUESTED
    else:
        raise HTTPException(status_code=403, detail="Role not authorized to create appointments")

    if current_user.role != Role.PATIENT and not access.has_any_grant(patient_id=patient_id, user=current_user):
        raise HTTPException(status_code=403, detail="Not authorized for this patient")

    row = Appointment(
        patient_id=patient_id,
        doctor_id=final_doctor_id,
        scheduled_at=final_scheduled_at,
        reason=payload.reason,
        status=status_to_set,
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

    # Only admin, secretary, or the assigned doctor can update
    if current_user.role not in (Role.ADMIN, Role.SECRETARY) and current_user.id != row.doctor_id:
        raise HTTPException(status_code=403, detail="Only assigned doctor or admin/secretary can update appointment status")

    # If transitioning from REQUESTED to SCHEDULED, ensure doctor_id and scheduled_at are provided
    if row.status == AppointmentStatus.REQUESTED and payload.status == AppointmentStatus.SCHEDULED:
        if current_user.role not in (Role.ADMIN, Role.SECRETARY):
             raise HTTPException(status_code=403, detail="Only admin or secretary can confirm requested appointments")
        if not payload.doctor_id or not payload.scheduled_at:
             raise HTTPException(status_code=400, detail="Must provide doctor_id and scheduled_at to schedule an appointment")
        row.doctor_id = payload.doctor_id
        row.scheduled_at = payload.scheduled_at

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

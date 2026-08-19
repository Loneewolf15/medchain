from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appointment, Patient, Role, User, AccessGrant
from app.schemas import AppointmentOut, PatientOut
from app.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/appointments/me", response_model=list[AppointmentOut])
def get_my_appointments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns upcoming appointments for the logged-in user."""
    if current_user.role == Role.PATIENT:
        # Find the patient record linked to this user
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.scheduled_at.asc()).all()
    elif current_user.role in (Role.DOCTOR, Role.NURSE, Role.LAB_SCIENTIST):
        return db.query(Appointment).filter(Appointment.doctor_id == current_user.id).order_by(Appointment.scheduled_at.asc()).all()
    else:
        # Admin or Secretary see all appointments
        return db.query(Appointment).order_by(Appointment.scheduled_at.asc()).all()

@router.get("/patients/assigned", response_model=list[PatientOut])
def get_assigned_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns patients that the current user has explicit access to."""
    if current_user.role == Role.ADMIN:
        return db.query(Patient).all()
    
    # Get patient IDs from AccessGrants where revoked_at is None
    grants = db.query(AccessGrant.patient_id).filter(
        AccessGrant.grantee_user_id == current_user.id,
        AccessGrant.revoked_at.is_(None)
    ).all()
    patient_ids = [g[0] for g in grants]
    
    if not patient_ids:
        return []
    
    return db.query(Patient).filter(Patient.id.in_(patient_ids)).all()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Global system stats."""
    if current_user.role not in (Role.ADMIN, Role.SECRETARY):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "total_patients": db.query(Patient).count(),
        "total_users": db.query(User).count(),
        "total_appointments": db.query(Appointment).count(),
        "active_appointments": db.query(Appointment).filter(Appointment.status.in_(["REQUESTED", "SCHEDULED"])).count()
    }

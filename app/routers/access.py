from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_access_service
from app.models import AccessGrant, Patient, Role, User
from app.schemas import AccessGrantCreate, AccessGrantOut
from app.security import get_current_user
from app.services.access_service import AccessService

router = APIRouter(prefix="/patients/{patient_id}/access", tags=["access"])


@router.post("", response_model=AccessGrantOut, status_code=status.HTTP_201_CREATED)
def grant_access(
    patient_id: str,
    payload: AccessGrantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Only the patient themself, or an admin/doctor already on the case, can grant.
    is_patient_owner = patient.user_id == current_user.id
    if not (is_patient_owner or current_user.role in (Role.ADMIN, Role.DOCTOR)):
        raise HTTPException(status_code=403, detail="Not allowed to grant access for this patient")

    return access.grant(
        patient_id=patient_id,
        grantee_user_id=payload.grantee_user_id,
        granted_by=current_user,
        scope=payload.scope,
    )


@router.delete("/{grant_id}", response_model=AccessGrantOut)
def revoke_access(
    patient_id: str,
    grant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    access: AccessService = Depends(get_access_service),
):
    grant = db.get(AccessGrant, grant_id)
    if not grant or grant.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Grant not found")

    patient = db.get(Patient, patient_id)
    is_patient_owner = patient and patient.user_id == current_user.id
    is_original_granter = grant.granted_by_user_id == current_user.id
    if not (is_patient_owner or is_original_granter or current_user.role in (Role.ADMIN, Role.DOCTOR)):
        raise HTTPException(status_code=403, detail="Not allowed to revoke this grant")

    return access.revoke(grant, current_user)


@router.get("", response_model=list[AccessGrantOut])
def list_access(
    patient_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return db.query(AccessGrant).filter(AccessGrant.patient_id == patient_id).all()

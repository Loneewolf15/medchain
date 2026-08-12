from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ledger.base import LedgerService
from app.models import AccessGrant, AccessScope, Role, User


class AccessService:
    """Grants/revokes/checks access to a patient's data.

    - In HCS mode: the AccessGrant table in Postgres/SQLite IS the source
      of truth. Every grant/revoke is also written to the HCS audit topic
      (via ledger.record_event) so there's an immutable log of who changed
      access and when, even though enforcement itself is off-chain.
    - In smart_contract mode: the deployed AccessControl.sol contract is
      the source of truth (ledger.grant_access_onchain / check_access_onchain).
      The local AccessGrant row is kept in sync as a fast-read cache, but
      is_authorized() always defers to the contract when this mode is active.
    """

    def __init__(self, db: Session, ledger: LedgerService):
        self.db = db
        self.ledger = ledger

    def grant(self, *, patient_id: str, grantee_user_id: str, granted_by: User, scope: AccessScope) -> AccessGrant:
        row = AccessGrant(
            patient_id=patient_id,
            grantee_user_id=grantee_user_id,
            granted_by_user_id=granted_by.id,
            scope=scope,
        )

        if self.ledger.enforces_access_onchain:
            receipt = self.ledger.grant_access_onchain(
                patient_id=patient_id, grantee_id=grantee_user_id, scope=scope.value
            )
            row.ledger_tx_id = receipt.transaction_id if receipt else None
        else:
            receipt = self.ledger.record_event(
                resource_type="access_grant",
                resource_id=row.id,
                action="GRANT",
                payload_hash=f"{patient_id}:{grantee_user_id}:{scope.value}",
            )
            row.ledger_tx_id = receipt.transaction_id

        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return row

    def revoke(self, grant: AccessGrant, revoked_by: User) -> AccessGrant:
        grant.revoked_at = datetime.now(timezone.utc)

        if self.ledger.enforces_access_onchain:
            self.ledger.revoke_access_onchain(
                patient_id=grant.patient_id,
                grantee_id=grant.grantee_user_id,
                scope=grant.scope.value,
            )
        else:
            self.ledger.record_event(
                resource_type="access_grant",
                resource_id=grant.id,
                action="REVOKE",
                payload_hash=f"{grant.patient_id}:{grant.grantee_user_id}:{grant.scope.value}",
            )

        self.db.commit()
        self.db.refresh(grant)
        return grant

    def is_authorized(self, *, patient_id: str, user: User, scope: AccessScope) -> bool:
        # Admins and the patient themself (viewing their own record) always pass.
        if user.role == Role.ADMIN:
            return True

        from app.models import Patient  # local import avoids circular import

        patient = self.db.get(Patient, patient_id)
        if patient and patient.user_id == user.id:
            return True

        if self.ledger.enforces_access_onchain:
            onchain = self.ledger.check_access_onchain(
                patient_id=patient_id, grantee_id=user.id, scope=scope.value
            )
            return bool(onchain)

        # HCS mode: check the DB directly.
        grants = (
            self.db.query(AccessGrant)
            .filter(
                AccessGrant.patient_id == patient_id,
                AccessGrant.grantee_user_id == user.id,
                AccessGrant.revoked_at.is_(None),
            )
            .all()
        )
        return any(g.scope == scope or g.scope == AccessScope.ALL for g in grants)

    def log_view(self, *, patient_id: str, resource_type: str, resource_id: str, viewer: User) -> None:
        """Every read of clinical/diagnostic data gets an audit entry too,
        in both ledger modes — this is what makes 'who looked at my
        record' auditable regardless of which mode is active."""
        self.ledger.record_event(
            resource_type=resource_type,
            resource_id=resource_id,
            action="VIEW",
            payload_hash=f"{patient_id}:{viewer.id}",
        )

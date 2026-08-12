from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.ledger.base import LedgerService
from app.ledger.hashing import canonical_hash
from app.models import LedgerAnchor


class RecordService:
    """Shared 'write it off-chain, hash it, anchor the hash on-chain'
    logic for clinical records, diagnostic records, and prescriptions.
    Keeps every router thin and consistent."""

    def __init__(self, db: Session, ledger: LedgerService, ledger_mode: str):
        self.db = db
        self.ledger = ledger
        self.ledger_mode = ledger_mode

    def anchor(self, *, resource_type: str, resource_id: str, payload: dict[str, Any]) -> tuple[str, str]:
        """Hash `payload`, submit the hash to the ledger, persist a
        LedgerAnchor row, and return (hash, transaction_id)."""
        record_hash = canonical_hash(payload)
        receipt = self.ledger.record_event(
            resource_type=resource_type,
            resource_id=resource_id,
            action="CREATE",
            payload_hash=record_hash,
        )

        anchor = LedgerAnchor(
            resource_type=resource_type,
            resource_id=resource_id,
            action="CREATE",
            payload_hash=record_hash,
            ledger_mode=self.ledger_mode,
            topic_id=receipt.topic_id,
            sequence_number=receipt.sequence_number,
            consensus_timestamp=receipt.consensus_timestamp,
            transaction_id=receipt.transaction_id,
            simulated=receipt.simulated,
        )
        self.db.add(anchor)
        self.db.commit()

        return record_hash, receipt.transaction_id

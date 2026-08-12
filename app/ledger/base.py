from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AnchorReceipt:
    """What we get back after writing something to Hedera (real or simulated)."""

    transaction_id: str
    topic_id: str | None = None
    sequence_number: int | None = None
    consensus_timestamp: str | None = None
    contract_id: str | None = None
    simulated: bool = True


class LedgerService(ABC):
    """Everything the rest of the app needs from 'the blockchain'.

    Two implementations exist (HcsLedgerService, SmartContractLedgerService).
    Both are picked up by app.ledger.factory.get_ledger_service() based on
    settings.LEDGER_MODE, so routers/services never import a concrete class
    directly — only this interface.
    """

    # -- audit trail, used in BOTH modes -----------------------------------
    @abstractmethod
    def record_event(
        self,
        *,
        resource_type: str,
        resource_id: str,
        action: str,
        payload_hash: str,
    ) -> AnchorReceipt:
        """Anchor a hash + action to Hedera Consensus Service as an
        immutable, timestamped audit entry. Used for record creation,
        access grants/revokes, and access views alike."""
        raise NotImplementedError

    # -- on-chain access control, ONLY meaningful in smart_contract mode ---
    @property
    @abstractmethod
    def enforces_access_onchain(self) -> bool:
        """True only for the smart-contract-backed implementation."""
        raise NotImplementedError

    def grant_access_onchain(
        self, *, patient_id: str, grantee_id: str, scope: str
    ) -> AnchorReceipt | None:
        """Default no-op for modes that don't enforce access on-chain
        (access is decided in Postgres/SQLite instead, see AccessService)."""
        return None

    def revoke_access_onchain(
        self, *, patient_id: str, grantee_id: str, scope: str
    ) -> AnchorReceipt | None:
        return None

    def check_access_onchain(
        self, *, patient_id: str, grantee_id: str, scope: str
    ) -> bool | None:
        """Return None to mean 'not applicable, ask the DB instead'."""
        return None

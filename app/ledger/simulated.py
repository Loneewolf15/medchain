"""
Drop-in stand-ins for the real Hedera-backed services.

Used whenever settings.LEDGER_SIMULATE=True (the default). They mimic the
shape of real Hedera responses (transaction ids, sequence numbers,
consensus timestamps) closely enough that swapping LEDGER_SIMULATE to
False later is a one-line change with no code changes elsewhere.
"""
from __future__ import annotations

import itertools
import time
import uuid

from app.ledger.base import AnchorReceipt, LedgerService


def _fake_tx_id() -> str:
    # Mimics Hedera's "0.0.1234@1699999999.123456789" transaction id shape
    return f"0.0.{uuid.uuid4().int % 100000}@{time.time():.9f}"


class SimulatedHcsLedgerService(LedgerService):
    """Behaves like HCS-only mode: audit trail is 'anchored', access control
    decisions are NOT handled here (see AccessService, which uses the DB)."""

    def __init__(self) -> None:
        self._seq = itertools.count(start=1)
        self.topic_id = "0.0.SIMULATED_RECORD_TOPIC"
        self.log: list[dict] = []

    @property
    def enforces_access_onchain(self) -> bool:
        return False

    def record_event(self, *, resource_type, resource_id, action, payload_hash) -> AnchorReceipt:
        seq = next(self._seq)
        receipt = AnchorReceipt(
            transaction_id=_fake_tx_id(),
            topic_id=self.topic_id,
            sequence_number=seq,
            consensus_timestamp=f"{time.time():.9f}",
            simulated=True,
        )
        self.log.append(
            {
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action,
                "payload_hash": payload_hash,
                "receipt": receipt,
            }
        )
        return receipt


class SimulatedSmartContractLedgerService(SimulatedHcsLedgerService):
    """Behaves like smart_contract mode: audit trail via (simulated) HCS,
    PLUS an in-memory stand-in for the on-chain AccessControl contract."""

    def __init__(self) -> None:
        super().__init__()
        self.contract_id = "0.0.SIMULATED_ACCESS_CONTRACT"
        # (patient_id, grantee_id, scope) -> bool
        self._access_state: dict[tuple[str, str, str], bool] = {}

    @property
    def enforces_access_onchain(self) -> bool:
        return True

    def grant_access_onchain(self, *, patient_id, grantee_id, scope) -> AnchorReceipt:
        self._access_state[(patient_id, grantee_id, scope)] = True
        return AnchorReceipt(
            transaction_id=_fake_tx_id(),
            contract_id=self.contract_id,
            simulated=True,
        )

    def revoke_access_onchain(self, *, patient_id, grantee_id, scope) -> AnchorReceipt:
        self._access_state[(patient_id, grantee_id, scope)] = False
        return AnchorReceipt(
            transaction_id=_fake_tx_id(),
            contract_id=self.contract_id,
            simulated=True,
        )

    def check_access_onchain(self, *, patient_id, grantee_id, scope) -> bool:
        if self._access_state.get((patient_id, grantee_id, "all")):
            return True
        return bool(self._access_state.get((patient_id, grantee_id, scope), False))

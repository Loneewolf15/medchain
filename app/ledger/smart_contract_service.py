from __future__ import annotations

import logging

from hiero_sdk_python import (
    ContractCallQuery,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId,
)

from app.config import Settings
from app.ledger.base import AnchorReceipt
from app.ledger.hcs_service import HcsLedgerService

logger = logging.getLogger(__name__)

DEFAULT_GAS = 300_000


class SmartContractLedgerService(HcsLedgerService):
    """HCS for the audit trail (inherited) + HSCS AccessControl.sol for
    on-chain-enforced access decisions.

    Requires settings.HEDERA_ACCESS_CONTRACT_ID to already point at a
    deployed AccessControl contract — see scripts/bootstrap_hedera.py to
    compile + deploy it and print the ID to paste into your .env.
    """

    def __init__(self, settings: Settings, client=None):
        super().__init__(settings, client)
        if not settings.HEDERA_ACCESS_CONTRACT_ID:
            raise RuntimeError(
                "LEDGER_MODE=smart_contract requires HEDERA_ACCESS_CONTRACT_ID. "
                "Run `python scripts/bootstrap_hedera.py` to compile+deploy "
                "AccessControl.sol and print the contract id to add to your .env."
            )
        self.contract_id = ContractId.from_string(settings.HEDERA_ACCESS_CONTRACT_ID)

    @property
    def enforces_access_onchain(self) -> bool:
        return True

    def grant_access_onchain(self, *, patient_id: str, grantee_id: str, scope: str) -> AnchorReceipt:
        params = (
            ContractFunctionParameters()
            .add_string(patient_id)
            .add_string(grantee_id)
            .add_string(scope)
        )
        tx = (
            ContractExecuteTransaction(contract_id=self.contract_id, gas=DEFAULT_GAS)
            .set_function("grantAccess", params)
            .freeze_with(self.client)
            .execute(self.client)
        )
        return AnchorReceipt(
            transaction_id=str(getattr(tx, "transaction_id", "")),
            contract_id=str(self.contract_id),
            simulated=False,
        )

    def revoke_access_onchain(self, *, patient_id: str, grantee_id: str, scope: str) -> AnchorReceipt:
        params = (
            ContractFunctionParameters()
            .add_string(patient_id)
            .add_string(grantee_id)
            .add_string(scope)
        )
        tx = (
            ContractExecuteTransaction(contract_id=self.contract_id, gas=DEFAULT_GAS)
            .set_function("revokeAccess", params)
            .freeze_with(self.client)
            .execute(self.client)
        )
        return AnchorReceipt(
            transaction_id=str(getattr(tx, "transaction_id", "")),
            contract_id=str(self.contract_id),
            simulated=False,
        )

    def check_access_onchain(self, *, patient_id: str, grantee_id: str, scope: str) -> bool:
        params = (
            ContractFunctionParameters()
            .add_string(patient_id)
            .add_string(grantee_id)
            .add_string(scope)
        )
        result = (
            ContractCallQuery(contract_id=self.contract_id, gas=DEFAULT_GAS)
            .set_function("hasAccess", params)
            .execute(self.client)
        )
        return bool(result.get_bool(0))

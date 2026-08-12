from app.config import Settings
from app.ledger.factory import _build
from app.ledger.simulated import SimulatedHcsLedgerService, SimulatedSmartContractLedgerService


def test_hcs_mode_returns_hcs_backend():
    settings = Settings(LEDGER_MODE="hcs", LEDGER_SIMULATE=True)
    service = _build(settings)
    assert isinstance(service, SimulatedHcsLedgerService)
    assert not isinstance(service, SimulatedSmartContractLedgerService)
    assert service.enforces_access_onchain is False


def test_smart_contract_mode_returns_smart_contract_backend():
    settings = Settings(LEDGER_MODE="smart_contract", LEDGER_SIMULATE=True)
    service = _build(settings)
    assert isinstance(service, SimulatedSmartContractLedgerService)
    assert service.enforces_access_onchain is True


def test_real_backends_are_not_imported_when_simulate_is_true():
    """Guards against accidentally requiring Hedera credentials just to
    run in simulate mode — the real hiero_sdk_python-backed classes must
    only be imported lazily, inside the non-simulate branch."""
    settings = Settings(LEDGER_MODE="smart_contract", LEDGER_SIMULATE=True)
    # No HEDERA_* env vars are set anywhere in this test run. If _build()
    # eagerly imported/constructed the real Hedera-backed classes, this
    # would raise. It shouldn't, because simulate mode must never require
    # real credentials.
    service = _build(settings)
    assert service is not None

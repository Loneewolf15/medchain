from app.config import LedgerMode, Settings, get_settings
from app.ledger.base import LedgerService
from app.ledger.simulated import SimulatedHcsLedgerService, SimulatedSmartContractLedgerService


def get_ledger_service() -> LedgerService:
    """Single place that decides which ledger backend the whole app uses.

    Controlled entirely by two env vars:
      LEDGER_MODE      = hcs | smart_contract
      LEDGER_SIMULATE  = true | false

    Everything else (routers, services) depends only on the LedgerService
    interface, so flipping either flag never requires touching business
    logic — just restart the app (or, in tests, clear this cache).
    """
    settings = get_settings()
    return _build(settings)


def _build(settings: Settings) -> LedgerService:
    if settings.LEDGER_SIMULATE:
        if settings.LEDGER_MODE == LedgerMode.SMART_CONTRACT:
            return SimulatedSmartContractLedgerService()
        return SimulatedHcsLedgerService()

    # Real Hedera testnet/mainnet calls — imported lazily so the SDK/network
    # aren't required at all for LEDGER_SIMULATE=True (e.g. in CI).
    if settings.LEDGER_MODE == LedgerMode.SMART_CONTRACT:
        from app.ledger.smart_contract_service import SmartContractLedgerService

        return SmartContractLedgerService(settings)

    from app.ledger.hcs_service import HcsLedgerService

    return HcsLedgerService(settings)

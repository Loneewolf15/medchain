from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.deps import get_ledger
from app.ledger.base import LedgerService
from app.schemas import LedgerStatusOut

router = APIRouter(prefix="/ledger", tags=["ledger"])


@router.get("/status", response_model=LedgerStatusOut)
def ledger_status(
    ledger: LedgerService = Depends(get_ledger), settings: Settings = Depends(get_settings)
):
    return LedgerStatusOut(
        ledger_mode=settings.LEDGER_MODE.value,
        simulated=settings.LEDGER_SIMULATE,
        enforces_access_onchain=ledger.enforces_access_onchain,
    )

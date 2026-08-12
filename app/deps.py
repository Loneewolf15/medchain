from fastapi import Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.database import get_db
from app.ledger.base import LedgerService
from app.ledger.factory import get_ledger_service
from app.services.access_service import AccessService
from app.services.record_service import RecordService


def get_ledger() -> LedgerService:
    return get_ledger_service()


def get_access_service(
    db: Session = Depends(get_db), ledger: LedgerService = Depends(get_ledger)
) -> AccessService:
    return AccessService(db, ledger)


def get_record_service(
    db: Session = Depends(get_db),
    ledger: LedgerService = Depends(get_ledger),
    settings: Settings = Depends(get_settings),
) -> RecordService:
    return RecordService(db, ledger, settings.LEDGER_MODE.value)

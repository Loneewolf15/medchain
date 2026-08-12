from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import iot_simulator
from app.database import Base
from app.ledger.simulated import SimulatedHcsLedgerService
from app.models import ClinicalRecordType


def _isolated_session_local():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_create_and_anchor_vitals_produces_a_hashed_anchored_record(monkeypatch):
    monkeypatch.setattr(iot_simulator, "SessionLocal", _isolated_session_local())
    monkeypatch.setattr(iot_simulator, "get_ledger_service", lambda: SimulatedHcsLedgerService())

    row = iot_simulator.create_and_anchor_vitals("patient-123")

    assert row.record_type == ClinicalRecordType.VITALS
    assert row.source == "iot_simulator"
    assert row.record_hash is not None
    assert len(row.record_hash) == 64
    assert row.ledger_tx_id is not None
    assert "heart_rate" in row.data
    assert "systolic" in row.data


def test_force_alert_produces_an_out_of_range_reading(monkeypatch):
    monkeypatch.setattr(iot_simulator, "SessionLocal", _isolated_session_local())
    monkeypatch.setattr(iot_simulator, "get_ledger_service", lambda: SimulatedHcsLedgerService())

    row = iot_simulator.create_and_anchor_vitals("patient-456", force_alert=True)
    assert row.data["is_alert"] is True

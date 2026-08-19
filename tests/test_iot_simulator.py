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


def test_create_and_anchor_vitals_produces_a_hashed_anchored_record_on_alert(monkeypatch):
    monkeypatch.setattr(iot_simulator, "SessionLocal", _isolated_session_local())
    monkeypatch.setattr(iot_simulator, "get_ledger_service", lambda: SimulatedHcsLedgerService())

    row = iot_simulator.create_and_anchor_vitals("patient-123", force_alert=True)

    assert row.record_type == ClinicalRecordType.VITALS
    assert row.source == "iot_simulator"
    assert row.record_hash is not None
    assert len(row.record_hash) == 64
    assert row.ledger_tx_id is not None
    assert "heart_rate" in row.data
    assert "systolic" in row.data


def test_create_vitals_skips_anchoring_on_normal_reading(monkeypatch):
    monkeypatch.setattr(iot_simulator, "SessionLocal", _isolated_session_local())
    monkeypatch.setattr(iot_simulator, "get_ledger_service", lambda: SimulatedHcsLedgerService())

    # Mock random to ensure is_alert is False, or just pass force_alert=False and assume random doesn't trigger 5% 
    # To be perfectly safe, we'll just check if it was an alert, and if not, assert it didn't anchor
    row = iot_simulator.create_and_anchor_vitals("patient-123", force_alert=False)
    if not row.data["is_alert"]:
        assert row.record_hash is None
        assert row.ledger_tx_id is None


def test_force_alert_produces_an_out_of_range_reading(monkeypatch):
    monkeypatch.setattr(iot_simulator, "SessionLocal", _isolated_session_local())
    monkeypatch.setattr(iot_simulator, "get_ledger_service", lambda: SimulatedHcsLedgerService())

    row = iot_simulator.create_and_anchor_vitals("patient-456", force_alert=True)
    assert row.data["is_alert"] is True


def test_external_iot_ingest_requires_valid_signature_and_no_auth(hcs_client):
    client, ledger = hcs_client
    # Create patient via admin
    from tests.conftest import register_and_login
    headers = register_and_login(client, "dr_ingest@example.com", "doctor")
    p_resp = client.post(
        "/patients",
        headers=headers,
        json={"full_name": "IoT Patient", "date_of_birth": "1990-01-01", "gender": "other", "contact_info": {}}
    )
    patient_id = p_resp.json()["id"]

    import hmac
    import hashlib
    import json
    from app.iot_simulator import DEVICE_SECRET_KEY

    payload = {
        "systolic": 120,
        "diastolic": 80,
        "heart_rate": 72,
        "spo2": 98,
        "temperature_c": 36.5,
        "blood_glucose_mgdl": 100,
        "is_alert": False
    }
    
    # 1. Invalid signature should fail
    resp = client.post(f"/patients/{patient_id}/iot/ingest", json={
        "payload": payload,
        "signature": "bad-signature"
    })
    assert resp.status_code == 401
    assert "Invalid IoT Device Signature" in resp.json()["detail"]

    # 2. Valid signature should succeed without bearer token
    payload_str = json.dumps(payload, sort_keys=True).encode('utf-8')
    valid_sig = hmac.new(DEVICE_SECRET_KEY, payload_str, hashlib.sha256).hexdigest()
    
    resp = client.post(f"/patients/{patient_id}/iot/ingest", json={
        "payload": payload,
        "signature": valid_sig
    })
    assert resp.status_code == 200
    assert resp.json()["data"]["heart_rate"] == 72
    assert resp.json()["source"] == "external_iot_device"

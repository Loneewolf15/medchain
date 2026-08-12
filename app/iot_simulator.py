"""
Stand-in for a real blood-pressure cuff / pulse oximeter / heart-rate strap.

A real IoT device would push readings to an ingest endpoint (or MQTT
broker) that ends up calling the same create_and_anchor_vitals() function
this simulator calls. Swapping the simulator for real hardware later is
just wiring a device webhook to this same function — nothing else in the
app changes.
"""
from __future__ import annotations

import asyncio
import logging
import random

from app.config import get_settings
from app.database import SessionLocal
from app.ledger.factory import get_ledger_service
from app.models import ClinicalRecord, ClinicalRecordType
from app.services.record_service import RecordService

logger = logging.getLogger(__name__)


def _generate_reading(force_alert: bool = False) -> dict:
    """Mostly-normal vitals with an occasional out-of-range value, so the
    demo can show an alert condition without manual data entry."""
    alert = force_alert or random.random() < 0.12

    if alert:
        systolic = random.choice([random.randint(160, 190), random.randint(80, 89)])
        heart_rate = random.choice([random.randint(120, 160), random.randint(35, 45)])
        spo2 = random.randint(85, 90)
    else:
        systolic = random.randint(105, 130)
        heart_rate = random.randint(60, 95)
        spo2 = random.randint(95, 100)

    diastolic = random.randint(65, 85) if not alert else random.choice([random.randint(100, 115), random.randint(45, 55)])

    return {
        "systolic": systolic,
        "diastolic": diastolic,
        "heart_rate": heart_rate,
        "spo2": spo2,
        "temperature_c": round(random.uniform(36.1, 37.8) if not alert else random.uniform(38.5, 40.0), 1),
        "blood_glucose_mgdl": random.randint(80, 140),
        "is_alert": alert,
    }


def create_and_anchor_vitals(patient_id: str, *, force_alert: bool = False) -> ClinicalRecord:
    """Writes one simulated vitals reading for `patient_id`, hashes it, and
    anchors the hash via whichever ledger mode is currently configured.
    Opens its own DB session so it can be called from a background asyncio
    loop as well as from a request handler."""
    settings = get_settings()
    ledger = get_ledger_service()
    db = SessionLocal()
    try:
        reading = _generate_reading(force_alert=force_alert)
        row = ClinicalRecord(
            patient_id=patient_id,
            record_type=ClinicalRecordType.VITALS,
            data=reading,
            source="iot_simulator",
        )
        db.add(row)
        db.flush()

        record_service = RecordService(db, ledger, settings.LEDGER_MODE.value)
        record_hash, tx_id = record_service.anchor(
            resource_type="clinical_record", resource_id=row.id, payload={"record_type": "vitals", "data": reading}
        )
        row.record_hash = record_hash
        row.ledger_tx_id = tx_id

        db.commit()
        db.refresh(row)
        return row
    finally:
        db.close()


class IoTSimulatorManager:
    """Tracks one background asyncio task per patient being 'monitored'."""

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task] = {}

    def is_running(self, patient_id: str) -> bool:
        task = self._tasks.get(patient_id)
        return task is not None and not task.done()

    def start(self, patient_id: str, interval_seconds: int) -> None:
        if self.is_running(patient_id):
            return
        self._tasks[patient_id] = asyncio.create_task(self._loop(patient_id, interval_seconds))

    def stop(self, patient_id: str) -> bool:
        task = self._tasks.pop(patient_id, None)
        if task and not task.done():
            task.cancel()
            return True
        return False

    async def _loop(self, patient_id: str, interval_seconds: int) -> None:
        try:
            while True:
                await asyncio.sleep(interval_seconds)
                try:
                    create_and_anchor_vitals(patient_id)
                except Exception:
                    logger.exception("IoT simulator tick failed for patient %s", patient_id)
        except asyncio.CancelledError:
            logger.info("IoT simulator stopped for patient %s", patient_id)
            raise


iot_manager = IoTSimulatorManager()

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
import hmac
import hashlib
import json
from collections import deque

from app.config import get_settings
from app.database import SessionLocal
from app.ledger.factory import get_ledger_service
from app.models import ClinicalRecord, ClinicalRecordType
from app.services.record_service import RecordService

logger = logging.getLogger(__name__)

# Simulated Device Identity Key for HMAC Signatures
DEVICE_SECRET_KEY = b"simulated-edge-device-secret-key-1234"


def _generate_reading(force_alert: bool = False, settings: dict | None = None) -> dict:
    """Generates vitals based on patient settings, or falls back to defaults."""
    settings = settings or {}
    
    base_hr = settings.get("hr_base", 72)
    base_sys = settings.get("sys_base", 120)
    base_dia = settings.get("dia_base", 80)
    base_spo2 = settings.get("spo2_base", 98)
    
    alert = force_alert or random.random() < 0.05 # Reduced random alerts if using settings

    if alert:
        systolic = random.choice([random.randint(160, 190), random.randint(80, 89)])
        heart_rate = random.choice([random.randint(120, 160), random.randint(35, 45)])
        spo2 = random.randint(85, 90)
        diastolic = random.choice([random.randint(100, 115), random.randint(45, 55)])
    else:
        # Add slight realistic variance to the base targets
        systolic = max(50, min(250, base_sys + random.randint(-5, 5)))
        diastolic = max(30, min(150, base_dia + random.randint(-4, 4)))
        heart_rate = max(20, min(220, base_hr + random.randint(-3, 3)))
        spo2 = max(50, min(100, base_spo2 + random.randint(-1, 1) if base_spo2 < 100 else 100))

    payload = {
        "systolic": systolic,
        "diastolic": diastolic,
        "heart_rate": heart_rate,
        "spo2": spo2,
        "temperature_c": round(random.uniform(36.1, 37.8) if not alert else random.uniform(38.5, 40.0), 1),
        "blood_glucose_mgdl": random.randint(80, 140),
        "is_alert": alert,
    }
    
    # Generate Cryptographic Signature (Simulating Edge Device Signing)
    payload_str = json.dumps(payload, sort_keys=True).encode('utf-8')
    signature = hmac.new(DEVICE_SECRET_KEY, payload_str, hashlib.sha256).hexdigest()
    
    return {
        "payload": payload,
        "signature": signature
    }


def create_and_anchor_vitals(patient_id: str, *, force_alert: bool = False, settings: dict | None = None) -> ClinicalRecord:
    """Writes one simulated vitals reading for `patient_id`. 
    Only anchors the hash to Hedera if the reading is an anomaly (is_alert=True), 
    optimizing for bandwidth and cost. Otherwise just stores locally.
    Opens its own DB session so it can be called from a background asyncio loop."""
    env_settings = get_settings()
    ledger = get_ledger_service()
    db = SessionLocal()
    try:
        generated = _generate_reading(force_alert=force_alert, settings=settings)
        reading = generated["payload"]
        signature = generated["signature"]
        
        # Cloud/Server Edge Verification: Verify the cryptographic signature
        # In a real system, the payload and signature would come over HTTP.
        payload_str = json.dumps(reading, sort_keys=True).encode('utf-8')
        expected_signature = hmac.new(DEVICE_SECRET_KEY, payload_str, hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(expected_signature, signature):
            raise ValueError("Invalid IoT Device Signature! Spoofing detected.")
        
        row = ClinicalRecord(
            patient_id=patient_id,
            record_type=ClinicalRecordType.VITALS,
            data=reading,
            source="iot_simulator",
        )
        db.add(row)
        db.flush()

        # Edge Anomaly Filtering: Only anchor to Hedera if it's an alert
        if reading.get("is_alert", False):
            record_service = RecordService(db, ledger, env_settings.LEDGER_MODE.value)
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
    """Tracks one background asyncio task per patient being 'monitored'.
    Implements an edge buffer queue to prevent data loss on network drops."""

    def __init__(self) -> None:
        self._tasks: dict[str, asyncio.Task] = {}
        self._settings: dict[str, dict] = {}
        self._queues: dict[str, deque] = {}

    def update_settings(self, patient_id: str, hr_base: int, sys_base: int, dia_base: int, spo2_base: int) -> None:
        self._settings[patient_id] = {
            "hr_base": hr_base,
            "sys_base": sys_base,
            "dia_base": dia_base,
            "spo2_base": spo2_base
        }

    def is_running(self, patient_id: str) -> bool:
        task = self._tasks.get(patient_id)
        return task is not None and not task.done()

    def start(self, patient_id: str, interval_seconds: int) -> None:
        if self.is_running(patient_id):
            return
        if patient_id not in self._queues:
            self._queues[patient_id] = deque()
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
                # Enqueue a new reading attempt
                self._queues[patient_id].append("TICK")
                
                # Try to process the queue (Edge Buffer flush)
                while self._queues[patient_id]:
                    try:
                        patient_settings = self._settings.get(patient_id, None)
                        # We pass the reading generating and anchoring to the blocking function.
                        # It generates inside, but we rely on its success. If it throws, we break out
                        # of the queue processing and leave the pending ticks for next time.
                        create_and_anchor_vitals(patient_id, settings=patient_settings)
                        
                        # Only pop if successful
                        self._queues[patient_id].popleft()
                    except Exception:
                        logger.exception("IoT simulator tick failed for patient %s. Retrying next tick.", patient_id)
                        break # break the inner while loop to keep the item in queue
                        
        except asyncio.CancelledError:
            logger.info("IoT simulator stopped for patient %s", patient_id)
            raise


iot_manager = IoTSimulatorManager()

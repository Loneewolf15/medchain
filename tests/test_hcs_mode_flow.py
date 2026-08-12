from tests.conftest import register_and_login


def _get_id(client, headers):
    return client.get("/auth/me", headers=headers).json()["id"]


def test_ledger_status_reports_hcs_mode(hcs_client):
    client, ledger = hcs_client
    resp = client.get("/ledger/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ledger_mode"] == "hcs"
    assert body["enforces_access_onchain"] is False


def test_create_patient_and_clinical_record_gets_anchored(hcs_client):
    client, ledger = hcs_client
    doctor_headers = register_and_login(client, "dr.amos@medchain.example.com", "doctor")

    patient_resp = client.post(
        "/patients",
        json={
            "full_name": "Efe Okoro",
            "date_of_birth": "1998-04-12",
            "gender": "female",
            "address": "Benin City",
            "blood_type": "O+",
        },
        headers=doctor_headers,
    )
    assert patient_resp.status_code == 201
    patient_id = patient_resp.json()["id"]

    record_resp = client.post(
        f"/patients/{patient_id}/clinical-records",
        json={"record_type": "vitals", "data": {"systolic": 118, "diastolic": 76, "heart_rate": 70}},
        headers=doctor_headers,
    )
    assert record_resp.status_code == 201
    body = record_resp.json()
    assert body["record_hash"] is not None
    assert body["ledger_tx_id"] is not None

    # the hash + CREATE action actually landed in the (simulated) HCS log
    assert any(entry["action"] == "CREATE" for entry in ledger.log)


def test_unauthorized_staff_cannot_read_clinical_records_until_granted(hcs_client):
    client, ledger = hcs_client
    doctor_headers = register_and_login(client, "dr.bello@medchain.example.com", "doctor")
    nurse_headers = register_and_login(client, "nurse.ada@medchain.example.com", "nurse")
    nurse_id = _get_id(client, nurse_headers)

    patient_id = client.post(
        "/patients",
        json={"full_name": "Chuka Eze", "date_of_birth": "1990-01-01", "gender": "male"},
        headers=doctor_headers,
    ).json()["id"]

    client.post(
        f"/patients/{patient_id}/clinical-records",
        json={"record_type": "vitals", "data": {"heart_rate": 80}},
        headers=doctor_headers,
    )

    # Nurse has no grant yet -> 403
    denied = client.get(f"/patients/{patient_id}/clinical-records", headers=nurse_headers)
    assert denied.status_code == 403

    # Doctor grants clinical access to the nurse
    grant_resp = client.post(
        f"/patients/{patient_id}/access",
        json={"grantee_user_id": nurse_id, "scope": "clinical"},
        headers=doctor_headers,
    )
    assert grant_resp.status_code == 201
    grant_id = grant_resp.json()["id"]

    # Now the nurse can read
    allowed = client.get(f"/patients/{patient_id}/clinical-records", headers=nurse_headers)
    assert allowed.status_code == 200
    assert len(allowed.json()) == 1

    # Revoke -> nurse loses access again
    revoke_resp = client.delete(f"/patients/{patient_id}/access/{grant_id}", headers=doctor_headers)
    assert revoke_resp.status_code == 200

    denied_again = client.get(f"/patients/{patient_id}/clinical-records", headers=nurse_headers)
    assert denied_again.status_code == 403


def test_view_actions_are_logged_to_the_ledger(hcs_client):
    client, ledger = hcs_client
    doctor_headers = register_and_login(client, "dr.tayo@medchain.example.com", "doctor")
    patient_id = client.post(
        "/patients",
        json={"full_name": "Zainab Musa", "date_of_birth": "1985-06-20", "gender": "female"},
        headers=doctor_headers,
    ).json()["id"]

    client.post(
        f"/patients/{patient_id}/clinical-records",
        json={"record_type": "vitals", "data": {"heart_rate": 90}},
        headers=doctor_headers,
    )
    before = len(ledger.log)
    client.get(f"/patients/{patient_id}/clinical-records", headers=doctor_headers)
    after = len(ledger.log)
    assert after == before + 1
    assert ledger.log[-1]["action"] == "VIEW"

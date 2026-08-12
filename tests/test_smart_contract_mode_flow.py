from tests.conftest import register_and_login


def _get_id(client, headers):
    return client.get("/auth/me", headers=headers).json()["id"]


def test_ledger_status_reports_smart_contract_mode(smart_contract_client):
    client, ledger = smart_contract_client
    resp = client.get("/ledger/status")
    body = resp.json()
    assert body["ledger_mode"] == "smart_contract"
    assert body["enforces_access_onchain"] is True


def test_access_is_enforced_via_the_simulated_contract_not_just_the_db(smart_contract_client):
    client, ledger = smart_contract_client
    doctor_headers = register_and_login(client, "dr.femi@medchain.example.com", "doctor")
    lab_headers = register_and_login(client, "lab.kate@medchain.example.com", "lab_scientist")
    lab_id = _get_id(client, lab_headers)

    patient_id = client.post(
        "/patients",
        json={"full_name": "Ify Nwosu", "date_of_birth": "2000-02-02", "gender": "female"},
        headers=doctor_headers,
    ).json()["id"]

    client.post(
        f"/patients/{patient_id}/diagnostic-records",
        json={"kind": "blood_sample", "summary": "CBC panel ordered"},
        headers=doctor_headers,
    )

    denied = client.get(f"/patients/{patient_id}/diagnostic-records", headers=lab_headers)
    assert denied.status_code == 403

    grant = client.post(
        f"/patients/{patient_id}/access",
        json={"grantee_user_id": lab_id, "scope": "diagnostic"},
        headers=doctor_headers,
    )
    assert grant.status_code == 201

    # The simulated "contract" state now has the grant, independent of the DB row.
    assert ledger.check_access_onchain(patient_id=patient_id, grantee_id=lab_id, scope="diagnostic") is True

    allowed = client.get(f"/patients/{patient_id}/diagnostic-records", headers=lab_headers)
    assert allowed.status_code == 200


def test_all_scope_grant_covers_every_specific_scope(smart_contract_client):
    client, ledger = smart_contract_client
    doctor_headers = register_and_login(client, "dr.grace@medchain.example.com", "doctor")
    nurse_headers = register_and_login(client, "nurse.jide@medchain.example.com", "nurse")
    nurse_id = _get_id(client, nurse_headers)

    patient_id = client.post(
        "/patients",
        json={"full_name": "Tunde Bakare", "date_of_birth": "1975-11-11", "gender": "male"},
        headers=doctor_headers,
    ).json()["id"]

    client.post(
        f"/patients/{patient_id}/access",
        json={"grantee_user_id": nurse_id, "scope": "all"},
        headers=doctor_headers,
    )

    client.post(
        f"/patients/{patient_id}/clinical-records",
        json={"record_type": "vitals", "data": {"heart_rate": 88}},
        headers=doctor_headers,
    )

    resp = client.get(f"/patients/{patient_id}/clinical-records", headers=nurse_headers)
    assert resp.status_code == 200

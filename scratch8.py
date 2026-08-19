import requests

API_URL = "http://127.0.0.1:8000"

login_data = {
    "username": "doctor@medchain.com",
    "password": "docpassword"
}
r = requests.post(f"{API_URL}/auth/login", data=login_data)
token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

r = requests.get(f"{API_URL}/patients", headers=headers)
patients = r.json()
patient_id = patients[0]["id"]

appt_data = {
    "doctor_id": "",
    "scheduled_at": "2026-08-20T10:00:00",
    "reason": "Test appointment"
}
r = requests.post(f"{API_URL}/patients/{patient_id}/appointments", json=appt_data, headers=headers)
print("Appointment Status:", r.status_code)
print("Appointment Body:", r.text)


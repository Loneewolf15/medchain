import requests

API_URL = "https://medchain-production.up.railway.app"

login_data = {
    "username": "doctor@medchain.com",
    "password": "docpassword"
}
r = requests.post(f"{API_URL}/auth/login", data=login_data)
if r.status_code != 200:
    print("Login failed", r.text)
    exit()

token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {token}"}

r = requests.get(f"{API_URL}/patients", headers=headers)
patients = r.json()
if not patients:
    print("No patients")
    exit()

patient_id = patients[0]["id"]
print(f"Patient ID: {patient_id}")

# Add appointment
appt_data = {
    "doctor_id": "",
    "scheduled_at": "",
    "reason": "Test appointment"
}
r = requests.post(f"{API_URL}/patients/{patient_id}/appointments", json=appt_data, headers=headers)
print("Appointment:", r.status_code, r.text)

clin_data = {
    "record_type": "vitals",
    "data": {},
    "source": "manual"
}
r = requests.post(f"{API_URL}/patients/{patient_id}/clinical-records", json=clin_data, headers=headers)
print("Clinical:", r.status_code, r.text)


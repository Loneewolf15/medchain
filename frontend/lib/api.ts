export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function register(data: any) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (err && err.detail) {
      if (Array.isArray(err.detail)) throw new Error(err.detail[0].msg);
      throw new Error(err.detail);
    }
    throw new Error("Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    if (err && err.detail) throw new Error(err.detail);
    throw new Error("Login failed");
  }
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Not logged in");
  return res.json();
}

export async function getMyPatientProfile() {
  const res = await fetch(`${API_URL}/auth/me/patient`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch patient profile");
  return res.json();
}

export async function listUsers() {
  const res = await fetch(`${API_URL}/auth/users`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function listPatients() {
  const res = await fetch(`${API_URL}/patients`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function getPatient(id: string) {
  const res = await fetch(`${API_URL}/patients/${id}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json();
}

export async function createPatient(data: any) {
  const res = await fetch(`${API_URL}/patients`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create patient");
  return res.json();
}

export async function listClinicalRecords(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/clinical-records`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch clinical records");
  return res.json();
}

export async function listDiagnosticRecords(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/diagnostic-records`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch diagnostic records");
  return res.json();
}

export async function listAccessGrants(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/access`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch access grants");
  return res.json();
}

export async function grantAccess(patientId: string, granteeId: string, scope: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/access`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ grantee_user_id: granteeId, scope }),
  });
  if (!res.ok) throw new Error("Failed to grant access");
  return res.json();
}

export async function revokeAccess(patientId: string, grantId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/access/${grantId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to revoke access");
  return res.json();
}

export async function createClinicalRecord(patientId: string, data: any) {
  const res = await fetch(`${API_URL}/patients/${patientId}/clinical-records`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create clinical record");
  return res.json();
}

export async function createDiagnosticRecord(patientId: string, data: any) {
  const res = await fetch(`${API_URL}/patients/${patientId}/diagnostic-records`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create diagnostic record");
  return res.json();
}

export async function triggerIotReading(patientId: string, forceAlert: boolean = false) {
  const res = await fetch(`${API_URL}/patients/${patientId}/iot/reading?force_alert=${forceAlert}`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to trigger reading");
  return res.json();
}

export async function startIotSimulation(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/iot/start`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to start simulation");
  return res.json();
}

export async function stopIotSimulation(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/iot/stop`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to stop simulation");
  return res.json();
}

export async function updateIotSettings(patientId: string, settings: { hr_base: number, sys_base: number, dia_base: number, spo2_base: number }) {
  const res = await fetch(`${API_URL}/patients/${patientId}/iot/settings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

export async function listAppointments(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/appointments`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
}

export async function createAppointment(patientId: string, data: { doctor_id?: string, scheduled_at?: string, reason: string }) {
  const res = await fetch(`${API_URL}/patients/${patientId}/appointments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create appointment");
  return res.json();
}

export async function updateAppointment(patientId: string, appointmentId: string, data: { status?: string, doctor_id?: string, scheduled_at?: string }) {
  const res = await fetch(`${API_URL}/patients/${patientId}/appointments/${appointmentId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update appointment");
  return res.json();
}

export async function listPrescriptions(patientId: string) {
  const res = await fetch(`${API_URL}/patients/${patientId}/prescriptions`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  return res.json();
}

export async function createPrescription(patientId: string, data: { medication: string, dosage: string, instructions: string }) {
  const res = await fetch(`${API_URL}/patients/${patientId}/prescriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create prescription");
  return res.json();
}

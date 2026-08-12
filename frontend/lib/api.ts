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
  if (!res.ok) throw new Error("Registration failed");
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
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function getMe() {
  const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Not logged in");
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

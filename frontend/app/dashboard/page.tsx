"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, getMyAppointments, getAssignedPatients, getDashboardStats, getMyPatientProfile } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Workspace Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 bg-white/50 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-slate-200">
            Welcome back, <span className="text-blue-600 capitalize font-bold">{user.role}</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {['admin', 'secretary'].includes(user.role) && (
            <Link href="/settings" className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all duration-300 shadow-sm border border-slate-200">
              Admin Settings
            </Link>
          )}
          {['admin', 'doctor', 'nurse', 'secretary'].includes(user.role) && (
            <Link href="/patients/new" className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Admit Patient
            </Link>
          )}
        </div>
      </div>

      {['admin', 'secretary'].includes(user.role) && <AdminDashboard />}
      {['doctor', 'nurse', 'lab_scientist'].includes(user.role) && <StaffDashboard />}
      {user.role === 'patient' && <PatientDashboard />}
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(console.error);
    getAssignedPatients().then(setPatients).catch(console.error);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-slate-900">{stats.total_patients || 0}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Total Patients</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-slate-900">{stats.total_appointments || 0}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Appointments</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-3xl font-bold text-slate-900">{stats.total_users || 0}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Staff Users</div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/20 p-6 flex flex-col items-center justify-center text-center text-white relative overflow-hidden">
          <div className="text-lg font-bold z-10 mb-1">Hedera HCS</div>
          <div className="text-xs font-medium text-blue-100 uppercase tracking-widest z-10">Audit Anchoring Active</div>
        </div>
      </div>

      <PatientList patients={patients} title="Global Patient Directory" />
    </>
  );
}

function StaffDashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    getAssignedPatients().then(setPatients).catch(console.error);
    getMyAppointments().then(setAppointments).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <PatientList patients={patients} title="My Assigned Patients" />
      </div>
      <div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Upcoming Appointments</h2>
          <ul className="space-y-4">
            {appointments.map(appt => (
              <li key={appt.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">{new Date(appt.scheduled_at).toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-900">Reason: {appt.reason}</div>
                <div className="mt-3 text-right">
                  <Link href={`/patients/${appt.patient_id}?tab=appointments`} className="text-xs font-bold text-slate-500 hover:text-blue-600">View Details &rarr;</Link>
                </div>
              </li>
            ))}
            {appointments.length === 0 && (
              <li className="text-center text-slate-500 text-sm py-8">No upcoming appointments.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PatientDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    getMyPatientProfile().then(setProfile).catch(console.error);
    getMyAppointments().then(setAppointments).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-8 text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-4">
            {profile ? profile.full_name.charAt(0) : '?'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{profile ? profile.full_name : 'Loading...'}</h2>
          <p className="text-slate-500 font-medium mb-6">Patient Code: {profile ? profile.patient_code : '---'}</p>
          {profile && (
            <Link href={`/patients/${profile.id}`} className="inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              Access Full Medical Record
            </Link>
          )}
        </div>
      </div>
      <div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">My Appointments</h2>
          <ul className="space-y-4">
            {appointments.map(appt => (
              <li key={appt.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-blue-50/50 transition-colors">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">{appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleString() : 'Requested'}</div>
                <div className="text-sm font-medium text-slate-900">Reason: {appt.reason}</div>
                <div className="text-xs text-slate-500 mt-1">Status: {appt.status}</div>
              </li>
            ))}
            {appointments.length === 0 && (
              <li className="text-center text-slate-500 text-sm py-8">No appointments found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PatientList({ patients, title }: { patients: any[], title: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
      <div className="p-6 border-b border-slate-100/50 flex justify-between items-center bg-slate-50/50">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      
      <div className="hidden sm:grid grid-cols-12 gap-4 border-b border-slate-100 p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
        <div className="col-span-5 sm:col-span-4 pl-2">Patient Name</div>
        <div className="col-span-3 sm:col-span-4">System Code</div>
        <div className="col-span-4 sm:col-span-4 text-right pr-2">Date of Birth</div>
      </div>

      <ul className="divide-y divide-slate-100/80">
        {patients.map((patient) => (
          <li key={patient.id}>
            <Link href={`/patients/${patient.id}`} className="group block hover:bg-blue-50/50 transition-colors p-4">
              <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:items-center">
                <div className="sm:col-span-5 text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 flex items-center justify-center mr-4 font-bold text-sm border border-slate-200 group-hover:border-blue-200 transition-all">
                    {patient.full_name.charAt(0)}
                  </div>
                  {patient.full_name}
                </div>
                <div className="sm:col-span-3 flex items-center">
                  <span className="sm:hidden text-xs text-slate-400 uppercase tracking-widest font-bold mr-2">Code:</span>
                  <span className="font-mono text-sm text-slate-600">
                    {patient.patient_code}
                  </span>
                </div>
                <div className="sm:col-span-4 flex items-center sm:justify-end text-sm text-slate-500 font-medium pr-2">
                  <span className="sm:hidden text-xs text-slate-400 uppercase tracking-widest font-bold mr-2">DOB:</span>
                  {patient.date_of_birth}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {patients.length === 0 && (
          <li className="p-12 text-center">
            <h3 className="text-sm font-medium text-slate-900">No patients found</h3>
          </li>
        )}
      </ul>
    </div>
  );
}

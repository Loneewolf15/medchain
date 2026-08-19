"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, listPatients, getMyPatientProfile } from "@/lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    if (user) {
      if (user.role === "patient") {
        getMyPatientProfile()
          .then((p) => router.push(`/patients/${p.id}`))
          .catch(console.error);
      } else {
        listPatients().then(setPatients).catch(console.error);
      }
    }
  }, [user, router]);

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

      {/* Stats / Quick Actions Area */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="text-3xl font-bold text-slate-900">{patients.length}</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Total Patients</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="text-3xl font-bold text-slate-900">Active</div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Schedules</div>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg shadow-blue-500/20 p-6 flex flex-col items-center justify-center text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 z-10 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div className="text-lg font-bold z-10 mb-1">Hedera HCS</div>
          <div className="text-xs font-medium text-blue-100 uppercase tracking-widest z-10">Audit Anchoring Active</div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
        <div className="p-6 border-b border-slate-100/50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Patient Directory</h2>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Select to view dossier</div>
        </div>
        
        {/* Desktop Header */}
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
              <div className="mx-auto w-12 h-12 text-slate-300 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-slate-900">No patients found</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by admitting a new patient to the registry.</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

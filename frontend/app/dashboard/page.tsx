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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Patient Registry</h1>
          <p className="text-sm font-medium text-slate-500 bg-white/50 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-slate-200">
            Authenticated as <span className="text-blue-600 capitalize">{user.role}</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          {user.role === 'admin' && (
            <Link href="/settings" className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all duration-300">
              Admin Settings
            </Link>
          )}
          <Link href="/patients/new" className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Admit Patient
          </Link>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 border-b border-slate-100/50 p-6 text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
          <div className="col-span-5 sm:col-span-4">Patient Name</div>
          <div className="col-span-3 sm:col-span-4">System Code</div>
          <div className="col-span-4 sm:col-span-4 text-right">Date of Birth</div>
        </div>

        <ul className="divide-y divide-slate-100/50">
          {patients.map((patient) => (
            <li key={patient.id}>
              <Link href={`/patients/${patient.id}`} className="group block hover:bg-blue-50/30 transition-colors p-6">
                <div className="flex flex-col sm:grid sm:grid-cols-12 gap-4 sm:items-center">
                  <div className="sm:col-span-5 text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-4 font-bold text-sm border border-blue-100">
                      {patient.full_name.charAt(0)}
                    </div>
                    {patient.full_name}
                  </div>
                  <div className="sm:col-span-3 flex items-center">
                    <span className="sm:hidden text-xs text-slate-400 uppercase tracking-widest font-bold mr-2">Code:</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-600 text-xs tracking-wide">
                      {patient.patient_code}
                    </span>
                  </div>
                  <div className="sm:col-span-4 flex items-center sm:justify-end text-sm text-slate-500 font-medium">
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

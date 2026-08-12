"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, listPatients } from "@/lib/api";
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
      listPatients().then(setPatients).catch(console.error);
    }
  }, [user]);

  if (!user) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard ({user.role})</h1>
        <Link href="/patients/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
          + New Patient
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {patients.map((patient) => (
            <li key={patient.id}>
              <Link href={`/patients/${patient.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">{patient.full_name}</p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {patient.patient_code}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        DOB: {patient.date_of_birth}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {patients.length === 0 && (
            <li className="px-4 py-4 text-gray-500 text-center">No patients found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getPatient, listClinicalRecords, listDiagnosticRecords, listAccessGrants } from "@/lib/api";

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [patient, setPatient] = useState<any>(null);
  const [clinical, setClinical] = useState<any[]>([]);
  const [diagnostic, setDiagnostic] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("clinical");
  const [error, setError] = useState("");

  useEffect(() => {
    getPatient(id)
      .then(setPatient)
      .catch((err) => setError(err.message));

    listClinicalRecords(id).then(setClinical).catch(() => {});
    listDiagnosticRecords(id).then(setDiagnostic).catch(() => {});
    listAccessGrants(id).then(setGrants).catch(() => {});
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!patient) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">{patient.full_name}</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Code: {patient.patient_code} | DOB: {patient.date_of_birth}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {["clinical", "diagnostic", "grants"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow sm:rounded-md p-4">
        {activeTab === "clinical" && (
          <ul className="divide-y divide-gray-200">
            {clinical.map((rec) => (
              <li key={rec.id} className="py-4">
                <p className="text-sm font-medium text-gray-900">{rec.record_type} ({rec.source})</p>
                <pre className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">{JSON.stringify(rec.data, null, 2)}</pre>
                {rec.ledger_tx_id && (
                  <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="mt-2 text-xs text-indigo-600 hover:underline">
                    View on HashScan: {rec.ledger_tx_id}
                  </a>
                )}
              </li>
            ))}
            {clinical.length === 0 && <p className="text-gray-500 text-sm">No clinical records found.</p>}
          </ul>
        )}

        {activeTab === "diagnostic" && (
          <ul className="divide-y divide-gray-200">
            {diagnostic.map((rec) => (
              <li key={rec.id} className="py-4">
                <p className="text-sm font-medium text-gray-900">{rec.kind}</p>
                <p className="mt-1 text-sm text-gray-500">{rec.summary}</p>
                {rec.ledger_tx_id && (
                  <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-indigo-600 hover:underline">
                    View on HashScan: {rec.ledger_tx_id}
                  </a>
                )}
              </li>
            ))}
            {diagnostic.length === 0 && <p className="text-gray-500 text-sm">No diagnostic records found.</p>}
          </ul>
        )}

        {activeTab === "grants" && (
          <ul className="divide-y divide-gray-200">
            {grants.map((grant) => (
              <li key={grant.id} className="py-4">
                <p className="text-sm font-medium text-gray-900">Grantee ID: {grant.grantee_user_id}</p>
                <p className="mt-1 text-sm text-gray-500">Scope: {grant.scope}</p>
                {grant.ledger_tx_id && (
                  <a href={`https://hashscan.io/testnet/transaction/${grant.ledger_tx_id}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-indigo-600 hover:underline">
                    View on HashScan: {grant.ledger_tx_id}
                  </a>
                )}
              </li>
            ))}
            {grants.length === 0 && <p className="text-gray-500 text-sm">No access grants found.</p>}
          </ul>
        )}
      </div>
    </div>
  );
}

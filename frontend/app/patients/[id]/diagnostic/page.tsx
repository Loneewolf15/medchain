"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getPatient, listDiagnosticRecords } from "@/lib/api";

export default function DiagnosticRecordsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [patient, setPatient] = useState<any>(null);
  const [diagnostic, setDiagnostic] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getPatient(id).then(setPatient).catch((err) => setError(err.message));
    listDiagnosticRecords(id).then(setDiagnostic).catch(() => {});
  }, [id]);

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!patient) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex justify-between items-center">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-blue-600 flex items-center transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Patient Dossier
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">All Diagnostic Records</h1>
        <p className="text-slate-500">Showing full diagnostic history for <span className="font-semibold text-slate-700">{patient.full_name}</span> ({patient.patient_code})</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {diagnostic.map((rec) => (
          <div key={rec.id} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800 text-xs uppercase">
                {rec.kind.replace('_', ' ')}
              </span>
              {rec.ledger_tx_id && (
                <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-1" title="View on Ledger">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </div>
            
            <div className="text-sm font-semibold text-slate-900 mb-2">
              {rec.summary}
            </div>
            
            <div className="flex-1 bg-slate-50/50 rounded-xl p-3 border border-slate-100 overflow-y-auto max-h-[250px]">
              {rec.result_data ? (
                <table className="w-full text-xs text-left">
                  <tbody>
                    {Object.entries(rec.result_data).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-100 last:border-0">
                        <td className="py-1.5 font-medium text-slate-500 capitalize">{k.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 font-bold text-slate-900 text-right">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-slate-400 text-xs italic">No structured data provided</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {diagnostic.length === 0 && (
        <div className="text-center py-20 bg-white/50 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm">
          <p className="text-slate-500">No diagnostic records found for this patient.</p>
        </div>
      )}
    </div>
  );
}

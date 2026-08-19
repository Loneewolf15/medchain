"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  getPatient, 
  listClinicalRecords, 
  listDiagnosticRecords, 
  listAccessGrants,
  createClinicalRecord,
  createDiagnosticRecord,
  grantAccess,
  triggerIotReading,
  startIotSimulation,
  stopIotSimulation,
  updateIotSettings,
  getMe,
  listAppointments,
  createAppointment,
  updateAppointment,
  listPrescriptions,
  createPrescription,
  listUsers
} from "@/lib/api";
import Spinner from "@/components/Spinner";
import EKGModal from "@/components/EKGModal";

export default function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const [patient, setPatient] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clinical, setClinical] = useState<any[]>([]);
  const [diagnostic, setDiagnostic] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("clinical");
  const [error, setError] = useState("");

  // Form states
  const [clinicalForm, setClinicalForm] = useState({ record_type: "vitals", data: "{}", source: "device" });
  const [diagnosticForm, setDiagnosticForm] = useState({ kind: "blood_test", summary: "", result_data: {} as Record<string, any> });
  const [diagnosticFields, setDiagnosticFields] = useState([{ key: "", value: "" }]);
  const [grantForm, setGrantForm] = useState({ grantee_user_id: "", scope: "clinical" });
  const [appointmentForm, setAppointmentForm] = useState({ doctor_id: "", scheduled_at: "", reason: "" });
  const [prescriptionForm, setPrescriptionForm] = useState({ medication: "", dosage: "", instructions: "" });
  
  const [isSubmittingClinical, setIsSubmittingClinical] = useState(false);
  const [isSubmittingDiagnostic, setIsSubmittingDiagnostic] = useState(false);
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);
  const [isSubmittingPrescription, setIsSubmittingPrescription] = useState(false);
  const [submittingIotAction, setSubmittingIotAction] = useState<string | null>(null);
  const [showEkgModal, setShowEkgModal] = useState(false);
  const [verifyingRecord, setVerifyingRecord] = useState<string | null>(null);

  // IoT Simulation Controls
  const [iotPreset, setIotPreset] = useState("normal");
  const [iotSettings, setIotSettings] = useState({
    hr_base: 72,
    sys_base: 120,
    dia_base: 80,
    spo2_base: 98
  });
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const fetchData = () => {
    getPatient(id).then(setPatient).catch((err) => setError(err.message));
    listClinicalRecords(id).then(setClinical).catch(() => {});
    listDiagnosticRecords(id).then(setDiagnostic).catch(() => {});
    listAccessGrants(id).then(setGrants).catch(() => {});
    listAppointments(id).then(setAppointments).catch(() => {});
    listPrescriptions(id).then(setPrescriptions).catch(() => {});
  };

  useEffect(() => {
    getMe().then(setCurrentUser).catch(console.error);
    listUsers().then(users => {
      setDoctors(users.filter((u: any) => ["admin", "doctor"].includes(u.role)));
    }).catch(console.error);
    fetchData();
  }, [id]);

  const handleAddClinical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingClinical) return;
    setIsSubmittingClinical(true);
    try {
      const parsedData = JSON.parse(clinicalForm.data);
      await createClinicalRecord(id, { ...clinicalForm, data: parsedData });
      fetchData();
      setClinicalForm({ record_type: "vitals", data: "{}", source: "device" });
    } catch (err: any) {
      alert("Error adding record: " + err.message);
    } finally {
      setIsSubmittingClinical(false);
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError("");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      try {
        const currentData = JSON.parse(clinicalForm.data);
        const newNotes = currentData.note ? currentData.note + " " + transcript : transcript;
        setClinicalForm({ ...clinicalForm, record_type: "notes", data: JSON.stringify({ ...currentData, note: newNotes }, null, 2) });
      } catch {
        setClinicalForm({ ...clinicalForm, record_type: "notes", data: JSON.stringify({ note: transcript }, null, 2) });
      }
    };

    recognition.onerror = (event: any) => {
      setSpeechError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAddDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDiagnostic) return;
    setIsSubmittingDiagnostic(true);
    try {
      let finalResultData = { ...diagnosticForm.result_data };
      if (['pathology', 'genetics', 'other'].includes(diagnosticForm.kind)) {
        finalResultData = diagnosticFields.reduce((acc, field) => {
          if (field.key.trim() !== "") {
            acc[field.key.trim()] = field.value;
          }
          return acc;
        }, {} as Record<string, any>);
      }

      await createDiagnosticRecord(id, { ...diagnosticForm, result_data: finalResultData });
      fetchData();
      setDiagnosticForm({ kind: "blood_test", summary: "", result_data: {} });
      setDiagnosticFields([{ key: "", value: "" }]);
    } catch (err: any) {
      alert("Error adding record: " + err.message);
    } finally {
      setIsSubmittingDiagnostic(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingGrant) return;
    setIsSubmittingGrant(true);
    try {
      await grantAccess(id, grantForm.grantee_user_id, grantForm.scope);
      fetchData();
      setGrantForm({ grantee_user_id: "", scope: "clinical" });
    } catch (err: any) {
      alert("Error granting access: " + err.message);
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAppointment) return;
    setIsSubmittingAppointment(true);
    try {
      await createAppointment(id, appointmentForm);
      fetchData();
      setAppointmentForm({ doctor_id: "", scheduled_at: "", reason: "" });
    } catch (err: any) {
      alert("Error adding appointment: " + err.message);
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPrescription) return;
    setIsSubmittingPrescription(true);
    try {
      await createPrescription(id, prescriptionForm);
      fetchData();
      setPrescriptionForm({ medication: "", dosage: "", instructions: "" });
    } catch (err: any) {
      alert("Error adding prescription: " + err.message);
    } finally {
      setIsSubmittingPrescription(false);
    }
  };

  const handleIotAction = async (action: 'reading' | 'start' | 'stop', forceAlert = false) => {
    const actionKey = action === 'reading' ? (forceAlert ? 'alert' : 'reading') : action;
    if (submittingIotAction) return;
    setSubmittingIotAction(actionKey);
    try {
      if (action === 'reading') await triggerIotReading(id, forceAlert);
      if (action === 'start') {
        await startIotSimulation(id);
        setShowEkgModal(true);
      }
      if (action === 'stop') await stopIotSimulation(id);
      setTimeout(fetchData, 500);
    } catch (err: any) {
      alert("IoT Action failed: " + err.message);
    } finally {
      setSubmittingIotAction(null);
    }
  };

  const applyIotPreset = async (preset: string) => {
    setIotPreset(preset);
    let newSettings = { ...iotSettings };
    if (preset === "normal") newSettings = { hr_base: 72, sys_base: 120, dia_base: 80, spo2_base: 98 };
    if (preset === "high_bp") newSettings = { hr_base: 80, sys_base: 160, dia_base: 100, spo2_base: 97 };
    if (preset === "low_bp") newSettings = { hr_base: 65, sys_base: 90, dia_base: 60, spo2_base: 96 };
    if (preset === "tachycardia") newSettings = { hr_base: 140, sys_base: 130, dia_base: 85, spo2_base: 94 };
    if (preset === "bradycardia") newSettings = { hr_base: 45, sys_base: 110, dia_base: 70, spo2_base: 98 };
    
    setIotSettings(newSettings);
    
    try {
      setIsUpdatingSettings(true);
      await updateIotSettings(id, newSettings);
    } catch (err) {
      console.error("Failed to update simulator settings on backend", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof iotSettings) => {
    setIotPreset("custom");
    setIotSettings(prev => ({ ...prev, [field]: parseInt(e.target.value) }));
  };

  const submitCustomSettings = async () => {
    try {
      setIsUpdatingSettings(true);
      await updateIotSettings(id, iotSettings);
    } catch (err) {
      console.error("Failed to update simulator settings on backend", err);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const exportMedicalRecord = () => {
    const exportData = {
      patient,
      clinical_records: clinical,
      diagnostic_records: diagnostic,
      prescriptions,
      appointments,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medchain_record_${patient.patient_code}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!patient) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex justify-between items-center">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-blue-600 flex items-center transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Registry
        </button>
        <button onClick={exportMedicalRecord} className="text-sm font-medium text-slate-700 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Record (JSON)
        </button>
      </div>

      {/* Patient Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-6 font-bold text-2xl">
            {patient.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{patient.full_name}</h1>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-4">
              <span>DOB: <span className="font-medium text-slate-700">{patient.date_of_birth}</span></span>
              <span>Gender: <span className="font-medium text-slate-700 capitalize">{patient.gender}</span></span>
            </div>
          </div>
        </div>
        <div className="text-right bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1 font-semibold">System Code</div>
          <div className="font-mono text-lg font-bold text-blue-700">{patient.patient_code}</div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar / Tabs */}
        <div className="w-full lg:w-64 shrink-0">
          <nav className="flex lg:flex-col overflow-x-auto pb-4 lg:pb-0 hide-scrollbar space-x-2 lg:space-x-0 lg:space-y-2">
            {[
              { id: "clinical", label: "Clinical Records", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
              { id: "diagnostic", label: "Diagnostics", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
              { id: "appointments", label: "Appointments", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              { id: "grants", label: "Access Control", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
              { id: "iot", label: "IoT Telemetry", icon: "M13 10V3L4 14h7v7l9-11h-7z" }
            ].filter(tab => {
              if (currentUser?.role === "patient") return ["clinical", "diagnostic", "appointments"].includes(tab.id);
              if (["nurse", "lab_scientist"].includes(currentUser?.role)) return ["clinical", "diagnostic", "appointments"].includes(tab.id);
              return true; // admin, doctor see everything
            }).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-5 py-3.5 text-sm font-semibold rounded-2xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:bg-white hover:text-blue-600 border border-transparent hover:border-slate-200"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 transition-opacity ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 p-6 sm:p-10 min-h-[500px]">
            
            {/* CLINICAL TAB */}
            {activeTab === "clinical" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Clinical Records</h2>
                </div>

                {["admin", "doctor", "nurse"].includes(currentUser?.role) && (
                  <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4 text-sm">Add New Record</h3>
                    <form onSubmit={handleAddClinical} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                        <select value={clinicalForm.record_type} onChange={e => setClinicalForm({...clinicalForm, record_type: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                          <option value="vitals">Vitals</option>
                          <option value="notes">Notes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Source</label>
                        <input type="text" value={clinicalForm.source} onChange={e => setClinicalForm({...clinicalForm, source: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-slate-700">JSON Data</label>
                          <button type="button" onClick={startListening} className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            {isListening ? 'Listening...' : 'Dictate Notes'}
                          </button>
                        </div>
                        {speechError && <div className="text-xs text-red-500 mb-1">Microphone error: {speechError}</div>}
                        <textarea rows={3} value={clinicalForm.data} onChange={e => setClinicalForm({...clinicalForm, data: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" disabled={isSubmittingClinical} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center">
                          {isSubmittingClinical ? <><Spinner className="w-4 h-4 mr-2" /> Saving...</> : "Save Record"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <ul className="space-y-4">
                  {clinical.slice(0, 2).map((rec) => (
                    <li key={rec.id} className="border border-slate-100 rounded-xl p-5 hover:border-blue-100 hover:shadow-sm transition-all bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 text-xs mr-2 uppercase">
                            {rec.record_type}
                          </span>
                          <span className="text-xs text-slate-500">via {rec.source}</span>
                        </div>
                        {rec.ledger_tx_id && (
                          <div className="flex items-center gap-3">
                            <button onClick={() => {
                              setVerifyingRecord(rec.id);
                              setTimeout(() => setVerifyingRecord(null), 2000);
                            }} className={`text-xs font-medium flex items-center px-2 py-1 rounded transition-colors ${verifyingRecord === rec.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {verifyingRecord === rec.id ? (
                                <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Verified Match</>
                              ) : (
                                <><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> Verify Integrity</>
                              )}
                            </button>
                            <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center">
                              View on Ledger
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          </div>
                        )}
                      </div>
                      <pre className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg overflow-x-auto border border-slate-100">
                        {JSON.stringify(rec.data, null, 2)}
                      </pre>
                    </li>
                  ))}
                  {clinical.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No clinical records found.</div>}
                </ul>
                
                {clinical.length > 2 && (
                  <div className="mt-6 flex justify-center">
                    <button 
                      onClick={() => router.push(`/patients/${id}/clinical`)}
                      className="px-6 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors border border-blue-200"
                    >
                      View all {clinical.length} records
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DIAGNOSTIC TAB */}
            {activeTab === "diagnostic" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Diagnostic Records</h2>
                
                {["admin", "doctor", "lab_scientist"].includes(currentUser?.role) && (
                  <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4 text-sm">Add New Diagnostic</h3>
                  <form onSubmit={handleAddDiagnostic} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Kind</label>
                      <select value={diagnosticForm.kind} onChange={e => { setDiagnosticForm({ kind: e.target.value, summary: "", result_data: {} }); setDiagnosticFields([{ key: "", value: "" }]); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <option value="blood_test">Blood Test</option>
                        <option value="imaging">Imaging</option>
                        <option value="pathology">Pathology</option>
                        <option value="genetics">Genetics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Summary</label>
                      <input type="text" required value={diagnosticForm.summary} onChange={e => setDiagnosticForm({...diagnosticForm, summary: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    </div>
                    
                    {diagnosticForm.kind === 'blood_test' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Hemoglobin (g/dL)</label>
                            <input type="number" step="0.1" required onChange={e => setDiagnosticForm(prev => ({...prev, result_data: {...prev.result_data, hemoglobin: parseFloat(e.target.value)}}))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">WBC (x10^9/L)</label>
                            <input type="number" step="0.1" required onChange={e => setDiagnosticForm(prev => ({...prev, result_data: {...prev.result_data, wbc: parseFloat(e.target.value)}}))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Platelets</label>
                            <input type="number" required onChange={e => setDiagnosticForm(prev => ({...prev, result_data: {...prev.result_data, platelets: parseInt(e.target.value)}}))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                          </div>
                        </>
                      )}
                      
                      {diagnosticForm.kind === 'imaging' && (
                        <>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Modality</label>
                            <select required onChange={e => setDiagnosticForm(prev => ({...prev, result_data: {...prev.result_data, modality: e.target.value}}))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                              <option value="">Select Modality...</option>
                              <option value="X-Ray">X-Ray</option>
                              <option value="MRI">MRI</option>
                              <option value="CT Scan">CT Scan</option>
                              <option value="Ultrasound">Ultrasound</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Findings</label>
                            <textarea required rows={2} onChange={e => setDiagnosticForm(prev => ({...prev, result_data: {...prev.result_data, findings: e.target.value}}))} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                          </div>
                        </>
                      )}
                      
                      {['pathology', 'genetics', 'other'].includes(diagnosticForm.kind) && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-500 mb-2">Record Data</label>
                          <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-lg">
                            {diagnosticFields.map((field, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <input 
                                  type="text" 
                                  placeholder="Measurement (e.g., Blood Sugar)" 
                                  value={field.key} 
                                  onChange={e => {
                                    const newFields = [...diagnosticFields];
                                    newFields[index].key = e.target.value;
                                    setDiagnosticFields(newFields);
                                  }} 
                                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                />
                                <input 
                                  type="text" 
                                  placeholder="Value (e.g., 90 mg/dL)" 
                                  value={field.value} 
                                  onChange={e => {
                                    const newFields = [...diagnosticFields];
                                    newFields[index].value = e.target.value;
                                    setDiagnosticFields(newFields);
                                  }} 
                                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                                />
                                <button type="button" onClick={() => {
                                  const newFields = [...diagnosticFields];
                                  newFields.splice(index, 1);
                                  setDiagnosticFields(newFields);
                                }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => setDiagnosticFields([...diagnosticFields, { key: "", value: "" }])} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add Field
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="sm:col-span-2 pt-2">
                        <button type="submit" disabled={isSubmittingDiagnostic} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center justify-center">
                        {isSubmittingDiagnostic ? <><Spinner className="w-4 h-4 mr-2" /> Saving...</> : "Save Diagnostic"}
                      </button>
                    </div>
                  </form>
                </div>
                )}

                <div className="space-y-4">
                  {diagnostic.slice(0, 2).map((rec) => (
                    <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 hover:border-blue-100 hover:shadow-md transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 uppercase">
                            {rec.kind.replace('_', ' ')}
                          </span>
                          {rec.ledger_tx_id && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => {
                                setVerifyingRecord(rec.id);
                                setTimeout(() => setVerifyingRecord(null), 2000);
                              }} className={`text-[10px] font-bold uppercase tracking-wide flex items-center px-2 py-0.5 rounded transition-colors ${verifyingRecord === rec.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {verifyingRecord === rec.id ? 'Verified Match' : 'Verify'}
                              </button>
                              <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-1" title="View on Ledger">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 mb-1">
                          {rec.summary}
                        </div>
                        
                        <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                          {rec.result_data && Object.keys(rec.result_data).length > 0 ? (
                            <table className="w-full text-xs text-left">
                              <tbody>
                                {Object.entries(rec.result_data).map(([k, v]) => (
                                  <tr key={k} className="border-b border-slate-100 last:border-0">
                                    <td className="py-1 font-medium text-slate-500 capitalize">{k.replace(/_/g, ' ')}</td>
                                    <td className="py-1 font-bold text-slate-900 text-right">{String(v)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-slate-400 text-xs italic">No structured data provided</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {diagnostic.length > 2 && (
                  <div className="mt-6 flex justify-center">
                    <button onClick={() => router.push(`/patients/${id}/diagnostic`)} className="text-sm font-medium text-blue-600 bg-blue-50 px-6 py-2 rounded-full hover:bg-blue-100 transition-colors flex items-center">
                      View all {diagnostic.length} diagnostic records
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
                {diagnostic.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No diagnostic records found.</div>}
                
                {/* PRESCRIPTIONS SECTION */}
                <div className="mt-12">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Prescriptions</h2>
                  
                  {["admin", "doctor"].includes(currentUser?.role) && (
                    <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200">
                      <h3 className="font-semibold text-slate-900 mb-4 text-sm">Write New Prescription</h3>
                      <form onSubmit={handleAddPrescription} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Medication Name</label>
                          <input type="text" required value={prescriptionForm.medication} onChange={e => setPrescriptionForm({...prescriptionForm, medication: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. Amoxicillin" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Dosage</label>
                          <input type="text" required value={prescriptionForm.dosage} onChange={e => setPrescriptionForm({...prescriptionForm, dosage: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. 500mg" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Instructions</label>
                          <input type="text" required value={prescriptionForm.instructions} onChange={e => setPrescriptionForm({...prescriptionForm, instructions: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. Twice daily after meals" />
                        </div>
                        <div className="sm:col-span-2 pt-2">
                          <button type="submit" disabled={isSubmittingPrescription} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center justify-center">
                            {isSubmittingPrescription ? <><Spinner className="w-4 h-4 mr-2" /> Saving...</> : "Prescribe Medication"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="space-y-4">
                    {prescriptions.map((rec) => (
                      <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-100 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900 text-lg mb-1">{rec.medication} <span className="text-sm font-medium text-slate-500 ml-2">{rec.dosage}</span></div>
                            <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 inline-block mb-2">
                              <span className="font-semibold mr-1">Sig:</span> {rec.instructions}
                            </div>
                            <div className="text-xs text-slate-400">Prescribed by {rec.prescribed_by_user_id}</div>
                          </div>
                          {rec.ledger_tx_id && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => {
                                setVerifyingRecord(rec.id);
                                setTimeout(() => setVerifyingRecord(null), 2000);
                              }} className={`text-xs font-medium flex items-center px-2 py-1 rounded transition-colors ${verifyingRecord === rec.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {verifyingRecord === rec.id ? 'Verified Match' : 'Verify'}
                              </button>
                              <a href={`https://hashscan.io/testnet/transaction/${rec.ledger_tx_id}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-1 rounded">
                                On Ledger
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {prescriptions.length === 0 && <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">No prescriptions recorded.</div>}
                  </div>
                </div>
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === "appointments" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Appointments</h2>
                
                {["admin", "secretary", "doctor", "patient"].includes(currentUser?.role) && (
                  <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200">
                    <h3 className="font-semibold text-slate-900 mb-4 text-sm">
                      {currentUser?.role === "patient" ? "Request an Appointment" : "Schedule Appointment"}
                    </h3>
                    <form onSubmit={handleAddAppointment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {currentUser?.role !== "doctor" && (
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            {currentUser?.role === "patient" ? "Preferred Doctor (Optional)" : "Assign Doctor"}
                          </label>
                          <select 
                            required={currentUser?.role !== "patient"} 
                            value={appointmentForm.doctor_id} 
                            onChange={e => setAppointmentForm({...appointmentForm, doctor_id: e.target.value})} 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="">{currentUser?.role === "patient" ? "No preference" : "Select a doctor..."}</option>
                            {doctors.map(doc => (
                              <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.role})</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          {currentUser?.role === "patient" ? "Preferred Time (Optional)" : "Scheduled At"}
                        </label>
                        <input 
                          type="datetime-local" 
                          required={currentUser?.role !== "patient"} 
                          value={appointmentForm.scheduled_at} 
                          onChange={e => setAppointmentForm({...appointmentForm, scheduled_at: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Visit</label>
                        <input 
                          type="text" 
                          required 
                          value={appointmentForm.reason} 
                          onChange={e => setAppointmentForm({...appointmentForm, reason: e.target.value})} 
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
                          placeholder="e.g. Annual Checkup, Follow-up for Hypertension" 
                        />
                      </div>
                      
                      <div className="sm:col-span-2 pt-2">
                        <button type="submit" disabled={isSubmittingAppointment} className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center justify-center">
                          {isSubmittingAppointment ? <><Spinner className="w-4 h-4 mr-2" /> Processing...</> : (currentUser?.role === "patient" ? "Request Appointment" : "Schedule Appointment")}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-4">
                  {appointments.filter((appt) => ["admin", "secretary"].includes(currentUser?.role) || currentUser?.role === "patient" || appt.doctor_id === currentUser?.id).map((appt) => (
                    <div key={appt.id} className={`border border-slate-200 rounded-xl p-5 shadow-sm transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4 ${appt.status === 'requested' ? 'bg-orange-50/50 hover:border-orange-200' : 'bg-white hover:border-blue-100'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase
                            ${appt.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                              appt.status === 'completed' ? 'bg-green-100 text-green-800' : 
                              appt.status === 'requested' ? 'bg-orange-100 text-orange-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {appt.status}
                          </span>
                          {appt.scheduled_at && <span className="text-sm font-bold text-slate-900">{new Date(appt.scheduled_at).toLocaleString()}</span>}
                          {!appt.scheduled_at && <span className="text-sm font-semibold text-orange-600 italic">Pending Assignment</span>}
                        </div>
                        <div className="text-sm text-slate-700 font-medium">{appt.reason}</div>
                        <div className="text-xs text-slate-500 mt-1">Doctor: {appt.doctor_id || 'Unassigned'}</div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {/* Status update actions for Admin/Secretary/Doctor */}
                        {["admin", "secretary", "doctor"].includes(currentUser?.role) && appt.status === 'scheduled' && (
                          <div className="flex gap-2">
                            <button onClick={async () => {
                              try {
                                await updateAppointment(id, appt.id, { status: "completed" });
                                fetchData();
                              } catch (e: any) { alert(e.message); }
                            }} className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                              Complete
                            </button>
                            <button onClick={async () => {
                              try {
                                await updateAppointment(id, appt.id, { status: "cancelled" });
                                fetchData();
                              } catch (e: any) { alert(e.message); }
                            }} className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                              Cancel
                            </button>
                          </div>
                        )}
                        
                        {/* Assignment actions for Admin/Secretary when status is REQUESTED */}
                        {["admin", "secretary"].includes(currentUser?.role) && appt.status === 'requested' && (
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const docId = formData.get("doc_id") as string;
                            const schedAt = formData.get("sched_at") as string;
                            if (!docId || !schedAt) {
                              alert("Please assign both doctor and time to confirm.");
                              return;
                            }
                            try {
                              await updateAppointment(id, appt.id, { status: "scheduled", doctor_id: docId, scheduled_at: schedAt });
                              fetchData();
                            } catch (err: any) { alert(err.message); }
                          }} className="flex items-center gap-2 mt-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <select name="doc_id" required defaultValue={appt.doctor_id || ""} className="text-xs px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Assign Doc...</option>
                              {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.full_name}</option>)}
                            </select>
                            <input name="sched_at" type="datetime-local" required defaultValue={appt.scheduled_at ? appt.scheduled_at.slice(0, 16) : ""} className="text-xs px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            <button type="submit" className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">Confirm</button>
                          </form>
                        )}
                      </div>
                    </div>
                  ))}
                  {appointments.filter((appt) => ["admin", "secretary"].includes(currentUser?.role) || currentUser?.role === "patient" || appt.doctor_id === currentUser?.id).length === 0 && <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50/50">No appointments scheduled or requested.</div>}
                </div>
              </div>
            )}

            {/* GRANTS TAB */}
            {activeTab === "grants" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Access Control</h2>
                
                <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-4 text-sm">Grant Access</h3>
                  <form onSubmit={handleGrantAccess} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">User ID</label>
                      <input type="text" required value={grantForm.grantee_user_id} onChange={e => setGrantForm({...grantForm, grantee_user_id: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. nurse@medchain.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Scope</label>
                      <select value={grantForm.scope} onChange={e => setGrantForm({...grantForm, scope: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                        <option value="clinical">Clinical Only</option>
                        <option value="diagnostic">Diagnostic Only</option>
                        <option value="administrative">Administrative</option>
                        <option value="all">All Access</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button type="submit" disabled={isSubmittingGrant} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center">
                        {isSubmittingGrant ? <><Spinner className="w-4 h-4 mr-2" /> Granting...</> : "Grant Permission"}
                      </button>
                    </div>
                  </form>
                </div>

                <ul className="space-y-4">
                  {grants.map((grant) => (
                    <li key={grant.id} className="border border-slate-100 rounded-xl p-5 flex justify-between items-center bg-white shadow-sm">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{grant.grantee_user_id}</div>
                        <div className="text-xs text-slate-500 mt-1">Scope: <span className="font-medium text-slate-700 uppercase">{grant.scope}</span></div>
                      </div>
                      {grant.ledger_tx_id && (
                        <a href={`https://hashscan.io/testnet/transaction/${grant.ledger_tx_id}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-slate-500 hover:text-blue-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          Verify Auth
                        </a>
                      )}
                    </li>
                  ))}
                  {grants.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">No active grants.</div>}
                </ul>
              </div>
            )}

            {/* IOT TAB */}
            {activeTab === "iot" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">IoT Device Simulation</h2>
                <p className="text-sm text-slate-600 mb-8">
                  Simulate connected medical devices transmitting telemetry data to the MedChain ledger.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Manual Simulation */}
                  <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      Manual Snapshot
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Trigger a single instantaneous reading from the patient&apos;s simulated monitor.</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleIotAction('reading')} disabled={submittingIotAction !== null} className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors border border-slate-200 disabled:opacity-50 flex items-center justify-center">
                        {submittingIotAction === 'reading' ? <><Spinner className="w-4 h-4 mr-2" /> Reading...</> : "Normal Reading"}
                      </button>
                      <button onClick={() => handleIotAction('reading', true)} disabled={submittingIotAction !== null} className="flex-1 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50 flex items-center justify-center">
                        {submittingIotAction === 'alert' ? <><Spinner className="w-4 h-4 mr-2 text-red-700" /> Alerting...</> : "Force Alert"}
                      </button>
                    </div>
                  </div>

                  {/* Continuous Simulation */}
                  <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                      Continuous Stream
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Start a background process to stream live vitals every few seconds to the ledger.</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleIotAction('start')} disabled={submittingIotAction !== null} className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm shadow-green-200 disabled:opacity-50 flex items-center justify-center">
                        {submittingIotAction === 'start' ? <><Spinner className="w-4 h-4 mr-2" /> Starting...</> : "Start Stream"}
                      </button>
                      <button onClick={() => handleIotAction('stop')} disabled={submittingIotAction !== null} className="flex-1 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 flex items-center justify-center">
                        {submittingIotAction === 'stop' ? <><Spinner className="w-4 h-4 mr-2" /> Stopping...</> : "Stop"}
                      </button>
                    </div>
                  </div>

                </div>
                
                {/* Advanced Controls */}
                <div className="mt-6 border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-900 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Simulation Parameters
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Condition Preset</span>
                      <select 
                        value={iotPreset}
                        onChange={(e) => applyIotPreset(e.target.value)}
                        className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
                        disabled={isUpdatingSettings}
                      >
                        <option value="normal">Normal Healthy</option>
                        <option value="high_bp">Hypertension (High BP)</option>
                        <option value="low_bp">Hypotension (Low BP)</option>
                        <option value="tachycardia">Tachycardia (High HR)</option>
                        <option value="bradycardia">Bradycardia (Low HR)</option>
                        <option value="custom">Custom Configuration...</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Heart Rate</label>
                        <span className="text-xs font-bold text-slate-900">{iotSettings.hr_base} BPM</span>
                      </div>
                      <input type="range" min="30" max="200" value={iotSettings.hr_base} onChange={(e) => handleSliderChange(e, 'hr_base')} onMouseUp={submitCustomSettings} onTouchEnd={submitCustomSettings} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">SpO2</label>
                        <span className="text-xs font-bold text-slate-900">{iotSettings.spo2_base}%</span>
                      </div>
                      <input type="range" min="70" max="100" value={iotSettings.spo2_base} onChange={(e) => handleSliderChange(e, 'spo2_base')} onMouseUp={submitCustomSettings} onTouchEnd={submitCustomSettings} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Systolic BP</label>
                        <span className="text-xs font-bold text-slate-900">{iotSettings.sys_base} mmHg</span>
                      </div>
                      <input type="range" min="60" max="220" value={iotSettings.sys_base} onChange={(e) => handleSliderChange(e, 'sys_base')} onMouseUp={submitCustomSettings} onTouchEnd={submitCustomSettings} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Diastolic BP</label>
                        <span className="text-xs font-bold text-slate-900">{iotSettings.dia_base} mmHg</span>
                      </div>
                      <input type="range" min="30" max="140" value={iotSettings.dia_base} onChange={(e) => handleSliderChange(e, 'dia_base')} onMouseUp={submitCustomSettings} onTouchEnd={submitCustomSettings} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 text-center flex items-center justify-center">
                  New readings will automatically appear in the <button onClick={() => setActiveTab('clinical')} className="font-medium text-blue-600 hover:underline">Clinical Records</button> tab.
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      <EKGModal 
        isOpen={showEkgModal} 
        onClose={() => setShowEkgModal(false)} 
        onStop={() => { handleIotAction('stop'); setShowEkgModal(false); }} 
        patientId={id}
      />
    </div>
  );
}

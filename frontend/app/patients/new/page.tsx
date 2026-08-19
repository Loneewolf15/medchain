"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient, register } from "@/lib/api";
import Spinner from "@/components/Spinner";

function generatePassword(length = 8) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}

export default function NewPatientPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "male",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{email: string, password: string, patientId: string} | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // 1. Generate patient credentials
      const cleanName = formData.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const email = `${cleanName}@patient.medchain.com`;
      const password = generatePassword();
      
      // 2. Register user account for patient
      const user = await register({
        email,
        password,
        full_name: formData.full_name,
        role: "patient"
      });

      // 3. Create Patient Record linked to user
      const p = await createPatient({
        ...formData,
        user_id: user.id
      });
      
      // Show credentials modal instead of redirecting immediately
      setCredentials({ email, password, patientId: p.id });
      setIsSubmitting(false);
    } catch (err: any) {
      alert("Failed to create patient: " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <button onClick={() => router.back()} className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center mb-6 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Registry
        </button>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Admit New Patient</h1>
        <p className="text-slate-500 mt-2 text-base">Enter the patient&apos;s primary details to initialize their secure record.</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-200/80 text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
              <input type="date" required value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-200/80 text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-200/80 text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-200/80 text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" placeholder="123 Main St, City" />
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100/80 flex flex-col sm:flex-row gap-4 sm:justify-end">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-6 py-3.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 text-center disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center disabled:opacity-50 flex items-center justify-center min-w-[180px]">
              {isSubmitting ? (
                <>
                  <Spinner className="w-5 h-5 mr-2" />
                  Saving...
                </>
              ) : (
                "Save Patient Record"
              )}
            </button>
          </div>
        </form>
      </div>

      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-900 mb-2">Patient Admitted</h3>
            <p className="text-center text-slate-500 mb-6">The patient record has been successfully initialized on the ledger. Please securely provide these portal credentials to the patient.</p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
              <div className="mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username / Email</span>
                <div className="text-slate-900 font-mono font-medium mt-1">{credentials.email}</div>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Temporary Password</span>
                <div className="text-slate-900 font-mono font-medium mt-1 select-all">{credentials.password}</div>
              </div>
            </div>

            <button 
              onClick={() => router.push(`/patients/${credentials.patientId}`)} 
              className="w-full bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Proceed to Patient Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

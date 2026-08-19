"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, listUsers, register, getSystemSettings, updateSystemSettings } from "@/lib/api";
import Spinner from "@/components/Spinner";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [ledgerMode, setLedgerMode] = useState<string>("hcs");
  const [isUpdatingLedger, setIsUpdatingLedger] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "doctor"
  });

  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.role !== "admin") {
          router.push("/dashboard");
          return;
        }
        setUser(u);
        
        getSystemSettings().then(s => setLedgerMode(s.ledger_mode)).catch(console.error);
        
        return listUsers();
      })
      .then(setAllUsers)
      .catch(() => router.push("/login"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const toggleLedgerMode = async (mode: string) => {
    if (isUpdatingLedger) return;
    setIsUpdatingLedger(true);
    try {
      const res = await updateSystemSettings({ mode });
      setLedgerMode(res.mode);
      alert(`Ledger mode updated to: ${res.mode}`);
    } catch (err: any) {
      alert("Failed to update ledger mode: " + err.message);
    } finally {
      setIsUpdatingLedger(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await register(formData);
      setFormData({ full_name: "", email: "", password: "", role: "doctor" });
      const updatedUsers = await listUsers();
      setAllUsers(updatedUsers);
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Admin Settings</h1>
        <p className="text-slate-500 mt-2 text-base">Manage staff accounts and system roles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Controls */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Ledger Mode Switcher */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden p-6 relative">
            {isUpdatingLedger && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <Spinner className="w-8 h-8 text-blue-600" />
              </div>
            )}
            <h2 className="text-lg font-bold text-slate-900 mb-2">Blockchain Backend</h2>
            <p className="text-sm text-slate-500 mb-6">Switch between active ledger strategies.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => toggleLedgerMode('hcs')}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${ledgerMode === 'hcs' ? 'border-blue-600 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-bold ${ledgerMode === 'hcs' ? 'text-blue-900' : 'text-slate-700'}`}>Hedera Consensus Service</div>
                    <div className={`text-xs mt-1 ${ledgerMode === 'hcs' ? 'text-blue-700' : 'text-slate-500'}`}>High throughput audit trail</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${ledgerMode === 'hcs' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {ledgerMode === 'hcs' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => toggleLedgerMode('smart_contract')}
                className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all ${ledgerMode === 'smart_contract' ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-bold ${ledgerMode === 'smart_contract' ? 'text-indigo-900' : 'text-slate-700'}`}>Smart Contract</div>
                    <div className={`text-xs mt-1 ${ledgerMode === 'smart_contract' ? 'text-indigo-700' : 'text-slate-500'}`}>EVM state execution</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${ledgerMode === 'smart_contract' ? 'border-indigo-600' : 'border-slate-300'}`}>
                    {ledgerMode === 'smart_contract' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Create Staff Form */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Create New Staff</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white" placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white" placeholder="jane@medchain.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
              <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 focus:bg-white">
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="lab_scientist">Lab Scientist</option>
                <option value="patient">Patient (Manual)</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 mt-4">
              {isSubmitting ? <><Spinner className="w-4 h-4 mr-2" /> Registering...</> : "Create User"}
            </button>
          </form>
          </div>
        </div>

        {/* User List */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
          <div className="p-6 border-b border-slate-100/50">
            <h2 className="text-lg font-bold text-slate-900">System Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-500">
              <thead className="bg-slate-50/50 text-xs uppercase text-slate-400 font-bold tracking-widest border-b border-slate-100/50">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
                        ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                          u.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                          u.role === 'nurse' ? 'bg-teal-100 text-teal-800' :
                          u.role === 'lab_scientist' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

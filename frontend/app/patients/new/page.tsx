"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient } from "@/lib/api";

export default function NewPatientPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "male",
    address: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const p = await createPatient(formData);
      router.push(`/patients/${p.id}`);
    } catch (err) {
      alert("Failed to create patient");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admit New Patient</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input type="date" required value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
        </div>
        <div className="pt-4 flex gap-4">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border rounded-md">Cancel</button>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Admit</button>
        </div>
      </form>
    </div>
  );
}

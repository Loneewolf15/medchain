import React, { useEffect, useState } from "react";
import { listClinicalRecords, updateIotSettings } from "@/lib/api";
import Spinner from "./Spinner";

interface EKGModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStop: () => void;
  patientId: string;
}

export default function EKGModal({ isOpen, onClose, onStop, patientId }: EKGModalProps) {
  const [bpm, setBpm] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [sys, setSys] = useState(120);
  const [dia, setDia] = useState(80);
  const [isAlert, setIsAlert] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Poll for the latest clinical record every second to update the monitor
    const fetchLatest = async () => {
      try {
        const records = await listClinicalRecords(patientId);
        if (records && records.length > 0) {
          const latest = records[0];
          if (latest.record_type === 'vitals' && latest.data) {
            setBpm(latest.data.heart_rate);
            setSpo2(latest.data.spo2);
            setSys(latest.data.systolic);
            setDia(latest.data.diastolic);
            setIsAlert(latest.data.is_alert || false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch EKG updates", err);
      }
    };
    
    fetchLatest();
    const interval = setInterval(fetchLatest, 1500);
    return () => clearInterval(interval);
  }, [isOpen, patientId]);

  const animationDuration = Math.max(0.5, Math.min(3, 60 / (bpm || 72))).toFixed(2);

  const handleInduce = async (preset: string, settings: {hr_base: number, sys_base: number, dia_base: number, spo2_base: number}) => {
    setUpdating(preset);
    try {
      await updateIotSettings(patientId, settings);
    } catch (err) {
      console.error("Failed to update simulation settings", err);
    } finally {
      setUpdating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <h2 className="text-white font-mono font-bold tracking-widest text-sm">IoT CONTINUOUS STREAM</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="relative h-64 w-full bg-slate-900 overflow-hidden flex items-center">
          {/* Grid background */}
          <div className="absolute inset-0 z-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          {/* SVG EKG Line */}
          <svg className="w-full h-full z-10" preserveAspectRatio="none" viewBox="0 0 500 100">
            {/* 
              A simple CSS-animated dash array approach to simulate a moving EKG.
              Real EKG path: flat, dip, spike, dip, flat, small bump, flat.
            */}
            <path
              d="M0 50 L50 50 L60 30 L70 90 L80 10 L90 70 L100 50 L120 50 L130 45 L140 50 L200 50 L250 50 L260 30 L270 90 L280 10 L290 70 L300 50 L320 50 L330 45 L340 50 L400 50 L450 50 L460 30 L470 90 L480 10 L490 70 L500 50"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinejoin="round"
              className="animate-ekg"
              style={{
                strokeDasharray: '500',
                strokeDashoffset: '500',
                animation: `ekg-draw ${animationDuration}s linear infinite`,
                stroke: isAlert ? '#ef4444' : '#22c55e'
              }}
            />
          </svg>
          
          {/* Heart rate text */}
          <div className="absolute top-4 right-6 text-right z-20">
            <div className={`font-mono text-4xl font-bold transition-colors duration-300 ${isAlert || bpm > 100 || bpm < 60 ? 'text-red-500' : 'text-green-500'}`}>
              {bpm} <span className="text-lg">BPM</span>
            </div>
            <div className={`font-mono text-xs ${isAlert || bpm > 100 || bpm < 60 ? 'text-red-600/70' : 'text-green-600/70'}`}>Heart Rate</div>
          </div>
          <div className="absolute bottom-4 right-6 text-right z-20 flex gap-6">
            <div>
              <div className={`font-mono text-2xl font-bold transition-colors duration-300 ${sys > 140 || dia > 90 ? 'text-orange-500' : 'text-blue-400'}`}>
                {sys}/{dia}
              </div>
              <div className={`font-mono text-xs ${sys > 140 || dia > 90 ? 'text-orange-600/70' : 'text-blue-500/70'}`}>BP (mmHg)</div>
            </div>
            <div>
              <div className={`font-mono text-2xl font-bold transition-colors duration-300 ${spo2 < 92 ? 'text-orange-500' : 'text-blue-400'}`}>
                {spo2}<span className="text-sm">%</span>
              </div>
              <div className={`font-mono text-xs ${spo2 < 92 ? 'text-orange-600/70' : 'text-blue-500/70'}`}>SpO2</div>
            </div>
          </div>
        </div>
        
        {/* Simulation Controls Panel */}
        <div className="bg-slate-900 border-t border-slate-800 p-4">
          <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Simulation Controls</div>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => handleInduce('normal', {hr_base: 72, sys_base: 120, dia_base: 80, spo2_base: 98})}
              disabled={updating !== null}
              className="flex items-center justify-center py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-colors disabled:opacity-50"
            >
              {updating === 'normal' ? <Spinner className="w-4 h-4" /> : "Normalize"}
            </button>
            <button 
              onClick={() => handleInduce('hypertension', {hr_base: 110, sys_base: 180, dia_base: 110, spo2_base: 95})}
              disabled={updating !== null}
              className="flex items-center justify-center py-2 px-3 bg-orange-900/40 hover:bg-orange-900/60 text-orange-400 rounded-lg text-sm border border-orange-800 transition-colors disabled:opacity-50"
            >
              {updating === 'hypertension' ? <Spinner className="w-4 h-4" /> : "Induce Hypertension"}
            </button>
            <button 
              onClick={() => handleInduce('hypoxia', {hr_base: 130, sys_base: 100, dia_base: 60, spo2_base: 85})}
              disabled={updating !== null}
              className="flex items-center justify-center py-2 px-3 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded-lg text-sm border border-red-800 transition-colors disabled:opacity-50"
            >
              {updating === 'hypoxia' ? <Spinner className="w-4 h-4" /> : "Induce Hypoxia"}
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <p className="text-slate-500 text-xs font-mono flex items-center">
            {isAlert && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span>}
            {isAlert ? "ANOMALY DETECTED: Anchoring alert to Hedera Ledger..." : "Transmitting telemetry to MedChain ledger..."}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              Hide Monitor
            </button>
            <button onClick={() => { onStop(); onClose(); }} className="px-4 py-2 bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-medium hover:bg-red-900/80 transition-colors">
              Stop Stream
            </button>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ekg-draw {
          0% { stroke-dashoffset: 500; opacity: 1; }
          90% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}} />
    </div>
  );
}

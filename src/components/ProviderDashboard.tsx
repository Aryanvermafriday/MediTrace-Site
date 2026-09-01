import React from 'react';
import { 
  Stethoscope, 
  Sparkles, 
  Building2, 
  Activity, 
  Pill, 
  FileText, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Eye,
  TrendingUp,
  Download,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { PatientProfile, MedicalRecord, Language } from '../types';
import { translations } from '../data/translations';
import { BackButton } from './common/BackButton';

interface ProviderDashboardProps {
  patient: PatientProfile;
  records: MedicalRecord[];
  language: Language;
  onOpenReferral: () => void;
  onSelectRecord: (rec: MedicalRecord) => void;
  onOpenUpload: () => void;
  onBack?: () => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({
  patient,
  records,
  language,
  onOpenReferral,
  onSelectRecord,
  onOpenUpload,
  onBack,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const allMedicines = records
    .flatMap(r => r.medicines)
    .filter(m => m.status === 'active');

  const allInvestigations = records
    .flatMap(r => r.investigations);

  return (
    <div className="space-y-6">
      {/* Healthcare Provider Clinical Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <BackButton
                onClick={onBack}
                label={isHindi ? 'होम' : 'Patient Home'}
                ariaLabel="Back to Patient Home"
                variant="header"
              />
            )}
            <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-black shadow-md shadow-teal-500/20 shrink-0">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {t.providerTitle}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-400/30 shrink-0">
                  Doctor / Referral OPD
                </span>
              </div>
              <p className="text-xs text-teal-200/90 font-medium mt-1">
                {t.providerSubtitle} — {patient.name} ({patient.age}M, {patient.bloodGroup})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenReferral}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-400/30"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t.generateReferral}</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              + Ingest Facility Slip
            </button>
          </div>
        </div>
      </div>

      {/* Critical Clinical Red Flags Bar */}
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-red-950 text-sm">
              CRITICAL DRUG ALLERGY WARNING: {patient.allergies && patient.allergies.length > 0 ? patient.allergies[0] : 'None Recorded'}
            </div>
            <p className="text-red-900 mt-0.5 font-semibold">
              {patient.allergies && patient.allergies.length > 0 
                ? 'Avoid Sulfa-based antimicrobials & sulfonylureas. Manifests as facial edema and cutaneous eruptions.'
                : 'No critical drug allergies or anaphylactic contraindications recorded.'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-red-200 text-red-950 font-black rounded-lg text-xs self-start sm:self-center shrink-0">
          Strict Contraindication
        </span>
      </div>

      {/* 60-Second Clinical Trajectory & Multi-Facility Journey */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-base">
            <Clock className="w-5 h-5 text-teal-700" />
            <span>{t.quickSummary} (Multi-Facility Continuum)</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Chronologically Reconstructed from 4 Ingested Slips
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {records.map((rec, i) => (
            <div
              key={rec.id}
              onClick={() => onSelectRecord(rec)}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{rec.recordDate}</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold">
                    {rec.recordType}
                  </span>
                </div>
                <div className="font-extrabold text-slate-900 text-xs">{rec.facility}</div>
                <div className="text-[11px] text-teal-800 font-bold mt-1">{rec.doctorName}</div>
                <p className="text-slate-600 mt-1 line-clamp-2">{rec.diagnosis}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-teal-700 font-bold text-[11px]">
                <span>View Full Record</span>
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Medication Reconciliation Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-base">
            <Pill className="w-5 h-5 text-emerald-700" />
            <span>{t.medReconciliation}</span>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
            {allMedicines.length} Active Prescriptions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-extrabold">
                <th className="p-3">Medication Name</th>
                <th className="p-3">Dosage</th>
                <th className="p-3">Regimen (Frequency)</th>
                <th className="p-3">Indication / Purpose</th>
                <th className="p-3">Prescribing Facility</th>
                <th className="p-3">Prescribed Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {allMedicines.map((med, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3 font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>{med.name}</span>
                  </td>
                  <td className="p-3 font-bold text-teal-800">{med.dosage}</td>
                  <td className="p-3 font-semibold">{med.frequency} ({med.timingNotes || 'With food'})</td>
                  <td className="p-3 text-slate-600">{med.purpose}</td>
                  <td className="p-3 text-slate-600">{med.prescribedFacility}</td>
                  <td className="p-3 font-mono text-slate-500">{med.prescribedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Diagnostic Trends & Lab Markers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-base">
            <Activity className="w-5 h-5 text-amber-700" />
            <span>{t.labTrends} & Serial Biomarkers</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Multi-Facility Lab Ingestion
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Hb */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="text-[11px] font-bold text-amber-900 uppercase">Hemoglobin (Hb)</div>
            <div className="text-2xl font-black text-amber-950 mt-1">10.2 g/dL</div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-amber-800 font-semibold">
              <span>Status: Low</span>
              <span>Ref: 13.0 - 17.0</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">PHC Lakhimpur (12 Aug 2026)</div>
          </div>

          {/* Fasting Sugar */}
          <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
            <div className="text-[11px] font-bold text-red-900 uppercase">Fasting Glucose (FBS)</div>
            <div className="text-2xl font-black text-red-950 mt-1">148 mg/dL</div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-red-800 font-semibold">
              <span>Status: Elevated</span>
              <span>Ref: 70 - 100</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">PHC Lakhimpur (12 Aug 2026)</div>
          </div>

          {/* HbA1c */}
          <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
            <div className="text-[11px] font-bold text-red-900 uppercase">Glycated Hb (HbA1c)</div>
            <div className="text-2xl font-black text-red-950 mt-1">7.8 %</div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-red-800 font-semibold">
              <span>Status: Suboptimal</span>
              <span>Target: &lt; 5.7%</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">PHC Lakhimpur (12 Aug 2026)</div>
          </div>

          {/* 12-Lead ECG */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
            <div className="text-[11px] font-bold text-purple-900 uppercase">12-Lead ECG</div>
            <div className="text-sm font-black text-purple-950 mt-1">Sinus Rhythm, ST-T changes</div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-purple-800 font-semibold">
              <span>HR: 76 bpm</span>
              <span>Non-specific V4-V6</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">District Hospital (18 Aug 2026)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

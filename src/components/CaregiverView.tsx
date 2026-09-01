import React from 'react';
import { 
  Users, 
  Upload, 
  Pill, 
  Sparkles, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Phone,
  HelpCircle
} from 'lucide-react';
import { PatientProfile, MedicalRecord, Language } from '../types';
import { translations } from '../data/translations';
import { BackButton } from './common/BackButton';

interface CaregiverViewProps {
  patient: PatientProfile;
  records: MedicalRecord[];
  language: Language;
  onOpenUpload: () => void;
  onOpenReferral: () => void;
  onOpenEmergency: () => void;
  onOpenPermissions: () => void;
  onSelectRecord: (rec: MedicalRecord) => void;
  onBack?: () => void;
}

export const CaregiverView: React.FC<CaregiverViewProps> = ({
  patient,
  records,
  language,
  onOpenUpload,
  onOpenReferral,
  onOpenEmergency,
  onOpenPermissions,
  onSelectRecord,
  onBack,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';
  const caregiver = (patient.caregivers && patient.caregivers.length > 0) ? patient.caregivers[0] : null;

  const activeMedicines = records
    .flatMap(r => r.medicines)
    .filter(m => m.status === 'active');

  const caregiverInitials = caregiver
    ? (caregiver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CG')
    : 'CG';

  return (
    <div className="space-y-6">
      {/* Caregiver Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm">
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
            <div className="w-16 h-16 rounded-2xl bg-violet-600/80 border border-violet-400/40 flex items-center justify-center text-white text-2xl font-black shrink-0">
              {caregiverInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  {caregiver 
                    ? (isHindi ? (caregiver.nameHindi || caregiver.name) : caregiver.name)
                    : (isHindi ? 'अधिकृत देखभालकर्ता' : 'Authorized Caregiver')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold border border-violet-400/30 shrink-0">
                  {isHindi ? 'अधिकृत देखभालकर्ता' : 'Authorized Caregiver'}
                </span>
              </div>
              <p className="text-xs text-violet-200/90 font-medium mt-1">
                {isHindi 
                  ? `मरीज: ${patient.nameHindi || patient.name} (उम्र ${patient.age} वर्ष, ${patient.bloodGroup}) के मेडिकल रिकॉर्ड संभालने में सहायक`
                  : `Managing portable continuity records for: ${patient.name} (${patient.age} yrs, ${patient.bloodGroup})`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenPermissions}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer border border-white/15"
            >
              {t.caregiverTitle}
            </button>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>{isHindi ? 'पिताजी का नया पर्चा अपलोड करें' : 'Upload Patient Slip'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Helper Guidance Cards for Family Caregiver */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Daily Medicine Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
              <Pill className="w-5 h-5 text-emerald-600" />
              <span>{isHindi ? 'दवाइयाँ देने का समय (आज)' : "Today's Medicine Schedule"}</span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              {activeMedicines.length} Active
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {activeMedicines.map((m, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{m.name} ({m.dosage})</div>
                  <div className="text-[11px] text-slate-500">{m.timingNotes || m.purpose}</div>
                </div>
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {m.frequency}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Hospital Referral Assistance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm mb-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>{isHindi ? 'अस्पताल रेफरल सहायता' : 'Referral Sheet Ready'}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {isHindi 
                ? 'जब आप मरीज को जिला या बड़े अस्पताल ले जाएं, तो डॉक्टर को दिखाने के लिए AI रेफरल सारांश तैयार रखें।'
                : 'When taking the patient to a district or tertiary hospital, generate this doctor-ready brief so they understand the whole multi-facility story in 60 seconds.'}
            </p>
          </div>

          <button
            onClick={onOpenReferral}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{t.generateReferral}</span>
          </button>
        </div>

        {/* 3. Emergency SOS Readiness */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>{isHindi ? 'इमरजेंसी कार्ड व एलर्जी चेतावनी' : 'Emergency Card & Drug Allergies'}</span>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-900">
              ⚠️ {patient.allergies && patient.allergies.length > 0
                ? (isHindi ? (patient.allergiesHindi?.[0] || patient.allergies[0]) : patient.allergies[0])
                : (isHindi ? 'कोई गंभीर एलर्जी दर्ज नहीं' : 'No Critical Drug Allergies Recorded')}
            </div>
          </div>

          <button
            onClick={onOpenEmergency}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-white" />
            <span>{t.emergencyCard}</span>
          </button>
        </div>
      </div>

      {/* Caregiver Managed Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-base">
            <FileText className="w-5 h-5 text-teal-700" />
            <span>{isHindi ? 'मरीज के सभी सत्यापित पर्चे व रिकॉर्ड्स' : 'Managed Multi-Facility Medical Slips'}</span>
          </div>
          <button
            onClick={onOpenUpload}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 cursor-pointer"
          >
            + {t.uploadRecord}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {records.map((rec) => (
            <div
              key={rec.id}
              onClick={() => onSelectRecord(rec)}
              className="p-4 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{rec.recordDate}</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-bold">
                    {rec.recordType}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{rec.facility}</h4>
                <p className="text-slate-600 mt-1 font-medium">{rec.diagnosis}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-teal-700 font-bold">
                <span>{rec.medicines.length} Medicines • {rec.investigations.length} Tests</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

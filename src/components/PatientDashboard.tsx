import React from 'react';
import { 
  Activity, 
  FileText, 
  Pill, 
  Building2, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Users, 
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import { PatientProfile, MedicalRecord, Language } from '../types';
import { translations } from '../data/translations';

interface PatientDashboardProps {
  patient: PatientProfile;
  records: MedicalRecord[];
  language: Language;
  onNavigate: (section: string) => void;
  onOpenUpload: () => void;
  onOpenReferral: () => void;
  onOpenEmergency: () => void;
  onOpenCaregiver: () => void;
  onOpenSecurity: () => void;
  onSelectRecord: (record: MedicalRecord) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patient,
  records,
  language,
  onNavigate,
  onOpenUpload,
  onOpenReferral,
  onOpenEmergency,
  onOpenCaregiver,
  onOpenSecurity,
  onSelectRecord,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  // Gather active medicines across records
  const allActiveMedicines = records
    .flatMap(r => r.medicines)
    .filter(m => m.status === 'active');

  // Unique facilities
  const facilitiesList = Array.from(new Set(records.map(r => r.facility)));

  return (
    <div className="space-y-6">
      {/* 9 Large Rural-First Touch Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. My Health & Vitals */}
        <button
          onClick={() => onNavigate('health')}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Activity className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              BP & Sugar
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors">
              {t.card_health}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_health_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700">
            <span>BP: 136/86 • Sugar: 148</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2. My Medical Records */}
        <button
          onClick={() => onNavigate('records')}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileText className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {records.length} {isHindi ? 'पर्चे' : 'Records'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {t.card_records}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_records_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>{isHindi ? 'सभी पर्चे देखें' : 'View All Documents'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 3. My Medicines */}
        <button
          onClick={() => onNavigate('medicines')}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Pill className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {allActiveMedicines.length} {isHindi ? 'दवाइयाँ' : 'Active'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
              {t.card_medicines}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_medicines_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>{isHindi ? 'सुबह / रात की खुराक' : 'Daily Schedule'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 4. My Multi-Facility Visits */}
        <button
          onClick={() => onNavigate('visits')}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {facilitiesList.length} {isHindi ? 'अस्पताल' : 'Facilities'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
              {t.card_visits}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_visits_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>{isHindi ? 'उप-केंद्र → पीएचसी → जिला' : 'Sub-Centre → PHC → District'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 5. Health Timeline (Chronological Story) */}
        <button
          onClick={() => onNavigate('timeline')}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <Clock className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold">
              {isHindi ? 'क्रमबद्ध' : 'Chronological'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-cyan-700 transition-colors">
              {t.card_timeline}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_timeline_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cyan-700">
            <span>{isHindi ? 'पूरी यात्रा देखें' : 'View Full Journey'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 6. AI Referral Summary (Killer Feature Highlighted) */}
        <button
          onClick={onOpenReferral}
          className="group text-left p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 border-2 border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-black tracking-wide uppercase">
              AI Powered
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-indigo-950 group-hover:text-indigo-700 transition-colors">
              {t.card_referral}
            </h2>
            <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
              {t.card_referral_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-200 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>{isHindi ? '1-क्लिक में सारांश बनाएं' : 'Generate Doctor Summary'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 7. Emergency Card */}
        <button
          onClick={onOpenEmergency}
          className="group text-left p-5 rounded-2xl bg-red-50/80 border border-red-200 hover:border-red-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-200 text-red-900 text-xs font-black">
              {patient.bloodGroup ? patient.bloodGroup.split(' ')[0] : 'O+'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-red-950 group-hover:text-red-700 transition-colors">
              {t.card_emergency}
            </h2>
            <p className="text-xs text-red-900/80 mt-1 leading-relaxed">
              {t.card_emergency_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-red-200 flex items-center justify-between text-xs font-bold text-red-700">
            <span>{isHindi ? 'पैरामेडिक QR व एलर्जी' : 'QR & Critical Info'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 8. Caregiver Access */}
        <button
          onClick={onOpenCaregiver}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold truncate max-w-[120px]">
              {patient.caregivers && patient.caregivers.length > 0
                ? (isHindi ? (patient.caregivers[0].nameHindi || patient.caregivers[0].name) : patient.caregivers[0].name)
                : (isHindi ? 'कोई परिजन नहीं' : 'No Caregiver')}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">
              {t.card_caregiver}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_caregiver_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-violet-700">
            <span>{isHindi ? 'अनुमतियां प्रबंधित करें' : 'Manage Permissions'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 9. Security & Consent */}
        <button
          onClick={onOpenSecurity}
          className="group text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              {isHindi ? 'सहमति सुरक्षित' : 'Consent Active'}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 group-hover:text-slate-700 transition-colors">
              {t.card_security}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t.card_security_desc}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>{isHindi ? 'डॉक्टर एक्सेस लॉग' : 'View Audit Trail'}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Multi-Facility Journey Snapshot Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              {isHindi ? 'मरीज की बहु-अस्पताल स्वास्थ्य यात्रा (Continuity Journey)' : 'Cross-Facility Medical Journey'}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('timeline')}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
          >
            <span>{isHindi ? 'विस्तृत समयरेखा' : 'Full Timeline'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Multi-facility visual progression */}
        {records.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">
              {isHindi ? 'अभी कोई पर्चा या जांच रिकॉर्ड उपलब्ध नहीं है।' : 'No medical records uploaded yet.'}
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-2 text-xs font-bold text-teal-700 hover:text-teal-800 underline cursor-pointer"
            >
              {isHindi ? 'पहला पर्चा अपलोड करें' : 'Upload your first medical record'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {records.map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className="p-3.5 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span>{rec.recordDate}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    rec.recordType === 'Prescription' ? 'bg-blue-100 text-blue-800' :
                    rec.recordType === 'Diagnostic' ? 'bg-amber-100 text-amber-800' :
                    rec.recordType === 'Consultation' ? 'bg-purple-100 text-purple-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {rec.recordType}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{rec.facility}</h4>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{rec.diagnosis}</p>
                {rec.medicines.length > 0 && (
                  <div className="mt-2 text-[10px] text-teal-800 font-semibold bg-white px-2 py-1 rounded border border-slate-100">
                    💊 {rec.medicines.length} {isHindi ? 'दवाइयाँ लिखी गईं' : 'Medications'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Medicines Rural Visual Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              {isHindi ? 'वर्तमान में चल रही दवाइयों का समय (Active Prescriptions)' : 'Current Active Medications & Daily Timetable'}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {allActiveMedicines.length} {isHindi ? 'सक्रिय दवाएं' : 'active medications'}
          </span>
        </div>

        {allActiveMedicines.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500">
            {isHindi ? 'वर्तमान में कोई सक्रिय दवा दर्ज नहीं है।' : 'No active medications currently recorded.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {allActiveMedicines.map((med, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{med.name}</span>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                      {med.dosage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">{med.purpose}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-slate-800">
                    {med.frequency.includes('morning') || med.frequency.startsWith('1-') ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px]">
                        <Sun className="w-3 h-3" /> {isHindi ? 'सुबह' : 'Morning'}
                      </span>
                    ) : null}
                    {med.frequency.includes('night') || med.frequency.endsWith('-1') ? (
                      <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded text-[11px]">
                        <Moon className="w-3 h-3" /> {isHindi ? 'रात' : 'Night'}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/80 text-[10px] text-slate-500">
                  <span>{isHindi ? 'अस्पताल' : 'From'}: {med.prescribedFacility}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

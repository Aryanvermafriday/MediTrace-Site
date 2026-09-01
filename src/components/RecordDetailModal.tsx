import React from 'react';
import { 
  X, 
  Building2, 
  Calendar, 
  User, 
  FileText, 
  Pill, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  Stethoscope,
  Printer,
  Download,
  Eye,
  AlertCircle
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { MedicalRecord, Language } from '../types';
import { translations } from '../data/translations';

interface RecordDetailModalProps {
  record: MedicalRecord | null;
  onClose: () => void;
  onBack?: () => void;
  previousScreenName?: string;
  language: Language;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onBack,
  previousScreenName,
  language,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  if (!record) return null;

  const handleBack = onBack || onClose;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Top-Left Back Navigation */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel={previousScreenName ? `Back to ${previousScreenName}` : 'Go back to previous view'}
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-600/90 border border-teal-400/40 flex items-center justify-center text-white font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white line-clamp-1">
                  {record.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-200 text-teal-950 text-[10px] font-black uppercase shrink-0">
                  {record.recordType}
                </span>
              </div>
              <p className="text-xs text-teal-200/90 font-medium">
                {record.facility} • {record.recordDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close document modal"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'अस्पताल स्तर' : 'Facility Level'}</div>
              <div className="font-extrabold text-slate-900 mt-0.5">{record.facilityType}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'तारीख' : 'Record Date'}</div>
              <div className="font-extrabold text-slate-900 mt-0.5">{record.recordDate}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'चिकित्सक' : 'Doctor / Officer'}</div>
              <div className="font-extrabold text-slate-900 mt-0.5">{record.doctorName}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{isHindi ? 'सत्यापन स्थिति' : 'Verification'}</div>
              <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified ({record.confidenceScore || 96}%)</span>
              </div>
            </div>
          </div>

          {/* Clinical Impression & Reason for visit */}
          <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100 space-y-2">
            <div>
              <div className="font-extrabold text-teal-950 text-xs uppercase tracking-wider">
                {isHindi ? 'निदान / क्लिनिकल निष्कर्ष' : 'Diagnosis & Clinical Impression'}
              </div>
              <p className="text-slate-900 font-bold text-sm mt-0.5">{record.diagnosis}</p>
            </div>
            {record.reasonForVisit && (
              <div>
                <div className="font-bold text-slate-600 text-xs">
                  {isHindi ? 'मरीज की मुख्य शिकायत:' : 'Chief Complaints & Symptoms:'}
                </div>
                <p className="text-slate-700 font-medium">{record.reasonForVisit}</p>
              </div>
            )}
          </div>

          {/* Vitals Recorded */}
          {record.vitals && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">
                {isHindi ? 'शारीरिक माप एवं वाइटल्स (Vitals)' : 'Vitals & Measurements Recorded'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {record.vitals.bloodPressure && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                    <span className="font-extrabold text-slate-900 text-sm">{record.vitals.bloodPressure}</span>
                  </div>
                )}
                {record.vitals.pulse && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                    <span className="font-extrabold text-slate-900 text-sm">{record.vitals.pulse}</span>
                  </div>
                )}
                {record.vitals.weight && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Body Weight</span>
                    <span className="font-extrabold text-slate-900 text-sm">{record.vitals.weight}</span>
                  </div>
                )}
                {record.vitals.spO2 && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">SpO2 Oxygen</span>
                    <span className="font-extrabold text-slate-900 text-sm">{record.vitals.spO2}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Investigations */}
          {record.investigations.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-600" />
                <span>{isHindi ? 'लैब जांच रिपोर्ट' : 'Diagnostic Lab Investigations'}</span>
              </div>
              <div className="space-y-2">
                {record.investigations.map((inv, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{inv.testName}</span>
                      <span className="text-slate-500 ml-2">Normal: {inv.normalRange}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{inv.result} {inv.unit}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.status === 'Normal' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'High' ? 'bg-red-100 text-red-800' :
                        inv.status === 'Low' ? 'bg-amber-100 text-amber-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescribed Medicines */}
          {record.medicines.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>{isHindi ? 'पर्चे पर लिखी गई दवाइयाँ' : 'Prescribed Medications & Dosages'}</span>
              </div>
              <div className="space-y-2">
                {record.medicines.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-slate-900">{med.name} ({med.dosage})</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{med.timingNotes || med.purpose}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-900 rounded-lg font-bold text-xs shrink-0">
                      {med.frequency} • {med.duration}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Notes & Follow up */}
          {record.clinicalNotes && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-1">
                {isHindi ? 'डॉक्टर की सलाह एवं सावधानियां' : 'Clinical Notes & Doctor Advice'}
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">{record.clinicalNotes}</p>
              {record.followUpInstructions && (
                <p className="text-teal-800 font-bold mt-2 pt-2 border-t border-slate-200">
                  📅 Follow-up: {record.followUpInstructions}
                </p>
              )}
            </div>
          )}

          {/* Simulated Physical Document Slip Preview */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-600" />
                <span>{isHindi ? 'मूल पर्चा / दस्तावेज' : 'Original Facility Document Slip'}</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {record.sourceDocumentName || 'Paper_Prescription.jpg'}
              </span>
            </div>
            {/* Realistic Prescription Slip Paper simulation */}
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-inner font-serif text-[11px] text-slate-700 space-y-2 border-t-4 border-t-teal-700">
              <div className="text-center pb-2 border-b border-slate-200 font-sans">
                <div className="font-black text-slate-900 text-xs uppercase">{record.facility}</div>
                <div className="text-[10px] text-slate-500">Govt. Public Health Service • Patient OPD Slip</div>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span>Date: {record.recordDate}</span>
                <span>Doctor: {record.doctorName}</span>
              </div>
              <div className="pt-2 font-mono text-[11px] text-slate-900 font-bold">
                Rx / Clinical Impression: {record.diagnosis}
              </div>
              <div className="pl-3 border-l-2 border-slate-200 space-y-1">
                {record.medicines.map((m, i) => (
                  <div key={i} className="font-sans font-semibold">
                    {i + 1}. Tab. {m.name} {m.dosage} — {m.frequency} ({m.duration})
                  </div>
                ))}
              </div>
              <div className="pt-2 text-[10px] text-slate-400 italic">
                Digitally ingested and structured into MediTrace Portable Health Profile.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Record ID: {record.id}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

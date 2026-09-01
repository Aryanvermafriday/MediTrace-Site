import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Calendar, 
  User, 
  FileText, 
  Pill, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Filter,
  ArrowRight,
  Stethoscope,
  Clock,
  Eye,
  AlertCircle,
  Home
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { MedicalRecord, RecordType, Language } from '../types';
import { translations } from '../data/translations';

interface MedicalTimelineProps {
  records: MedicalRecord[];
  language: Language;
  onSelectRecord: (record: MedicalRecord) => void;
  onOpenUpload: () => void;
  onOpenReferral: () => void;
  onBack?: () => void;
  previousScreenName?: string;
  initialSelectedType?: RecordType | 'ALL';
}

export const MedicalTimeline: React.FC<MedicalTimelineProps> = ({
  records,
  language,
  onSelectRecord,
  onOpenUpload,
  onOpenReferral,
  onBack,
  previousScreenName,
  initialSelectedType = 'ALL',
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const [selectedType, setSelectedType] = useState<string>(initialSelectedType);
  const [selectedFacility, setSelectedFacility] = useState<string>('ALL');

  useEffect(() => {
    setSelectedType(initialSelectedType);
  }, [initialSelectedType]);

  // Facilities list for filtering
  const facilities = Array.from(new Set(records.map(r => r.facility)));

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesType = selectedType === 'ALL' || rec.recordType === selectedType;
    const matchesFacility = selectedFacility === 'ALL' || rec.facility === selectedFacility;
    return matchesType && matchesFacility;
  });

  return (
    <div className="space-y-6">
      {/* Top Navigation & Cross-Facility Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        {onBack && (
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <BackButton
              onClick={onBack}
              label={isHindi ? t.backToHome : t.backToHome}
              ariaLabel={`Go back to ${previousScreenName || 'Patient Home'}`}
              variant="light"
            />
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-teal-700" />
              <span>{isHindi ? 'मरीज होम / समयरेखा' : 'Patient Home / Medical Timeline'}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              <span>{t.card_timeline} — {isHindi ? 'मल्टी-हॉस्पिटल स्वास्थ्य समयरेखा' : 'Multi-Facility Medical Timeline'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isHindi 
                ? 'कागजी पर्चों की जगह एक एकीकृत डिजिटल इतिहास जो मरीज के साथ यात्रा करता है।' 
                : 'Fragmented physical slips unified into a single chronological patient journey across all facilities.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              + {t.uploadRecord}
            </button>
            <button
              onClick={onOpenReferral}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{t.generateReferral}</span>
            </button>
          </div>
        </div>

        {/* Facility Trajectory Stepper */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
            {isHindi ? 'स्वास्थ्य केंद्रों की यात्रा' : 'Cross-Facility Continuum'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs">
              <div className="font-extrabold text-teal-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px]">1</span>
                <span>Village Sub-Centre</span>
              </div>
              <p className="text-[11px] text-teal-800 mt-1 font-medium">Initial BP 144/92 & Screening</p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
              <div className="font-extrabold text-blue-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px]">2</span>
                <span>PHC Lakhimpur</span>
              </div>
              <p className="text-[11px] text-blue-800 mt-1 font-medium">Lab Panel: Hb 10.2, FBS 148, HbA1c</p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
              <div className="font-extrabold text-purple-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px]">3</span>
                <span>District Hospital</span>
              </div>
              <p className="text-[11px] text-purple-800 mt-1 font-medium">Specialist Consult, ECG & Statin</p>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs">
              <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Tertiary Referral</span>
              </div>
              <p className="text-[11px] text-indigo-800 mt-1 font-medium">Ready with AI Referral Summary</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: t.filter_all },
            { id: 'Prescription', label: t.filter_prescriptions },
            { id: 'Diagnostic', label: t.filter_diagnostics },
            { id: 'Consultation', label: t.filter_consultations },
            { id: 'Referral', label: t.filter_referrals },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setSelectedType(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedType === chip.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Facility Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedFacility}
            onChange={e => setSelectedFacility(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-teal-600 cursor-pointer"
          >
            <option value="ALL">{t.allFacilities}</option>
            {facilities.map((fac, idx) => (
              <option key={idx} value={fac}>{fac}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-teal-200 space-y-6 ml-2 sm:ml-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            <p className="text-sm font-medium">{t.noRecords}</p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isPrescription = record.recordType === 'Prescription';
            const isDiagnostic = record.recordType === 'Diagnostic';
            const isConsultation = record.recordType === 'Consultation';
            const isReferral = record.recordType === 'Referral';

            return (
              <div key={record.id} className="relative group">
                {/* Timeline Dot with Record Type Color */}
                <div className={`absolute -left-[31px] sm:-left-[39px] top-4 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${
                  isPrescription ? 'bg-blue-600' :
                  isDiagnostic ? 'bg-amber-500' :
                  isConsultation ? 'bg-purple-600' :
                  'bg-emerald-600'
                }`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Timeline Card */}
                <div 
                  onClick={() => onSelectRecord(record)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all p-5 cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-teal-700" />
                        {record.recordDate}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isPrescription ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        isDiagnostic ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        isConsultation ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {record.recordType}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200/60">
                        {record.facilityType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.verifiedBadge}</span>
                        </span>
                      )}
                      <button className="text-xs font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{t.viewDetails}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Facility & Doctor Context */}
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-base">
                      <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>{record.facility}</span>
                    </div>
                    {record.doctorName && (
                      <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        <span>{record.doctorName} {record.specialization ? `(${record.specialization})` : ''}</span>
                      </p>
                    )}
                  </div>

                  {/* Diagnosis & Clinical Impression */}
                  <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-700">
                      {isHindi ? 'क्लिनिकल निष्कर्ष / निदान:' : 'Clinical Impression / Diagnosis:'}
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5 leading-relaxed">
                      {record.diagnosis}
                    </p>
                    {record.reasonForVisit && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        <strong>{isHindi ? 'लक्षण:' : 'Symptoms:'}</strong> {record.reasonForVisit}
                      </p>
                    )}
                  </div>

                  {/* Vitals pill */}
                  {record.vitals && (record.vitals.bloodPressure || record.vitals.pulse) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {record.vitals.bloodPressure && (
                        <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-bold">
                          BP: {record.vitals.bloodPressure}
                        </span>
                      )}
                      {record.vitals.pulse && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium">
                          Pulse: {record.vitals.pulse}
                        </span>
                      )}
                      {record.vitals.weight && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium">
                          Weight: {record.vitals.weight}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Investigations / Lab results if present */}
                  {record.investigations.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isHindi ? 'जांच रिपोर्ट परिणाम:' : 'Investigation Results:'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {record.investigations.map((inv, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{inv.testName}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900">{inv.result} {inv.unit}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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

                  {/* Medicines prescribed if present */}
                  {record.medicines.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isHindi ? 'लिखी गई दवाइयाँ:' : 'Prescribed Medications:'}</span>
                      </div>
                      <div className="space-y-1.5">
                        {record.medicines.map((med, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-slate-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-900">{med.name}</span>
                              <span className="text-slate-500 font-medium ml-1">({med.dosage})</span>
                              {med.timingNotes && (
                                <p className="text-[11px] text-slate-500">{med.timingNotes}</p>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded shrink-0">
                              {med.frequency} • {med.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer with AI Extraction Badge & Source preview indicator */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>{t.aiExtractedBadge} ({record.confidenceScore || 96}%)</span>
                      </span>
                      {record.sourceDocumentName && (
                        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline truncate max-w-[180px]">
                          📎 {record.sourceDocumentName}
                        </span>
                      )}
                    </div>
                    <span className="text-teal-700 font-bold text-xs flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {t.viewDocument}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

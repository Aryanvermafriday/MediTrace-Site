import React from 'react';
import { 
  AlertTriangle, 
  X, 
  Phone, 
  MapPin, 
  Pill, 
  ShieldAlert, 
  Clock, 
  QrCode,
  Heart,
  Share2
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { PatientProfile, MedicalRecord, Language } from '../types';
import { translations } from '../data/translations';

interface EmergencyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  patient: PatientProfile;
  records: MedicalRecord[];
  language: Language;
}

export const EmergencyCardModal: React.FC<EmergencyCardModalProps> = ({
  isOpen,
  onClose,
  onBack,
  patient,
  records,
  language,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  if (!isOpen) return null;

  const handleBack = onBack || onClose;

  const activeMedicines = records
    .flatMap(r => r.medicines)
    .filter(m => m.status === 'active');

  const locationDisplay = [patient.village, patient.district, patient.state].filter(Boolean).join(', ') || (isHindi ? 'स्थान दर्ज नहीं' : 'Location not specified');

  const primaryContact = (patient.emergencyContacts && patient.emergencyContacts.length > 0)
    ? (patient.emergencyContacts.find(c => c.isPrimary) || patient.emergencyContacts[0])
    : (patient.emergencyContact?.name ? {
        id: 'legacy',
        name: patient.emergencyContact.name,
        relationship: patient.emergencyContact.relationship,
        phone: patient.emergencyContact.phone,
        isPrimary: true,
      } : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border-2 border-red-500 shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* High Contrast Emergency Header with Back Navigation */}
        <div className="bg-red-600 text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel="Go back"
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl tracking-tight text-white uppercase">
                {t.emergencyTitle}
              </h3>
              <p className="text-xs text-red-100 font-semibold">
                {isHindi ? 'आपातकालीन पैरामेडिक व डॉक्टर कार्ड' : 'Instant Critical Triage & Emergency Card'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close emergency card"
            className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5 bg-gradient-to-b from-red-50/40 to-white text-xs">
          {/* Patient Demographics & Blood Group Badge */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div>
              <h4 className="text-xl font-black text-slate-900">
                {isHindi ? patient.nameHindi : patient.name}
              </h4>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                {patient.age} {t.yearsOld} • {isHindi ? patient.genderHindi : patient.gender} • {patient.id}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {locationDisplay}
              </p>
            </div>
            {/* Giant Blood Group Pill */}
            <div className="text-center bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-md border-2 border-red-700">
              <div className="text-[10px] uppercase font-bold tracking-wider">{t.bloodGroup}</div>
              <div className="text-2xl font-black">{patient.bloodGroup ? patient.bloodGroup.split(' ')[0] : 'O+'}</div>
            </div>
          </div>

          {/* CRITICAL DRUG ALLERGIES (RED ALERT) */}
          <div className="bg-red-100/90 border-2 border-red-300 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-900 font-black text-sm uppercase tracking-wide mb-1">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>{isHindi ? 'गंभीर दवा एलर्जी (DO NOT ADMINISTER)' : 'CRITICAL DRUG ALLERGIES'}</span>
            </div>
            <div className="font-bold text-red-950 text-xs mt-1">
              ⚠️ {patient.allergies && patient.allergies.length > 0
                ? (isHindi ? (patient.allergiesHindi?.[0] || patient.allergies[0]) : patient.allergies[0])
                : (isHindi ? 'कोई गंभीर एलर्जी दर्ज नहीं (No Drug Allergies Recorded)' : 'No Known Drug Allergies Recorded')}
            </div>
          </div>

          {/* Chronic Major Conditions */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2">
              {t.chronicConditions}
            </div>
            <div className="space-y-1 font-semibold text-slate-800">
              {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                (isHindi ? (patient.chronicConditionsHindi || patient.chronicConditions) : patient.chronicConditions).map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    <span>{c}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-[11px] italic">
                  {isHindi ? 'कोई गंभीर बीमारी दर्ज नहीं' : 'No chronic conditions recorded'}
                </div>
              )}
            </div>
          </div>

          {/* Key Active Medications */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-emerald-700" />
              <span>{t.currentMedicines} ({activeMedicines.length})</span>
            </div>
            <div className="space-y-1.5">
              {activeMedicines.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg">
                  <span>{m.name} ({m.dosage})</span>
                  <span className="text-[11px] text-teal-800 font-bold">{m.frequency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact & Paramedic QR code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider mb-1">
                  {t.emergencyContact}
                </div>
                {primaryContact ? (
                  <>
                    <div className="font-bold text-slate-900 text-sm">
                      {primaryContact.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {primaryContact.relationship}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    {isHindi ? 'कोई आपातकालीन संपर्क नहीं' : 'No emergency contact specified'}
                  </div>
                )}
              </div>
              {primaryContact?.phone ? (
                <a
                  href={`tel:${primaryContact.phone}`}
                  className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call {primaryContact.phone}</span>
                </a>
              ) : null}
            </div>

            {/* Offline-Safe QR Code simulation */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-slate-900 text-white rounded-xl flex items-center justify-center p-2 mb-2">
                <QrCode className="w-16 h-16 text-white" />
              </div>
              <div className="font-bold text-[10px] text-slate-500 uppercase">
                Paramedic Offline Scan
              </div>
              <div className="font-mono text-[9px] text-slate-400 mt-0.5">
                {patient.qrPayload}
              </div>
            </div>
          </div>

          {/* Sync Stamp */}
          <div className="text-center text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{t.lastSynced}: {patient.lastSynchronized}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600">
            MediTrace Emergency Protocol v1.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

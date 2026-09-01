import React from 'react';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  Eye, 
  KeyRound, 
  FileText, 
  Building2, 
  Clock, 
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { PatientProfile, SecurityAccessLog, Language } from '../types';
import { translations } from '../data/translations';

interface SecurityPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  patient: PatientProfile;
  logs: SecurityAccessLog[];
  language: Language;
}

export const SecurityPrivacyModal: React.FC<SecurityPrivacyModalProps> = ({
  isOpen,
  onClose,
  onBack,
  patient,
  logs,
  language,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  if (!isOpen) return null;

  const handleBack = onBack || onClose;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Back Navigation */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel="Go back"
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-xl text-white">
                {t.card_security}
              </h3>
              <p className="text-xs text-teal-200/90 font-medium">
                {isHindi ? 'सहमति-आधारित डॉक्टर एक्सेस एवं ऑडिट ट्रेल' : 'Consent-based access architecture & immutable audit logs'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close security logs"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          {/* Security Features Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
              <div className="flex items-center gap-1.5 font-bold text-teal-950 mb-1">
                <Lock className="w-4 h-4 text-teal-700" />
                <span>Consent-First Access</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Supabase Row Level Security limits every record to its patient and explicitly linked caregivers or providers.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
              <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1">
                <KeyRound className="w-4 h-4 text-blue-700" />
                <span>ABHA ABDM Linked</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Fully compatible with National Digital Health Mission token standards ({patient.id}).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
              <div className="flex items-center gap-1.5 font-bold text-purple-950 mb-1">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Encrypted Offline Cache</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Signed-in sessions refresh securely, while sensitive clinical records remain authoritative in Supabase.
              </p>
            </div>
          </div>

          {/* Access Logs (Audit Trail) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                {isHindi ? 'अधिकृत एक्सेस लॉग (Audit Trail)' : 'Authorized Healthcare Access Logs'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {logs.length} logged events
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{log.action}</span>
                    <span className="text-[10px] font-mono text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-700 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>{log.facility} • {log.actorName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{log.details}</p>
                  <div className="pt-1 text-[10px] font-mono text-teal-800 font-semibold">
                    Auth Token: {log.authMethod}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-emerald-900 text-[11px] font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Patient data privacy is protected. No commercial sharing or unauthenticated access.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
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

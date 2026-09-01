import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Mail, 
  Globe, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  FileText,
  Lock,
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { AuthUser, Language, PatientProfile } from '../types';
import { translations } from '../data/translations';
import { authService } from '../services/authService';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  previousScreenName?: string;
  user: AuthUser;
  patient: PatientProfile;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  onOpenCaregivers?: () => void;
  onOpenAuditLogs?: () => void;
  onUserUpdated: (updatedUser: AuthUser) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  onBack,
  previousScreenName,
  user,
  patient,
  language,
  onLanguageChange,
  onLogout,
  onOpenCaregivers,
  onOpenAuditLogs,
  onUserUpdated,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const handleBack = onBack || onClose;

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleLanguageChange = async (nextLanguage: Language) => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updated = await authService.updateAccountSettings({ language: nextLanguage });
      onUserUpdated(updated);
      onLanguageChange(nextLanguage);
      setSuccessMsg(t.profileSaved);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(isHindi ? 'भाषा सेटिंग सहेजी नहीं जा सकी। कृपया फिर प्रयास करें।' : 'The language setting could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Top-Left Back Navigation */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel={previousScreenName ? `Back to ${previousScreenName}` : 'Go back'}
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-400/40 flex items-center justify-center text-white shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {t.accountSettings}
              </h2>
              <p className="text-xs text-teal-200 font-medium">
                {user.email} • {patient.mediTraceId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close account settings"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Verified Email Identity */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-teal-700" />
              <span>{isHindi ? 'खाता ईमेल' : 'Account email'}</span>
            </span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-900 break-all">
                {user.email}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Password protected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              {isHindi ? 'यह ईमेल आपके सुरक्षित MediTrace साइन-इन के लिए उपयोग होता है।' : 'This email is used for your secure MediTrace sign-in.'}
            </p>
          </div>

          {/* Language Preference */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-700" />
              <span>{t.preferredLanguage}</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLanguageChange('en')}
                disabled={isSaving}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                English (Default)
              </button>
              <button
                onClick={() => handleLanguageChange('hi')}
                disabled={isSaving}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                  language === 'hi'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                हिंदी (Hindi)
              </button>
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="space-y-2 pt-1">
            {onOpenCaregivers && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCaregivers();
                }}
                className="w-full p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{t.card_caregiver}</span>
                    <span className="text-[10px] text-slate-500">{t.card_caregiver_desc}</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-sm">→</span>
              </button>
            )}

            {onOpenAuditLogs && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuditLogs();
                }}
                className="w-full p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{t.card_security}</span>
                    <span className="text-[10px] text-slate-500">{t.card_security_desc}</span>
                  </div>
                </div>
                <span className="text-slate-400 font-bold text-sm">→</span>
              </button>
            )}
          </div>

          {/* Logout Section */}
          <div className="pt-3 border-t border-slate-200">
            {showLogoutConfirm ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-red-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{t.logoutConfirm}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    id="confirm-logout-button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="account-logout-button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs border border-red-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};

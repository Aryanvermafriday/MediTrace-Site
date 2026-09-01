import React, { useState } from 'react';
import { 
  Users, 
  X, 
  ShieldCheck, 
  Phone, 
  Check, 
  FileText, 
  Pill, 
  Calendar, 
  Upload, 
  Lock, 
  UserCheck, 
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { PatientProfile, CaregiverInfo, Language } from '../types';
import { translations } from '../data/translations';

interface CaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  patient: PatientProfile;
  language: Language;
  onUpdateCaregiver: (updated: CaregiverInfo) => Promise<boolean> | boolean;
}

export const CaregiverModal: React.FC<CaregiverModalProps> = ({
  isOpen,
  onClose,
  onBack,
  patient,
  language,
  onUpdateCaregiver,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const primaryEC = (patient?.emergencyContacts && patient.emergencyContacts.length > 0)
    ? (patient.emergencyContacts.find(c => c.isPrimary) || patient.emergencyContacts[0])
    : (patient?.emergencyContact?.name ? {
        name: patient.emergencyContact.name,
        relationship: patient.emergencyContact.relationship,
        phone: patient.emergencyContact.phone,
      } : null);

  const defaultCaregiver = {
    id: 'cg-primary',
    name: primaryEC?.name || 'Primary Caregiver',
    nameHindi: primaryEC?.name || 'मुख्य देखभालकर्ता',
    relationship: primaryEC?.relationship || 'Family Caregiver',
    relationshipHindi: 'परिवार देखभालकर्ता',
    phone: primaryEC?.phone || patient?.phone || '',
    isPrimary: true,
    permissions: {
      viewRecords: true,
      viewMedicines: true,
      viewAppointments: true,
      uploadRecords: true,
      editFullProfile: false,
    },
    lastActive: 'Active',
  };

  const caregiver = (patient.caregivers && patient.caregivers.length > 0) ? patient.caregivers[0] : defaultCaregiver;
  const [permissions, setPermissions] = useState(caregiver.permissions);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const caregiverInitials = caregiver.name
    ? (caregiver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CG')
    : 'CG';

  if (!isOpen) return null;

  const handleBack = onBack || onClose;

  const handleToggle = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const saved = await onUpdateCaregiver({ ...caregiver, permissions });
    setIsSaving(false);
    if (saved) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Back Navigation */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-violet-900 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel="Go back"
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-xl text-white">
                {t.caregiverTitle}
              </h3>
              <p className="text-xs text-violet-200/90 font-medium">
                {t.caregiverSubtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close caregiver permissions"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 text-xs">
          {/* Active Caregiver Profile Card */}
          <div className="bg-violet-50/70 border border-violet-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                {caregiverInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">
                    {isHindi ? caregiver.nameHindi : caregiver.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-violet-200 text-violet-900 font-bold text-[10px]">
                    {isHindi ? caregiver.relationshipHindi : caregiver.relationship}
                  </span>
                </div>
                <p className="text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{caregiver.phone}</span>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isHindi ? 'अनुमति प्रोफ़ाइल सक्रिय' : 'Permission profile active'}</span>
            </span>
          </div>

          {/* Granular Permissions Toggle List */}
          <div className="space-y-3">
            <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
              {t.permissionsLabel}
            </div>

            <div className="space-y-2">
              {/* 1. View Records */}
              <div 
                onClick={() => handleToggle('viewRecords')}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{t.permRecords}</div>
                    <div className="text-[11px] text-slate-500">Allow reading doctor prescriptions and lab results</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  permissions.viewRecords ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300'
                }`}>
                  {permissions.viewRecords && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 2. View Medicines */}
              <div 
                onClick={() => handleToggle('viewMedicines')}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{t.permMedicines}</div>
                    <div className="text-[11px] text-slate-500">Allow viewing daily morning/night medicine schedules</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  permissions.viewMedicines ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                }`}>
                  {permissions.viewMedicines && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 3. View Appointments */}
              <div 
                onClick={() => handleToggle('viewAppointments')}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{t.permAppointments}</div>
                    <div className="text-[11px] text-slate-500">Allow seeing hospital follow-up dates & referral notes</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  permissions.viewAppointments ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {permissions.viewAppointments && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 4. Upload Records */}
              <div 
                onClick={() => handleToggle('uploadRecords')}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{t.permUpload}</div>
                    <div className="text-[11px] text-slate-500">Allow taking photos of slips and triggering AI extraction</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  permissions.uploadRecords ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                }`}>
                  {permissions.uploadRecords && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* 5. Edit Full Profile (Restricted default) */}
              <div 
                onClick={() => handleToggle('editFullProfile')}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{t.permEditProfile}</div>
                    <div className="text-[11px] text-slate-500">Sensitive changes (Name, Blood group, Primary facility)</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                  permissions.editFullProfile ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300'
                }`}>
                  {permissions.editFullProfile && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-slate-600 text-[11px]">
            <AlertCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>The patient retains 100% sovereign authority to revoke or modify caregiver permissions at any time.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
          >
            {t.cancel}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : null}
            <span>{isSaving ? (isHindi ? 'सहेज रहे हैं…' : 'Saving…') : isSaved ? 'Permissions Updated!' : t.savePermissions}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

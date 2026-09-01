import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  AlertCircle, 
  Pill, 
  Building2, 
  Clock, 
  FileText,
  Sparkles,
  AlertTriangle,
  Upload,
  UserCheck
} from 'lucide-react';
import { PatientProfile, Language } from '../types';
import { translations } from '../data/translations';

interface PatientHeaderProps {
  patient: PatientProfile;
  activeMedicinesCount: number;
  recordsCount: number;
  language: Language;
  onOpenUpload: () => void;
  onOpenReferral: () => void;
  onOpenEmergency: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patient,
  activeMedicinesCount,
  recordsCount,
  language,
  onOpenUpload,
  onOpenReferral,
  onOpenEmergency,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const initials = patient.name
    ? patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'PT';

  const firstCaregiver = patient.caregivers && patient.caregivers.length > 0 ? patient.caregivers[0] : null;
  const locationText = [patient.village, patient.district, patient.state].filter(Boolean).join(', ') || (isHindi ? 'स्थान दर्ज नहीं' : 'Location not specified');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Top Banner with Patient Context */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Patient Core Identity */}
          <div className="flex items-start sm:items-center gap-4">
            {/* Avatar Pill with Blood Group */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-teal-700/80 border-2 border-teal-400/40 flex items-center justify-center text-white text-2xl font-black shadow-inner overflow-hidden">
                {patient.profilePhoto ? (
                  <img
                    src={patient.profilePhoto}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="absolute -bottom-2 -right-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black tracking-wide border border-white shadow-sm">
                {patient.bloodGroup.split(' ')[0]}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {isHindi ? (patient.nameHindi || patient.name) : patient.name}
                </h1>
                
                {/* MediTrace Unique Patient ID Badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-300/40 text-xs font-mono font-bold">
                  {patient.mediTraceId}
                </span>

                {/* ABHA Badge Intact */}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ABHA Verified</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs sm:text-sm text-teal-100/90 font-medium">
                <span>
                  {patient.age} {t.yearsOld} • {isHindi ? (patient.genderHindi || patient.gender) : patient.gender}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-300" />
                  {locationText}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="font-mono text-teal-200" title="ABHA Health ID">{patient.id}</span>
              </div>
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t border-teal-700/50 md:border-t-0">
            <button
              onClick={onOpenEmergency}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>{t.emergencyCard}</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{t.uploadRecord}</span>
            </button>

            <button
              onClick={onOpenReferral}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer border border-indigo-400/30"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{t.generateReferral}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Medical Snapshot Strip (Rural High-Yield) */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/80 p-3 sm:p-4 text-xs">
        {/* Critical Allergies */}
        <div className="p-2 sm:p-3">
          <div className="flex items-center gap-1.5 text-red-600 font-bold mb-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t.allergies}</span>
          </div>
          <div className="bg-red-50 text-red-900 border border-red-200/80 rounded-lg p-2 font-semibold">
            {patient.allergies && patient.allergies.length > 0
              ? (isHindi ? (patient.allergiesHindi?.[0] || patient.allergies[0]) : patient.allergies[0])
              : (isHindi ? 'कोई ज्ञात एलर्जी नहीं (None Recorded)' : 'No Known Allergies Recorded')}
          </div>
        </div>

        {/* Chronic Conditions */}
        <div className="p-2 sm:p-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
            <Building2 className="w-4 h-4 text-teal-700" />
            <span>{t.chronicConditions}</span>
          </div>
          <div className="space-y-1 text-slate-800 font-medium">
            {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
              (isHindi ? (patient.chronicConditionsHindi || patient.chronicConditions) : patient.chronicConditions)
                .slice(0, 2)
                .map((c, i) => (
                  <div key={i} className="truncate">• {c}</div>
                ))
            ) : (
              <div className="text-slate-400 text-[11px] italic">
                {isHindi ? 'कोई गंभीर बीमारी दर्ज नहीं' : 'No chronic conditions recorded'}
              </div>
            )}
          </div>
        </div>

        {/* Active Medicines & Records */}
        <div className="p-2 sm:p-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
            <Pill className="w-4 h-4 text-emerald-700" />
            <span>{t.currentMedicines}</span>
          </div>
          <div className="text-slate-800 font-semibold flex items-center justify-between">
            <span>{activeMedicinesCount} Active Drugs</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
              {recordsCount} {t.recordsTotal}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {patient.primaryFacility 
              ? (isHindi ? patient.primaryFacilityHindi || patient.primaryFacility : patient.primaryFacility)
              : (isHindi ? 'प्राथमिक स्वास्थ्य केंद्र दर्ज नहीं' : 'Primary health facility not linked')}
          </p>
        </div>

        {/* Caregiver & Sync Status */}
        <div className="p-2 sm:p-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
            <UserCheck className="w-4 h-4 text-indigo-700" />
            <span>{t.card_caregiver}</span>
          </div>
          <div className="text-slate-800 font-semibold truncate">
            {firstCaregiver ? (
              <span>{isHindi ? (firstCaregiver.nameHindi || firstCaregiver.name) : firstCaregiver.name} ({isHindi ? (firstCaregiver.relationshipHindi || firstCaregiver.relationship) : firstCaregiver.relationship})</span>
            ) : (
              <span className="text-slate-400 font-normal">{isHindi ? 'कोई परिजन लिंक नहीं' : 'No caregiver linked'}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{t.lastSynced}: {patient.lastSynchronized}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

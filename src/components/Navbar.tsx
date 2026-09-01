import React, { useRef, useEffect } from 'react';
import { 
  Heart, 
  Wifi, 
  WifiOff, 
  Globe, 
  User, 
  Users, 
  Stethoscope, 
  PlusCircle, 
  FileText,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Lock
} from 'lucide-react';
import { UserRole, Language, AuthUser, PatientProfile } from '../types';
import { translations } from '../data/translations';

interface NavbarProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isOffline: boolean;
  lastSynced: string;
  user: AuthUser | null;
  patient: PatientProfile | null;
  onOpenEmergency: () => void;
  onOpenUpload: () => void;
  onOpenReferral: () => void;
  onOpenProfile: () => void;
  onOpenAccountSettings: () => void;
  onLogout: () => void;
  onSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  setRole,
  language,
  setLanguage,
  isOffline,
  lastSynced,
  user,
  patient,
  onOpenEmergency,
  onOpenUpload,
  onOpenReferral,
  onOpenProfile,
  onOpenAccountSettings,
  onLogout,
  onSync,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const t = translations[language];
  const canUseRole = (candidate: UserRole) => !user || user.role === candidate;

  // Ref for the mobile/tablet horizontally scrollable navigation container
  const scrollNavRef = useRef<HTMLDivElement>(null);
  const activeRoleRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active item into view when role changes on phone/tablet
  useEffect(() => {
    if (activeRoleRef.current && scrollNavRef.current) {
      activeRoleRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [role]);

  const initials = patient?.name
    ? patient.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'MT';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Notification Bar for Connectivity */}
      <div className={`px-4 py-1.5 text-xs flex items-center justify-between transition-colors ${
        isOffline 
          ? 'bg-amber-500 text-slate-950 font-medium' 
          : 'bg-emerald-600 text-white'
      }`}>
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <strong>{t.offline}</strong> — {t.lastSynced}: {lastSynced}
              </span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                <strong>{t.online}</strong> — {t.slogan}
              </span>
            </>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={onSync}
              disabled={isOffline}
              className="flex items-center gap-1 px-2 py-1 bg-black/15 hover:bg-black/25 text-xs font-semibold cursor-pointer transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              title="Sync latest records to local cache"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{t.syncNow}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. DESKTOP HEADER (xl: and above) - EXACT ORIGINAL DESKTOP LAYOUT
          Must remain exactly as it is without horizontal scrolling.
         ========================================================================= */}
      <div className="hidden xl:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Heart className="w-6 h-6 fill-white stroke-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">MediTrace</span>
                {patient && (
                  <span className="px-2 py-0.5 text-[10px] font-bold font-mono tracking-wider rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    {patient.mediTraceId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'hi' ? 'ग्रामीण स्वास्थ्य निरंतरता मंच' : 'Continuity-of-Care for Rural Patients'}
              </p>
            </div>
          </div>

          {/* Center Role Navigation Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => canUseRole('patient') && setRole('patient')}
              disabled={!canUseRole('patient')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                role === 'patient'
                  ? 'bg-white text-teal-800 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.role_patient}</span>
            </button>

            <button
              onClick={() => canUseRole('caregiver') && setRole('caregiver')}
              disabled={!canUseRole('caregiver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                role === 'caregiver'
                  ? 'bg-white text-teal-800 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{t.role_caregiver}</span>
            </button>

            <button
              onClick={() => canUseRole('provider') && setRole('provider')}
              disabled={!canUseRole('provider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                role === 'provider'
                  ? 'bg-white text-teal-800 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>{t.role_provider}</span>
            </button>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  language === 'en' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  language === 'hi' ? 'bg-white text-teal-700 shadow-xs font-bold' : 'text-slate-600'
                }`}
                title="हिंदी में देखें"
              >
                हिंदी
              </button>
            </div>

            {/* User Account / Profile Menu */}
            {patient && (
              <div className="relative">
                <button
                  id="user-profile-menu-button-desktop"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs font-black shadow-xs overflow-hidden">
                    {patient.profilePhoto ? (
                      <img
                        src={patient.profilePhoto}
                        alt={patient.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-slate-900 leading-tight truncate max-w-[100px]">{patient.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-teal-700 font-mono leading-none">{patient.mediTraceId}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. PHONE & TABLET HEADER (< xl: e.g. 320px - 1200px)
          Features brand header top-row + smooth horizontally scrollable navigation/control strip
         ========================================================================= */}
      <div className="xl:hidden border-slate-100">
        {/* Top Header Row for Phone/Tablet */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xs shrink-0">
              <Heart className="w-4.5 h-4.5 fill-white stroke-teal-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">MediTrace</span>
                {patient && (
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 truncate">
                    {patient.mediTraceId}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {language === 'hi' ? 'ग्रामीण निरंतरता मंच' : 'Continuity-of-Care'}
              </p>
            </div>
          </div>

          {/* Fast Profile Trigger on Top Mobile Row */}
          {patient && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Account Options"
            >
              <div className="w-6 h-6 rounded-md bg-teal-700 text-white flex items-center justify-center text-[10px] font-black">
                {initials}
              </div>
              <span className="text-[11px] text-slate-800 max-w-[70px] truncate hidden sm:inline">
                {patient.name.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>

        {/* Dedicated Responsive Horizontally Scrollable Navigation Strip */}
        <div className="relative bg-slate-50/80 border-t border-slate-100/80">
          {/* Scrollable Control Container */}
          <div 
            ref={scrollNavRef}
            className="flex items-center gap-2 overflow-x-auto px-4 py-2 subtle-scrollbar touch-pan-x scroll-smooth w-full"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Role Navigation Pills */}
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs font-medium shrink-0 shadow-2xs">
              <button
                ref={role === 'patient' ? activeRoleRef : null}
                onClick={() => canUseRole('patient') && setRole('patient')}
                disabled={!canUseRole('patient')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                  role === 'patient'
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{t.role_patient}</span>
              </button>

              <button
                ref={role === 'caregiver' ? activeRoleRef : null}
                onClick={() => canUseRole('caregiver') && setRole('caregiver')}
                disabled={!canUseRole('caregiver')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                  role === 'caregiver'
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t.role_caregiver}</span>
              </button>

              <button
                ref={role === 'provider' ? activeRoleRef : null}
                onClick={() => canUseRole('provider') && setRole('provider')}
                disabled={!canUseRole('provider')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                  role === 'provider'
                    ? 'bg-teal-700 text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.role_provider}</span>
              </button>
            </div>

            {/* Language Toggle */}
            <div className="flex items-center bg-white p-0.5 rounded-xl border border-slate-200 text-xs font-semibold shrink-0 shadow-2xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  language === 'en' ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/60' : 'text-slate-600'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  language === 'hi' ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/60' : 'text-slate-600'
                }`}
                title="हिंदी"
              >
                हिंदी
              </button>
            </div>

            {/* User Profile / Settings CTA */}
            {patient && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
              >
                <div className="w-4 h-4 rounded bg-teal-700 text-white flex items-center justify-center text-[9px] font-black overflow-hidden">
                  {patient.profilePhoto ? (
                    <img
                      src={patient.profilePhoto}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <span>{t.myProfile}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shared Dropdown Menu (Positioned fixed to prevent clipping on mobile horizontal scroll) */}
      {isMenuOpen && patient && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs" 
            onClick={() => setIsMenuOpen(false)} 
          />
          <div className="fixed right-4 top-14 sm:top-16 w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 py-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Patient Info Snippet */}
            <div className="px-3.5 py-2.5 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center text-sm font-black shadow-xs shrink-0 overflow-hidden">
                  {patient.profilePhoto ? (
                    <img
                      src={patient.profilePhoto}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 text-sm truncate">{patient.name}</p>
                  <p className="font-mono text-[11px] text-teal-700 font-bold">{patient.mediTraceId}</p>
                  <p className="text-[11px] text-slate-500 truncate">{patient.maskedPhone || user?.email}</p>
                </div>
              </div>
            </div>

            {/* Menu Actions */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenProfile();
                }}
                className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer"
              >
                <User className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{t.myProfile}</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAccountSettings();
                }}
                className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-semibold cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                <span>{t.accountSettings}</span>
              </button>
            </div>

            {/* Logout Trigger */}
            <div className="pt-1">
              <button
                id="navbar-logout-button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
                className="w-full px-3.5 py-2.5 text-left hover:bg-red-50 flex items-center gap-2.5 text-red-600 font-bold cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600 shrink-0" />
                <span>{t.logout}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
};

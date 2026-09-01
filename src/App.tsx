import React, { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { PatientHeader } from './components/PatientHeader';
import { AuthScreen } from './components/auth/AuthScreen';

import { 
  Language, 
  UserRole, 
  MedicalRecord, 
  PatientProfile, 
  CaregiverInfo, 
  SecurityAccessLog,
  AuthUser,
  RecordType,
} from './types';
import { translations } from './data/translations';
import { authService } from './services/authService';
import { patientDataService } from './services/patientDataService';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2,
  User
} from 'lucide-react';

const PatientDashboard = lazy(() => import('./components/PatientDashboard').then(module => ({ default: module.PatientDashboard })));
const MedicalTimeline = lazy(() => import('./components/MedicalTimeline').then(module => ({ default: module.MedicalTimeline })));
const CaregiverView = lazy(() => import('./components/CaregiverView').then(module => ({ default: module.CaregiverView })));
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard').then(module => ({ default: module.ProviderDashboard })));
const DocumentUploader = lazy(() => import('./components/DocumentUploader').then(module => ({ default: module.DocumentUploader })));
const ReferralSummaryModal = lazy(() => import('./components/ReferralSummaryModal').then(module => ({ default: module.ReferralSummaryModal })));
const EmergencyCardModal = lazy(() => import('./components/EmergencyCardModal').then(module => ({ default: module.EmergencyCardModal })));
const CaregiverModal = lazy(() => import('./components/CaregiverModal').then(module => ({ default: module.CaregiverModal })));
const SecurityPrivacyModal = lazy(() => import('./components/SecurityPrivacyModal').then(module => ({ default: module.SecurityPrivacyModal })));
const RecordDetailModal = lazy(() => import('./components/RecordDetailModal').then(module => ({ default: module.RecordDetailModal })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then(module => ({ default: module.ProfileModal })));
const AccountSettingsModal = lazy(() => import('./components/AccountSettingsModal').then(module => ({ default: module.AccountSettingsModal })));

const SectionFallback = () => (
  <div className="min-h-48 border border-slate-200 bg-white grid place-items-center text-sm font-semibold text-slate-600" role="status">
    Loading view…
  </div>
);

export default function App() {
  // Authentication & Session State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Core UI / Environment states
  const [language, setLanguage] = useState<Language>('en');
  const [role, setRole] = useState<UserRole>('patient');
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [timelineFilter, setTimelineFilter] = useState<RecordType | 'ALL'>('ALL');

  // Logs state
  const [logs, setLogs] = useState<SecurityAccessLog[]>([]);

  // Modals visibility
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState<boolean>(false);
  const [isCaregiverOpen, setIsCaregiverOpen] = useState<boolean>(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[language];
  const isHindi = language === 'hi';

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Restore authenticated session on initial load or reload with Supabase read integration
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const session = await authService.getCurrentSession();
        if (session && session.user) {
          setAuthUser(session.user);
          setRole(session.user.role || 'patient');
          setLanguage(session.user.preferredLanguage || 'en');

          // Attempt loading patient profile and medical records from Supabase
          if (!session.user.patientId) {
            if (isMounted) setPatient(null);
            return;
          }
          const [{ patient: loadedPatient, records: loadedRecords }, loadedLogs] = await Promise.all([
            patientDataService.fetchPatientAndRecords(session.user.patientId),
            patientDataService.fetchSecurityLogs(session.user.patientId),
          ]);

          if (isMounted) {
            if (loadedPatient) {
              setPatient(loadedPatient);
              setRecords(loadedRecords);
              setLogs(loadedLogs);
            } else {
              setPatient(null);
            }
          }
        }
      } catch (e) {
        console.error('Session restoration failed:', e);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const markOnline = () => setIsOffline(false);
    const markOffline = () => setIsOffline(true);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const { data } = authService.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setPatient(null);
          setRecords([]);
          setLogs([]);
          setRole('patient');
          setActiveTab('dashboard');
        }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  const [completeProfile, setCompleteProfile] = useState<boolean>(false);

  // Handle successful login or profile creation with Supabase read integration
  const handleAuthSuccess = async (user: AuthUser, patientProfile: PatientProfile) => {
    setCompleteProfile(false);
    setAuthUser(user);
    setRole(user.role || 'patient');
    setLanguage(user.preferredLanguage || 'en');

    // Immediately set loaded patient profile
    setPatient(patientProfile);

    // Concurrently retrieve fresh medical records from Supabase
    try {
      const { patient: freshPatient, records: loadedRecords } = 
        await patientDataService.fetchPatientAndRecords(user.patientId);
      if (freshPatient) {
        setPatient(freshPatient);
      }
      setRecords(loadedRecords);
    } catch (err) {
      console.warn('Failed to load fresh records from Supabase data service:', err);
      setRecords([]);
    }

    showToast(
      isHindi 
        ? `${patientProfile.name} के रूप में सफलतापूर्वक लॉगिन किया` 
        : `Logged in as ${patientProfile.name} (${patientProfile.mediTraceId})`
    );
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setAuthUser(null);
    setPatient(null);
    setRecords([]);
    setLogs([]);
    setRole('patient');
    setIsProfileOpen(false);
    setIsAccountSettingsOpen(false);
    setCompleteProfile(false);
    setActiveTab('dashboard');
    setTimelineFilter('ALL');
    showToast(isHindi ? 'सफलतापूर्वक लॉगआउट हो गया' : 'Logged out successfully');
  };

  // Save newly extracted and verified record strictly to the active patient
  const handleSaveNewRecord = async (newRecord: MedicalRecord) => {
    if (!patient) return;

    try {
      const updated = await patientDataService.saveMedicalRecord(patient.mediTraceId, newRecord);
      setRecords(updated);
      try {
        const refreshedLogs = await patientDataService.fetchSecurityLogs(patient.mediTraceId);
        setLogs(refreshedLogs);
      } catch (logError) {
        console.warn('The record was saved, but audit logs could not be refreshed:', logError);
      }

      // Update local patient summary stats
      setPatient(prev => (prev ? {
        ...prev,
        lastSynchronized: 'Just now',
        recordsCount: updated.length,
      } : null));

      showToast(isHindi ? 'नया मेडिकल रिकॉर्ड सफलतापूर्वक समयरेखा में जुड़ गया!' : 'New medical record verified and added to patient timeline!');
    } catch (error: any) {
      console.error('Record save failed:', error);
      showToast(error?.message || 'The medical record could not be saved.');
      throw error;
    }
  };

  // Update Caregiver Info
  const handleUpdateCaregiver = async (updated: CaregiverInfo) => {
    if (!patient) return false;
    try {
      const updatedPatient = await patientDataService.updatePrimaryCaregiver(patient.mediTraceId, updated);
      setPatient(updatedPatient);
      showToast(isHindi ? 'देखभालकर्ता अनुमतियाँ अपडेट हो गईं' : 'Caregiver permissions updated successfully');
      return true;
    } catch (error: any) {
      showToast(error?.message || 'Caregiver permissions could not be updated.');
      return false;
    }
  };

  // 1. INITIALIZING / LOADING STATE
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 p-4">
        <div className="animate-spin rounded-full h-9 w-9 border-3 border-teal-700 border-t-transparent" />
        <p className="text-sm font-bold text-slate-700">Loading your profile...</p>
      </div>
    );
  }

  // 2. MISSING PROFILE STATE (Authenticated, but patient record missing)
  if (authUser && !patient) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-100 shadow-xs">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {isHindi ? 'हम आपकी MediTrace प्रोफ़ाइल लोड नहीं कर सके।' : "We couldn't load your MediTrace profile."}
            </h2>
            <p className="text-xs text-slate-500 mt-2">
              {isHindi 
                ? `खाता (${authUser.email}) सक्रिय है, लेकिन मरीज प्रोफ़ाइल अभी पूरी नहीं हुई है।`
                : `Your account (${authUser.email}) is active, but the patient profile is not complete yet.`}
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={async () => {
                const resolvedPatientId = authUser.patientId || await patientDataService.resolveCurrentPatientId();
                const { patient: loadedPatient, records: loadedRecords } = resolvedPatientId
                  ? await patientDataService.fetchPatientAndRecords(resolvedPatientId)
                  : { patient: null, records: [] };
                if (loadedPatient) {
                  setPatient(loadedPatient);
                  setRecords(loadedRecords);
                } else {
                  showToast(isHindi ? 'प्रोफ़ाइल अभी भी उपलब्ध नहीं है' : 'Profile still not found');
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md shadow-teal-700/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isHindi ? 'पुनः प्रयास करें' : 'Try Again'}</span>
            </button>

            <button
              onClick={() => {
                setCompleteProfile(true);
                setAuthUser(null);
                setPatient(null);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4 text-teal-700" />
              <span>{isHindi ? 'प्रोफ़ाइल पूरा करें' : 'Complete Profile'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline"
            >
              {isHindi ? 'लॉग आउट करें' : 'Log Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. UNAUTHENTICATED STATE
  if (!authUser || !patient) {
    return (
      <AuthScreen
        language={language}
        onLanguageChange={setLanguage}
        onAuthSuccess={handleAuthSuccess}
        initialMode={completeProfile ? 'profile' : 'sign-in'}
      />
    );
  }

  // IF AUTHENTICATED: Render Full MediTrace Dashboard
  return (
    <div className="min-h-screen bg-[#eef4f3] text-slate-900 font-sans flex flex-col antialiased selection:bg-teal-100 selection:text-teal-950">
      {/* Top Navbar */}
      <Navbar
        role={role}
        setRole={setRole}
        language={language}
        setLanguage={setLanguage}
        isOffline={isOffline}
        lastSynced={patient.lastSynchronized}
        user={authUser}
        patient={patient}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenReferral={() => setIsReferralOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
        onLogout={handleLogout}
        onSync={async () => {
          try {
            const fresh = await patientDataService.fetchPatientAndRecords(patient.mediTraceId);
            if (fresh.patient) setPatient(fresh.patient);
            setRecords(fresh.records);
            showToast(isHindi ? 'सुरक्षित रिकॉर्ड सिंक पूरा हुआ' : 'Secure records synchronized');
          } catch (error: any) {
            showToast(error?.message || 'Synchronization failed.');
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 page-fade">
        {/* Patient Identity Profile Card */}
        <PatientHeader
          patient={patient}
          activeMedicinesCount={records.flatMap(r => r.medicines).filter(m => m.status === 'active').length}
          recordsCount={records.length}
          language={language}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenReferral={() => setIsReferralOpen(true)}
        />

        {/* Dynamic View based on Active Role or Tab */}
        <Suspense fallback={<SectionFallback />}>
        <div key={`${role}-${activeTab}-${timelineFilter}`} className="view-fade">
        {role === 'provider' ? (
          <ProviderDashboard
            patient={patient}
            records={records}
            language={language}
            onOpenReferral={() => setIsReferralOpen(true)}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onBack={() => setRole('patient')}
          />
        ) : role === 'caregiver' ? (
          <CaregiverView
            patient={patient}
            records={records}
            language={language}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenReferral={() => setIsReferralOpen(true)}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onOpenPermissions={() => setIsCaregiverOpen(true)}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onBack={() => setRole('patient')}
          />
        ) : activeTab === 'timeline' ? (
          <MedicalTimeline
            records={records}
            language={language}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenReferral={() => setIsReferralOpen(true)}
            onBack={() => setActiveTab('dashboard')}
            previousScreenName={language === 'hi' ? 'मरीज होम' : 'Patient Home'}
            initialSelectedType={timelineFilter}
          />
        ) : (
          <PatientDashboard
            patient={patient}
            records={records}
            language={language}
            onNavigate={(section) => {
              if (section === 'timeline' || section === 'records' || section === 'visits' || section === 'medicines' || section === 'health') {
                const filterBySection: Record<string, RecordType | 'ALL'> = {
                  timeline: 'ALL',
                  records: 'ALL',
                  visits: 'Consultation',
                  medicines: 'Prescription',
                  health: 'Diagnostic',
                };
                setTimelineFilter(filterBySection[section] || 'ALL');
                setActiveTab('timeline');
              }
            }}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenReferral={() => setIsReferralOpen(true)}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
            onOpenCaregiver={() => setIsCaregiverOpen(true)}
            onOpenSecurity={() => setIsSecurityOpen(true)}
            onSelectRecord={(rec) => setSelectedRecord(rec)}
          />
        )}
        </div>
        </Suspense>
      </main>

      {/* MODALS */}
      <Suspense fallback={null}>
      {/* 1. My Profile Modal (with intact ABHA section & editable address) */}
      {isProfileOpen && <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onBack={() => setIsProfileOpen(false)}
        patient={patient}
        language={language}
        onOpenAccountSettings={() => {
          setIsProfileOpen(false);
          setIsAccountSettingsOpen(true);
        }}
        onUpdatePatient={(updatedPatient, toastMessage) => {
          setPatient(updatedPatient);
          if (toastMessage) {
            showToast(toastMessage);
          }
        }}
      />}

      {/* 2. Account & Privacy Settings Modal */}
      {isAccountSettingsOpen && <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        onBack={() => {
          setIsAccountSettingsOpen(false);
          setIsProfileOpen(true);
        }}
        previousScreenName={language === 'hi' ? 'मेरी प्रोफ़ाइल' : 'My Profile'}
        user={authUser}
        patient={patient}
        language={language}
        onLanguageChange={setLanguage}
        onLogout={handleLogout}
        onOpenCaregivers={() => {
          setIsAccountSettingsOpen(false);
          setIsCaregiverOpen(true);
        }}
        onOpenAuditLogs={() => {
          setIsAccountSettingsOpen(false);
          setIsSecurityOpen(true);
        }}
        onUserUpdated={(updatedUser) => {
          setAuthUser(updatedUser);
        }}
      />}

      {/* 3. Document Uploader & AI Extraction Modal */}
      {isUploadOpen && <DocumentUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        language={language}
        onSaveRecord={handleSaveNewRecord}
      />}

      {/* 4. AI Doctor Referral Summary Modal */}
      {isReferralOpen && <ReferralSummaryModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
        onBack={() => setIsReferralOpen(false)}
        patient={patient}
        records={records}
        language={language}
      />}

      {/* 5. Emergency Health Card Modal */}
      {isEmergencyOpen && <EmergencyCardModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        onBack={() => setIsEmergencyOpen(false)}
        patient={patient}
        records={records}
        language={language}
      />}

      {/* 6. Caregiver Permissions Modal */}
      {isCaregiverOpen && <CaregiverModal
        isOpen={isCaregiverOpen}
        onClose={() => setIsCaregiverOpen(false)}
        onBack={() => {
          setIsCaregiverOpen(false);
          if (role === 'patient') {
            // If opened from account settings
            setIsAccountSettingsOpen(true);
          }
        }}
        patient={patient}
        language={language}
        onUpdateCaregiver={handleUpdateCaregiver}
      />}

      {/* 7. Security & Access Audit Logs Modal */}
      {isSecurityOpen && <SecurityPrivacyModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        onBack={() => {
          setIsSecurityOpen(false);
          if (role === 'patient') {
            setIsAccountSettingsOpen(true);
          }
        }}
        patient={patient}
        logs={logs}
        language={language}
      />}

      {/* 8. Single Record Detail & Paper Slip Viewer Modal */}
      {selectedRecord && <RecordDetailModal
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onBack={() => setSelectedRecord(null)}
        previousScreenName={
          activeTab === 'timeline' 
            ? (language === 'hi' ? 'टाइमलाइन' : 'Medical Timeline')
            : role === 'provider' 
              ? (language === 'hi' ? 'डॉक्टर ओपीडी' : 'Doctor OPD')
              : (language === 'hi' ? 'मरीज होम' : 'Patient Home')
        }
        language={language}
      />}
      </Suspense>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-teal-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

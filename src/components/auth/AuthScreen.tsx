import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileHeart,
  Globe2,
  HeartPulse,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import type { AuthUser, Language, PatientProfile } from '../../types';
import { authService } from '../../services/authService';
import { patientDataService } from '../../services/patientDataService';

type AuthMode = 'sign-in' | 'sign-up' | 'profile';

interface AuthScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onAuthSuccess: (user: AuthUser, patient: PatientProfile) => void;
  initialMode?: AuthMode;
}

const inputClass = 'w-full h-12 border border-slate-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/10 disabled:bg-slate-100';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  language,
  onLanguageChange,
  onAuthSuccess,
  initialMode = 'sign-in',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('O Positive (O+)');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [post, setPost] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [primaryFacility, setPrimaryFacility] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const isHindi = language === 'hi';

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(isHindi ? 'ईमेल और पासवर्ड दर्ज करें।' : 'Enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const session = await authService.signIn(email, password);
      if (!session.user.patientId) {
        setAuthenticatedUser(session.user);
        setFullName(session.user.name || '');
        setMode('profile');
        return;
      }
      const patient = await patientDataService.fetchPatientProfile(session.user.patientId);
      if (!patient) throw new Error('Your linked patient profile could not be loaded.');
      onAuthSuccess(session.user, patient);
    } catch (caught: any) {
      setError(caught?.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError(isHindi ? 'अपना पूरा नाम दर्ज करें।' : 'Enter your full name.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(isHindi ? 'सही ईमेल पता दर्ज करें।' : 'Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError(isHindi ? 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए।' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isHindi ? 'दोनों पासवर्ड मेल नहीं खाते।' : 'Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const session = await authService.signUp(email, password, fullName, language);
      setAuthenticatedUser(session.user);
      setMode('profile');
    } catch (caught: any) {
      setError(caught?.message || 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const numericAge = Number(age);
    if (fullName.trim().length < 2 || numericAge < 1 || numericAge > 130) {
      setError(isHindi ? 'नाम और सही आयु दर्ज करें।' : 'Enter your full name and a valid age.');
      return;
    }
    const emergencyDigits = emergencyPhone.replace(/\D/g, '');
    if ((emergencyName.trim() || emergencyPhone.trim()) && (!emergencyName.trim() || emergencyDigits.length < 10)) {
      setError(isHindi ? 'आपातकालीन संपर्क का नाम और सही फ़ोन नंबर दर्ज करें।' : 'Enter both an emergency contact name and a valid phone number.');
      return;
    }
    setIsLoading(true);
    try {
      const patient = await patientDataService.completeOnboarding({
        fullName,
        age: numericAge,
        gender,
        bloodGroup,
        phone,
        village,
        post,
        district,
        state,
        pinCode,
        primaryFacility,
        preferredLanguage: language,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
      });
      const refreshed = await authService.getCurrentSession();
      if (!refreshed) throw new Error('Your session expired while creating the profile.');
      onAuthSuccess(refreshed.user, patient);
    } catch (caught: any) {
      setError(caught?.message || 'Unable to save the patient profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-shell min-h-screen bg-[#eef4f3] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
        <section className="relative hidden overflow-hidden bg-[#083c3b] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#6ee7b7_0,transparent_28%),radial-gradient(circle_at_80%_72%,#38bdf8_0,transparent_24%)]" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center border border-white/25 bg-white/10">
              <HeartPulse className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xl font-extrabold tracking-tight">MediTrace</p>
              <p className="text-xs text-teal-100">Continuity of care, without gaps</p>
            </div>
          </div>

          <div className="relative max-w-xl py-16">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Secure clinical history</p>
            <h1 className="text-4xl font-black leading-tight xl:text-5xl">
              One health record that moves with the patient.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-teal-50/80">
              Medical visits, prescriptions, investigations, emergency details, and referral summaries—organized across facilities and protected by patient-level access controls.
            </p>
            <div className="mt-9 grid gap-3 text-sm sm:grid-cols-3">
              {[
                [FileHeart, 'Unified timeline'],
                [ShieldCheck, 'Private by design'],
                [Stethoscope, 'Doctor-ready'],
              ].map(([Icon, label]) => (
                <div key={label as string} className="border border-white/15 bg-white/5 p-3.5">
                  <Icon className="mb-2 h-5 w-5 text-emerald-300" />
                  <span className="font-semibold">{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs leading-5 text-teal-100/70">
            Built for patients, caregivers, and healthcare teams across rural and district care networks.
          </p>
        </section>

        <section className="flex min-h-screen flex-col bg-[#f7faf9]">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2.5 lg:hidden">
              <span className="grid h-9 w-9 place-items-center bg-teal-800 text-white"><HeartPulse className="h-5 w-5" /></span>
              <span className="font-extrabold">MediTrace</span>
            </div>
            <div className="ml-auto flex items-center border border-slate-300 bg-white p-1 text-xs font-bold">
              <Globe2 className="mx-2 h-4 w-4 text-slate-500" />
              <button type="button" onClick={() => onLanguageChange('en')} className={`min-h-9 px-3 ${language === 'en' ? 'bg-teal-800 text-white' : 'text-slate-600'}`}>EN</button>
              <button type="button" onClick={() => onLanguageChange('hi')} className={`min-h-9 px-3 ${language === 'hi' ? 'bg-teal-800 text-white' : 'text-slate-600'}`}>हिंदी</button>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
            <div className={`w-full ${mode === 'profile' ? 'max-w-3xl' : 'max-w-md'} page-fade`}>
              {mode !== 'profile' && (
                <div className="mb-7">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    {mode === 'sign-in' ? (isHindi ? 'अपने स्वास्थ्य रिकॉर्ड खोलें' : 'Access your health record') : (isHindi ? 'MediTrace से जुड़ें' : 'Join MediTrace')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {mode === 'sign-in'
                      ? (isHindi ? 'अपने ईमेल और पासवर्ड से सुरक्षित रूप से साइन इन करें।' : 'Sign in securely with your email and password.')
                      : (isHindi ? 'कोई OTP या ईमेल सत्यापन आवश्यक नहीं है।' : 'No OTP or email-verification step is required.')}
                  </p>
                </div>
              )}

              {error && (
                <div role="alert" className="mb-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {error}
                </div>
              )}

              {mode === 'sign-in' && (
                <form onSubmit={handleSignIn} className="space-y-5" noValidate>
                  <Field label={isHindi ? 'ईमेल पता' : 'Email address'} icon={<Mail className="h-4 w-4" />}>
                    <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
                  </Field>
                  <PasswordField value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} label={isHindi ? 'पासवर्ड' : 'Password'} />
                  <SubmitButton loading={isLoading} label={isHindi ? 'साइन इन करें' : 'Sign in securely'} />
                  <p className="text-center text-sm text-slate-600">
                    {isHindi ? 'नया खाता चाहिए?' : 'Need a new account?'}{' '}
                    <button type="button" className="font-bold text-teal-800 underline-offset-4 hover:underline" onClick={() => switchMode('sign-up')}>{isHindi ? 'खाता बनाएं' : 'Create one'}</button>
                  </p>
                </form>
              )}

              {mode === 'sign-up' && (
                <form onSubmit={handleSignUp} className="space-y-5" noValidate>
                  <Field label={isHindi ? 'पूरा नाम' : 'Full name'}><input className={inputClass} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoFocus /></Field>
                  <Field label={isHindi ? 'ईमेल पता' : 'Email address'} icon={<Mail className="h-4 w-4" />}><input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></Field>
                  <PasswordField value={password} setValue={setPassword} visible={showPassword} setVisible={setShowPassword} label={isHindi ? 'पासवर्ड' : 'Password'} />
                  <Field label={isHindi ? 'पासवर्ड दोबारा दर्ज करें' : 'Confirm password'}><input className={inputClass} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></Field>
                  <SubmitButton loading={isLoading} label={isHindi ? 'खाता बनाएं' : 'Create account'} />
                  <p className="text-center text-sm text-slate-600">
                    {isHindi ? 'पहले से खाता है?' : 'Already have an account?'}{' '}
                    <button type="button" className="font-bold text-teal-800 underline-offset-4 hover:underline" onClick={() => switchMode('sign-in')}>{isHindi ? 'साइन इन करें' : 'Sign in'}</button>
                  </p>
                </form>
              )}

              {mode === 'profile' && (
                <form onSubmit={handleProfile} className="space-y-6" noValidate>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Final setup</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">Complete your patient profile</h2>
                    <p className="mt-2 text-sm text-slate-600">These details create your private MediTrace patient record. You can update them later.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name *"><input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
                    <Field label="Mobile number"><input className={inputClass} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" /></Field>
                    <Field label="Age *"><input className={inputClass} type="number" min="1" max="130" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} /></Field>
                    <Field label="Gender"><select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}><option>Male</option><option>Female</option><option>Other</option></select></Field>
                    <Field label="Blood group"><select className={inputClass} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>{['O Positive (O+)','A Positive (A+)','B Positive (B+)','AB Positive (AB+)','O Negative (O-)','A Negative (A-)','B Negative (B-)','AB Negative (AB-)'].map((item) => <option key={item}>{item}</option>)}</select></Field>
                    <Field label="Primary facility"><input className={inputClass} value={primaryFacility} onChange={(e) => setPrimaryFacility(e.target.value)} placeholder="PHC / hospital name" /></Field>
                    <Field label="Village / address"><input className={inputClass} value={village} onChange={(e) => setVillage(e.target.value)} /></Field>
                    <Field label="Post office"><input className={inputClass} value={post} onChange={(e) => setPost(e.target.value)} /></Field>
                    <Field label="District"><input className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)} /></Field>
                    <Field label="State"><input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} /></Field>
                    <Field label="PIN code"><input className={inputClass} inputMode="numeric" maxLength={6} value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))} /></Field>
                  </div>
                  <div className="border-t border-slate-200 pt-5">
                    <p className="mb-4 text-sm font-extrabold text-slate-800">Emergency contact (optional)</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Contact name"><input className={inputClass} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} /></Field>
                      <Field label="Contact phone"><input className={inputClass} type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} /></Field>
                    </div>
                  </div>
                  <SubmitButton loading={isLoading} label="Create patient profile" />
                  {!authenticatedUser && <p className="text-xs text-slate-500">You must be signed in before this profile can be saved.</p>}
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const Field: React.FC<{ label: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">{icon}{label}</span>
    {children}
  </label>
);

const PasswordField: React.FC<{ value: string; setValue: (value: string) => void; visible: boolean; setVisible: (value: boolean) => void; label: string }> = ({ value, setValue, visible, setVisible, label }) => (
  <Field label={label} icon={<LockKeyhole className="h-4 w-4" />}>
    <div className="relative">
      <input className={`${inputClass} pr-12`} type={visible ? 'text' : 'password'} autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-slate-500 hover:text-teal-800" onClick={() => setVisible(!visible)}>{visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
    </div>
  </Field>
);

const SubmitButton: React.FC<{ loading: boolean; label: string }> = ({ loading, label }) => (
  <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 bg-teal-800 px-5 text-sm font-extrabold text-white transition hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
    {loading ? <span className="h-5 w-5 animate-spin border-2 border-white/40 border-t-white" /> : <CheckCircle2 className="h-5 w-5" />}
    <span>{loading ? 'Please wait…' : label}</span>
    {!loading && <ArrowRight className="h-4 w-4" />}
  </button>
);

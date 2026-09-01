import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Printer, 
  Check, 
  X, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  Globe, 
  Stethoscope, 
  ShieldAlert,
  Zap,
  Clock,
  AlertTriangle,
  Heart,
  Activity,
  Pill,
  Calendar,
  Building2,
  Phone,
  User,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Flame,
  HelpCircle
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { PatientProfile, MedicalRecord, Language, ReferralSummaryStructured } from '../types';
import { translations } from '../data/translations';
import {
  getOrGenerateReferralSummary,
  getDefaultReferralContext,
  computeDataFingerprint,
  computeRecordVersion,
  getCachedSummary,
  isSummaryOutdated,
  formatSummaryToText,
  buildDeterministicStructuredSummary,
  SummaryResult,
} from '../services/aiSummaryService';
import { printReferralSummaryDocument } from '../utils/printReferralSummary';

interface ReferralSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  patient: PatientProfile;
  records: MedicalRecord[];
  language: Language;
}

export const ReferralSummaryModal: React.FC<ReferralSummaryModalProps> = ({
  isOpen,
  onClose,
  onBack,
  patient,
  records,
  language,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';
  const handleBack = onBack || onClose;

  const patientId = patient?.mediTraceId || patient?.id || '';

  // Tailored default referral reason & facilities
  const defaultCtx = getDefaultReferralContext(patient);

  const [summaryLang, setSummaryLang] = useState<Language>(language || 'hi');
  const [referralReason, setReferralReason] = useState<string>(defaultCtx.referralReason);
  const [referringFacility, setReferringFacility] = useState<string>(defaultCtx.referringFacility);
  const [receivingFacility, setReceivingFacility] = useState<string>(defaultCtx.receivingFacility);
  
  const [structuredData, setStructuredData] = useState<ReferralSummaryStructured | null>(null);
  const [plainSummaryText, setPlainSummaryText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cacheSource, setCacheSource] = useState<string | null>(null);
  const [hasOutdatedNotice, setHasOutdatedNotice] = useState<boolean>(false);

  const currentDataFingerprint = computeDataFingerprint(patient, records, referralReason, referringFacility, receivingFacility);

  // Sync initial language if app language changes
  useEffect(() => {
    if (language) {
      setSummaryLang(language);
    }
  }, [language]);

  // Reset defaults when patient switches
  useEffect(() => {
    if (patient) {
      const ctx = getDefaultReferralContext(patient);
      setReferralReason(ctx.referralReason);
      setReferringFacility(ctx.referringFacility);
      setReceivingFacility(ctx.receivingFacility);
      setStructuredData(null);
      setPlainSummaryText('');
    }
  }, [patientId]);

  // Check cache and load summary on modal open, language switch, or fingerprint change
  useEffect(() => {
    if (!isOpen || !patient) return;

    const cached = getCachedSummary(patientId);
    const savedFp = cached?.dataFingerprint || cached?.recordVersion;
    const isExactMatch = !!(cached && cached.patientId === patientId && savedFp === currentDataFingerprint);

    // Case 1: Exact Cache Hit for current patient clinical data
    if (isExactMatch) {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentDataFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=${savedFp}`);
      console.log('[REFERRAL] CACHE HIT — Gemini NOT called');

      setHasOutdatedNotice(false);
      setCacheSource('instant_cache');
      setErrorMsg(null);

      if (cached.structuredTranslations?.[summaryLang]) {
        const struct = cached.structuredTranslations[summaryLang]!;
        setStructuredData(struct);
        setPlainSummaryText(cached.translations?.[summaryLang] || formatSummaryToText(struct, summaryLang));
        setIsLoading(false);
        setIsTranslating(false);
        return;
      }
      // If language translation needed for cached entry
      loadSummary(false);
      return;
    }

    // Case 2: Data Changed (Saved summary exists, but current clinical records/referral details have changed)
    if (cached && savedFp !== currentDataFingerprint) {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentDataFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=${savedFp}`);
      console.log('[REFERRAL] DATA CHANGED — new summary required');

      setHasOutdatedNotice(true);
      setCacheSource('data_changed');
      setIsLoading(false);
      setIsTranslating(false);
      setErrorMsg(null);

      // Safely display the previous saved summary so clinician has instant access without automatic Gemini call
      const prevStruct = cached.structuredTranslations?.[summaryLang] || cached.structuredTranslations?.[summaryLang === 'hi' ? 'en' : 'hi'];
      if (prevStruct) {
        setStructuredData(prevStruct);
        const prevText = cached.translations?.[summaryLang] || formatSummaryToText(prevStruct, summaryLang);
        setPlainSummaryText(prevText);
      }
      return;
    }

    // Case 3: No saved summary exists at all for this patient
    loadSummary(false);
  }, [isOpen, summaryLang, patientId, currentDataFingerprint]);

  if (!isOpen) return null;

  const loadSummary = async (forceRefresh: boolean = false) => {
    setErrorMsg(null);

    const hasExistingData = !!structuredData;
    if (!hasExistingData || forceRefresh) {
      setIsLoading(true);
    } else {
      setIsTranslating(true);
    }

    try {
      const result: SummaryResult = await getOrGenerateReferralSummary(
        {
          patient,
          records,
          referralReason,
          referringFacility,
          receivingFacility,
          language: summaryLang,
          forceRefresh,
        },
        status => {
          if (status === 'translating') {
            setIsTranslating(true);
          }
        }
      );

      setStructuredData(result.structuredSummary);
      setPlainSummaryText(result.summary || formatSummaryToText(result.structuredSummary, result.language));
      if (result.language !== summaryLang) {
        setSummaryLang(result.language);
      }

      if (result.isOutdated) {
        setCacheSource('data_changed');
        setHasOutdatedNotice(true);
      } else if (result.source === 'preserved_cache_after_503') {
        setCacheSource('preserved_cache_after_503');
        setHasOutdatedNotice(true);
      } else if (result.source === 'chart_records_fallback') {
        setCacheSource('chart_records_fallback');
        setHasOutdatedNotice(false);
      } else if (result.isFromCache) {
        setCacheSource('instant_cache');
        setHasOutdatedNotice(false);
      } else {
        setCacheSource('ai_generated');
        setHasOutdatedNotice(false);
      }

      if (result.errorMessage) {
        setErrorMsg(result.errorMessage);
      }
    } catch (err: any) {
      console.error('Failed to load referral summary:', err);
      // Preserve existing structured data if available, without breaking UI
      if (structuredData) {
        setCacheSource('data_changed');
        setHasOutdatedNotice(true);
        setErrorMsg(
          summaryLang === 'hi'
            ? 'AI सेवा अस्थायी रूप से व्यस्त है (503 High Demand)। आपका पिछला सारांश सुरक्षित रखा गया है। कृपया थोड़ी देर बाद पुनः प्रयास करें।'
            : 'AI service is temporarily unavailable (503 High Demand). Your previous summary has been preserved. Please try again later.'
        );
      } else {
        const fallback = buildDeterministicStructuredSummary(
          patient,
          records,
          referralReason,
          referringFacility,
          receivingFacility,
          summaryLang
        );
        setStructuredData(fallback);
        setPlainSummaryText(formatSummaryToText(fallback, summaryLang));
        setCacheSource('chart_records_fallback');
        setErrorMsg(
          summaryLang === 'hi'
            ? 'AI सेवा अस्थायी रूप से व्यस्त है (503 High Demand)। दर्ज मेडिकल रिकॉर्ड से संरचित क्लिनिकल सारांश प्रदर्शित किया जा रहा है।'
            : 'AI service is temporarily unavailable (503 High Demand). Displaying structured clinical summary directly from recorded medical charts.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsTranslating(false);
    }
  };

  const handleLanguageSwitch = (newLang: Language) => {
    if (newLang === summaryLang) return;

    // Check if target language already exists in cache for instantaneous zero-latency switch!
    const cached = getCachedSummary(patientId);
    const savedFp = cached?.dataFingerprint || cached?.recordVersion;
    if (
      cached &&
      cached.patientId === patientId &&
      savedFp === currentDataFingerprint &&
      cached.structuredTranslations?.[newLang]
    ) {
      const struct = cached.structuredTranslations[newLang]!;
      setStructuredData(struct);
      setPlainSummaryText(cached.translations?.[newLang] || formatSummaryToText(struct, newLang));
      setSummaryLang(newLang);
      setCacheSource('instant_cache');
      setErrorMsg(null);
      return;
    }

    // Set summary lang to trigger translation while keeping existing data on screen
    setSummaryLang(newLang);
  };

  const handleCopy = async () => {
    const textToCopy = plainSummaryText || (structuredData ? formatSummaryToText(structuredData, summaryLang) : '');
    if (!textToCopy) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Copy is not supported in this browser.');
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      setErrorMsg(isCurrentLangHindi ? 'सारांश कॉपी नहीं हो सका। कृपया दोबारा प्रयास करें।' : 'The summary could not be copied. Please try again.');
    }
  };

  const handlePrint = () => {
    if (!structuredData) return;
    printReferralSummaryDocument({
      structuredData,
      language: summaryLang,
      doctorName: 'Dr. Manoj Kumar, MBBS',
      facilityName: referringFacility || 'PHC Lakhimpur Rural Health Center',
    });
  };

  const p = structuredData?.patientDetails || ({} as any);
  const r = structuredData?.referralReason || ({} as any);
  const c = structuredData?.clinicalSummary || ({} as any);
  const v = structuredData?.vitals || ({} as any);
  const investigations = structuredData?.investigations || [];
  const medications = structuredData?.medications || [];
  const keyFindings = structuredData?.keyFindings || [];
  const recommendedActions = structuredData?.recommendedActions || [];
  const meta = structuredData?.metadata || ({} as any);

  const isCurrentLangHindi = summaryLang === 'hi';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto referral-summary-modal-backdrop print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 referral-summary-card print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* =========================================================================
            HEADER BAR
           ========================================================================= */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-950 text-white flex items-center justify-between gap-3 shrink-0 referral-print-header print:bg-teal-900 print:text-white print:p-4 print:rounded-xl">
          <div className="flex items-center gap-3">
            <div className="print:hidden">
              <BackButton
                onClick={handleBack}
                label={isCurrentLangHindi ? 'वापस' : 'Back'}
                ariaLabel="Go back"
                variant="header"
              />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-500/30 shrink-0 print:border print:border-white/30">
              <Stethoscope className="w-6 h-6 text-teal-200 print:text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl text-white tracking-tight">
                  {isCurrentLangHindi 
                    ? 'मेडिट्रेस AI-सहायक डॉक्टर रेफरल सारांश' 
                    : 'MediTrace AI-Assisted Clinical Referral Summary'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 print:text-amber-200 text-[10px] font-black uppercase tracking-wider border border-amber-400/30 shrink-0">
                  {isCurrentLangHindi ? 'विशेषज्ञ रेफरल' : 'Clinical Referral'}
                </span>
                {cacheSource === 'ai_generated' && !hasOutdatedNotice && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-400/30 print:hidden">
                    <Sparkles className="w-3 h-3 text-teal-300" />
                    {isCurrentLangHindi ? 'AI-निर्मित सारांश (AI Generated)' : 'AI Generated'}
                  </span>
                )}
                {cacheSource === 'instant_cache' && !hasOutdatedNotice && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 print:hidden">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {isCurrentLangHindi ? 'सहेजा गया सारांश (Cached)' : 'Cached / Saved Summary'}
                  </span>
                )}
                {(hasOutdatedNotice || cacheSource === 'data_changed' || (cacheSource === 'preserved_cache_after_503' && hasOutdatedNotice)) && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-400/30 print:hidden">
                    <AlertTriangle className="w-3 h-3 text-amber-300" />
                    {isCurrentLangHindi ? 'डेटा बदला गया — नया सारांश आवश्यक' : 'Data Changed — New Summary Required'}
                  </span>
                )}
                {cacheSource === 'preserved_cache_after_503' && !hasOutdatedNotice && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30 print:hidden">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {isCurrentLangHindi ? 'सहेजा गया सारांश (Preserved)' : 'Cached / Saved Summary'}
                  </span>
                )}
                {cacheSource === 'chart_records_fallback' && !hasOutdatedNotice && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-400/30 print:hidden">
                    <AlertTriangle className="w-3 h-3 text-rose-300" />
                    {isCurrentLangHindi ? 'AI सेवा अनुपलब्ध' : 'AI Service Unavailable'}
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-200/90 print:text-teal-100 font-medium">
                {isCurrentLangHindi
                  ? 'प्राथमिक स्वास्थ्य केंद्र से उच्च संस्थान/विशेषज्ञ डॉक्टर हेतु मानकीकृत क्लिनिकल रिपोर्ट'
                  : 'Standardized cross-facility clinical summary for receiving hospital & specialist'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close referral summary"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            CONFIGURATION & LANGUAGE CONTROLS STRIP (Hidden during print)
           ========================================================================= */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs shrink-0 print:hidden">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isCurrentLangHindi ? 'रेफरल का मुख्य कारण' : 'Primary Reason for Referral'}
            </label>
            <input
              type="text"
              value={referralReason}
              onChange={e => setReferralReason(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-teal-600 focus:border-teal-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isCurrentLangHindi ? 'प्राप्तकर्ता अस्पताल / संस्थान' : 'Receiving Healthcare Facility'}
            </label>
            <input
              type="text"
              value={receivingFacility}
              onChange={e => setReceivingFacility(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-teal-600 focus:border-teal-600"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block font-bold text-slate-700 mb-1">
                {isCurrentLangHindi ? 'सारांश भाषा (Language)' : 'Summary Language'}
              </label>
              <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleLanguageSwitch('hi')}
                  className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                    summaryLang === 'hi' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  हिंदी (Default)
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageSwitch('en')}
                  className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                    summaryLang === 'en' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English (Doctor)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadSummary(true)}
              disabled={isLoading || isTranslating}
              className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 shadow-xs h-[34px]"
              title="Regenerate fresh synthesis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isCurrentLangHindi ? 'पुनः बनाएँ' : 'Regenerate'}</span>
            </button>
          </div>
        </div>

        {/* AI Service Graceful Error / Notification Banner (Hidden during print) */}
        {errorMsg && (
          <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-300 flex items-start justify-between gap-3 text-xs text-amber-950 font-medium shrink-0 print:hidden animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-amber-900 text-xs mb-0.5">
                  {isCurrentLangHindi ? 'AI सेवा सूचना' : 'AI Service Notice'}
                </span>
                <p className="leading-relaxed text-amber-900">{errorMsg}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => loadSummary(true)}
                disabled={isLoading || isTranslating}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isCurrentLangHindi ? 'पुनः प्रयास' : 'Retry'}</span>
              </button>
              <button
                onClick={() => setErrorMsg(null)}
                className="w-6 h-6 rounded-full hover:bg-amber-200/70 text-amber-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Outdated records / Data Changed alert banner */}
        {hasOutdatedNotice && (
          <div className="px-4 sm:px-6 py-2.5 bg-amber-500/15 border-b border-amber-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 font-medium shrink-0 print:hidden">
            <div className="flex items-start sm:items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-extrabold text-amber-950 mr-1.5">
                  {isCurrentLangHindi ? 'क्लिनिकल डेटा बदला गया:' : 'Clinical Data Changed:'}
                </span>
                <span className="text-amber-900">
                  {isCurrentLangHindi
                    ? 'अंतिम सारांश निर्माण के बाद नए/संशोधित मेडिकल रिकॉर्ड या रेफरल विवरण दर्ज हुए हैं। नीचे पिछला सहेजा गया सारांश प्रदर्शित है।'
                    : 'Medical records or referral details have changed since the last summary was generated. The previous saved summary is shown below.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => loadSummary(true)}
              disabled={isLoading || isTranslating}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isCurrentLangHindi ? 'नया AI सारांश बनाएँ' : 'Generate New AI Summary'}</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            STRUCTURED SUMMARY CLINICAL REPORT BODY
           ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/70 space-y-5 referral-summary-scroll-body print:p-0 print:bg-white print:space-y-4">
          
          {/* Subtle In-flight Translation Pill */}
          {isTranslating && (
            <div className="sticky top-0 z-20 p-2.5 bg-teal-900/90 backdrop-blur-xs text-white rounded-xl shadow-lg border border-teal-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 print:hidden">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <RefreshCw className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
                <span>
                  {summaryLang === 'hi'
                    ? 'क्लिनिकल सटीकता बनाए रखते हुए हिंदी में अनुवाद हो रहा है...'
                    : 'Translating summary into English for receiving specialist...'}
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-teal-100 font-mono">
                Preserving Medical Entities
              </span>
            </div>
          )}

          {isLoading && !structuredData ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">
                  {isCurrentLangHindi ? 'AI रेफरल सारांश तैयार हो रहा है...' : 'Generating Clinical Referral Summary...'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {isCurrentLangHindi
                    ? 'उप-स्वास्थ्य केंद्र, PHC लखीमपुर और जिला अस्पताल के रिकॉर्ड्स का एक डॉक्टर-तैयार क्लिनिकल सारांश में संश्लेषण किया जा रहा है।'
                    : 'Synthesizing cross-facility records from Sub-Centre, PHC Lakhimpur, and District Hospital into one doctor-ready brief.'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`space-y-4.5 transition-opacity duration-200 ${isTranslating ? 'opacity-70' : 'opacity-100'}`}>
              
              {/* =========================================================================
                  SECTION 1: PATIENT DETAILS
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {isCurrentLangHindi ? 'रोगी का विवरण' : 'PATIENT DETAILS'}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {p.abhaId || patient.id || patient.mediTraceId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'नाम (Name)' : 'Patient Name'}</span>
                    <span className="font-extrabold text-slate-900 text-sm">{p.name || patient.name}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'आयु / लिंग (Age/Sex)' : 'Age / Gender'}</span>
                    <span className="font-bold text-slate-800">{p.age || patient.age} {isCurrentLangHindi ? 'वर्ष' : 'Yrs'} / {p.gender || patient.gender}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'रक्त समूह (Blood Group)' : 'Blood Group'}</span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-black rounded-md border border-rose-200 inline-block">
                      {p.bloodGroup || patient.bloodGroup}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'प्राथमिक संपर्क (Phone)' : 'Primary Contact'}</span>
                    <span className="font-bold text-slate-800 font-mono">{p.primaryContact || patient.phone}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'आपातकालीन संपर्क (Emergency)' : 'Emergency Contact'}</span>
                    <span className="font-semibold text-slate-800 block">
                      {p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactRelationship || ''})` : (isCurrentLangHindi ? 'उपलब्ध नहीं' : 'Not listed')}
                    </span>
                    {p.emergencyContactPhone && (
                      <span className="font-mono text-[11px] text-slate-500">{p.emergencyContactPhone}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">{isCurrentLangHindi ? 'मूल स्वास्थ्य केंद्र (Base PHC)' : 'Base Facility'}</span>
                    <span className="font-semibold text-slate-800">{p.baseFacility || meta.referringFacility || patient.primaryFacility}</span>
                  </div>

                  <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                    <span className="text-slate-400 font-medium block mb-1">{isCurrentLangHindi ? 'ज्ञात एलर्जी (Confirmed Allergies)' : 'Confirmed Allergies'}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(p.allergies) && p.allergies.length > 0 ? (
                        p.allergies.map((alg: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded-lg text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            {alg}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">{isCurrentLangHindi ? 'कोई ज्ञात एलर्जी दर्ज नहीं' : 'No known drug allergies recorded'}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3 lg:col-span-4 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-medium block mb-1">{isCurrentLangHindi ? 'दीर्घकालिक रोग (Chronic Conditions)' : 'Chronic Conditions'}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(p.chronicConditions) && p.chronicConditions.length > 0 ? (
                        p.chronicConditions.map((cond: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 font-semibold rounded-lg text-[11px]">
                            • {cond}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">{isCurrentLangHindi ? 'कोई गंभीर बीमारी दर्ज नहीं' : 'None recorded'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 2: REASON FOR REFERRAL
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {isCurrentLangHindi ? 'रेफरल का कारण' : 'REASON FOR REFERRAL'}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-extrabold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    {r.urgencyLevel || (isCurrentLangHindi ? 'प्राथमिकता ओपीडी / विशेषज्ञ समीक्षा' : 'Priority OPD / Semi-Urgent')}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-950 font-semibold leading-relaxed">
                    <span className="font-bold block text-amber-900 mb-1">
                      {isCurrentLangHindi ? 'मुख्य नैदानिक कारण (Primary Reason):' : 'Primary Clinical Reason:'}
                    </span>
                    {r.primaryReason || referralReason}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {isCurrentLangHindi ? 'क्लिनिकल संकेत (Clinical Indication):' : 'Clinical Indication:'}
                      </span>
                      <p className="text-slate-800 font-medium">
                        {r.clinicalIndication || (isCurrentLangHindi ? 'परिश्रमजन्य सांस फूलना और अनियंत्रित डायबिटीज' : 'Progressive exertional dyspnea with suboptimal glycemic control')}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700 block mb-0.5">
                        {isCurrentLangHindi ? 'आवश्यक विशेषज्ञता (Specialist Needed):' : 'Specialist Consultation Needed:'}
                      </span>
                      <p className="text-slate-800 font-medium">
                        {r.specialistEvaluationNeeded || (isCurrentLangHindi ? 'कार्डियोलॉजी (2D Echo / TMT) एवं एंडोक्रिनोलॉजी परामर्श' : 'Cardiology (2D Echocardiography, TMT) & Endocrinology')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 3: CLINICAL SUMMARY & CROSS-FACILITY TRAJECTORY
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {isCurrentLangHindi ? 'नैदानिक सारांश एवं बहु-अस्पताल यात्रा' : 'CLINICAL SUMMARY & CROSS-FACILITY TRAJECTORY'}
                  </h4>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
                    {c.synthesis || (isCurrentLangHindi
                      ? '54 वर्षीय पुरुष मरीज जिन्हें टाइप-2 डायबिटीज (7 वर्ष) और हाइपरटेंशन (3 वर्ष) का इतिहास है। पिछले 2 हफ्तों से चलने पर सांस फूलने और सीने में भारीपन की शिकायत पर जिला अस्पताल व पीएचसी में प्राथमिक जांच की गई है।'
                      : '54-year-old male with 7-year history of Type 2 Diabetes and 3-year history of Hypertension presenting with exertional breathlessness (NYHA Class II) and recent suboptimal glycemic control (HbA1c 7.8%).')}
                  </div>

                  {Array.isArray(c.trajectory) && c.trajectory.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                        {isCurrentLangHindi ? 'बहु-स्तरीय स्वास्थ्य केंद्रों की टाइमलाइन:' : 'Cross-Facility Timeline Trajectory:'}
                      </span>
                      <div className="space-y-2">
                        {c.trajectory.map((step: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800">
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded font-mono font-bold text-[10px] shrink-0">
                              {step.date}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-slate-900 block text-[11px]">
                                {step.facility}
                              </span>
                              <span className="text-slate-600 text-xs">{step.eventSummary}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================================
                  SECTION 4: VITALS (MOST RECENT)
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                      4
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {isCurrentLangHindi ? 'वाइटल्स — नवीनतम' : 'VITALS — MOST RECENT'}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{v.recordedDate || '2026-08-20'}</span>
                    <span>•</span>
                    <span className="text-slate-700 font-bold">{v.recordedFacility || 'Village Sub-Centre Rampur'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                  {/* BP */}
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                    <span className="text-teal-900 font-medium block text-[11px]">{isCurrentLangHindi ? 'रक्तचाप (BP)' : 'Blood Pressure'}</span>
                    <span className="font-black text-slate-900 text-sm block mt-0.5">{v.bloodPressure || '142/90 mmHg'}</span>
                    {v.previousBP && (
                      <span className="text-[10px] text-teal-800 block mt-0.5">
                        {isCurrentLangHindi ? `पिछला: ${v.previousBP}` : `Prev: ${v.previousBP}`}
                      </span>
                    )}
                  </div>

                  {/* Pulse */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium block text-[11px]">{isCurrentLangHindi ? 'पल्स (Pulse)' : 'Pulse Rate'}</span>
                    <span className="font-black text-slate-900 text-sm block mt-0.5">{v.pulse || '82 bpm'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Regular Sinus</span>
                  </div>

                  {/* SpO2 */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium block text-[11px]">SpO₂</span>
                    <span className="font-black text-emerald-700 text-sm block mt-0.5">{v.spO2 || '98%'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">On Room Air</span>
                  </div>

                  {/* Temperature */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium block text-[11px]">{isCurrentLangHindi ? 'तापमान (Temp)' : 'Temperature'}</span>
                    <span className="font-black text-slate-900 text-sm block mt-0.5">{v.temperature || '98.6 °F'}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Afebrile</span>
                  </div>

                  {/* Blood Sugar */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-amber-900 font-medium block text-[11px]">{isCurrentLangHindi ? 'ब्लड शुगर (Sugar)' : 'Blood Sugar'}</span>
                    <span className="font-black text-amber-950 text-sm block mt-0.5">{v.bloodSugar || '148 mg/dL'}</span>
                    <span className="text-[10px] text-amber-800 block mt-0.5">{v.sugarType || 'Fasting (FBS)'}</span>
                  </div>

                  {/* Weight & BMI */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium block text-[11px]">{isCurrentLangHindi ? 'वजन / BMI' : 'Weight / BMI'}</span>
                    <span className="font-black text-slate-900 text-sm block mt-0.5">{v.weight || '64 kg'}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{v.bmi || 'BMI: 23.8'}</span>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 5: RECENT INVESTIGATIONS
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                      5
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {isCurrentLangHindi ? 'हाल के महत्वपूर्ण जांच परिणाम' : 'RECENT INVESTIGATIONS'}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {investigations.length} {isCurrentLangHindi ? 'परीक्षण दर्ज' : 'Tests Recorded'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">{isCurrentLangHindi ? 'जांच का नाम' : 'Investigation'}</th>
                        <th className="py-2.5 px-3">{isCurrentLangHindi ? 'परिणाम (Result)' : 'Result'}</th>
                        <th className="py-2.5 px-3">{isCurrentLangHindi ? 'सामान्य सीमा (Ref. Range)' : 'Normal Range'}</th>
                        <th className="py-2.5 px-3">{isCurrentLangHindi ? 'स्थिति (Status)' : 'Status'}</th>
                        <th className="py-2.5 px-3">{isCurrentLangHindi ? 'स्वास्थ्य केंद्र व तिथि' : 'Facility & Date'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {investigations.map((inv: any, idx: number) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">{inv.testName}</td>
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-900">{inv.result}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{inv.normalRange || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase inline-block border ${
                                inv.status === 'High' || inv.status === 'Low'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : inv.status === 'Borderline'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                              {inv.facility} {inv.date ? `(${inv.date})` : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 6: CURRENT MEDICATIONS
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                      6
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                      {isCurrentLangHindi ? 'वर्तमान दवाएं (सक्रिय पर्चे)' : 'CURRENT MEDICATIONS'}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-xs">
                    {medications.length} {isCurrentLangHindi ? 'दवाएं सक्रिय' : 'Active Drugs'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {medications.map((med: any, idx: number) => (
                    <div key={idx} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{med.name}</span>
                            <span className="text-[11px] text-teal-700 font-bold font-mono">
                              {med.dosage} • {med.frequency}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-600 shrink-0">
                          {med.route || 'Oral'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800">
                          <strong>{isCurrentLangHindi ? 'निर्देश:' : 'Timing:'}</strong> {med.timingInstructions || (isCurrentLangHindi ? 'भोजनोपरांत पानी के साथ' : 'Post meals')}
                        </span>
                        {med.purpose && (
                          <span className="text-slate-500">
                            <strong>{isCurrentLangHindi ? 'उद्देश्य:' : 'Purpose:'}</strong> {med.purpose}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* =========================================================================
                  SECTION 7: KEY FINDINGS FOR RECEIVING DOCTOR
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                    7
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {isCurrentLangHindi ? 'प्राप्तकर्ता डॉक्टर के लिए मुख्य निष्कर्ष' : 'KEY FINDINGS FOR RECEIVING DOCTOR'}
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs">
                  {keyFindings.map((finding: any, idx: number) => {
                    const text = typeof finding === 'object' ? finding.text : finding;
                    const cat = typeof finding === 'object' ? finding.category : (isCurrentLangHindi ? 'निष्कर्ष' : 'Finding');
                    const isAlert = typeof finding === 'object' && (finding.highlightType === 'alert' || finding.isCritical);
                    const isWarning = typeof finding === 'object' && finding.highlightType === 'warning';

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          isAlert
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : isWarning
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        {isAlert ? (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-extrabold block text-[11px] mb-0.5 opacity-90">
                            [{cat}]
                          </span>
                          <p className="font-medium leading-relaxed">{text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* =========================================================================
                  SECTION 8: RECOMMENDED ACTION
                 ========================================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs referral-print-section referral-print-avoid-break">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-3.5">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center">
                    8
                  </span>
                  <h4 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {isCurrentLangHindi ? 'अनुशंसित अगले कदम (Recommended Actions)' : 'RECOMMENDED ACTIONS'}
                  </h4>
                </div>

                <div className="space-y-2 text-xs">
                  {recommendedActions.map((action: string, idx: number) => (
                    <div key={idx} className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/70 text-teal-950 font-semibold flex items-start gap-2.5">
                      <ChevronRight className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Legal Notice */}
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-semibold referral-print-section referral-print-avoid-break">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {meta.disclaimer || (isCurrentLangHindi 
                    ? 'AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड और प्रत्यक्ष शारीरिक परीक्षण की पुष्टि अवश्य करें।'
                    : 'AI-generated clinical summary — verify against original health facility records and direct clinical examination.')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER ACTIONS
           ========================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>{isCurrentLangHindi ? 'विशेषज्ञ समीक्षा हेतु तैयार' : 'Ready for Specialist Evaluation'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-400 font-mono">
              FP: {currentDataFingerprint.slice(0, 16)}...
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !structuredData}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">{isCurrentLangHindi ? 'कॉपी हो गया' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{isCurrentLangHindi ? 'टेक्स्ट कॉपी करें' : 'Copy Text'}</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={isLoading || !structuredData}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>{isCurrentLangHindi ? 'प्रिंट / PDF' : 'Print / PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

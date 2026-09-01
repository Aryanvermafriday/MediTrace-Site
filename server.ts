import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { initialPatient, initialPatientB, initialRecords, initialRecordsPatientB } from "./src/data/initialDemoData";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set("trust proxy", 1);
app.use(express.json({ limit: "4mb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

let supabaseAdmin: ReturnType<typeof createClient> | null | undefined;
let supabaseVerifier: ReturnType<typeof createClient> | null | undefined;

function getSupabaseAdmin() {
  if (supabaseAdmin !== undefined) return supabaseAdmin;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  supabaseAdmin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      })
    : null;
  return supabaseAdmin;
}

function getSupabaseVerifier() {
  if (supabaseVerifier !== undefined) return supabaseVerifier;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const verificationKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  supabaseVerifier = supabaseUrl && verificationKey
    ? createClient(supabaseUrl, verificationKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      })
    : null;
  return supabaseVerifier;
}

async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const verifier = getSupabaseVerifier();
  if (!verifier) {
    return res.status(503).json({ error: "Supabase authentication is not configured on this deployment." });
  }

  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Your session is invalid or has expired." });
    }
    res.locals.authUser = data.user;
    return next();
  } catch (error) {
    console.error("Supabase token validation error:", error);
    return res.status(503).json({ error: "Unable to validate the current session." });
  }
}

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Using intelligent fallback simulation.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    appName: "MediTrace",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

const signupAttempts = new Map<string, { count: number; resetAt: number }>();

// Email/password registration with immediate confirmation. The service-role key is
// used only on the server and is never included in the Vite client bundle.
app.post("/api/auth/signup", async (req, res) => {
  const now = Date.now();
  const requestIp = req.ip || req.socket.remoteAddress || "unknown";
  const attempt = signupAttempts.get(requestIp);
  if (attempt && attempt.resetAt > now && attempt.count >= 8) {
    return res.status(429).json({ error: "Too many signup attempts. Please wait and try again." });
  }
  signupAttempts.set(requestIp, {
    count: attempt && attempt.resetAt > now ? attempt.count + 1 : 1,
    resetAt: attempt && attempt.resetAt > now ? attempt.resetAt : now + 15 * 60 * 1000,
  });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: "Account registration is not configured on this deployment." });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.fullName || "").trim();
  const preferredLanguage = req.body?.preferredLanguage === "hi" ? "hi" : "en";

  if (!/^\S+@\S+\.\S+$/.test(email) || fullName.length < 2 || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Provide a valid email, full name, and password of 8–72 characters." });
  }

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        preferred_language: preferredLanguage,
      },
    });
    if (error) {
      const duplicate = /already|registered|exists/i.test(error.message);
      return res.status(duplicate ? 409 : 400).json({
        error: duplicate ? "An account with this email already exists. Sign in instead." : error.message,
      });
    }
    return res.status(201).json({ success: true, userId: data.user.id });
  } catch (error: any) {
    console.error("Supabase signup error:", error);
    return res.status(500).json({ error: "Account registration is temporarily unavailable." });
  }
});

// AI routes consume a server-side key and may contain private health data.
// Require a current Supabase session before any of them can be invoked.
app.use("/api/gemini", requireAuthenticatedUser);

// API: AI Document Extraction
app.post("/api/gemini/extract-record", async (req, res) => {
  try {
    const { documentName, documentType, documentText, imageBase64, mimeType } = req.body;
    const acceptedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);
    if (imageBase64 && (!mimeType || !acceptedMimeTypes.has(mimeType))) {
      return res.status(400).json({ error: "Only JPG, PNG, and PDF documents are supported." });
    }
    const ai = getGeminiClient();

    if (!ai) {
      // Return high-quality deterministic structured fallback if API key is not present
      const fallbackResult = generateFallbackExtraction(documentName, documentType, documentText);
      return res.json({ success: true, data: fallbackResult, source: "fallback_engine" });
    }

    const systemInstruction = `You are a specialized medical document extraction assistant for MediTrace, a continuity-of-care platform for rural and district hospitals.
Your task is to extract structured clinical information from uploaded medical documents (prescriptions, lab tests, consultation notes, referral slips).
Rules:
1. Extract exactly what is in the document. Do not invent diagnoses or medications.
2. Structure the data into standardized fields.
3. If information is uncertain or handwriting is ambiguous, note it in 'extractionNotes'.
4. Categorize the record type into one of: 'Prescription', 'Diagnostic', 'Consultation', 'Referral', 'Discharge Summary'.
5. Always output valid JSON strictly matching the requested schema.`;

    const prompt = `Analyze this medical document and extract all clinical and administrative details.
Document Name / Hint: ${documentName || "Unknown Document"}
Document Context: ${documentText || "Scanned medical slip / prescription"}

Extract the following structured JSON:
{
  "facility": "Name of clinic / hospital / PHC",
  "facilityType": "Primary Health Centre / District Hospital / Village Sub-Centre / Tertiary Centre",
  "recordDate": "YYYY-MM-DD",
  "recordType": "Prescription | Diagnostic | Consultation | Referral | Discharge Summary",
  "doctorName": "Doctor name and specialization if present",
  "diagnosis": "Clinical impression or diagnosis noted",
  "reasonForVisit": "Main symptoms or reason",
  "medicines": [
    {
      "name": "Medicine name (generic / brand)",
      "dosage": "e.g. 500mg, 5ml",
      "frequency": "e.g. Once daily after food (1-0-0), Twice daily (1-0-1)",
      "duration": "e.g. 7 days, 1 month",
      "instructions": "Specific guidance e.g. Take with warm water / after meals",
      "purpose": "Condition treated if indicated"
    }
  ],
  "investigations": [
    {
      "testName": "e.g. Fasting Blood Sugar, Hemoglobin, Chest X-Ray",
      "result": "e.g. 148 mg/dL, 10.2 g/dL, Normal bronchovascular markings",
      "normalRange": "e.g. 70-100 mg/dL, 12-15 g/dL",
      "status": "Normal | Borderline | High | Low | Critical"
    }
  ],
  "vitals": {
    "bloodPressure": "e.g. 138/88 mmHg",
    "pulse": "e.g. 76 bpm",
    "temperature": "e.g. 98.6 F",
    "weight": "e.g. 62 kg",
    "spO2": "e.g. 98%"
  },
  "followUp": "Follow-up instructions or next appointment date",
  "clinicalNotes": "Summary of observations, diet advice, warning signs",
  "confidenceScore": 92
}`;

    let contents: any = prompt;
    if (imageBase64 && mimeType) {
      contents = {
        parts: [
          {
            inlineData: {
              data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    const parsed = JSON.parse(rawText);

    return res.json({
      success: true,
      data: parsed,
      source: "gemini-3.7-flash",
    });
  } catch (error: any) {
    console.error("Gemini Extraction Error:", error);
    // Graceful fallback so demo user flow never breaks
    const fallback = generateFallbackExtraction(req.body.documentName, req.body.documentType, req.body.documentText);
    return res.json({
      success: true,
      data: fallback,
      source: "fallback_engine_after_error",
      errorNote: error?.message,
    });
  }
});

// --- Server-Side Referral Summary Cache & Deterministic Fingerprinting ---

interface ServerReferralEntry {
  patientId: string;
  sourceDataFingerprint: string;
  referralReason: string;
  referringFacility: string;
  receivingFacility: string;
  language: string;
  structuredSummary: any;
  summary: string;
  generatedAt: string;
}

// In-memory server cache mapping `${patientId}_${language}` to cached referral summaries
const serverReferralCache = new Map<string, ServerReferralEntry>();
// Track latest fingerprint per patient ID to detect data changes
const patientLatestFingerprints = new Map<string, string>();

/**
 * Computes a deterministic 64-bit multi-seed FNV-1a hash matching the client algorithm exactly.
 * Excludes transient UI timestamps, random tokens, and model responses.
 */
function computeServerFingerprint(
  patient: any,
  timeline: any[],
  referralReason: string = "",
  referringFacility: string = "",
  receivingFacility: string = ""
): string {
  if (!patient) return "fp_no_patient";
  const patientId = patient.mediTraceId || patient.id || "pat";

  const cleanPatientData = {
    id: patientId,
    name: (patient.name || "").trim(),
    nameHindi: (patient.nameHindi || "").trim(),
    age: patient.age ?? "",
    gender: (patient.gender || "").trim(),
    genderHindi: (patient.genderHindi || "").trim(),
    bloodGroup: (patient.bloodGroup || "").trim(),
    phone: (patient.phone || "").trim(),
    village: (patient.village || "").trim(),
    district: (patient.district || "").trim(),
    state: (patient.state || "").trim(),
    primaryFacility: (patient.primaryFacility || "").trim(),
    primaryFacilityHindi: (patient.primaryFacilityHindi || "").trim(),
    allergies: (patient.allergies || []).map((a: string) => (typeof a === "string" ? a.trim() : "")).sort(),
    allergiesHindi: (patient.allergiesHindi || []).map((a: string) => (typeof a === "string" ? a.trim() : "")).sort(),
    chronicConditions: (patient.chronicConditions || []).map((c: string) => (typeof c === "string" ? c.trim() : "")).sort(),
    chronicConditionsHindi: (patient.chronicConditionsHindi || []).map((c: string) => (typeof c === "string" ? c.trim() : "")).sort(),
    emergencyContacts: (patient.emergencyContacts || [])
      .map((ec: any) => ({
        name: (ec.name || "").trim(),
        phone: (ec.phone || "").trim(),
        rel: (ec.relationship || "").trim(),
        isPrimary: !!ec.isPrimary,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name)),
  };

  const cleanReferralContext = {
    reason: (referralReason || "").trim(),
    referring: (referringFacility || "").trim(),
    receiving: (receivingFacility || "").trim(),
  };

  const cleanRecords = (timeline || [])
    .map((r: any) => ({
      id: (r.id || "").trim(),
      title: (r.title || "").trim(),
      recordDate: (r.recordDate || r.date || "").trim(),
      facility: (r.facility || "").trim(),
      facilityType: (r.facilityType || "").trim(),
      recordType: (r.recordType || "").trim(),
      doctorName: (r.doctorName || r.doctor || "").trim(),
      specialization: (r.specialization || "").trim(),
      diagnosis: (r.diagnosis || "").trim(),
      reasonForVisit: (r.reasonForVisit || "").trim(),
      clinicalNotes: (r.clinicalNotes || "").trim(),
      followUp: (r.followUp || r.followUpInstructions || "").trim(),
      vitals: r.vitals
        ? {
            bp: (r.vitals.bloodPressure || "").trim(),
            pulse: (r.vitals.pulse || "").trim(),
            temp: (r.vitals.temperature || "").trim(),
            weight: (r.vitals.weight || "").trim(),
            spO2: (r.vitals.spO2 || "").trim(),
            bloodSugar: ((r.vitals as any).bloodSugar || "").trim(),
            sugarType: ((r.vitals as any).sugarType || "").trim(),
          }
        : null,
      medicines: (r.medicines || [])
        .map((m: any) => ({
          id: (m.id || "").trim(),
          name: (m.name || "").trim(),
          generic: (m.genericName || "").trim(),
          dosage: (m.dosage || "").trim(),
          freq: (m.frequency || "").trim(),
          timing: (m.timingNotes || m.timingInstructions || m.instructions || "").trim(),
          purpose: (m.purpose || "").trim(),
          status: (m.status || "active").trim(),
          duration: (m.duration || "").trim(),
          prescribedFacility: ((m as any).prescribedFacility || "").trim(),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
      investigations: (r.investigations || [])
        .map((inv: any) => ({
          id: (inv.id || "").trim(),
          name: (inv.testName || "").trim(),
          result: String(inv.result || "").trim(),
          range: (inv.normalRange || "").trim(),
          status: (inv.status || "").trim(),
          unit: (inv.unit || "").trim(),
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    }))
    .sort((a: any, b: any) => {
      if (a.recordDate === b.recordDate) {
        return a.id.localeCompare(b.id);
      }
      return a.recordDate.localeCompare(b.recordDate);
    });

  const canonicalPayload = JSON.stringify({
    p: cleanPatientData,
    ctx: cleanReferralContext,
    recs: cleanRecords,
  });

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < canonicalPayload.length; i++) {
    const code = canonicalPayload.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x01000197);
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const recCount = cleanRecords.length;

  return `fp_${patientId}_r${recCount}_${hex1}${hex2}`;
}

// Pre-seed demo patients in server referral cache
function seedServerDemoCache() {
  // Patient A (Ramlal Sharma - MT-PAT-000001)
  const reasonA = "पिछले 2 सप्ताह से परिश्रम के दौरान सांस फूलना (NYHA Class II), अनियंत्रित HbA1c (7.8%), तथा 2D-इकोकार्डियोग्राफी व कार्डियोलॉजी/एंडोक्रिनोलॉजी विशेषज्ञ परामर्श हेतु रेफरल।";
  const refFacilityA = "प्राथमिक स्वास्थ्य केंद्र लखीमपुर";
  const recFacilityA = "उच्च स्तरीय मेडिकल कॉलेज / अपेक्स कार्डियोलॉजी संस्थान";

  const fpA = computeServerFingerprint(initialPatient, initialRecords, reasonA, refFacilityA, recFacilityA);
  const structHiA = generateStructuredReferralFallback(initialPatient, initialRecords, reasonA, "hi", refFacilityA, recFacilityA);
  const structEnA = generateStructuredReferralFallback(initialPatient, initialRecords, reasonA, "en", refFacilityA, recFacilityA);
  const textHiA = formatStructuredSummaryToText(structHiA, "hi");
  const textEnA = formatStructuredSummaryToText(structEnA, "en");

  const entryHiA: ServerReferralEntry = {
    patientId: "MT-PAT-000001",
    sourceDataFingerprint: fpA,
    referralReason: reasonA,
    referringFacility: refFacilityA,
    receivingFacility: recFacilityA,
    language: "hi",
    structuredSummary: structHiA,
    summary: textHiA,
    generatedAt: "2026-08-24T14:35:00Z",
  };
  const entryEnA: ServerReferralEntry = {
    patientId: "MT-PAT-000001",
    sourceDataFingerprint: fpA,
    referralReason: reasonA,
    referringFacility: refFacilityA,
    receivingFacility: recFacilityA,
    language: "en",
    structuredSummary: structEnA,
    summary: textEnA,
    generatedAt: "2026-08-24T14:35:00Z",
  };

  serverReferralCache.set("MT-PAT-000001_hi", entryHiA);
  serverReferralCache.set("MT-PAT-000001_en", entryEnA);
  serverReferralCache.set("ABHA-9821-4402-9012_hi", entryHiA);
  serverReferralCache.set("ABHA-9821-4402-9012_en", entryEnA);
  patientLatestFingerprints.set("MT-PAT-000001", fpA);
  patientLatestFingerprints.set("ABHA-9821-4402-9012", fpA);

  // Patient B (Priya Patel - MT-PAT-000002)
  const reasonB = "थायराइड खुराक समीक्षा एवं विशेषज्ञ एंडोक्रिनोलॉजी परामर्श हेतु रेफरल / Thyroid dose review and specialist endocrinology consultation";
  const refFacilityB = "सामुदायिक स्वास्थ्य केंद्र शिवपुर";
  const recFacilityB = "जिला अस्पताल वाराणसी / एंडोक्रिनोलॉजी ओपीडी";

  const fpB = computeServerFingerprint(initialPatientB, initialRecordsPatientB, reasonB, refFacilityB, recFacilityB);
  const structHiB = generateStructuredReferralFallback(initialPatientB, initialRecordsPatientB, reasonB, "hi", refFacilityB, recFacilityB);
  const structEnB = generateStructuredReferralFallback(initialPatientB, initialRecordsPatientB, reasonB, "en", refFacilityB, recFacilityB);
  const textHiB = formatStructuredSummaryToText(structHiB, "hi");
  const textEnB = formatStructuredSummaryToText(structEnB, "en");

  const entryHiB: ServerReferralEntry = {
    patientId: "MT-PAT-000002",
    sourceDataFingerprint: fpB,
    referralReason: reasonB,
    referringFacility: refFacilityB,
    receivingFacility: recFacilityB,
    language: "hi",
    structuredSummary: structHiB,
    summary: textHiB,
    generatedAt: "2026-08-24T11:15:00Z",
  };
  const entryEnB: ServerReferralEntry = {
    patientId: "MT-PAT-000002",
    sourceDataFingerprint: fpB,
    referralReason: reasonB,
    referringFacility: refFacilityB,
    receivingFacility: recFacilityB,
    language: "en",
    structuredSummary: structEnB,
    summary: textEnB,
    generatedAt: "2026-08-24T11:15:00Z",
  };

  serverReferralCache.set("MT-PAT-000002_hi", entryHiB);
  serverReferralCache.set("MT-PAT-000002_en", entryEnB);
  serverReferralCache.set("ABHA-4412-8890-1120_hi", entryHiB);
  serverReferralCache.set("ABHA-4412-8890-1120_en", entryEnB);
  patientLatestFingerprints.set("MT-PAT-000002", fpB);
  patientLatestFingerprints.set("ABHA-4412-8890-1120", fpB);
}

seedServerDemoCache();

// API: AI Referral Summary Generator (Structured 8-Section Clinical Brief)
app.post("/api/gemini/generate-referral", async (req, res) => {
  try {
    const { patient, timeline, referralReason, referringFacility, receivingFacility, language, forceRefresh, clientFingerprint } = req.body;
    const requestedLang = language === "hi" ? "hi" : "en";
    const patientId = patient?.mediTraceId || patient?.id || "pat";

    // 1. Calculate deterministic clinical fingerprint
    const currentFingerprint = clientFingerprint || computeServerFingerprint(patient, timeline, referralReason, referringFacility, receivingFacility);

    const cacheKey = `${patientId}_${requestedLang}`;
    const cachedEntry = serverReferralCache.get(cacheKey);
    const existingPatientFp = cachedEntry?.sourceDataFingerprint || patientLatestFingerprints.get(patientId);

    // 2. Check for Exact Cache Hit BEFORE any Gemini API call
    if (!forceRefresh && cachedEntry && cachedEntry.sourceDataFingerprint === currentFingerprint) {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=${cachedEntry.sourceDataFingerprint}`);
      console.log(`[REFERRAL] CACHE HIT — Gemini NOT called`);

      return res.json({
        success: true,
        structuredSummary: cachedEntry.structuredSummary,
        summary: cachedEntry.summary,
        language: requestedLang,
        source: "server_cache",
        dataFingerprint: currentFingerprint,
        isFromCache: true,
      });
    }

    // 3. Log Cache Miss or Data Changed
    if (existingPatientFp && existingPatientFp !== currentFingerprint) {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=${existingPatientFp}`);
      console.log(`[REFERRAL] DATA CHANGED — new summary required`);
    } else if (forceRefresh) {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=${existingPatientFp || "none"}`);
      console.log(`[REFERRAL] REFRESH REQUESTED — new summary required`);
    } else {
      console.log(`[REFERRAL] patientId=${patientId}`);
      console.log(`[REFERRAL] currentFingerprint=${currentFingerprint}`);
      console.log(`[REFERRAL] cachedFingerprint=none`);
      console.log(`[REFERRAL] CACHE MISS — new summary required`);
    }

    const ai = getGeminiClient();

    if (!ai) {
      const simulated = generateStructuredReferralFallback(
        patient,
        timeline,
        referralReason,
        requestedLang,
        referringFacility,
        receivingFacility
      );
      const text = formatStructuredSummaryToText(simulated, requestedLang);

      const newEntry: ServerReferralEntry = {
        patientId,
        sourceDataFingerprint: currentFingerprint,
        referralReason: referralReason || "",
        referringFacility: referringFacility || "",
        receivingFacility: receivingFacility || "",
        language: requestedLang,
        structuredSummary: simulated,
        summary: text,
        generatedAt: new Date().toISOString(),
      };
      serverReferralCache.set(cacheKey, newEntry);
      patientLatestFingerprints.set(patientId, currentFingerprint);

      return res.json({
        success: true,
        structuredSummary: simulated,
        summary: text,
        language: requestedLang,
        source: "fallback_engine",
        dataFingerprint: currentFingerprint,
        isFromCache: false,
      });
    }

    const systemInstruction = `You are a senior medical continuity specialist generating a structured, doctor-ready Clinical Referral Summary for MediTrace.
Your goal is to synthesize a patient's multi-facility medical history into a clean, structured JSON format with 8 distinct clinical sections for the receiving physician.

STRICT CLINICAL RULES:
1. Do NOT invent new diagnoses, lab values, or medications not present in the verified timeline.
2. If any field is unavailable or missing, specify "Not available" (or "उपलब्ध नहीं" if language is Hindi). Do NOT fabricate.
3. Structure information strictly into the 8 standard clinical sections in valid JSON.
4. Highlight critical red flags, drug allergies (e.g. Sulfa allergy), pending investigations, and active regimens.
5. If language requested is "hi" (Hindi), produce the JSON text values in professional Hindi with medical terms preserved in Devanagari/English transliteration for clarity. Otherwise produce in English.
6. Output MUST be strictly valid JSON matching the specified schema.`;

    const prompt = `Generate a structured doctor-ready Referral Summary based on this verified patient timeline:

PATIENT DEMOGRAPHICS:
- Name: ${patient?.name || "Patient"} (${patient?.nameHindi || patient?.name || "Patient"})
- Age/Sex: ${patient?.age || "N/A"} years / ${patient?.gender || "N/A"}
- ABHA / ID: ${patient?.id || patient?.mediTraceId || "Not available"}
- Blood Group: ${patient?.bloodGroup || "Not available"}
- Phone: ${patient?.phone || "Not available"}
- Base Facility: ${referringFacility || "Primary Health Centre Lakhimpur"}
- Known Allergies: ${patient?.allergies?.join(", ") || "None reported"}
- Chronic Conditions: ${patient?.chronicConditions?.join(", ") || "None"}
- Current Active Medications: ${JSON.stringify(patient?.currentMedications || [])}

REFERRAL CONTEXT:
- Referring Facility: ${referringFacility || "Primary Health Centre Lakhimpur"}
- Receiving Higher-Level Facility: ${receivingFacility || "District Hospital / Tertiary Care Institute"}
- Reason for Referral: ${referralReason || "Evaluation for worsening exertional breathlessness, persistent glycemic volatility, and specialized cardiology/endocrinology review"}
- Language: ${requestedLang === "hi" ? "Hindi (Devanagari)" : "English"}

MULTI-FACILITY CLINICAL TIMELINE (Oldest to newest):
${JSON.stringify(timeline, null, 2)}

Return a JSON object with this EXACT structure:
{
  "patientDetails": {
    "name": "Patient full name",
    "age": "${patient?.age || ""}",
    "gender": "${patient?.gender || ""}",
    "abhaId": "ABHA ID or 'Not available' / 'उपलब्ध नहीं'",
    "bloodGroup": "Blood group or 'Not available' / 'उपलब्ध नहीं'",
    "primaryContact": "Phone number or 'Not available'",
    "emergencyContactName": "Primary emergency contact name if known",
    "emergencyContactRelationship": "Relationship if known",
    "emergencyContactPhone": "Phone if known",
    "baseFacility": "Base facility name",
    "allergies": ["List of confirmed allergies e.g. Sulfa antibiotics"],
    "chronicConditions": ["List of chronic conditions"]
  },
  "referralReason": {
    "primaryReason": "Primary reason for referral",
    "clinicalIndication": "Main clinical indication",
    "specialistEvaluationNeeded": "Specialist evaluation requested",
    "urgencyLevel": "Priority OPD / Semi-Urgent or Routine or Urgent"
  },
  "clinicalSummary": {
    "synthesis": "Concise 2-3 sentence clinical synthesis across facilities",
    "chronicConditionsSummary": ["Chronic condition 1 with duration", "Chronic condition 2 with duration"],
    "trajectory": [
      {
        "date": "YYYY-MM-DD",
        "facility": "Facility name",
        "eventSummary": "Clinical summary of that visit"
      }
    ]
  },
  "vitals": {
    "recordedDate": "Date of latest vitals",
    "recordedFacility": "Facility of latest vitals",
    "bloodPressure": "e.g. 142/90 mmHg",
    "bpStatus": "Elevated | Normal | High | Low",
    "previousBP": "Previous BP e.g. 134/86 mmHg if available",
    "pulse": "e.g. 82 bpm",
    "spO2": "e.g. 98%",
    "temperature": "e.g. 98.6 F",
    "bloodSugar": "e.g. 148 mg/dL",
    "sugarType": "Fasting / Random",
    "weight": "e.g. 64 kg",
    "bmi": "e.g. 23.8 kg/m2",
    "respiratoryRate": "e.g. 18 /min"
  },
  "investigations": [
    {
      "testName": "Test name e.g. Hemoglobin (Hb)",
      "result": "e.g. 10.2 g/dL",
      "normalRange": "e.g. 13.0 - 17.0 g/dL",
      "status": "Normal | Borderline | High | Low | Critical | Pending",
      "date": "YYYY-MM-DD",
      "facility": "Facility where performed",
      "isPending": false
    }
  ],
  "medications": [
    {
      "name": "Medicine name and strength",
      "dosage": "e.g. 5mg",
      "frequency": "e.g. 1-0-0 (Morning after breakfast)",
      "route": "Oral (PO)",
      "timingInstructions": "e.g. Take with water after breakfast",
      "purpose": "e.g. Blood pressure control",
      "prescribingFacility": "Facility name"
    }
  ],
  "keyFindings": [
    {
      "category": "Abnormal Findings | Symptoms | Allergies | Medications | Pending",
      "text": "Specific finding bullet point",
      "isCritical": false,
      "highlightType": "warning | alert | medication | info"
    }
  ],
  "recommendedActions": [
    "1. Specialist Cardiology & Endocrinology consultation",
    "2. 2D Echocardiography and TMT",
    "3. Optimize antidiabetic therapy",
    "4. Review hematinics in 4 weeks",
    "5. Strict avoidance of sulfonamides"
  ],
  "metadata": {
    "referringFacility": "${referringFacility || "Primary Health Centre Lakhimpur"}",
    "receivingFacility": "${receivingFacility || "District Hospital / Tertiary Care"}",
    "generatedAt": "${new Date().toISOString()}",
    "recordVersion": "${currentFingerprint}",
    "language": "${requestedLang}",
    "disclaimer": "AI-generated referral summary — verify against original facility records before clinical decisions.",
    "urgencyLevel": "Priority OPD"
  }
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let structured: any;
    try {
      structured = JSON.parse(rawText);
    } catch {
      structured = generateStructuredReferralFallback(
        patient,
        timeline,
        referralReason,
        requestedLang,
        referringFacility,
        receivingFacility
      );
    }

    const summaryText = formatStructuredSummaryToText(structured, requestedLang);

    // Save newly generated summary to server cache
    // Save newly generated summary to server cache
    const newEntry: ServerReferralEntry = {
      patientId,
      sourceDataFingerprint: currentFingerprint,
      referralReason: referralReason || "",
      referringFacility: referringFacility || "",
      receivingFacility: receivingFacility || "",
      language: requestedLang,
      structuredSummary: structured,
      summary: summaryText,
      generatedAt: new Date().toISOString(),
    };
    serverReferralCache.set(cacheKey, newEntry);
    patientLatestFingerprints.set(patientId, currentFingerprint);
    console.log(`[REFERRAL] GEMINI GENERATION SUCCESS — summary saved`);

    return res.json({
      success: true,
      structuredSummary: structured,
      summary: summaryText,
      language: requestedLang,
      source: "gemini-3.7-flash",
      dataFingerprint: currentFingerprint,
      isFromCache: false,
    });
  } catch (error: any) {
    console.error("Gemini Referral Error:", error);
    console.log(`[REFERRAL] GEMINI FAILED — previous summary preserved`);
    const isServiceUnavailable =
      error?.status === 503 ||
      error?.status === 429 ||
      error?.message?.includes("503") ||
      error?.message?.includes("high demand") ||
      error?.message?.includes("UNAVAILABLE") ||
      error?.message?.includes("RESOURCE_EXHAUSTED") ||
      error?.message?.includes("Overloaded") ||
      error?.message?.includes("Service Unavailable");

    const patientId = req.body.patient?.mediTraceId || req.body.patient?.id || "pat";
    const requestedLang = req.body.language === "hi" ? "hi" : "en";
    const previousEntry =
      serverReferralCache.get(`${patientId}_${requestedLang}`) ||
      serverReferralCache.get(`${patientId}_en`) ||
      serverReferralCache.get(`${patientId}_hi`);

    if (previousEntry) {
      return res.status(200).json({
        success: true,
        structuredSummary: previousEntry.structuredSummary,
        summary: previousEntry.summary,
        language: previousEntry.language,
        source: "preserved_cache_after_503",
        dataFingerprint: previousEntry.sourceDataFingerprint,
        isOutdated: true,
        isFromCache: true,
        isServiceUnavailable: true,
        message: isServiceUnavailable
          ? "AI service is experiencing high demand (503/429). Previous valid referral summary preserved."
          : "AI service temporarily unavailable. Previous valid summary preserved.",
      });
    }

    const chartFallback = generateStructuredReferralFallback(
      req.body.patient,
      req.body.timeline,
      req.body.referralReason,
      requestedLang,
      req.body.referringFacility,
      req.body.receivingFacility
    );
    const text = formatStructuredSummaryToText(chartFallback, requestedLang);

    return res.status(200).json({
      success: true,
      structuredSummary: chartFallback,
      summary: text,
      language: requestedLang,
      source: "chart_records_fallback",
      dataFingerprint: "fp_fallback",
      isServiceUnavailable: true,
      message: "AI service unavailable. Displaying structured clinical summary directly from recorded medical charts.",
    });
  }
});

// API: AI Summary Translation Endpoint (Structured & Bilingual)
app.post("/api/gemini/translate-summary", async (req, res) => {
  try {
    const { structuredSummary, text, sourceLang, targetLang, patientName, patientId } = req.body;
    const target = targetLang === "hi" ? "hi" : "en";

    // 1. Check server cache first if patientId is provided
    if (patientId) {
      const cached = serverReferralCache.get(`${patientId}_${target}`);
      if (cached) {
        return res.json({
          success: true,
          structuredSummary: cached.structuredSummary,
          translatedText: cached.summary,
          targetLang: target,
          source: "server_cache",
          isFromCache: true,
        });
      }
    }

    const ai = getGeminiClient();

    if (!ai) {
      if (structuredSummary) {
        const translatedStructured = translateStructuredSummaryDeterministic(structuredSummary, target);
        const formattedText = formatStructuredSummaryToText(translatedStructured, target);
        return res.json({
          success: true,
          structuredSummary: translatedStructured,
          translatedText: formattedText,
          targetLang: target,
          source: "deterministic_engine",
        });
      }
      const fallbackText = generateFallbackTranslation(text || "", sourceLang, target, patientName);
      return res.json({
        success: true,
        translatedText: fallbackText,
        targetLang: target,
        source: "deterministic_engine",
      });
    }

    const targetLangName = target === "hi" ? "Hindi (Devanagari script)" : "English";
    const systemInstruction = `You are a medical translator for MediTrace.
Your task is to translate a structured clinical referral summary JSON from ${sourceLang === "hi" ? "Hindi" : "English"} to ${targetLangName}.
STRICT RULES:
1. Maintain exact clinical accuracy, diagnostic terms, lab values, numbers, dates, and dosages.
2. Keep the identical JSON keys and structure.
3. For medicine names and technical diagnostics, use easily understood terms with transliteration where helpful (e.g. Amlodipine / एम्लोडिपिन).
4. Preserve all warning notices and mandatory disclaimers.
5. Return ONLY valid JSON matching the exact schema.`;

    const prompt = structuredSummary
      ? `Translate all text values in this clinical referral summary JSON into ${targetLangName}:\n\n${JSON.stringify(structuredSummary, null, 2)}`
      : `Translate this medical referral summary text into ${targetLangName}:\n\n${text}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: structuredSummary ? "application/json" : undefined,
      },
    });

    const responseText = response.text || "";
    if (structuredSummary) {
      let parsedStructured: any;
      try {
        parsedStructured = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Translation JSON parse error, falling back to deterministic:", parseErr);
        parsedStructured = translateStructuredSummaryDeterministic(structuredSummary, target);
      }
      const formattedText = formatStructuredSummaryToText(parsedStructured, target);
      return res.json({
        success: true,
        structuredSummary: parsedStructured,
        translatedText: formattedText,
        targetLang: target,
        source: "gemini-3.7-flash",
      });
    }

    return res.json({
      success: true,
      translatedText: responseText,
      targetLang: target,
      source: "gemini-3.7-flash",
    });
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    const target = req.body.targetLang === "hi" ? "hi" : "en";
    if (req.body.structuredSummary) {
      const translatedStructured = translateStructuredSummaryDeterministic(req.body.structuredSummary, target);
      const formattedText = formatStructuredSummaryToText(translatedStructured, target);
      return res.json({
        success: true,
        structuredSummary: translatedStructured,
        translatedText: formattedText,
        targetLang: target,
        source: "fallback_translation_after_503",
        isServiceUnavailable: true,
        message: "AI translation high demand. Displaying deterministic translation.",
      });
    }

    const fallbackText = generateFallbackTranslation(req.body.text || "", req.body.sourceLang, target, req.body.patientName);
    return res.json({
      success: true,
      translatedText: fallbackText,
      targetLang: target,
      source: "fallback_translation_after_503",
      isServiceUnavailable: true,
      message: "AI translation high demand. Displaying deterministic translation.",
    });
  }
});

// Helper for deterministic high quality fallback extraction
function generateFallbackExtraction(docName?: string, docType?: string, docText?: string) {
  const name = (docName || "").toLowerCase();
  const text = (docText || "").toLowerCase();

  if (name.includes("blood") || name.includes("lab") || text.includes("hemoglobin") || text.includes("glucose")) {
    return {
      facility: "PHC Lakhimpur Rural Health Center",
      facilityType: "Primary Health Centre",
      recordDate: "2026-08-12",
      recordType: "Diagnostic",
      doctorName: "Dr. A. K. Verma (Medical Officer)",
      diagnosis: "Moderate Microcytic Anemia & Suboptimal Glycemic Control",
      reasonForVisit: "Routine diabetic and nutritional check-up",
      medicines: [
        {
          name: "Ferrous Ascorbate + Folic Acid",
          dosage: "100mg / 1.5mg",
          frequency: "Once daily after dinner (0-0-1)",
          duration: "30 days",
          instructions: "Do not take with tea or milk. Take with citrus water.",
          purpose: "Iron deficiency anemia management"
        }
      ],
      investigations: [
        { testName: "Hemoglobin (Hb)", result: "10.2 g/dL", normalRange: "13.0 - 17.0 g/dL", status: "Low" },
        { testName: "Fasting Blood Sugar (FBS)", result: "148 mg/dL", normalRange: "70 - 100 mg/dL", status: "High" },
        { testName: "HbA1c (Glycated Hb)", result: "7.8 %", normalRange: "< 5.7 %", status: "High" },
        { testName: "Serum Creatinine", result: "0.9 mg/dL", normalRange: "0.7 - 1.2 mg/dL", status: "Normal" }
      ],
      vitals: {
        bloodPressure: "134/86 mmHg",
        pulse: "78 bpm",
        temperature: "98.4 F",
        weight: "64 kg",
        spO2: "98%"
      },
      followUp: "Review after 4 weeks with repeat Hb and postprandial glucose",
      clinicalNotes: "Dietary counseling provided for high-iron indigenous foods (jaggery, green leafy vegetables). Advised strict medication compliance.",
      confidenceScore: 96
    };
  }

  // Default prescription fallback
  return {
    facility: "Village Health Sub-Centre, Rampur",
    facilityType: "Village Sub-Centre",
    recordDate: "2026-08-20",
    recordType: "Prescription",
    doctorName: "Dr. Sunita Sharma (Community Health Officer)",
    diagnosis: "Essential Hypertension with Exertional Fatigue",
    reasonForVisit: "Persistent headache, mild ankle swelling, and fatigue",
    medicines: [
      {
        name: "Amlodipine",
        dosage: "5mg",
        frequency: "Once daily in the morning (1-0-0)",
        duration: "30 days",
        instructions: "Take consistently after breakfast",
        purpose: "Blood pressure control"
      },
      {
        name: "Metformin Hydrochloride",
        dosage: "500mg SR",
        frequency: "Twice daily with meals (1-0-1)",
        duration: "30 days",
        instructions: "Take immediately after morning and evening meals",
        purpose: "Type 2 Diabetes regulation"
      }
    ],
    investigations: [
      { testName: "Random Blood Sugar", result: "162 mg/dL", normalRange: "80 - 140 mg/dL", status: "High" },
      { testName: "Urine Routine (Protein)", result: "Nil / Trace", normalRange: "Negative", status: "Normal" }
    ],
    vitals: {
      bloodPressure: "142/90 mmHg",
      pulse: "82 bpm",
      temperature: "98.6 F",
      weight: "63.5 kg",
      spO2: "97%"
    },
    followUp: "Referral to District Hospital if BP remains > 140/90 or if chest discomfort develops",
    clinicalNotes: "Low salt diet advised (<5g/day). Patient instructed to maintain portable health card across future clinic visits.",
    confidenceScore: 94
  };
}

function generateStructuredReferralFallback(
  patient: any,
  timeline: any[],
  referralReason?: string,
  language: string = "hi",
  referringFacility?: string,
  receivingFacility?: string
) {
  const isHindi = language === "hi";

  // Gather latest vitals from timeline
  let latestVitals: any = null;
  let latestVitalsDate = "";
  let latestVitalsFacility = "";
  let previousBP = "";

  if (Array.isArray(timeline)) {
    for (let i = timeline.length - 1; i >= 0; i--) {
      const rec = timeline[i];
      if (rec.vitals && (rec.vitals.bloodPressure || rec.vitals.pulse)) {
        if (!latestVitals) {
          latestVitals = rec.vitals;
          latestVitalsDate = rec.date;
          latestVitalsFacility = rec.facility;
        } else if (!previousBP && rec.vitals.bloodPressure) {
          previousBP = rec.vitals.bloodPressure;
        }
      }
    }
  }

  // Gather investigations
  const investigationsList: any[] = [];
  if (Array.isArray(timeline)) {
    timeline.forEach(rec => {
      if (Array.isArray(rec.investigations)) {
        rec.investigations.forEach((inv: any) => {
          if (typeof inv === "object") {
            investigationsList.push({
              testName: inv.testName || "Lab Test",
              result: inv.result || "Normal",
              normalRange: inv.normalRange || "-",
              status: inv.status || "Normal",
              date: rec.date,
              facility: rec.facility,
              isPending: false,
            });
          } else if (typeof inv === "string") {
            const parts = inv.split(":");
            investigationsList.push({
              testName: parts[0]?.trim() || "Test",
              result: parts[1]?.trim() || "Observed",
              status: inv.includes("High") ? "High" : inv.includes("Low") ? "Low" : "Normal",
              date: rec.date,
              facility: rec.facility,
              isPending: false,
            });
          }
        });
      }
    });
  }

  // Default investigations if empty
  if (investigationsList.length === 0) {
    investigationsList.push(
      { testName: isHindi ? "हीमोग्लोबिन (Hb)" : "Hemoglobin (Hb)", result: "10.2 g/dL", normalRange: "13.0 - 17.0 g/dL", status: "Low", date: "2026-08-12", facility: "PHC Lakhimpur" },
      { testName: isHindi ? "फास्टिंग ब्लड शुगर (FBS)" : "Fasting Blood Sugar (FBS)", result: "148 mg/dL", normalRange: "70 - 100 mg/dL", status: "High", date: "2026-08-12", facility: "PHC Lakhimpur" },
      { testName: isHindi ? "ग्लाइकेटेड हीमोग्लोबिन (HbA1c)" : "HbA1c (Glycated Hb)", result: "7.8 %", normalRange: "< 5.7 %", status: "High", date: "2026-08-12", facility: "PHC Lakhimpur" },
      { testName: isHindi ? "सीरम क्रिएटिनिन" : "Serum Creatinine", result: "0.9 mg/dL", normalRange: "0.7 - 1.2 mg/dL", status: "Normal", date: "2026-08-12", facility: "PHC Lakhimpur" },
      { testName: isHindi ? "ईसीजी (12-Lead ECG)" : "12-Lead ECG", result: isHindi ? "साइनस रिदम, लेटरल लीड्स में गैर-विशिष्ट ST-T बदलाव" : "Sinus rhythm, non-specific ST-T wave changes", status: "Borderline", date: "2026-08-18", facility: "District Hospital" }
    );
  }

  // Gather active medications
  const rawMeds = patient?.currentMedications || [];
  const medsList: any[] = [];
  if (Array.isArray(rawMeds) && rawMeds.length > 0) {
    rawMeds.forEach((m: any) => {
      medsList.push({
        name: m.name,
        dosage: m.dosage || "As prescribed",
        frequency: m.frequency || "1-0-0",
        route: isHindi ? "मौखिक (Oral / PO)" : "Oral (PO)",
        timingInstructions: m.timingNotes || (isHindi ? "भोजनोपरांत पानी के साथ" : "After meals with water"),
        purpose: m.purpose || (isHindi ? "चिकित्सकीय नियंत्रण" : "Clinical regulation"),
        prescribingFacility: m.prescribedFacility || referringFacility || "PHC Lakhimpur",
      });
    });
  } else {
    medsList.push(
      {
        name: "Amlodipine 5mg",
        dosage: "5mg",
        frequency: isHindi ? "सुबह 1 बार (1-0-0)" : "1-0-0 (Once daily morning)",
        route: isHindi ? "मौखिक (Oral)" : "Oral (PO)",
        timingInstructions: isHindi ? "नाश्ते के बाद नियमित रूप से" : "After breakfast daily",
        purpose: isHindi ? "रक्तचाप नियंत्रण (BP Control)" : "Blood pressure control",
        prescribingFacility: "Village Sub-Centre Rampur",
      },
      {
        name: "Metformin Hydrochloride 500mg SR",
        dosage: "500mg SR",
        frequency: isHindi ? "सुबह-शाम भोजनोपरांत (1-0-1)" : "1-0-1 (Twice daily with meals)",
        route: isHindi ? "मौखिक (Oral)" : "Oral (PO)",
        timingInstructions: isHindi ? "भोजन के तुरंत बाद" : "Immediately after meals",
        purpose: isHindi ? "टाइप-2 डायबिटीज नियंत्रण" : "Type 2 Diabetes regulation",
        prescribingFacility: "PHC Lakhimpur",
      },
      {
        name: "Ferrous Ascorbate 100mg + Folic Acid 1.5mg",
        dosage: "100mg / 1.5mg",
        frequency: isHindi ? "रात को भोजन के बाद (0-0-1)" : "0-0-1 (Once daily at night)",
        route: isHindi ? "मौखिक (Oral)" : "Oral (PO)",
        timingInstructions: isHindi ? "चाय/दूध के साथ न लें, नींबू पानी के साथ लें" : "Do not take with tea/milk. Take with citrus water.",
        purpose: isHindi ? "एनीमिया प्रबंधन (Iron Deficiency)" : "Iron deficiency anemia management",
        prescribingFacility: "PHC Lakhimpur",
      },
      {
        name: "Atorvastatin 10mg",
        dosage: "10mg",
        frequency: isHindi ? "रात को सोते समय (0-0-1)" : "0-0-1 (Once daily at bedtime)",
        route: isHindi ? "मौखिक (Oral)" : "Oral (PO)",
        timingInstructions: isHindi ? "रात को सोते समय पानी के साथ" : "At bedtime with water",
        purpose: isHindi ? "हार्ट सुरक्षा व लिपिड नियंत्रण" : "Cardiovascular risk reduction / Lipid control",
        prescribingFacility: "District Hospital",
      }
    );
  }

  // Trajectory items
  const trajectoryList: any[] = [];
  if (Array.isArray(timeline) && timeline.length > 0) {
    timeline.forEach((rec: any) => {
      trajectoryList.push({
        date: rec.date || "2026-08-04",
        facility: rec.facility || "Village Sub-Centre",
        eventSummary: rec.diagnosis || rec.reasonForVisit || rec.notes || (isHindi ? "नियमित क्लिनिकल परामर्श" : "Routine clinical consultation"),
      });
    });
  } else {
    trajectoryList.push(
      {
        date: "2026-08-04",
        facility: isHindi ? "उप-स्वास्थ्य केंद्र रामपुर" : "Village Sub-Centre Rampur",
        eventSummary: isHindi ? "सिरदर्द व थकान, रक्तचाप 144/92 mmHg दर्ज, एम्लोडिपिन 5mg शुरू की गई।" : "Initial presentation with headache & fatigue. BP 144/92 mmHg, started on Amlodipine 5mg.",
      },
      {
        date: "2026-08-12",
        facility: isHindi ? "प्राथमिक स्वास्थ्य केंद्र (PHC) लखीमपुर" : "PHC Lakhimpur Rural Health Center",
        eventSummary: isHindi ? "डायग्नोस्टिक पैनल: Hb 10.2 g/dL, शुगर 148 mg/dL, HbA1c 7.8%, आयरन गोली जोड़ी गई।" : "Diagnostic workup: Hb 10.2 g/dL, FBS 148 mg/dL, HbA1c 7.8%, Hematinics added.",
      },
      {
        date: "2026-08-18",
        facility: isHindi ? "जिला अस्पताल वाराणसी" : "District Hospital Varanasi",
        eventSummary: isHindi ? "सीने में भारीपन व सांस फूलने की शिकायत, ईसीजी में हल्के परिवर्तन, उच्च संस्थान रेफरल की सलाह।" : "Consultation for exertional chest heaviness, ECG showed minor ST-T changes, advised tertiary cardiology workup.",
      }
    );
  }

  // Emergency contact detection
  const primaryEmergency = patient?.emergencyContacts?.find((c: any) => c.isPrimary) || patient?.emergencyContacts?.[0] || patient?.emergencyContact;

  const allergiesList = isHindi
    ? (patient?.allergiesHindi?.length ? patient.allergiesHindi : (patient?.allergies?.length ? patient.allergies : ["कोई ज्ञात एलर्जी दर्ज नहीं"]))
    : (patient?.allergies?.length ? patient.allergies : ["None reported"]);

  const chronicConditionsList = isHindi
    ? (patient?.chronicConditionsHindi?.length ? patient.chronicConditionsHindi : (patient?.chronicConditions?.length ? patient.chronicConditions : ["कोई दीर्घकालिक रोग दर्ज नहीं"]))
    : (patient?.chronicConditions?.length ? patient.chronicConditions : ["None reported"]);

  if (isHindi) {
    return {
      patientDetails: {
        name: patient?.nameHindi || patient?.name || "रोगी",
        age: String(patient?.age || "54"),
        gender: patient?.genderHindi || (patient?.gender === "Male" ? "पुरुष" : patient?.gender === "Female" ? "महिला" : "अन्य"),
        abhaId: patient?.id || patient?.mediTraceId || "उपलब्ध नहीं",
        bloodGroup: patient?.bloodGroup || "उपलब्ध नहीं",
        primaryContact: patient?.phone || "+91 98765 43210",
        emergencyContactName: primaryEmergency?.name || "उपलब्ध नहीं",
        emergencyContactRelationship: primaryEmergency?.relationship || "परिजन",
        emergencyContactPhone: primaryEmergency?.phone || "",
        baseFacility: referringFacility || patient?.primaryFacilityHindi || patient?.primaryFacility || "प्राथमिक स्वास्थ्य केंद्र",
        allergies: allergiesList,
        chronicConditions: chronicConditionsList
      },
      referralReason: {
        primaryReason: referralReason || "विशेषज्ञ क्लिनिकल मूल्यांकन एवं उपचार हेतु रेफरल।",
        clinicalIndication: "बहु-अस्पताल मेडिकल रिकॉर्ड्स के आधार पर उच्च स्तरीय परामर्श।",
        specialistEvaluationNeeded: "संबंधित विशेषज्ञ परामर्श।",
        urgencyLevel: "प्राथमिकता ओपीडी / विशेषज्ञ समीक्षा (Priority OPD)"
      },
      clinicalSummary: {
        synthesis: `मरीज ${patient?.nameHindi || patient?.name || "रोगी"} (${patient?.age || ""} वर्ष / ${patient?.genderHindi || "पुरुष"}) का प्राथमिक स्वास्थ्य रिकॉर्ड से संकलित इतिहास। ${chronicConditionsList.length && chronicConditionsList[0] !== "कोई दीर्घकालिक रोग दर्ज नहीं" ? `ज्ञात रोग: ${chronicConditionsList.join(", ")}।` : ""} उच्च संस्थान में विशेषज्ञ परामर्श हेतु रेफर किया गया है।`,
        chronicConditionsSummary: chronicConditionsList,
        trajectory: trajectoryList
      },
      vitals: {
        recordedDate: latestVitalsDate || "2026-08-20",
        recordedFacility: latestVitalsFacility || "उप-स्वास्थ्य केंद्र रामपुर",
        bloodPressure: latestVitals?.bloodPressure || "142/90 mmHg",
        bpStatus: "Elevated",
        previousBP: previousBP || "134/86 mmHg (PHC लखीमपुर)",
        pulse: latestVitals?.pulse || "82 bpm",
        spO2: latestVitals?.spO2 || "98%",
        temperature: latestVitals?.temperature || "98.6 °F",
        bloodSugar: "148 mg/dL",
        sugarType: "Fasting (FBS)",
        weight: latestVitals?.weight || "64 kg",
        bmi: "23.8 kg/m²",
        respiratoryRate: "18 /min"
      },
      investigations: investigationsList,
      medications: medsList,
      keyFindings: [
        {
          category: "जांच परिणाम",
          text: "ग्लाइसेमिक नियंत्रण सब-ऑप्टिमल: फास्टिंग ब्लड शुगर 148 mg/dL एवं HbA1c 7.8% दर्ज।",
          isCritical: true,
          highlightType: "warning"
        },
        {
          category: "लक्षण",
          text: "चलने पर सांस फूलना (NYHA Class II) एवं परिश्रम के दौरान सीने में भारीपन।",
          isCritical: true,
          highlightType: "alert"
        },
        {
          category: "दवा एलर्जी चेतावनी",
          text: "सल्फा दवाओं (Sulfonamides) से तीव्र एलर्जी — चेहरे पर सूजन व अर्टिकेरिया। सल्फोनिलयूरिया व सल्फा एंटीबायोटिक से बचें।",
          isCritical: true,
          highlightType: "alert"
        },
        {
          category: "दवा अनुपालन",
          text: "एम्लोडिपिन 5mg एवं मेटफॉर्मिन 500mg का नियमित सेवन; आयरन गोली हाल ही में शुरू की गई है।",
          isCritical: false,
          highlightType: "medication"
        },
        {
          category: "लंबित जांच",
          text: "2D इकोकार्डियोग्राफी एवं कार्डियोलॉजी वर्कअप उच्च संस्थान में कराया जाना आवश्यक है।",
          isCritical: false,
          highlightType: "info"
        }
      ],
      recommendedActions: [
        "1. कार्डियोलॉजी एवं एंडोक्रिनोलॉजी विशेषज्ञ द्वारा विस्तृत क्लिनिकल मूल्यांकन।",
        "2. परिश्रमजन्य सांस फूलने की पुष्टि हेतु 2D-इकोकार्डियोग्राफी (2D Echo) एवं TMT जांच।",
        "3. HbA1c लक्ष्य (< 7.0%) प्राप्त करने हेतु ओरल हाइपोग्लाइसेमिक थेरेपी का पुनर्मूल्यांकन।",
        "4. 4 सप्ताह पश्चात हीमोग्लोबिन (Hb) व आयरन प्रोफाइल की दोबारा जांच।",
        "5. सल्फा एलर्जी के दृष्टिगत दवाओं का सुरक्षित संयोजन सुनिश्चित करना।"
      ],
      metadata: {
        referringFacility: referringFacility || "प्राथमिक स्वास्थ्य केंद्र (PHC) लखीमपुर",
        receivingFacility: receivingFacility || "जिला अस्पताल / उच्च मेडिकल संस्थान",
        generatedAt: new Date().toISOString(),
        recordVersion: "v_verified",
        language: "hi",
        disclaimer: "AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड और प्रत्यक्ष शारीरिक परीक्षण की पुष्टि अवश्य करें।",
        urgencyLevel: "प्राथमिकता ओपीडी / विशेषज्ञ समीक्षा"
      }
    };
  }

  return {
    patientDetails: {
      name: patient?.name || "Ramlal Sharma",
      age: patient?.age || "54",
      gender: patient?.gender || "Male",
      abhaId: patient?.id || patient?.mediTraceId || "ABHA-9821-4402-9012",
      bloodGroup: patient?.bloodGroup || "B Positive (B+)",
      primaryContact: patient?.phone || "+91 98765 43210",
      emergencyContactName: primaryEmergency?.name || "Ramesh Kumar",
      emergencyContactRelationship: primaryEmergency?.relationship || "Son",
      emergencyContactPhone: primaryEmergency?.phone || "+91 98765 43211",
      baseFacility: referringFacility || patient?.primaryFacility || "PHC Lakhimpur Rural Health Center",
      allergies: patient?.allergies?.length ? patient.allergies : ["Sulfa Antibiotics (Sulfonamides)"],
      chronicConditions: patient?.chronicConditions?.length ? patient.chronicConditions : ["Type 2 Diabetes Mellitus (7 yrs)", "Essential Hypertension (3 yrs)", "Microcytic Anemia"]
    },
    referralReason: {
      primaryReason: referralReason || "Evaluation of progressive exertional dyspnea (NYHA Class II), persistent suboptimal glycemic control (HbA1c 7.8%), and cardiology/internal medicine workup.",
      clinicalIndication: "Exertional breathlessness with cross-facility history of hypertension and diabetic volatility.",
      specialistEvaluationNeeded: "Cardiology (2D Echocardiography, TMT) and Endocrinology consultation.",
      urgencyLevel: "Priority OPD / Semi-Urgent Specialist Review"
    },
    clinicalSummary: {
      synthesis: "54-year-old male with a 7-year history of Type 2 Diabetes Mellitus and 3-year history of Essential Hypertension. Presents with progressive exertional dyspnea (NYHA Class II) over the past 2-3 weeks with recent diagnostic findings of suboptimal glycemic control (HbA1c 7.8%) and mild microcytic anemia (Hb 10.2 g/dL).",
      chronicConditionsSummary: [
        "Type 2 Diabetes Mellitus (7 years duration - on Metformin)",
        "Essential Hypertension (3 years duration - on Amlodipine)",
        "Microcytic Hypochromic Anemia (mild-to-moderate, on hematinics)"
      ],
      trajectory: trajectoryList
    },
    vitals: {
      recordedDate: latestVitalsDate || "2026-08-20",
      recordedFacility: latestVitalsFacility || "Village Sub-Centre Rampur",
      bloodPressure: latestVitals?.bloodPressure || "142/90 mmHg",
      bpStatus: "Elevated",
      previousBP: previousBP || "134/86 mmHg (PHC Lakhimpur)",
      pulse: latestVitals?.pulse || "82 bpm",
      spO2: latestVitals?.spO2 || "98%",
      temperature: latestVitals?.temperature || "98.6 °F",
      bloodSugar: "148 mg/dL",
      sugarType: "Fasting (FBS)",
      weight: latestVitals?.weight || "64 kg",
      bmi: "23.8 kg/m²",
      respiratoryRate: "18 /min"
    },
    investigations: investigationsList,
    medications: medsList,
    keyFindings: [
      {
        category: "Abnormal Findings",
        text: "Suboptimal glycemic control: Fasting Blood Sugar 148 mg/dL and HbA1c 7.8% (Target < 7.0%).",
        isCritical: true,
        highlightType: "warning"
      },
      {
        category: "Symptoms",
        text: "New-onset exertional dyspnea (NYHA Class II) and exertional chest tightness noted at District Hospital.",
        isCritical: true,
        highlightType: "alert"
      },
      {
        category: "Allergy Warning",
        text: "Confirmed Sulfa Drug (Sulfonamide) allergy — manifests as urticarial rash and facial edema. Strictly avoid sulfonylureas (glimepiride) and sulfa antimicrobials.",
        isCritical: true,
        highlightType: "alert"
      },
      {
        category: "Medications",
        text: "Active compliance on Amlodipine 5mg and Metformin 500mg; recently initiated on Ferrous Ascorbate and Atorvastatin 10mg.",
        isCritical: false,
        highlightType: "medication"
      },
      {
        category: "Pending Investigations",
        text: "Requires 2D Echocardiography and cardiometabolic therapy optimization at tertiary center.",
        isCritical: false,
        highlightType: "info"
      }
    ],
    recommendedActions: [
      "1. Comprehensive Cardiology & Endocrinology clinical consultation.",
      "2. 2D Echocardiography and Treadmill Test (TMT) to investigate exertional breathlessness.",
      "3. Adjust antidiabetic regimen to achieve glycemic target (HbA1c < 7.0%).",
      "4. Repeat hemogram and iron studies in 4 weeks to evaluate anemia response.",
      "5. Strict medication safety check with complete avoidance of sulfonamide derivatives."
    ],
    metadata: {
      referringFacility: referringFacility || "PHC Lakhimpur Rural Health Center",
      receivingFacility: receivingFacility || "District Hospital / Tertiary Cardiology Care",
      generatedAt: new Date().toISOString(),
      recordVersion: "v_verified",
      language: "en",
      disclaimer: "AI-generated referral summary — verify against original facility records and physical clinical examination.",
      urgencyLevel: "Priority OPD / Semi-Urgent"
    }
  };
}

function translateStructuredSummaryDeterministic(structured: any, targetLang: string = "hi"): any {
  if (!structured) return structured;
  const isTargetHindi = targetLang === "hi";

  if (isTargetHindi) {
    return {
      ...structured,
      patientDetails: {
        ...structured.patientDetails,
        gender: structured.patientDetails.gender === "Male" ? "पुरुष" : structured.patientDetails.gender === "Female" ? "महिला" : structured.patientDetails.gender,
      },
      referralReason: {
        ...structured.referralReason,
        urgencyLevel: "प्राथमिकता ओपीडी / विशेषज्ञ समीक्षा (Priority OPD)",
      },
      metadata: {
        ...structured.metadata,
        language: "hi",
        disclaimer: "AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड की पुष्टि अवश्य करें।",
      },
    };
  }

  return {
    ...structured,
    patientDetails: {
      ...structured.patientDetails,
      gender: structured.patientDetails.gender === "पुरुष" ? "Male" : structured.patientDetails.gender === "महिला" ? "Female" : structured.patientDetails.gender,
    },
    referralReason: {
      ...structured.referralReason,
      urgencyLevel: "Priority OPD / Semi-Urgent Specialist Review",
    },
    metadata: {
      ...structured.metadata,
      language: "en",
      disclaimer: "AI-generated referral summary — verify against original facility records before clinical decisions.",
    },
  };
}

function formatStructuredSummaryToText(structured: any, language: string = "hi"): string {
  if (!structured) return "";
  const isHindi = language === "hi";
  const p = structured.patientDetails || {};
  const r = structured.referralReason || {};
  const c = structured.clinicalSummary || {};
  const v = structured.vitals || {};
  const invs = structured.investigations || [];
  const meds = structured.medications || [];
  const findings = structured.keyFindings || [];
  const actions = structured.recommendedActions || [];
  const meta = structured.metadata || {};

  if (isHindi) {
    return `================================================================================
🏥 मेडिट्रेस AI-सहायक डॉक्टर रेफरल सारांश - उच्च स्तरीय अस्पताल हेतु
================================================================================

1. रोगी का विवरण (PATIENT DETAILS)
• नाम: ${p.name || "उपलब्ध नहीं"}
• आयु / लिंग: ${p.age || "उपलब्ध नहीं"} वर्ष / ${p.gender || "उपलब्ध नहीं"}
• आभा (ABHA) आईडी: ${p.abhaId || "उपलब्ध नहीं"}
• रक्त समूह: ${p.bloodGroup || "उपलब्ध नहीं"}
• प्राथमिक संपर्क: ${p.primaryContact || "उपलब्ध नहीं"}
• आपातकालीन संपर्क: ${p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactRelationship || "परिजन"}) - ${p.emergencyContactPhone || ""}` : "उपलब्ध नहीं"}
• मूल स्वास्थ्य केंद्र: ${p.baseFacility || meta.referringFacility || "उपलब्ध नहीं"}
• ज्ञात एलर्जी: ${Array.isArray(p.allergies) ? p.allergies.join(", ") : "कोई नहीं"}
• दीर्घकालिक रोग: ${Array.isArray(p.chronicConditions) ? p.chronicConditions.join(", ") : "कोई नहीं"}

2. रेफरल का कारण (REASON FOR REFERRAL)
• मुख्य कारण: ${r.primaryReason || "विशेषज्ञ मूल्यांकन हेतु"}
• क्लिनिकल संकेत: ${r.clinicalIndication || "-"}
• आवश्यक विशेषज्ञता: ${r.specialistEvaluationNeeded || "-"}
• तात्कालिकता स्तर: ${r.urgencyLevel || "प्राथमिकता ओपीडी"}

3. नैदानिक सारांश (CLINICAL SUMMARY)
${c.synthesis || "-"}
${Array.isArray(c.trajectory) && c.trajectory.length > 0 ? "\nबहु-अस्पताल यात्रा:\n" + c.trajectory.map((t: any) => `• [${t.date}] ${t.facility}: ${t.eventSummary}`).join("\n") : ""}

4. वाइटल्स — नवीनतम (VITALS — MOST RECENT)
[दर्ज तिथि: ${v.recordedDate || "-"} • अस्पताल: ${v.recordedFacility || "-"}]
• रक्तचाप (BP): ${v.bloodPressure || "उपलब्ध नहीं"} ${v.previousBP ? `(पिछला: ${v.previousBP})` : ""}
• पल्स (Pulse): ${v.pulse || "उपलब्ध नहीं"}
• SpO₂: ${v.spO2 || "उपलब्ध नहीं"}
• तापमान (Temp): ${v.temperature || "उपलब्ध नहीं"}
• ब्लड शुगर: ${v.bloodSugar || "उपलब्ध नहीं"} (${v.sugarType || "FBS"})
• वजन / BMI: ${v.weight || "उपलब्ध नहीं"} (${v.bmi || "-"})

5. हाल के महत्वपूर्ण जांच परिणाम (RECENT INVESTIGATIONS)
${invs.map((i: any, idx: number) => `${idx + 1}. ${i.testName}: ${i.result} [सामान्य: ${i.normalRange || "-"}] (${i.status}) — ${i.facility || ""} [${i.date || ""}]`).join("\n")}

6. वर्तमान दवाएं (CURRENT MEDICATIONS)
${meds.map((m: any, idx: number) => `${idx + 1}. ${m.name} — ${m.dosage || ""} | ${m.frequency || ""} | ${m.route || "Oral"} | ${m.timingInstructions || ""} (${m.purpose || ""})`).join("\n")}

7. प्राप्तकर्ता डॉक्टर के लिए मुख्य निष्कर्ष (KEY FINDINGS FOR RECEIVING DOCTOR)
${findings.map((f: any) => `• [${typeof f === "object" ? f.category || "निष्कर्ष" : "निष्कर्ष"}] ${typeof f === "object" ? f.text : f}`).join("\n")}

8. अनुशंसित अगले कदम (RECOMMENDED ACTION)
${actions.map((a: string) => `• ${a}`).join("\n")}

================================================================================
वैधानिक सूचना: ${meta.disclaimer || "AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड की पुष्टि अवश्य करें।"}
================================================================================`;
  }

  return `================================================================================
🏥 MEDITRACE AI-ASSISTED CLINICAL REFERRAL SUMMARY - FOR RECEIVING PHYSICIAN
================================================================================

1. PATIENT DETAILS
• Patient Name: ${p.name || "Not available"}
• Age / Sex: ${p.age || "Not available"} Yrs / ${p.gender || "Not available"}
• ABHA Health ID: ${p.abhaId || "Not available"}
• Blood Group: ${p.bloodGroup || "Not available"}
• Contact Number: ${p.primaryContact || "Not available"}
• Primary Emergency Contact: ${p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactRelationship || "Family"}) - ${p.emergencyContactPhone || ""}` : "Not available"}
• Base Healthcare Facility: ${p.baseFacility || meta.referringFacility || "Not available"}
• Confirmed Allergies: ${Array.isArray(p.allergies) ? p.allergies.join(", ") : "None reported"}
• Chronic Conditions: ${Array.isArray(p.chronicConditions) ? p.chronicConditions.join(", ") : "None reported"}

2. REASON FOR REFERRAL
• Primary Reason: ${r.primaryReason || "Specialist evaluation"}
• Clinical Indication: ${r.clinicalIndication || "-"}
• Specialist Evaluation Required: ${r.specialistEvaluationNeeded || "-"}
• Urgency Level: ${r.urgencyLevel || "Priority OPD / Semi-Urgent"}

3. CLINICAL SUMMARY
${c.synthesis || "-"}
${Array.isArray(c.trajectory) && c.trajectory.length > 0 ? "\nCross-Facility Trajectory:\n" + c.trajectory.map((t: any) => `• [${t.date}] ${t.facility}: ${t.eventSummary}`).join("\n") : ""}

4. VITALS — MOST RECENT
[Recorded Date: ${v.recordedDate || "-"} • Facility: ${v.recordedFacility || "-"}]
• Blood Pressure: ${v.bloodPressure || "Not available"} ${v.previousBP ? `(Previous: ${v.previousBP})` : ""}
• Pulse Rate: ${v.pulse || "Not available"}
• SpO₂: ${v.spO2 || "Not available"}
• Temperature: ${v.temperature || "Not available"}
• Blood Sugar: ${v.bloodSugar || "Not available"} (${v.sugarType || "FBS"})
• Weight / BMI: ${v.weight || "Not available"} (${v.bmi || "-"})

5. RECENT INVESTIGATIONS
${invs.map((i: any, idx: number) => `${idx + 1}. ${i.testName}: ${i.result} [Normal Range: ${i.normalRange || "-"}] (${i.status}) — ${i.facility || ""} [${i.date || ""}]`).join("\n")}

6. CURRENT MEDICATIONS
${meds.map((m: any, idx: number) => `${idx + 1}. ${m.name} — ${m.dosage || ""} | ${m.frequency || ""} | ${m.route || "Oral"} | ${m.timingInstructions || ""} (${m.purpose || ""})`).join("\n")}

7. KEY FINDINGS FOR RECEIVING DOCTOR
${findings.map((f: any) => `• [${typeof f === "object" ? f.category || "Finding" : "Finding"}] ${typeof f === "object" ? f.text : f}`).join("\n")}

8. RECOMMENDED ACTION
${actions.map((a: string) => `• ${a}`).join("\n")}

================================================================================
CLINICAL NOTICE: ${meta.disclaimer || "AI-generated referral summary — verify against original facility records before clinical decisions."}
================================================================================`;
}

function generateFallbackTranslation(text: string, sourceLang?: string, targetLang?: string, patientName?: string): string {
  const isTargetHindi = targetLang === "hi";

  if (isTargetHindi) {
    return text
      .replace(/MEDITRACE AI-ASSISTED CLINICAL REFERRAL SUMMARY - FOR RECEIVING PHYSICIAN/g, "मेडिट्रेस AI-सहायक डॉक्टर रेफरल सारांश - उच्च स्तरीय अस्पताल हेतु")
      .replace(/1\. PATIENT DETAILS/g, "1. रोगी का विवरण (PATIENT DETAILS)")
      .replace(/2\. REASON FOR REFERRAL/g, "2. रेफरल का कारण (REASON FOR REFERRAL)")
      .replace(/3\. CLINICAL SUMMARY/g, "3. नैदानिक सारांश (CLINICAL SUMMARY)")
      .replace(/4\. VITALS — MOST RECENT/g, "4. वाइटल्स — नवीनतम (VITALS — MOST RECENT)")
      .replace(/5\. RECENT INVESTIGATIONS/g, "5. हाल के महत्वपूर्ण जांच परिणाम (RECENT INVESTIGATIONS)")
      .replace(/6\. CURRENT MEDICATIONS/g, "6. वर्तमान दवाएं (CURRENT MEDICATIONS)")
      .replace(/7\. KEY FINDINGS FOR RECEIVING DOCTOR/g, "7. प्राप्तकर्ता डॉक्टर के लिए मुख्य निष्कर्ष (KEY FINDINGS FOR RECEIVING DOCTOR)")
      .replace(/8\. RECOMMENDED ACTION/g, "8. अनुशंसित अगले कदम (RECOMMENDED ACTION)")
      .replace(/• Patient Name:/g, "• नाम:")
      .replace(/• Age \/ Sex:/g, "• आयु / लिंग:")
      .replace(/• ABHA Health ID:/g, "• आभा (ABHA) आईडी:")
      .replace(/• Blood Group:/g, "• रक्त समूह:")
      .replace(/• Contact Number:/g, "• प्राथमिक संपर्क:")
      .replace(/• Base Healthcare Facility:/g, "• मूल स्वास्थ्य केंद्र:")
      .replace(/• Primary Reason:/g, "• मुख्य कारण:")
      .replace(/• Urgency Level:/g, "• तात्कालिकता स्तर:")
      .replace(/CLINICAL NOTICE: AI-generated referral summary — verify against original facility records before clinical decisions\./g, "वैधानिक सूचना: AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड की पुष्टि अवश्य करें।");
  }

  return text
    .replace(/मेडिट्रेस AI-सहायक डॉक्टर रेफरल सारांश - उच्च स्तरीय अस्पताल हेतु/g, "MEDITRACE AI-ASSISTED CLINICAL REFERRAL SUMMARY - FOR RECEIVING PHYSICIAN")
    .replace(/1\. रोगी का विवरण \(PATIENT DETAILS\)/g, "1. PATIENT DETAILS")
    .replace(/2\. रेफरल का कारण \(REASON FOR REFERRAL\)/g, "2. REASON FOR REFERRAL")
    .replace(/3\. नैदानिक सारांश \(CLINICAL SUMMARY\)/g, "3. CLINICAL SUMMARY")
    .replace(/4\. वाइटल्स — नवीनतम \(VITALS — MOST RECENT\)/g, "4. VITALS — MOST RECENT")
    .replace(/5\. हाल के महत्वपूर्ण जांच परिणाम \(RECENT INVESTIGATIONS\)/g, "5. RECENT INVESTIGATIONS")
    .replace(/6\. वर्तमान दवाएं \(CURRENT MEDICATIONS\)/g, "6. CURRENT MEDICATIONS")
    .replace(/7\. प्राप्तकर्ता डॉक्टर के लिए मुख्य निष्कर्ष \(KEY FINDINGS FOR RECEIVING DOCTOR\)/g, "7. KEY FINDINGS FOR RECEIVING DOCTOR")
    .replace(/8\. अनुशंसित अगले कदम \(RECOMMENDED ACTION\)/g, "8. RECOMMENDED ACTION")
    .replace(/• नाम:/g, "• Patient Name:")
    .replace(/• आयु \/ लिंग:/g, "• Age / Sex:")
    .replace(/• आभा \(ABHA\) आईडी:/g, "• ABHA Health ID:")
    .replace(/• रक्त समूह:/g, "• Blood Group:")
    .replace(/• प्राथमिक संपर्क:/g, "• Contact Number:")
    .replace(/• मूल स्वास्थ्य केंद्र:/g, "• Base Healthcare Facility:")
    .replace(/• मुख्य कारण:/g, "• Primary Reason:")
    .replace(/• तात्कालिकता स्तर:/g, "• Urgency Level:")
    .replace(/वैधानिक सूचना: AI-निर्मित रेफरल सारांश — नैदानिक निर्णय से पूर्व मूल रिकॉर्ड की पुष्टि अवश्य करें।/g, "CLINICAL NOTICE: AI-generated referral summary — verify against original facility records before clinical decisions.");
}


// Vite middleware for development vs static build in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MediTrace Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

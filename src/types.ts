export type UserRole = 'patient' | 'caregiver' | 'provider';
export type Language = 'en' | 'hi';

export type RecordType = 'Prescription' | 'Diagnostic' | 'Consultation' | 'Referral' | 'Discharge Summary';

export type FacilityType = 'Village Sub-Centre' | 'Primary Health Centre' | 'District Hospital' | 'Tertiary Hospital' | 'Private Clinic';

export interface MedicineItem {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string; // e.g. "1-0-1" or "Once daily"
  timingNotes?: string; // e.g. "After breakfast", "With warm water"
  duration: string;
  purpose: string;
  status: 'active' | 'completed' | 'discontinued';
  prescribedFacility: string;
  prescribedDate: string;
}

export interface InvestigationItem {
  id: string;
  testName: string;
  result: string;
  normalRange: string;
  unit?: string;
  status: 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical';
  date: string;
  facility: string;
}

export interface VitalsRecord {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  weight?: string;
  spO2?: string;
  respiratoryRate?: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  recordDate: string;
  facility: string;
  facilityType: FacilityType;
  recordType: RecordType;
  doctorName: string;
  specialization?: string;
  diagnosis: string;
  reasonForVisit: string;
  medicines: MedicineItem[];
  investigations: InvestigationItem[];
  vitals?: VitalsRecord;
  clinicalNotes: string;
  followUpInstructions?: string;
  sourceDocumentName?: string;
  sourceDocumentType?: 'prescription_scan' | 'lab_report' | 'consultation_slip' | 'referral_slip';
  sourceDocumentPreview?: string;
  isAiExtracted: boolean;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  confidenceScore?: number;
}

export interface CaregiverInfo {
  id: string;
  name: string;
  nameHindi: string;
  relationship: string;
  relationshipHindi: string;
  phone: string;
  isPrimary: boolean;
  permissions: {
    viewRecords: boolean;
    viewMedicines: boolean;
    viewAppointments: boolean;
    uploadRecords: boolean;
    editFullProfile: boolean;
  };
  lastActive: string;
}

export interface SecurityAccessLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  facility: string;
  action: string;
  details: string;
  authMethod: string;
}

export interface AuthUser {
  userId: string;
  phone: string;
  maskedPhone: string;
  email: string;
  role: UserRole;
  patientId: string; // Internal MediTrace Patient ID (e.g., MT-PAT-000001)
  abhaId?: string; // Existing ABHA ID (e.g., ABHA-9821-4402-9012)
  name: string;
  preferredLanguage: Language;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export interface PatientProfile {
  id: string; // ABHA ID (e.g. ABHA-9821-4402-9012) - PRESERVED UNCHANGED
  mediTraceId: string; // Unique Internal MediTrace Patient ID (e.g., MT-PAT-000001)
  abhaAddress: string;
  name: string;
  nameHindi: string;
  profilePhoto?: string; // Optional Base64 data URL for patient profile image
  email?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  genderHindi: string;
  bloodGroup: string;
  village: string;
  post?: string;
  district: string;
  state: string;
  pinCode?: string;
  phone: string;
  maskedPhone?: string;
  primaryFacility: string;
  primaryFacilityHindi: string;
  allergies: string[];
  allergiesHindi: string[];
  chronicConditions: string[];
  chronicConditionsHindi: string[];
  emergencyContacts: EmergencyContact[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  caregivers: CaregiverInfo[];
  lastSynchronized: string;
  lastVisitDate: string;
  recordsCount: number;
  qrPayload: string;
}

// Structured 8-Section AI Referral Summary
export interface PatientSummaryDetails {
  name: string;
  age: number | string;
  gender: string;
  abhaId?: string;
  bloodGroup?: string;
  primaryContact?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  baseFacility?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export interface ReferralReasonDetails {
  primaryReason: string;
  clinicalIndication: string;
  specialistEvaluationNeeded: string;
  urgencyLevel: string; // e.g. "Priority OPD" / "प्राथमिकता ओपीडी"
}

export interface ClinicalSummaryDetails {
  synthesis: string;
  chronicConditionsSummary?: string[];
  relevantHistory?: string[];
  trajectory?: Array<{
    date: string;
    facility: string;
    eventSummary: string;
  }>;
}

export interface VitalsSummaryItem {
  name: string;
  value: string;
  unit: string;
  status?: 'Normal' | 'Elevated' | 'High' | 'Low' | 'Critical';
  previousValue?: string;
}

export interface VitalsSummaryDetails {
  recordedDate?: string;
  recordedFacility?: string;
  bloodPressure?: string;
  bpStatus?: 'Normal' | 'Elevated' | 'High' | 'Low';
  previousBP?: string;
  pulse?: string;
  spO2?: string;
  temperature?: string;
  bloodSugar?: string;
  sugarType?: string;
  weight?: string;
  bmi?: string;
  respiratoryRate?: string;
  items?: VitalsSummaryItem[];
}

export interface InvestigationSummaryItem {
  id?: string;
  testName: string;
  result: string;
  normalRange?: string;
  status: 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical' | 'Pending';
  date?: string;
  facility?: string;
  isPending?: boolean;
}

export interface MedicationSummaryItem {
  id?: string;
  name: string;
  dosage: string;
  frequency: string; // e.g. "1-0-0" or "Once daily"
  route?: string; // e.g. "Oral (PO)" or "मौखिक"
  timingInstructions?: string; // e.g. "After breakfast with water"
  purpose?: string; // e.g. "Blood pressure control"
  prescribingFacility?: string;
}

export interface KeyFindingItem {
  category?: string;
  text: string;
  isCritical?: boolean;
  highlightType?: 'warning' | 'alert' | 'medication' | 'info';
}

export interface ReferralSummaryStructured {
  // 1. Patient Details
  patientDetails: PatientSummaryDetails;
  // 2. Reason for Referral
  referralReason: ReferralReasonDetails;
  // 3. Clinical Summary
  clinicalSummary: ClinicalSummaryDetails;
  // 4. Vitals — Most Recent
  vitals: VitalsSummaryDetails;
  // 5. Recent Investigations
  investigations: InvestigationSummaryItem[];
  // 6. Current Medications
  medications: MedicationSummaryItem[];
  // 7. Key Findings for Receiving Doctor
  keyFindings: KeyFindingItem[];
  // 8. Recommended Action
  recommendedActions: string[];
  // Metadata & Disclaimers
  metadata: {
    referringFacility: string;
    receivingFacility: string;
    generatedAt: string;
    recordVersion: string;
    language: Language;
    disclaimer: string;
    urgencyLevel?: string;
    source?: string;
  };
}

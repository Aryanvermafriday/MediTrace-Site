import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  CaregiverInfo,
  EmergencyContact,
  FacilityType,
  Language,
  MedicalRecord,
  PatientProfile,
  RecordType,
  SecurityAccessLog,
} from '../types';
import { formatMaskedPhone } from './authService';

export type PersistedReferralSummary = {
  dataFingerprint: string;
  referralReason: string;
  referringFacility: string;
  receivingFacility: string;
  language: Language;
  source: string;
  structuredData: unknown;
  summaryText: string;
  generatedAt: string;
};

type OnboardingInput = {
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  phone?: string;
  village?: string;
  post?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  primaryFacility?: string;
  preferredLanguage: Language;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

function requireClient(): any {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY variables.');
  }
  const client = getSupabase();
  if (!client) throw new Error('Unable to initialize Supabase.');
  return client;
}

function dateLabel(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

class PatientDataService {
  async completeOnboarding(input: OnboardingInput): Promise<PatientProfile> {
    const client = requireClient();
    const { data, error } = await client.rpc('complete_patient_onboarding', {
      p_profile: {
        full_name: input.fullName.trim(),
        age: input.age,
        gender: input.gender,
        blood_group: input.bloodGroup,
        phone: input.phone?.trim() || null,
        village: input.village?.trim() || 'Not specified',
        post: input.post?.trim() || null,
        district: input.district?.trim() || 'Not specified',
        state: input.state?.trim() || 'Not specified',
        pin_code: input.pinCode?.trim() || null,
        primary_facility_name: input.primaryFacility?.trim() || 'Not linked',
        preferred_language: input.preferredLanguage,
        emergency_contact_name: input.emergencyContactName?.trim() || null,
        emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
      },
    });
    if (error) throw new Error(error.message);
    const meditraceId = data?.meditrace_id;
    if (!meditraceId) throw new Error('The patient profile was created without a MediTrace ID.');
    const profile = await this.fetchPatientProfile(meditraceId);
    if (!profile) throw new Error('The newly created patient profile could not be loaded.');
    return profile;
  }

  async resolveCurrentPatientId(): Promise<string | null> {
    const client = requireClient();
    const { data, error } = await client.rpc('get_my_context');
    if (error) throw new Error(error.message);
    return data?.meditrace_id || null;
  }

  async fetchPatientProfile(mediTraceId: string): Promise<PatientProfile | null> {
    if (!mediTraceId) return null;
    const client = requireClient();
    const { data: patientRow, error: patientError } = await client
      .from('patients')
      .select('*')
      .eq('meditrace_id', mediTraceId)
      .maybeSingle();
    if (patientError) throw new Error(patientError.message);
    if (!patientRow) return null;

    const [allergiesRes, conditionsRes, contactsRes, caregiversRes, countRes, authRes] = await Promise.all([
      client.from('patient_allergies').select('*').eq('patient_id', patientRow.id).order('created_at'),
      client.from('patient_chronic_conditions').select('*').eq('patient_id', patientRow.id).order('created_at'),
      client.from('patient_emergency_contacts').select('*').eq('patient_id', patientRow.id).order('is_primary', { ascending: false }),
      client.from('caregivers').select('*').eq('patient_id', patientRow.id).order('is_primary', { ascending: false }),
      client.from('medical_records').select('id', { count: 'exact', head: true }).eq('patient_id', patientRow.id),
      client.auth.getUser(),
    ]);

    for (const result of [allergiesRes, conditionsRes, contactsRes, caregiversRes, countRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    const emergencyContacts: EmergencyContact[] = (contactsRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      relationship: row.relationship,
      phone: row.phone,
      isPrimary: Boolean(row.is_primary),
    }));
    const primaryContact = emergencyContacts.find((item) => item.isPrimary) || emergencyContacts[0];

    const caregivers: CaregiverInfo[] = (caregiversRes.data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      nameHindi: row.name_hindi || row.name,
      relationship: row.relationship,
      relationshipHindi: row.relationship_hindi || row.relationship,
      phone: row.phone,
      isPrimary: Boolean(row.is_primary),
      permissions: {
        viewRecords: Boolean(row.can_view_records),
        viewMedicines: Boolean(row.can_view_medicines),
        viewAppointments: Boolean(row.can_view_appointments),
        uploadRecords: Boolean(row.can_upload_records),
        editFullProfile: Boolean(row.can_edit_full_profile),
      },
      lastActive: dateLabel(row.last_active_at) || 'Not active yet',
    }));

    return {
      id: patientRow.abha_id || 'Not linked',
      mediTraceId: patientRow.meditrace_id,
      abhaAddress: patientRow.abha_address || 'Not linked',
      name: patientRow.full_name,
      nameHindi: patientRow.full_name_hindi || patientRow.full_name,
      profilePhoto: patientRow.profile_photo_storage_path || undefined,
      email: authRes.data?.user?.email || '',
      age: Number(patientRow.age),
      gender: patientRow.gender,
      genderHindi: patientRow.gender_hindi || (patientRow.gender === 'Male' ? 'पुरुष' : patientRow.gender === 'Female' ? 'महिला' : 'अन्य'),
      bloodGroup: patientRow.blood_group,
      village: patientRow.village,
      post: patientRow.post || undefined,
      district: patientRow.district,
      state: patientRow.state,
      pinCode: patientRow.pin_code || undefined,
      phone: patientRow.phone || '',
      maskedPhone: patientRow.masked_phone || formatMaskedPhone(patientRow.phone || ''),
      primaryFacility: patientRow.primary_facility_name,
      primaryFacilityHindi: patientRow.primary_facility_name_hindi || patientRow.primary_facility_name,
      allergies: (allergiesRes.data || []).map((row: any) => row.allergen_name),
      allergiesHindi: (allergiesRes.data || []).map((row: any) => row.allergen_name_hindi || row.allergen_name),
      chronicConditions: (conditionsRes.data || []).map((row: any) => row.condition_name),
      chronicConditionsHindi: (conditionsRes.data || []).map((row: any) => row.condition_name_hindi || row.condition_name),
      emergencyContacts,
      emergencyContact: primaryContact ? {
        name: primaryContact.name,
        relationship: primaryContact.relationship,
        phone: primaryContact.phone,
      } : undefined,
      caregivers,
      lastSynchronized: dateLabel(patientRow.last_synchronized_at) || 'Just now',
      lastVisitDate: patientRow.last_visit_date || '',
      recordsCount: countRes.count || 0,
      qrPayload: patientRow.qr_payload,
    };
  }

  async fetchPatientRecords(mediTraceId: string): Promise<MedicalRecord[]> {
    if (!mediTraceId) return [];
    const client = requireClient();
    const { data: patientRow, error: patientError } = await client
      .from('patients')
      .select('id')
      .eq('meditrace_id', mediTraceId)
      .maybeSingle();
    if (patientError) throw new Error(patientError.message);
    if (!patientRow) return [];

    const [recordsRes, vitalsRes, medicinesRes, labsRes, documentsRes] = await Promise.all([
      client.from('medical_records').select('*').eq('patient_id', patientRow.id).order('record_date', { ascending: false }),
      client.from('medical_record_vitals').select('*').eq('patient_id', patientRow.id),
      client.from('prescribed_medicines').select('*').eq('patient_id', patientRow.id),
      client.from('lab_investigations').select('*').eq('patient_id', patientRow.id),
      client.from('medical_documents').select('*').eq('patient_id', patientRow.id),
    ]);
    for (const result of [recordsRes, vitalsRes, medicinesRes, labsRes, documentsRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    return (recordsRes.data || []).map((row: any) => {
      const vital = (vitalsRes.data || []).find((item: any) => item.record_id === row.id);
      const document = (documentsRes.data || []).find((item: any) => item.record_id === row.id);
      return {
        id: row.id,
        title: row.title,
        recordDate: row.record_date,
        facility: row.facility_name,
        facilityType: row.facility_type as FacilityType,
        recordType: row.record_type as RecordType,
        doctorName: row.doctor_name,
        specialization: row.specialization || undefined,
        diagnosis: row.diagnosis,
        reasonForVisit: row.reason_for_visit,
        clinicalNotes: row.clinical_notes,
        followUpInstructions: row.follow_up_instructions || undefined,
        isAiExtracted: Boolean(row.is_ai_extracted),
        isVerified: Boolean(row.is_verified),
        verifiedBy: row.verified_by || undefined,
        verifiedAt: row.verified_at || undefined,
        confidenceScore: row.confidence_score == null ? undefined : Number(row.confidence_score),
        vitals: vital ? {
          bloodPressure: vital.blood_pressure || undefined,
          pulse: vital.pulse || undefined,
          temperature: vital.temperature || undefined,
          weight: vital.weight || undefined,
          spO2: vital.spo2 || undefined,
          respiratoryRate: vital.respiratory_rate || undefined,
        } : undefined,
        medicines: (medicinesRes.data || []).filter((item: any) => item.record_id === row.id).map((item: any) => ({
          id: item.id,
          name: item.name,
          genericName: item.generic_name || undefined,
          dosage: item.dosage,
          frequency: item.frequency,
          timingNotes: item.timing_notes || undefined,
          duration: item.duration,
          purpose: item.purpose,
          status: item.status,
          prescribedFacility: item.prescribed_facility,
          prescribedDate: item.prescribed_date,
        })),
        investigations: (labsRes.data || []).filter((item: any) => item.record_id === row.id).map((item: any) => ({
          id: item.id,
          testName: item.test_name,
          result: item.result,
          normalRange: item.normal_range,
          unit: item.unit || undefined,
          status: item.status,
          date: item.test_date,
          facility: item.facility,
        })),
        sourceDocumentName: document?.file_name || row.source_document_name || undefined,
        sourceDocumentType: document?.document_type || row.source_document_type || undefined,
      } as MedicalRecord;
    });
  }

  async fetchPatientAndRecords(mediTraceId: string): Promise<{ patient: PatientProfile | null; records: MedicalRecord[] }> {
    const [patient, records] = await Promise.all([
      this.fetchPatientProfile(mediTraceId),
      this.fetchPatientRecords(mediTraceId),
    ]);
    return { patient, records };
  }

  async saveMedicalRecord(mediTraceId: string, record: MedicalRecord): Promise<MedicalRecord[]> {
    const client = requireClient();
    const { error } = await client.rpc('create_complete_medical_record', {
      p_meditrace_id: mediTraceId,
      p_record: record,
    });
    if (error) throw new Error(error.message);
    return this.fetchPatientRecords(mediTraceId);
  }

  async updatePatientProfile(mediTraceId: string, updates: Partial<PatientProfile>): Promise<PatientProfile> {
    const client = requireClient();
    const dbUpdates: Record<string, unknown> = {};
    const scalarMap: Array<[keyof PatientProfile, string]> = [
      ['name', 'full_name'], ['nameHindi', 'full_name_hindi'], ['age', 'age'], ['gender', 'gender'],
      ['genderHindi', 'gender_hindi'], ['bloodGroup', 'blood_group'], ['village', 'village'], ['post', 'post'],
      ['district', 'district'], ['state', 'state'], ['pinCode', 'pin_code'], ['phone', 'phone'],
      ['primaryFacility', 'primary_facility_name'], ['primaryFacilityHindi', 'primary_facility_name_hindi'],
      ['profilePhoto', 'profile_photo_storage_path'],
    ];
    for (const [frontKey, dbKey] of scalarMap) {
      if (Object.prototype.hasOwnProperty.call(updates, frontKey)) dbUpdates[dbKey] = updates[frontKey] ?? null;
    }
    if (updates.phone !== undefined) dbUpdates.masked_phone = formatMaskedPhone(updates.phone);

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await client.from('patients').update(dbUpdates).eq('meditrace_id', mediTraceId);
      if (error) throw new Error(error.message);
    }
    if (updates.emergencyContacts) {
      const { error } = await client.rpc('replace_emergency_contacts', {
        p_meditrace_id: mediTraceId,
        p_contacts: updates.emergencyContacts,
      });
      if (error) throw new Error(error.message);
    }
    const refreshed = await this.fetchPatientProfile(mediTraceId);
    if (!refreshed) throw new Error('The updated patient profile could not be loaded.');
    return refreshed;
  }

  async updatePrimaryCaregiver(mediTraceId: string, caregiver: CaregiverInfo): Promise<PatientProfile> {
    const client = requireClient();
    const { error } = await client.rpc('upsert_primary_caregiver', {
      p_meditrace_id: mediTraceId,
      p_caregiver: {
        name: caregiver.name,
        name_hindi: caregiver.nameHindi,
        relationship: caregiver.relationship,
        relationship_hindi: caregiver.relationshipHindi,
        phone: caregiver.phone,
        can_view_records: caregiver.permissions.viewRecords,
        can_view_medicines: caregiver.permissions.viewMedicines,
        can_view_appointments: caregiver.permissions.viewAppointments,
        can_upload_records: caregiver.permissions.uploadRecords,
        can_edit_full_profile: caregiver.permissions.editFullProfile,
      },
    });
    if (error) throw new Error(error.message);
    const refreshed = await this.fetchPatientProfile(mediTraceId);
    if (!refreshed) throw new Error('The caregiver update could not be loaded.');
    return refreshed;
  }

  async fetchReferralSummaryCache(
    mediTraceId: string,
    dataFingerprint: string,
  ): Promise<PersistedReferralSummary[]> {
    const client = requireClient();
    const { data: patientRow, error: patientError } = await client
      .from('patients')
      .select('id')
      .eq('meditrace_id', mediTraceId)
      .maybeSingle();
    if (patientError) throw new Error(patientError.message);
    if (!patientRow) return [];

    const { data, error } = await client
      .from('referral_summaries')
      .select('*')
      .eq('patient_id', patientRow.id)
      .eq('data_fingerprint', dataFingerprint)
      .eq('is_outdated', false)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      dataFingerprint: row.data_fingerprint,
      referralReason: row.referral_reason,
      referringFacility: row.referring_facility,
      receivingFacility: row.receiving_facility,
      language: row.language as Language,
      source: row.source,
      structuredData: row.structured_data,
      summaryText: row.summary_text,
      generatedAt: row.generated_at,
    }));
  }

  async saveReferralSummary(
    mediTraceId: string,
    summary: {
      dataFingerprint: string;
      referralReason: string;
      referringFacility: string;
      receivingFacility: string;
      language: Language;
      source: string;
      structuredData: unknown;
      summaryText: string;
    },
  ): Promise<void> {
    const client = requireClient();
    const { error } = await client.rpc('save_referral_summary', {
      p_meditrace_id: mediTraceId,
      p_summary: {
        data_fingerprint: summary.dataFingerprint,
        referral_reason: summary.referralReason,
        referring_facility: summary.referringFacility,
        receiving_facility: summary.receivingFacility,
        language: summary.language,
        source: summary.source,
        structured_data: summary.structuredData,
        summary_text: summary.summaryText,
      },
    });
    if (error) throw new Error(error.message);
  }

  async fetchSecurityLogs(mediTraceId: string): Promise<SecurityAccessLog[]> {
    const client = requireClient();
    const { data: patientRow, error: patientError } = await client.from('patients').select('id').eq('meditrace_id', mediTraceId).maybeSingle();
    if (patientError) throw new Error(patientError.message);
    if (!patientRow) return [];
    const { data, error } = await client.from('security_access_logs').select('*').eq('patient_id', patientRow.id).order('timestamp', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: dateLabel(row.timestamp) || row.timestamp,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      facility: row.facility,
      action: row.action,
      details: row.details,
      authMethod: row.auth_method,
    }));
  }
}

export const patientDataService = new PatientDataService();

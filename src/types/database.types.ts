/**
 * MediTrace Database Types (Supabase PostgreSQL)
 * Aligned with the base schema and the production email-auth migration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string | null;
          masked_phone: string | null;
          email: string | null;
          full_name: string;
          role: 'patient' | 'caregiver' | 'provider';
          preferred_language: 'en' | 'hi';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          masked_phone?: string | null;
          email?: string | null;
          full_name: string;
          role: 'patient' | 'caregiver' | 'provider';
          preferred_language?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          masked_phone?: string | null;
          email?: string | null;
          full_name?: string;
          role?: 'patient' | 'caregiver' | 'provider';
          preferred_language?: 'en' | 'hi';
          created_at?: string;
          updated_at?: string;
        };
      };
      facilities: {
        Row: {
          id: string;
          name: string;
          name_hindi: string | null;
          facility_type:
            | 'Village Sub-Centre'
            | 'Primary Health Centre'
            | 'Community Health Centre'
            | 'District Hospital'
            | 'Tertiary Hospital'
            | 'Private Clinic';
          district: string;
          state: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_hindi?: string | null;
          facility_type:
            | 'Village Sub-Centre'
            | 'Primary Health Centre'
            | 'Community Health Centre'
            | 'District Hospital'
            | 'Tertiary Hospital'
            | 'Private Clinic';
          district: string;
          state: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_hindi?: string | null;
          facility_type?:
            | 'Village Sub-Centre'
            | 'Primary Health Centre'
            | 'Community Health Centre'
            | 'District Hospital'
            | 'Tertiary Hospital'
            | 'Private Clinic';
          district?: string;
          state?: string;
          created_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          user_id: string | null;
          meditrace_id: string;
          abha_id: string | null;
          abha_address: string | null;
          full_name: string;
          full_name_hindi: string | null;
          age: number;
          gender: 'Male' | 'Female' | 'Other';
          gender_hindi: string | null;
          blood_group: string;
          phone: string | null;
          masked_phone: string | null;
          village: string;
          post: string | null;
          district: string;
          state: string;
          pin_code: string | null;
          primary_facility_id: string | null;
          primary_facility_name: string;
          primary_facility_name_hindi: string | null;
          profile_photo_storage_path: string | null;
          qr_payload: string;
          last_synchronized_at: string | null;
          last_visit_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          meditrace_id: string;
          abha_id?: string | null;
          abha_address?: string | null;
          full_name: string;
          full_name_hindi?: string | null;
          age: number;
          gender: 'Male' | 'Female' | 'Other';
          gender_hindi?: string | null;
          blood_group: string;
          phone?: string | null;
          masked_phone?: string | null;
          village: string;
          post?: string | null;
          district: string;
          state: string;
          pin_code?: string | null;
          primary_facility_id?: string | null;
          primary_facility_name: string;
          primary_facility_name_hindi?: string | null;
          profile_photo_storage_path?: string | null;
          qr_payload: string;
          last_synchronized_at?: string | null;
          last_visit_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          meditrace_id?: string;
          abha_id?: string | null;
          abha_address?: string | null;
          full_name?: string;
          full_name_hindi?: string | null;
          age?: number;
          gender?: 'Male' | 'Female' | 'Other';
          gender_hindi?: string | null;
          blood_group?: string;
          phone?: string | null;
          masked_phone?: string | null;
          village?: string;
          post?: string | null;
          district?: string;
          state?: string;
          pin_code?: string | null;
          primary_facility_id?: string | null;
          primary_facility_name?: string;
          primary_facility_name_hindi?: string | null;
          profile_photo_storage_path?: string | null;
          qr_payload?: string;
          last_synchronized_at?: string | null;
          last_visit_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      patient_allergies: {
        Row: {
          id: string;
          patient_id: string;
          allergen_name: string;
          allergen_name_hindi: string | null;
          reaction_details: string | null;
          severity: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening';
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          allergen_name: string;
          allergen_name_hindi?: string | null;
          reaction_details?: string | null;
          severity?: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening';
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          allergen_name?: string;
          allergen_name_hindi?: string | null;
          reaction_details?: string | null;
          severity?: 'Mild' | 'Moderate' | 'Severe' | 'Life-Threatening';
          created_at?: string;
        };
      };
      patient_chronic_conditions: {
        Row: {
          id: string;
          patient_id: string;
          condition_name: string;
          condition_name_hindi: string | null;
          diagnosed_duration: string | null;
          status: 'active' | 'managed' | 'resolved';
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          condition_name: string;
          condition_name_hindi?: string | null;
          diagnosed_duration?: string | null;
          status?: 'active' | 'managed' | 'resolved';
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          condition_name?: string;
          condition_name_hindi?: string | null;
          diagnosed_duration?: string | null;
          status?: 'active' | 'managed' | 'resolved';
          created_at?: string;
        };
      };
      patient_emergency_contacts: {
        Row: {
          id: string;
          patient_id: string;
          name: string;
          relationship: string;
          relationship_hindi: string | null;
          phone: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          name: string;
          relationship: string;
          relationship_hindi?: string | null;
          phone: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          name?: string;
          relationship?: string;
          relationship_hindi?: string | null;
          phone?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      caregivers: {
        Row: {
          id: string;
          patient_id: string;
          user_id: string | null;
          name: string;
          name_hindi: string | null;
          relationship: string;
          relationship_hindi: string | null;
          phone: string;
          is_primary: boolean;
          can_view_records: boolean;
          can_view_medicines: boolean;
          can_view_appointments: boolean;
          can_upload_records: boolean;
          can_edit_full_profile: boolean;
          last_active_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          user_id?: string | null;
          name: string;
          name_hindi?: string | null;
          relationship: string;
          relationship_hindi?: string | null;
          phone: string;
          is_primary?: boolean;
          can_view_records?: boolean;
          can_view_medicines?: boolean;
          can_view_appointments?: boolean;
          can_upload_records?: boolean;
          can_edit_full_profile?: boolean;
          last_active_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          user_id?: string | null;
          name?: string;
          name_hindi?: string | null;
          relationship?: string;
          relationship_hindi?: string | null;
          phone?: string;
          is_primary?: boolean;
          can_view_records?: boolean;
          can_view_medicines?: boolean;
          can_view_appointments?: boolean;
          can_upload_records?: boolean;
          can_edit_full_profile?: boolean;
          last_active_at?: string | null;
          created_at?: string;
        };
      };
      healthcare_providers: {
        Row: {
          id: string;
          user_id: string | null;
          facility_id: string | null;
          hpr_id: string | null;
          name: string;
          name_hindi: string | null;
          specialization: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          facility_id?: string | null;
          hpr_id?: string | null;
          name: string;
          name_hindi?: string | null;
          specialization: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          facility_id?: string | null;
          hpr_id?: string | null;
          name?: string;
          name_hindi?: string | null;
          specialization?: string;
          phone?: string | null;
          created_at?: string;
        };
      };
      provider_patient_access: {
        Row: {
          id: string;
          provider_user_id: string;
          patient_id: string;
          can_view: boolean;
          can_upload: boolean;
          can_edit: boolean;
          granted_at: string;
        };
        Insert: {
          id?: string;
          provider_user_id: string;
          patient_id: string;
          can_view?: boolean;
          can_upload?: boolean;
          can_edit?: boolean;
          granted_at?: string;
        };
        Update: {
          id?: string;
          provider_user_id?: string;
          patient_id?: string;
          can_view?: boolean;
          can_upload?: boolean;
          can_edit?: boolean;
          granted_at?: string;
        };
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          facility_id: string | null;
          provider_id: string | null;
          title: string;
          record_date: string;
          facility_name: string;
          facility_type: string;
          record_type:
            | 'Prescription'
            | 'Diagnostic'
            | 'Consultation'
            | 'Referral'
            | 'Discharge Summary';
          doctor_name: string;
          specialization: string | null;
          diagnosis: string;
          reason_for_visit: string;
          clinical_notes: string;
          follow_up_instructions: string | null;
          is_ai_extracted: boolean;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          confidence_score: number | null;
          source_document_name: string | null;
          source_document_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          facility_id?: string | null;
          provider_id?: string | null;
          title: string;
          record_date: string;
          facility_name: string;
          facility_type: string;
          record_type:
            | 'Prescription'
            | 'Diagnostic'
            | 'Consultation'
            | 'Referral'
            | 'Discharge Summary';
          doctor_name: string;
          specialization?: string | null;
          diagnosis: string;
          reason_for_visit: string;
          clinical_notes: string;
          follow_up_instructions?: string | null;
          is_ai_extracted?: boolean;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          confidence_score?: number | null;
          source_document_name?: string | null;
          source_document_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          facility_id?: string | null;
          provider_id?: string | null;
          title?: string;
          record_date?: string;
          facility_name?: string;
          facility_type?: string;
          record_type?:
            | 'Prescription'
            | 'Diagnostic'
            | 'Consultation'
            | 'Referral'
            | 'Discharge Summary';
          doctor_name?: string;
          specialization?: string | null;
          diagnosis?: string;
          reason_for_visit?: string;
          clinical_notes?: string;
          follow_up_instructions?: string | null;
          is_ai_extracted?: boolean;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          confidence_score?: number | null;
          source_document_name?: string | null;
          source_document_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_record_vitals: {
        Row: {
          id: string;
          record_id: string | null;
          patient_id: string;
          blood_pressure: string | null;
          pulse: string | null;
          temperature: string | null;
          weight: string | null;
          spo2: string | null;
          respiratory_rate: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          record_id?: string | null;
          patient_id: string;
          blood_pressure?: string | null;
          pulse?: string | null;
          temperature?: string | null;
          weight?: string | null;
          spo2?: string | null;
          respiratory_rate?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string | null;
          patient_id?: string;
          blood_pressure?: string | null;
          pulse?: string | null;
          temperature?: string | null;
          weight?: string | null;
          spo2?: string | null;
          respiratory_rate?: string | null;
          recorded_at?: string;
        };
      };
      prescribed_medicines: {
        Row: {
          id: string;
          record_id: string | null;
          patient_id: string;
          name: string;
          generic_name: string | null;
          dosage: string;
          frequency: string;
          timing_notes: string | null;
          duration: string;
          purpose: string;
          status: 'active' | 'completed' | 'discontinued';
          prescribed_facility: string;
          prescribed_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          record_id?: string | null;
          patient_id: string;
          name: string;
          generic_name?: string | null;
          dosage: string;
          frequency: string;
          timing_notes?: string | null;
          duration: string;
          purpose: string;
          status?: 'active' | 'completed' | 'discontinued';
          prescribed_facility: string;
          prescribed_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string | null;
          patient_id?: string;
          name?: string;
          generic_name?: string | null;
          dosage?: string;
          frequency?: string;
          timing_notes?: string | null;
          duration?: string;
          purpose?: string;
          status?: 'active' | 'completed' | 'discontinued';
          prescribed_facility?: string;
          prescribed_date?: string;
          created_at?: string;
        };
      };
      lab_investigations: {
        Row: {
          id: string;
          record_id: string | null;
          patient_id: string;
          test_name: string;
          result: string;
          normal_range: string;
          unit: string | null;
          status: 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical' | 'Pending';
          test_date: string;
          facility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          record_id?: string | null;
          patient_id: string;
          test_name: string;
          result: string;
          normal_range: string;
          unit?: string | null;
          status: 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical' | 'Pending';
          test_date: string;
          facility: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string | null;
          patient_id?: string;
          test_name?: string;
          result?: string;
          normal_range?: string;
          unit?: string | null;
          status?: 'Normal' | 'Borderline' | 'High' | 'Low' | 'Critical' | 'Pending';
          test_date?: string;
          facility?: string;
          created_at?: string;
        };
      };
      medical_documents: {
        Row: {
          id: string;
          record_id: string | null;
          patient_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          document_type:
            | 'prescription_scan'
            | 'lab_report'
            | 'consultation_slip'
            | 'referral_slip';
          uploaded_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          record_id?: string | null;
          patient_id: string;
          file_name: string;
          storage_path: string;
          mime_type: string;
          file_size_bytes: number;
          document_type:
            | 'prescription_scan'
            | 'lab_report'
            | 'consultation_slip'
            | 'referral_slip';
          uploaded_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          record_id?: string | null;
          patient_id?: string;
          file_name?: string;
          storage_path?: string;
          mime_type?: string;
          file_size_bytes?: number;
          document_type?:
            | 'prescription_scan'
            | 'lab_report'
            | 'consultation_slip'
            | 'referral_slip';
          uploaded_by_user_id?: string | null;
          created_at?: string;
        };
      };
      referral_summaries: {
        Row: {
          id: string;
          patient_id: string;
          data_fingerprint: string;
          referral_reason: string;
          referring_facility: string;
          receiving_facility: string;
          language: 'en' | 'hi';
          source: string;
          is_outdated: boolean;
          structured_data: Json;
          summary_text: string;
          generated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          data_fingerprint: string;
          referral_reason: string;
          referring_facility: string;
          receiving_facility: string;
          language?: 'en' | 'hi';
          source?: string;
          is_outdated?: boolean;
          structured_data: Json;
          summary_text: string;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          data_fingerprint?: string;
          referral_reason?: string;
          referring_facility?: string;
          receiving_facility?: string;
          language?: 'en' | 'hi';
          source?: string;
          is_outdated?: boolean;
          structured_data?: Json;
          summary_text?: string;
          generated_at?: string;
          updated_at?: string;
        };
      };
      security_access_logs: {
        Row: {
          id: string;
          patient_id: string | null;
          actor_user_id: string | null;
          actor_name: string;
          actor_role: string;
          facility: string;
          action: string;
          details: string;
          auth_method: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          actor_user_id?: string | null;
          actor_name: string;
          actor_role: string;
          facility: string;
          action: string;
          details: string;
          auth_method: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          actor_user_id?: string | null;
          actor_name?: string;
          actor_role?: string;
          facility?: string;
          action?: string;
          details?: string;
          auth_method?: string;
          timestamp?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_patient_onboarding: {
        Args: { p_profile: Json };
        Returns: Json;
      };
      create_complete_medical_record: {
        Args: { p_meditrace_id: string; p_record: Json };
        Returns: string;
      };
      get_my_context: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      replace_emergency_contacts: {
        Args: { p_meditrace_id: string; p_contacts: Json };
        Returns: undefined;
      };
      save_referral_summary: {
        Args: { p_meditrace_id: string; p_summary: Json };
        Returns: string;
      };
      upsert_primary_caregiver: {
        Args: { p_meditrace_id: string; p_caregiver: Json };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

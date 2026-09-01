-- ============================================================================
-- MediTrace Database Schema Migration
-- Migration: 20260830000000_create_meditrace_schema.sql
-- Description: Creates the full PostgreSQL database schema for MediTrace
--              including users, facilities, patients, medical encounters,
--              prescriptions, lab investigations, documents, referral cache,
--              and audit logs with strict RLS and partial unique indexes.
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- Application-level profile table extending auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    masked_phone VARCHAR(25),
    email VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'caregiver', 'provider')),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. FACILITIES TABLE
-- Healthcare facilities catalog across sub-centres, PHCs, CHCs, and hospitals
-- ============================================================================
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    name_hindi VARCHAR(200),
    facility_type VARCHAR(50) NOT NULL CHECK (facility_type IN (
        'Village Sub-Centre', 'Primary Health Centre', 'Community Health Centre',
        'District Hospital', 'Tertiary Hospital', 'Private Clinic'
    )),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PATIENTS TABLE
-- Core patient demographics, ABHA credentials, and location details
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    meditrace_id VARCHAR(30) NOT NULL UNIQUE,
    abha_id VARCHAR(50) UNIQUE,
    abha_address VARCHAR(100),
    full_name VARCHAR(150) NOT NULL,
    full_name_hindi VARCHAR(150),
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 130),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    gender_hindi VARCHAR(20),
    blood_group VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    masked_phone VARCHAR(25),
    village VARCHAR(150) NOT NULL,
    post VARCHAR(100),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(10),
    primary_facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    primary_facility_name VARCHAR(150) NOT NULL,
    primary_facility_name_hindi VARCHAR(150),
    profile_photo_storage_path TEXT,
    qr_payload TEXT NOT NULL,
    last_synchronized_at TIMESTAMPTZ,
    last_visit_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. PATIENT ALLERGIES TABLE
-- Known drug, food, and environmental allergies with severity levels
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen_name VARCHAR(150) NOT NULL,
    allergen_name_hindi VARCHAR(150),
    reaction_details TEXT,
    severity VARCHAR(20) DEFAULT 'Moderate' CHECK (severity IN ('Mild', 'Moderate', 'Severe', 'Life-Threatening')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PATIENT CHRONIC CONDITIONS TABLE
-- Long-term chronic medical conditions and duration
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_chronic_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_name VARCHAR(150) NOT NULL,
    condition_name_hindi VARCHAR(150),
    diagnosed_duration VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'managed', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PATIENT EMERGENCY CONTACTS TABLE
-- Emergency contacts with strict partial unique index for primary contact
-- ============================================================================
CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    relationship_hindi VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial Unique Index: Exactly one primary emergency contact per patient
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_primary_emergency_contact
ON patient_emergency_contacts (patient_id)
WHERE is_primary = TRUE;

-- ============================================================================
-- 7. CAREGIVERS TABLE
-- Designated caregivers with granular access delegation permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    name_hindi VARCHAR(150),
    relationship VARCHAR(100) NOT NULL,
    relationship_hindi VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_records BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_medicines BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_appointments BOOLEAN NOT NULL DEFAULT TRUE,
    can_upload_records BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_full_profile BOOLEAN NOT NULL DEFAULT FALSE,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial Unique Index: Exactly one primary caregiver per patient
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_primary_caregiver
ON caregivers (patient_id)
WHERE is_primary = TRUE;

-- ============================================================================
-- 8. HEALTHCARE PROVIDERS TABLE
-- Credentialed doctors, CHOs, and medical specialists
-- ============================================================================
CREATE TABLE IF NOT EXISTS healthcare_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    hpr_id VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    name_hindi VARCHAR(150),
    specialization VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. MEDICAL RECORDS TABLE
-- Core medical encounters across all care facilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES healthcare_providers(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    record_date DATE NOT NULL,
    facility_name VARCHAR(150) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'Prescription', 'Diagnostic', 'Consultation', 'Referral', 'Discharge Summary'
    )),
    doctor_name VARCHAR(150) NOT NULL,
    specialization VARCHAR(100),
    diagnosis TEXT NOT NULL,
    reason_for_visit TEXT NOT NULL,
    clinical_notes TEXT NOT NULL,
    follow_up_instructions TEXT,
    is_ai_extracted BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(150),
    verified_at TIMESTAMPTZ,
    confidence_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. MEDICAL RECORD VITALS TABLE
-- Clinical vitals associated with patient encounters
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_record_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    blood_pressure VARCHAR(20),
    pulse VARCHAR(20),
    temperature VARCHAR(20),
    weight VARCHAR(20),
    spo2 VARCHAR(20),
    respiratory_rate VARCHAR(20),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. PRESCRIBED MEDICINES TABLE
-- Prescribed medications with dosage, frequency, and compliance status
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescribed_medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    timing_notes TEXT,
    duration VARCHAR(50) NOT NULL,
    purpose TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
    prescribed_facility VARCHAR(150) NOT NULL,
    prescribed_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. LAB INVESTIGATIONS TABLE
-- Diagnostic laboratory test results, normal reference ranges, and flags
-- ============================================================================
CREATE TABLE IF NOT EXISTS lab_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    test_name VARCHAR(150) NOT NULL,
    result VARCHAR(100) NOT NULL,
    normal_range VARCHAR(100) NOT NULL,
    unit VARCHAR(30),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Normal', 'Borderline', 'High', 'Low', 'Critical', 'Pending')),
    test_date DATE NOT NULL,
    facility VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. MEDICAL DOCUMENTS TABLE
-- Storage metadata references for uploaded scans, PDFs, and slips
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'prescription_scan', 'lab_report', 'consultation_slip', 'referral_slip'
    )),
    uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 14. REFERRAL SUMMARIES TABLE
-- Persisted AI-generated referral summaries with fingerprint caching
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    data_fingerprint VARCHAR(120) NOT NULL,
    referral_reason TEXT NOT NULL,
    referring_facility VARCHAR(200) NOT NULL,
    receiving_facility VARCHAR(200) NOT NULL,
    language VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
    source VARCHAR(50) NOT NULL DEFAULT 'instant_cache',
    is_outdated BOOLEAN NOT NULL DEFAULT FALSE,
    structured_data JSONB NOT NULL,
    summary_text TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Context-Aware Unique Index for Referral Cache:
-- Ensures deterministic caching per patient, clinical fingerprint, referral reason hash, receiving facility, and language
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_summary_context
ON referral_summaries (patient_id, data_fingerprint, md5(referral_reason), receiving_facility, language);

-- ============================================================================
-- 15. SECURITY ACCESS LOGS TABLE
-- Audit log trail (retains audit records even if patient is removed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(100) NOT NULL,
    facility VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    auth_method VARCHAR(100) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient_date ON medical_records(patient_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_facility ON medical_records(facility_id);

CREATE INDEX IF NOT EXISTS idx_prescribed_medicines_patient_status ON prescribed_medicines(patient_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_investigations_patient_date ON lab_investigations(patient_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_record ON medical_documents(patient_id, record_id);

CREATE INDEX IF NOT EXISTS idx_caregivers_user_patient ON caregivers(user_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_referral_summaries_patient_fp ON referral_summaries(patient_id, data_fingerprint);
CREATE INDEX IF NOT EXISTS idx_referral_summaries_latest ON referral_summaries(patient_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_patient_time ON security_access_logs(patient_id, timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_chronic_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_access_logs ENABLE ROW LEVEL SECURITY;

-- 1. Users policies: Users can view and manage their own user profile
CREATE POLICY users_self_access ON users
    FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Facilities policies: Readable by all authenticated users
CREATE POLICY facilities_authenticated_read ON facilities
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Patients policies: Patients can view and edit their own patient record
CREATE POLICY patients_owner_access ON patients
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Caregivers can view patient profile if designated
CREATE POLICY patients_caregiver_read ON patients
    FOR SELECT
    USING (id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid()
    ));

-- 4. Patient Sub-entities policies (Allergies, Conditions, Contacts, Caregivers)
CREATE POLICY patient_allergies_owner_access ON patient_allergies
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY patient_allergies_caregiver_read ON patient_allergies
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY patient_conditions_owner_access ON patient_chronic_conditions
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY patient_conditions_caregiver_read ON patient_chronic_conditions
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY patient_contacts_owner_access ON patient_emergency_contacts
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY patient_contacts_caregiver_read ON patient_emergency_contacts
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid()
    ));

CREATE POLICY caregivers_owner_access ON caregivers
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY caregivers_self_read ON caregivers
    FOR SELECT
    USING (user_id = auth.uid());

-- 5. Healthcare Providers policy: Read-only for authenticated users
CREATE POLICY providers_authenticated_read ON healthcare_providers
    FOR SELECT
    TO authenticated
    USING (true);

-- 6. Medical Records and Clinical Details policies
CREATE POLICY medical_records_owner_access ON medical_records
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY medical_records_caregiver_read ON medical_records
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY medical_records_caregiver_insert ON medical_records
    FOR INSERT
    WITH CHECK (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_upload_records = TRUE
    ));

CREATE POLICY vitals_owner_access ON medical_record_vitals
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY vitals_caregiver_read ON medical_record_vitals
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY medicines_owner_access ON prescribed_medicines
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY medicines_caregiver_read ON prescribed_medicines
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_medicines = TRUE
    ));

CREATE POLICY investigations_owner_access ON lab_investigations
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY investigations_caregiver_read ON lab_investigations
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY medical_documents_owner_access ON medical_documents
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY medical_documents_caregiver_read ON medical_documents
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

CREATE POLICY medical_documents_caregiver_insert ON medical_documents
    FOR INSERT
    WITH CHECK (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_upload_records = TRUE
    ));

-- 7. Referral Summaries policies
CREATE POLICY referral_summaries_owner_access ON referral_summaries
    FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY referral_summaries_caregiver_read ON referral_summaries
    FOR SELECT
    USING (patient_id IN (
        SELECT patient_id FROM caregivers WHERE user_id = auth.uid() AND can_view_records = TRUE
    ));

-- 8. Security Access Logs: Patients can view audit logs for their own account
CREATE POLICY security_logs_owner_read ON security_access_logs
    FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY security_logs_actor_insert ON security_access_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

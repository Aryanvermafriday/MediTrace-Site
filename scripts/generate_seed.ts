import fs from 'fs';
import path from 'path';
import { initialPatient, initialPatientB, initialRecords, initialRecordsPatientB, initialSecurityLogs } from '../src/data/initialDemoData';
import { computeDataFingerprint, buildDeterministicStructuredSummary, formatSummaryToText, getDefaultReferralContext } from '../src/services/aiSummaryService';

console.log('Generating seed SQL for MediTrace demo data...');

// Compute deterministic fingerprints and summaries
const ctxA = getDefaultReferralContext(initialPatient);
const fpA = computeDataFingerprint(initialPatient, initialRecords, ctxA.referralReason, ctxA.referringFacility, ctxA.receivingFacility);
const structHiA = buildDeterministicStructuredSummary(initialPatient, initialRecords, ctxA.referralReason, ctxA.referringFacility, ctxA.receivingFacility, 'hi');
const structEnA = buildDeterministicStructuredSummary(initialPatient, initialRecords, ctxA.referralReason, ctxA.referringFacility, ctxA.receivingFacility, 'en');
const textHiA = formatSummaryToText(structHiA, 'hi');
const textEnA = formatSummaryToText(structEnA, 'en');

const ctxB = getDefaultReferralContext(initialPatientB);
const fpB = computeDataFingerprint(initialPatientB, initialRecordsPatientB, ctxB.referralReason, ctxB.referringFacility, ctxB.receivingFacility);
const structHiB = buildDeterministicStructuredSummary(initialPatientB, initialRecordsPatientB, ctxB.referralReason, ctxB.referringFacility, ctxB.receivingFacility, 'hi');
const structEnB = buildDeterministicStructuredSummary(initialPatientB, initialRecordsPatientB, ctxB.referralReason, ctxB.referringFacility, ctxB.receivingFacility, 'en');
const textHiB = formatSummaryToText(structHiB, 'hi');
const textEnB = formatSummaryToText(structEnB, 'en');

console.log('Patient A Fingerprint:', fpA);
console.log('Patient B Fingerprint:', fpB);

// Helper to escape SQL strings safely
function sqlEscape(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function sqlJson(obj: any): string {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

// Generate the idempotent SQL script
let sql = `-- ============================================================================
-- MediTrace Demo Data Seed Migration
-- Migration: 20260830000001_seed_demo_data.sql
-- Description: Seeds the exact verified demo data for MediTrace into Supabase.
--              Includes:
--              - 5 Healthcare Facilities
--              - 5 Healthcare Providers
--              - 2 Demo Patients (Ramlal Sharma MT-PAT-000001, Priya Patel MT-PAT-000002)
--              - Patient Allergies & Chronic Conditions
--              - Emergency Contacts (with primary constraint compliance)
--              - Caregivers & granular access permissions
--              - 5 Medical Records (4 for Ramlal Sharma, 1 for Priya Patel)
--              - 5 Vitals Records
--              - 5 Prescribed Medicines
--              - 8 Lab Investigations
--              - 5 Medical Document Metadata records
--              - 4 Pre-seeded Referral Summaries (Hindi & English for each patient)
--              - 4 Security Access Audit Logs
--
-- Auth Deferral Notice:
-- Application users extending auth.users are deferred until real Supabase Auth
-- registration occurs. No fake auth.users accounts are created.
-- All patient, caregiver, provider, and document rows use NULL for foreign user_id.
--
-- Idempotency:
-- Uses DO blocks and ON CONFLICT / deterministic WHERE clauses to ensure
-- safe, repeat execution without creating duplicate rows or destroying user data.
-- ============================================================================

DO $$
DECLARE
    -- Deterministic Facility UUIDs
    v_fac_vsc_rampur UUID := '11111111-1111-4111-a111-000000000001'::UUID;
    v_fac_phc_lakhimpur UUID := '11111111-1111-4111-a111-000000000002'::UUID;
    v_fac_dh_varanasi UUID := '11111111-1111-4111-a111-000000000003'::UUID;
    v_fac_chc_shivpur UUID := '11111111-1111-4111-a111-000000000004'::UUID;
    v_fac_tertiary_apex UUID := '11111111-1111-4111-a111-000000000005'::UUID;

    -- Deterministic Provider UUIDs
    v_doc_sunita UUID := '22222222-2222-4222-a222-000000000001'::UUID;
    v_doc_verma UUID := '22222222-2222-4222-a222-000000000002'::UUID;
    v_doc_mukherjee UUID := '22222222-2222-4222-a222-000000000003'::UUID;
    v_doc_neha UUID := '22222222-2222-4222-a222-000000000004'::UUID;
    v_doc_sk_verma UUID := '22222222-2222-4222-a222-000000000005'::UUID;

    -- Deterministic Patient UUIDs
    v_pat_ramlal UUID := '33333333-3333-4333-a333-000000000001'::UUID;
    v_pat_priya UUID := '33333333-3333-4333-a333-000000000002'::UUID;

    -- Deterministic Medical Record UUIDs
    v_rec_001 UUID := '44444444-4444-4444-a444-000000000001'::UUID;
    v_rec_002 UUID := '44444444-4444-4444-a444-000000000002'::UUID;
    v_rec_003 UUID := '44444444-4444-4444-a444-000000000003'::UUID;
    v_rec_004 UUID := '44444444-4444-4444-a444-000000000004'::UUID;
    v_rec_b01 UUID := '44444444-4444-4444-a444-000000000005'::UUID;

BEGIN

    -- ========================================================================
    -- 1. SEED FACILITIES
    -- ========================================================================
    INSERT INTO facilities (id, name, name_hindi, facility_type, district, state)
    VALUES 
    (v_fac_vsc_rampur, 'Village Health Sub-Centre, Rampur', 'ग्राम स्वास्थ्य उप-केंद्र, रामपुर', 'Village Sub-Centre', 'Lakhimpur Kheri', 'Uttar Pradesh'),
    (v_fac_phc_lakhimpur, 'Primary Health Centre (PHC) Lakhimpur', 'प्राथमिक स्वास्थ्य केंद्र लखीमपुर', 'Primary Health Centre', 'Lakhimpur Kheri', 'Uttar Pradesh'),
    (v_fac_dh_varanasi, 'District Hospital, Varanasi', 'जिला अस्पताल, वाराणसी', 'District Hospital', 'Varanasi', 'Uttar Pradesh'),
    (v_fac_chc_shivpur, 'CHC Shivpur Community Health Centre', 'सामुदायिक स्वास्थ्य केंद्र शिवपुर', 'Community Health Centre', 'Varanasi', 'Uttar Pradesh'),
    (v_fac_tertiary_apex, 'Apex Medical College / Tertiary Cardiology Hospital', 'उच्च स्तरीय मेडिकल कॉलेज / अपेक्स कार्डियोलॉजी संस्थान', 'Tertiary Hospital', 'Varanasi', 'Uttar Pradesh')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        name_hindi = EXCLUDED.name_hindi,
        facility_type = EXCLUDED.facility_type,
        district = EXCLUDED.district,
        state = EXCLUDED.state;

    -- ========================================================================
    -- 2. SEED HEALTHCARE PROVIDERS
    -- ========================================================================
    INSERT INTO healthcare_providers (id, facility_id, hpr_id, name, name_hindi, specialization, phone)
    VALUES
    (v_doc_sunita, v_fac_vsc_rampur, 'HPR-CHO-8812', 'Dr. Sunita Sharma', 'डॉ. सुनीता शर्मा', 'Community Health Officer (CHO)', '+91 98765 00001'),
    (v_doc_verma, v_fac_phc_lakhimpur, 'HPR-99214', 'Dr. A. K. Verma', 'डॉ. ए. के. वर्मा', 'Medical Officer (MBBS)', '+91 98999 88776'),
    (v_doc_mukherjee, v_fac_dh_varanasi, 'HPR-CARD-4410', 'Dr. S. K. Mukherjee', 'डॉ. एस. के. मुखर्जी', 'Senior Consultant Physician (MD Medicine)', '+91 98765 00003'),
    (v_doc_neha, v_fac_chc_shivpur, 'HPR-GP-7721', 'Dr. Neha Gupta', 'डॉ. नेहा गुप्ता', 'General Physician', '+91 98765 00004'),
    (v_doc_sk_verma, NULL, 'HPR-FD-1102', 'Dr. S. K. Verma', 'डॉ. एस. के. वर्मा', 'Family Doctor', '+91 98234 56789')
    ON CONFLICT (id) DO UPDATE SET
        facility_id = EXCLUDED.facility_id,
        hpr_id = EXCLUDED.hpr_id,
        name = EXCLUDED.name,
        name_hindi = EXCLUDED.name_hindi,
        specialization = EXCLUDED.specialization,
        phone = EXCLUDED.phone;

    -- ========================================================================
    -- 3. SEED PATIENTS
    -- ========================================================================
    -- Patient A: Ramlal Sharma (MT-PAT-000001 / ABHA-9821-4402-9012)
    INSERT INTO patients (
        id, user_id, meditrace_id, abha_id, abha_address, full_name, full_name_hindi,
        age, gender, gender_hindi, blood_group, phone, masked_phone,
        village, post, district, state, pin_code,
        primary_facility_id, primary_facility_name, primary_facility_name_hindi,
        qr_payload, last_synchronized_at, last_visit_date
    )
    VALUES (
        v_pat_ramlal, NULL, 'MT-PAT-000001', 'ABHA-9821-4402-9012', 'ramlal.sharma@abdm', 'Ramlal Sharma', 'रामलाल शर्मा',
        54, 'Male', 'पुरुष', 'B Positive (B+)', '+91 98765 43210', '+91 XXXXXXX43210',
        'Rampur Village, Post Gola', 'Gola', 'Lakhimpur Kheri', 'Uttar Pradesh', '262802',
        v_fac_phc_lakhimpur, 'PHC Lakhimpur Rural Health Center', 'प्राथमिक स्वास्थ्य केंद्र लखीमपुर',
        'MEDITRACE-PATIENT-MT-PAT-000001-ABHA982144029012-RAMLAL-B+', '2026-08-24 14:35:00+00'::TIMESTAMPTZ, '2026-08-18'::DATE
    )
    ON CONFLICT (meditrace_id) DO UPDATE SET
        abha_id = EXCLUDED.abha_id,
        abha_address = EXCLUDED.abha_address,
        full_name = EXCLUDED.full_name,
        full_name_hindi = EXCLUDED.full_name_hindi,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        gender_hindi = EXCLUDED.gender_hindi,
        blood_group = EXCLUDED.blood_group,
        phone = EXCLUDED.phone,
        masked_phone = EXCLUDED.masked_phone,
        village = EXCLUDED.village,
        post = EXCLUDED.post,
        district = EXCLUDED.district,
        state = EXCLUDED.state,
        primary_facility_id = EXCLUDED.primary_facility_id,
        primary_facility_name = EXCLUDED.primary_facility_name,
        primary_facility_name_hindi = EXCLUDED.primary_facility_name_hindi,
        qr_payload = EXCLUDED.qr_payload,
        last_synchronized_at = EXCLUDED.last_synchronized_at,
        last_visit_date = EXCLUDED.last_visit_date,
        updated_at = NOW();

    -- Patient B: Priya Patel (MT-PAT-000002 / ABHA-4412-8890-1120)
    INSERT INTO patients (
        id, user_id, meditrace_id, abha_id, abha_address, full_name, full_name_hindi,
        age, gender, gender_hindi, blood_group, phone, masked_phone,
        village, post, district, state, pin_code,
        primary_facility_id, primary_facility_name, primary_facility_name_hindi,
        qr_payload, last_synchronized_at, last_visit_date
    )
    VALUES (
        v_pat_priya, NULL, 'MT-PAT-000002', 'ABHA-4412-8890-1120', 'priya.patel@abdm', 'Priya Patel', 'प्रिया पटेल',
        38, 'Female', 'महिला', 'O Positive (O+)', '+91 98111 22334', '+91 XXXXXXX22334',
        'Shivpur, Block 2', 'Shivpur', 'Varanasi', 'Uttar Pradesh', '221003',
        v_fac_chc_shivpur, 'CHC Shivpur Community Health Centre', 'सामुदायिक स्वास्थ्य केंद्र शिवपुर',
        'MEDITRACE-PATIENT-MT-PAT-000002-ABHA441288901120-PRIYA-O+', '2026-08-24 11:15:00+00'::TIMESTAMPTZ, '2026-08-10'::DATE
    )
    ON CONFLICT (meditrace_id) DO UPDATE SET
        abha_id = EXCLUDED.abha_id,
        abha_address = EXCLUDED.abha_address,
        full_name = EXCLUDED.full_name,
        full_name_hindi = EXCLUDED.full_name_hindi,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        gender_hindi = EXCLUDED.gender_hindi,
        blood_group = EXCLUDED.blood_group,
        phone = EXCLUDED.phone,
        masked_phone = EXCLUDED.masked_phone,
        village = EXCLUDED.village,
        post = EXCLUDED.post,
        district = EXCLUDED.district,
        state = EXCLUDED.state,
        primary_facility_id = EXCLUDED.primary_facility_id,
        primary_facility_name = EXCLUDED.primary_facility_name,
        primary_facility_name_hindi = EXCLUDED.primary_facility_name_hindi,
        qr_payload = EXCLUDED.qr_payload,
        last_synchronized_at = EXCLUDED.last_synchronized_at,
        last_visit_date = EXCLUDED.last_visit_date,
        updated_at = NOW();

    -- ========================================================================
    -- 4. SEED PATIENT ALLERGIES
    -- ========================================================================
    -- Clean existing demo allergies for deterministic idempotency
    DELETE FROM patient_allergies WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    INSERT INTO patient_allergies (id, patient_id, allergen_name, allergen_name_hindi, reaction_details, severity)
    VALUES
    ('55555555-5555-4555-a555-000000000001'::UUID, v_pat_ramlal, 'Sulfa Drugs (Sulfonamides)', 'सल्फा दवाइयाँ (सल्फा ड्रग्स) - चेहरे पर सूजन व चकत्ते', 'Causes rash & facial swelling', 'Severe'),
    ('55555555-5555-4555-a555-000000000002'::UUID, v_pat_priya, 'Penicillin', 'पेनिसिलिन (त्वचा पर चकत्ते)', 'Moderate rash', 'Moderate');

    -- ========================================================================
    -- 5. SEED PATIENT CHRONIC CONDITIONS
    -- ========================================================================
    DELETE FROM patient_chronic_conditions WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    INSERT INTO patient_chronic_conditions (id, patient_id, condition_name, condition_name_hindi, diagnosed_duration, status)
    VALUES
    ('66666666-6666-4666-a666-000000000001'::UUID, v_pat_ramlal, 'Type 2 Diabetes Mellitus', 'टाइप-2 डायबिटीज (7 वर्ष)', '7 yrs', 'active'),
    ('66666666-6666-4666-a666-000000000002'::UUID, v_pat_ramlal, 'Essential Hypertension', 'हाई ब्लड प्रेशर (3 वर्ष)', '3 yrs', 'active'),
    ('66666666-6666-4666-a666-000000000003'::UUID, v_pat_ramlal, 'Mild Iron Deficiency Anemia', 'माइल्ड एनीमिया (खून की कमी)', NULL, 'active'),
    ('66666666-6666-4666-a666-000000000004'::UUID, v_pat_priya, 'Hypothyroidism', 'हाइपोथायरायडिज्म (2 वर्ष)', '2 yrs', 'active'),
    ('66666666-6666-4666-a666-000000000005'::UUID, v_pat_priya, 'Migraine', 'माइग्रेन (आधा सीसी सिरदर्द)', NULL, 'active');

    -- ========================================================================
    -- 6. SEED PATIENT EMERGENCY CONTACTS
    -- ========================================================================
    DELETE FROM patient_emergency_contacts WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    INSERT INTO patient_emergency_contacts (id, patient_id, name, relationship, relationship_hindi, phone, is_primary)
    VALUES
    ('77777777-7777-4777-a777-000000000001'::UUID, v_pat_ramlal, 'Ramesh Kumar (Son)', 'Son (पुत्र)', 'पुत्र (बेटा)', '+91 98765 11223', TRUE),
    ('77777777-7777-4777-a777-000000000002'::UUID, v_pat_ramlal, 'Dr. S. K. Verma', 'Family Doctor (डॉक्टर)', 'पारिवारिक डॉक्टर', '+91 98234 56789', FALSE),
    ('77777777-7777-4777-a777-000000000003'::UUID, v_pat_priya, 'Suresh Patel (Husband)', 'Husband (पति)', 'पति', '+91 98111 55667', TRUE);

    -- ========================================================================
    -- 7. SEED CAREGIVERS
    -- ========================================================================
    DELETE FROM caregivers WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    INSERT INTO caregivers (
        id, patient_id, user_id, name, name_hindi, relationship, relationship_hindi, phone,
        is_primary, can_view_records, can_view_medicines, can_view_appointments, can_upload_records, can_edit_full_profile, last_active_at
    )
    VALUES
    (
        '88888888-8888-4888-a888-000000000001'::UUID, v_pat_ramlal, NULL, 'Ramesh Kumar', 'रमेश कुमार', 'Son', 'बेटा (पुत्र)', '+91 98765 11223',
        TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, '2026-08-24 14:15:00+00'::TIMESTAMPTZ
    ),
    (
        '88888888-8888-4888-a888-000000000002'::UUID, v_pat_priya, NULL, 'Suresh Patel', 'सुरेश पटेल', 'Husband', 'पति', '+91 98111 55667',
        TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, '2026-08-24 11:00:00+00'::TIMESTAMPTZ
    );

    -- ========================================================================
    -- 8. SEED MEDICAL RECORDS
    -- ========================================================================
    -- Record 1: rec-001 (Ramlal - Village Sub-Centre)
    INSERT INTO medical_records (
        id, patient_id, facility_id, provider_id, title, record_date,
        facility_name, facility_type, record_type, doctor_name, specialization,
        diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
        is_ai_extracted, is_verified, verified_by, verified_at, confidence_score
    )
    VALUES (
        v_rec_001, v_pat_ramlal, v_fac_vsc_rampur, v_doc_sunita,
        'Initial Evaluation & Blood Pressure Check', '2026-08-04'::DATE,
        'Village Health Sub-Centre, Rampur', 'Village Sub-Centre', 'Prescription',
        'Dr. Sunita Sharma', 'Community Health Officer (CHO)',
        'Essential Hypertension (Newly symptomatic) & Fatigue',
        'Severe morning headache, dizziness while working in farm, mild pedal edema',
        'Advised strict reduction of dietary table salt. Recommended comprehensive blood panel and diabetic workup at PHC Lakhimpur.',
        'Visit PHC Lakhimpur for fasting blood investigations and doctor consultation.',
        TRUE, TRUE, 'Dr. Sunita Sharma (CHO)', '2026-08-04 11:45:00+00'::TIMESTAMPTZ, 97.00
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        record_date = EXCLUDED.record_date,
        facility_name = EXCLUDED.facility_name,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_instructions = EXCLUDED.follow_up_instructions,
        updated_at = NOW();

    -- Record 2: rec-002 (Ramlal - PHC Lakhimpur)
    INSERT INTO medical_records (
        id, patient_id, facility_id, provider_id, title, record_date,
        facility_name, facility_type, record_type, doctor_name, specialization,
        diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
        is_ai_extracted, is_verified, verified_by, verified_at, confidence_score
    )
    VALUES (
        v_rec_002, v_pat_ramlal, v_fac_phc_lakhimpur, v_doc_verma,
        'Diagnostic Lab Investigation Panel', '2026-08-12'::DATE,
        'Primary Health Centre (PHC) Lakhimpur', 'Primary Health Centre', 'Diagnostic',
        'Dr. A. K. Verma', 'Medical Officer (MBBS)',
        'Microcytic Hypochromic Anemia & Uncontrolled Glycemia',
        'Fasting blood investigations ordered by CHO',
        'Mild pallor present. Diabetes poorly controlled on lifestyle alone. Started oral Metformin SR and iron hematinics.',
        'Review after 30 days or earlier if chest heaviness or excessive fatigue occurs.',
        TRUE, TRUE, 'Dr. A. K. Verma (MO)', '2026-08-12 14:30:00+00'::TIMESTAMPTZ, 98.00
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        record_date = EXCLUDED.record_date,
        facility_name = EXCLUDED.facility_name,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_instructions = EXCLUDED.follow_up_instructions,
        updated_at = NOW();

    -- Record 3: rec-003 (Ramlal - District Hospital)
    INSERT INTO medical_records (
        id, patient_id, facility_id, provider_id, title, record_date,
        facility_name, facility_type, record_type, doctor_name, specialization,
        diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
        is_ai_extracted, is_verified, verified_by, verified_at, confidence_score
    )
    VALUES (
        v_rec_003, v_pat_ramlal, v_fac_dh_varanasi, v_doc_mukherjee,
        'Physician Consultation & Cardiology Workup', '2026-08-18'::DATE,
        'District Hospital, Varanasi', 'District Hospital', 'Consultation',
        'Dr. S. K. Mukherjee', 'Senior Consultant Physician (MD Medicine)',
        'Hypertensive Heart Disease / Exertional Angina Equivalents & Statin initiation',
        'Progressive exertional breathlessness and retrosternal heaviness when climbing stairs',
        'Known diabetic & hypertensive. Chest heaviness on exertion. Strict avoidance of Sulfa antibiotics (patient had severe rash previously). Initiated statin therapy. Advised Echocardiogram.',
        'Prepared referral slip to Apex Medical College / Tertiary Cardiology Hospital for 2D-Echocardiography & specialist management.',
        TRUE, TRUE, 'Dr. S. K. Mukherjee (MD)', '2026-08-18 16:10:00+00'::TIMESTAMPTZ, 95.00
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        record_date = EXCLUDED.record_date,
        facility_name = EXCLUDED.facility_name,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_instructions = EXCLUDED.follow_up_instructions,
        updated_at = NOW();

    -- Record 4: rec-004 (Ramlal - District Hospital Referral)
    INSERT INTO medical_records (
        id, patient_id, facility_id, provider_id, title, record_date,
        facility_name, facility_type, record_type, doctor_name, specialization,
        diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
        is_ai_extracted, is_verified, verified_by, verified_at, confidence_score
    )
    VALUES (
        v_rec_004, v_pat_ramlal, v_fac_dh_varanasi, v_doc_mukherjee,
        'Hospital Referral & Care Continuity Slip', '2026-08-23'::DATE,
        'District Hospital, Varanasi', 'District Hospital', 'Referral',
        'Dr. S. K. Mukherjee', 'Senior Consultant Physician',
        'Hypertensive & Diabetic Heart Disease - Referred for 2D-Echo & Cardiology Review',
        'Formal referral packet creation for higher-level cardiology institute',
        'Formal referral issued to Tertiary Institute. Complete portable record packet generated on MediTrace for seamless cross-facility admission.',
        'Present MediTrace ABHA Health Card and AI Referral Summary at Tertiary OPD Desk.',
        TRUE, TRUE, 'Dr. S. K. Mukherjee', '2026-08-23 10:00:00+00'::TIMESTAMPTZ, 99.00
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        record_date = EXCLUDED.record_date,
        facility_name = EXCLUDED.facility_name,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_instructions = EXCLUDED.follow_up_instructions,
        updated_at = NOW();

    -- Record 5: rec-b-001 (Priya - CHC Shivpur)
    INSERT INTO medical_records (
        id, patient_id, facility_id, provider_id, title, record_date,
        facility_name, facility_type, record_type, doctor_name, specialization,
        diagnosis, reason_for_visit, clinical_notes, follow_up_instructions,
        is_ai_extracted, is_verified, verified_by, verified_at, confidence_score
    )
    VALUES (
        v_rec_b01, v_pat_priya, v_fac_chc_shivpur, v_doc_neha,
        'Thyroid Function Evaluation & Follow-up', '2026-08-10'::DATE,
        'CHC Shivpur Community Health Centre', 'Primary Health Centre', 'Prescription',
        'Dr. Neha Gupta', 'General Physician',
        'Primary Hypothyroidism (Euthyroid on therapy)',
        'Routine thyroid dose review and mild morning fatigue',
        'TSH well controlled on 50mcg. Advised to continue current dose. Avoid taking iron or calcium supplements within 4 hours of levothyroxine.',
        'Repeat TSH after 6 months or if fatigue worsens.',
        TRUE, TRUE, 'Dr. Neha Gupta', '2026-08-10 10:30:00+00'::TIMESTAMPTZ, 98.00
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        record_date = EXCLUDED.record_date,
        facility_name = EXCLUDED.facility_name,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_instructions = EXCLUDED.follow_up_instructions,
        updated_at = NOW();

    -- ========================================================================
    -- 9. SEED MEDICAL RECORD VITALS
    -- ========================================================================
    DELETE FROM medical_record_vitals WHERE record_id IN (v_rec_001, v_rec_002, v_rec_003, v_rec_004, v_rec_b01);

    INSERT INTO medical_record_vitals (id, record_id, patient_id, blood_pressure, pulse, temperature, weight, spo2, respiratory_rate, recorded_at)
    VALUES
    ('99999999-9999-4999-a999-000000000001'::UUID, v_rec_001, v_pat_ramlal, '144/92 mmHg', '84 bpm', '98.4 F', '63 kg', '98%', NULL, '2026-08-04 11:45:00+00'::TIMESTAMPTZ),
    ('99999999-9999-4999-a999-000000000002'::UUID, v_rec_002, v_pat_ramlal, '138/88 mmHg', '78 bpm', NULL, '63.5 kg', '98%', NULL, '2026-08-12 14:30:00+00'::TIMESTAMPTZ),
    ('99999999-9999-4999-a999-000000000003'::UUID, v_rec_003, v_pat_ramlal, '142/90 mmHg', '76 bpm', NULL, '64 kg', '97%', NULL, '2026-08-18 16:10:00+00'::TIMESTAMPTZ),
    ('99999999-9999-4999-a999-000000000004'::UUID, v_rec_004, v_pat_ramlal, '136/86 mmHg', '74 bpm', NULL, '64 kg', '98%', NULL, '2026-08-23 10:00:00+00'::TIMESTAMPTZ),
    ('99999999-9999-4999-a999-000000000005'::UUID, v_rec_b01, v_pat_priya, '120/78 mmHg', '72 bpm', '98.2 F', '56 kg', '99%', NULL, '2026-08-10 10:30:00+00'::TIMESTAMPTZ);

    -- ========================================================================
    -- 10. SEED PRESCRIBED MEDICINES
    -- ========================================================================
    DELETE FROM prescribed_medicines WHERE record_id IN (v_rec_001, v_rec_002, v_rec_003, v_rec_004, v_rec_b01);

    INSERT INTO prescribed_medicines (
        id, record_id, patient_id, name, generic_name, dosage, frequency, timing_notes, duration, purpose, status, prescribed_facility, prescribed_date
    )
    VALUES
    (
        'aaaaaaaa-aaaa-4aaa-aaaa-000000000001'::UUID, v_rec_001, v_pat_ramlal,
        'Amlodipine', 'Amlodipine Besylate', '5 mg', '1-0-0 (Once daily morning)',
        'Take in the morning after breakfast with plain water', '30 days',
        'Blood pressure control', 'active', 'Village Health Sub-Centre, Rampur', '2026-08-04'::DATE
    ),
    (
        'aaaaaaaa-aaaa-4aaa-aaaa-000000000002'::UUID, v_rec_002, v_pat_ramlal,
        'Ferrous Ascorbate + Folic Acid', 'Elemental Iron 100mg + Folic Acid 1.5mg', '100 mg / 1.5 mg', '0-0-1 (Once daily night)',
        'Take after dinner. Avoid drinking tea or milk within 2 hours.', '60 days',
        'Iron deficiency anemia management', 'active', 'PHC Lakhimpur', '2026-08-12'::DATE
    ),
    (
        'aaaaaaaa-aaaa-4aaa-aaaa-000000000003'::UUID, v_rec_002, v_pat_ramlal,
        'Metformin Hydrochloride SR', 'Metformin 500mg Sustained Release', '500 mg', '1-0-1 (Twice daily with meals)',
        'Take immediately after morning and evening meals', '30 days',
        'Type 2 Diabetes regulation', 'active', 'PHC Lakhimpur', '2026-08-12'::DATE
    ),
    (
        'aaaaaaaa-aaaa-4aaa-aaaa-000000000004'::UUID, v_rec_003, v_pat_ramlal,
        'Atorvastatin', 'Atorvastatin Calcium', '10 mg', '0-0-1 (Once daily night)',
        'Take after dinner at bedtime', '90 days',
        'Cardiovascular risk reduction & cholesterol control', 'active', 'District Hospital, Varanasi', '2026-08-18'::DATE
    ),
    (
        'aaaaaaaa-aaaa-4aaa-aaaa-000000000005'::UUID, v_rec_b01, v_pat_priya,
        'Thyroxine Sodium (Levothyroxine)', 'Levothyroxine Sodium 50mcg', '50 mcg', '1-0-0 (Once daily empty stomach)',
        'Take early morning with plain water at least 45 minutes before breakfast', '90 days',
        'Thyroid hormone replacement', 'active', 'CHC Shivpur', '2026-08-10'::DATE
    );

    -- ========================================================================
    -- 11. SEED LAB INVESTIGATIONS
    -- ========================================================================
    DELETE FROM lab_investigations WHERE record_id IN (v_rec_001, v_rec_002, v_rec_003, v_rec_004, v_rec_b01);

    INSERT INTO lab_investigations (
        id, record_id, patient_id, test_name, result, normal_range, unit, status, test_date, facility
    )
    VALUES
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000001'::UUID, v_rec_001, v_pat_ramlal, 'Random Blood Sugar (Fingerstick)', '182', '70 - 140', 'mg/dL', 'High', '2026-08-04'::DATE, 'Village Health Sub-Centre, Rampur'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000002'::UUID, v_rec_002, v_pat_ramlal, 'Hemoglobin (Hb)', '10.2', '13.0 - 17.0', 'g/dL', 'Low', '2026-08-12'::DATE, 'PHC Lakhimpur'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000003'::UUID, v_rec_002, v_pat_ramlal, 'Fasting Blood Sugar (FBS)', '148', '70 - 100', 'mg/dL', 'High', '2026-08-12'::DATE, 'PHC Lakhimpur'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000004'::UUID, v_rec_002, v_pat_ramlal, 'HbA1c (Glycated Hemoglobin)', '7.8', '< 5.7', '%', 'High', '2026-08-12'::DATE, 'PHC Lakhimpur'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000005'::UUID, v_rec_002, v_pat_ramlal, 'Serum Creatinine', '0.9', '0.7 - 1.2', 'mg/dL', 'Normal', '2026-08-12'::DATE, 'PHC Lakhimpur'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000006'::UUID, v_rec_003, v_pat_ramlal, '12-Lead Electrocardiogram (ECG)', 'Sinus Rhythm, HR 76, Mild non-specific ST-T changes in V4-V6', 'Normal Sinus', '', 'Borderline', '2026-08-18'::DATE, 'District Hospital, Varanasi'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000007'::UUID, v_rec_003, v_pat_ramlal, 'Total Cholesterol', '218', '< 200', 'mg/dL', 'High', '2026-08-18'::DATE, 'District Hospital, Varanasi'),
    ('bbbbbbbb-bbbb-4bbb-abbb-000000000008'::UUID, v_rec_b01, v_pat_priya, 'Thyroid Stimulating Hormone (TSH)', '2.4', '0.4 - 4.2', 'mIU/L', 'Normal', '2026-08-10'::DATE, 'CHC Shivpur');

    -- ========================================================================
    -- 12. SEED MEDICAL DOCUMENTS METADATA
    -- ========================================================================
    DELETE FROM medical_documents WHERE record_id IN (v_rec_001, v_rec_002, v_rec_003, v_rec_004, v_rec_b01);

    INSERT INTO medical_documents (
        id, record_id, patient_id, file_name, storage_path, mime_type, file_size_bytes, document_type, uploaded_by_user_id
    )
    VALUES
    (
        'cccccccc-cccc-4ccc-accc-000000000001'::UUID, v_rec_001, v_pat_ramlal,
        'Prescription_Village_SubCentre_04Aug.jpg', 'patients/MT-PAT-000001/records/rec-001/Prescription_Village_SubCentre_04Aug.jpg',
        'image/jpeg', 245760, 'prescription_scan', NULL
    ),
    (
        'cccccccc-cccc-4ccc-accc-000000000002'::UUID, v_rec_002, v_pat_ramlal,
        'PHC_Lab_Report_12Aug2026.pdf', 'patients/MT-PAT-000001/records/rec-002/PHC_Lab_Report_12Aug2026.pdf',
        'application/pdf', 512000, 'lab_report', NULL
    ),
    (
        'cccccccc-cccc-4ccc-accc-000000000003'::UUID, v_rec_003, v_pat_ramlal,
        'District_Hospital_Consult_18Aug.jpg', 'patients/MT-PAT-000001/records/rec-003/District_Hospital_Consult_18Aug.jpg',
        'image/jpeg', 315400, 'consultation_slip', NULL
    ),
    (
        'cccccccc-cccc-4ccc-accc-000000000004'::UUID, v_rec_004, v_pat_ramlal,
        'Referral_Slip_TertiaryCare_23Aug.pdf', 'patients/MT-PAT-000001/records/rec-004/Referral_Slip_TertiaryCare_23Aug.pdf',
        'application/pdf', 188400, 'referral_slip', NULL
    ),
    (
        'cccccccc-cccc-4ccc-accc-000000000005'::UUID, v_rec_b01, v_pat_priya,
        'Thyroid_Prescription_CHC_Shivpur.pdf', 'patients/MT-PAT-000002/records/rec-b-001/Thyroid_Prescription_CHC_Shivpur.pdf',
        'application/pdf', 320000, 'prescription_scan', NULL
    );

    -- ========================================================================
    -- 13. SEED REFERRAL SUMMARIES (EXACT DETERMINISTIC DEMO SUMMARIES)
    -- ========================================================================
    DELETE FROM referral_summaries WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    -- Patient A (Ramlal Sharma) - Hindi
    INSERT INTO referral_summaries (
        id, patient_id, data_fingerprint, referral_reason, referring_facility, receiving_facility,
        language, source, is_outdated, structured_data, summary_text, generated_at, updated_at
    )
    VALUES (
        'dddddddd-dddd-4ddd-addd-000000000001'::UUID,
        v_pat_ramlal,
        ${sqlEscape(fpA)},
        ${sqlEscape(ctxA.referralReason)},
        ${sqlEscape(ctxA.referringFacility)},
        ${sqlEscape(ctxA.receivingFacility)},
        'hi',
        'instant_cache',
        FALSE,
        ${sqlJson(structHiA)},
        ${sqlEscape(textHiA)},
        '2026-08-24 14:35:00+00'::TIMESTAMPTZ,
        '2026-08-24 14:35:00+00'::TIMESTAMPTZ
    );

    -- Patient A (Ramlal Sharma) - English
    INSERT INTO referral_summaries (
        id, patient_id, data_fingerprint, referral_reason, referring_facility, receiving_facility,
        language, source, is_outdated, structured_data, summary_text, generated_at, updated_at
    )
    VALUES (
        'dddddddd-dddd-4ddd-addd-000000000002'::UUID,
        v_pat_ramlal,
        ${sqlEscape(fpA)},
        ${sqlEscape(ctxA.referralReason)},
        ${sqlEscape(ctxA.referringFacility)},
        ${sqlEscape(ctxA.receivingFacility)},
        'en',
        'instant_cache',
        FALSE,
        ${sqlJson(structEnA)},
        ${sqlEscape(textEnA)},
        '2026-08-24 14:35:00+00'::TIMESTAMPTZ,
        '2026-08-24 14:35:00+00'::TIMESTAMPTZ
    );

    -- Patient B (Priya Patel) - Hindi
    INSERT INTO referral_summaries (
        id, patient_id, data_fingerprint, referral_reason, referring_facility, receiving_facility,
        language, source, is_outdated, structured_data, summary_text, generated_at, updated_at
    )
    VALUES (
        'dddddddd-dddd-4ddd-addd-000000000003'::UUID,
        v_pat_priya,
        ${sqlEscape(fpB)},
        ${sqlEscape(ctxB.referralReason)},
        ${sqlEscape(ctxB.referringFacility)},
        ${sqlEscape(ctxB.receivingFacility)},
        'hi',
        'instant_cache',
        FALSE,
        ${sqlJson(structHiB)},
        ${sqlEscape(textHiB)},
        '2026-08-24 11:15:00+00'::TIMESTAMPTZ,
        '2026-08-24 11:15:00+00'::TIMESTAMPTZ
    );

    -- Patient B (Priya Patel) - English
    INSERT INTO referral_summaries (
        id, patient_id, data_fingerprint, referral_reason, referring_facility, receiving_facility,
        language, source, is_outdated, structured_data, summary_text, generated_at, updated_at
    )
    VALUES (
        'dddddddd-dddd-4ddd-addd-000000000004'::UUID,
        v_pat_priya,
        ${sqlEscape(fpB)},
        ${sqlEscape(ctxB.referralReason)},
        ${sqlEscape(ctxB.referringFacility)},
        ${sqlEscape(ctxB.receivingFacility)},
        'en',
        'instant_cache',
        FALSE,
        ${sqlJson(structEnB)},
        ${sqlEscape(textEnB)},
        '2026-08-24 11:15:00+00'::TIMESTAMPTZ,
        '2026-08-24 11:15:00+00'::TIMESTAMPTZ
    );

    -- ========================================================================
    -- 14. SEED SECURITY ACCESS LOGS
    -- ========================================================================
    DELETE FROM security_access_logs WHERE patient_id IN (v_pat_ramlal, v_pat_priya);

    INSERT INTO security_access_logs (
        id, patient_id, actor_user_id, actor_name, actor_role, facility, action, details, auth_method, timestamp
    )
    VALUES
    (
        'eeeeeeee-eeee-4eee-aeee-000000000001'::UUID, v_pat_ramlal, NULL,
        'Ramesh Kumar (Caregiver)', 'Authorized Caregiver', 'MediTrace Web App',
        'Offline Packet Cache Refresh', 'Encrypted local cache synchronized with latest ABHA records.',
        'Email/password session', '2026-08-24 14:35:00+00'::TIMESTAMPTZ
    ),
    (
        'eeeeeeee-eeee-4eee-aeee-000000000002'::UUID, v_pat_ramlal, NULL,
        'Dr. S. K. Mukherjee (MD)', 'Senior Consultant Physician', 'District Hospital, Varanasi',
        'Referral Slip Creation & Timeline Export', 'Generated continuity-of-care summary for tertiary cardiology referral.',
        'HPR Doctor ID: HPR-99214', '2026-08-23 10:05:00+00'::TIMESTAMPTZ
    ),
    (
        'eeeeeeee-eeee-4eee-aeee-000000000003'::UUID, v_pat_ramlal, NULL,
        'Dr. S. K. Mukherjee (MD)', 'Senior Consultant Physician', 'District Hospital, Varanasi',
        'Record View & Medication Addition', 'Reviewed PHC lab reports and added Atorvastatin 10mg.',
        'HPR Doctor ID: HPR-99214', '2026-08-18 15:40:00+00'::TIMESTAMPTZ
    ),
    (
        'eeeeeeee-eeee-4eee-aeee-000000000004'::UUID, v_pat_ramlal, NULL,
        'Dr. A. K. Verma (MO)', 'Medical Officer', 'PHC Lakhimpur Rural Health Center',
        'Lab Results Upload & Verification', 'Uploaded Fasting Sugar (148), HbA1c (7.8%), Hb (10.2).',
        'Facility Token: PHC-LK-440', '2026-08-12 14:15:00+00'::TIMESTAMPTZ
    );

END $$;
`;

const outputPath = path.join(process.cwd(), 'supabase', 'migrations', '20260830000001_seed_demo_data.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log('Successfully generated:', outputPath);

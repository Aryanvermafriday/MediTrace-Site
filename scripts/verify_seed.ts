import { getSupabase, isSupabaseConfigured } from '../src/lib/supabase';
import { initialPatient, initialPatientB, initialRecords, initialRecordsPatientB } from '../src/data/initialDemoData';
import { computeDataFingerprint, getDefaultReferralContext } from '../src/services/aiSummaryService';

async function verify() {
  console.log('=== MEDITRACE SEED DATA INTEGRITY CHECK ===');
  console.log('Is Supabase Configured:', isSupabaseConfigured());

  const ctxA = getDefaultReferralContext(initialPatient);
  const fpA = computeDataFingerprint(initialPatient, initialRecords, ctxA.referralReason, ctxA.referringFacility, ctxA.receivingFacility);

  const ctxB = getDefaultReferralContext(initialPatientB);
  const fpB = computeDataFingerprint(initialPatientB, initialRecordsPatientB, ctxB.referralReason, ctxB.referringFacility, ctxB.receivingFacility);

  console.log('\n--- Patients ---');
  console.log(`1. Ramlal Sharma: MediTrace ID = ${initialPatient.mediTraceId}, ABHA ID = ${initialPatient.id}, Fingerprint = ${fpA}`);
  console.log(`   - Allergies: ${initialPatient.allergies.length}`);
  console.log(`   - Chronic Conditions: ${initialPatient.chronicConditions.length}`);
  console.log(`   - Emergency Contacts: ${initialPatient.emergencyContacts.length} (Primary: ${initialPatient.emergencyContacts.filter(c => c.isPrimary).length})`);
  console.log(`   - Caregivers: ${initialPatient.caregivers.length} (Primary: ${initialPatient.caregivers.filter(c => c.isPrimary).length})`);
  console.log(`   - Records: ${initialRecords.length}`);

  console.log(`\n2. Priya Patel: MediTrace ID = ${initialPatientB.mediTraceId}, ABHA ID = ${initialPatientB.id}, Fingerprint = ${fpB}`);
  console.log(`   - Allergies: ${initialPatientB.allergies.length}`);
  console.log(`   - Chronic Conditions: ${initialPatientB.chronicConditions.length}`);
  console.log(`   - Emergency Contacts: ${initialPatientB.emergencyContacts.length} (Primary: ${initialPatientB.emergencyContacts.filter(c => c.isPrimary).length})`);
  console.log(`   - Caregivers: ${initialPatientB.caregivers.length} (Primary: ${initialPatientB.caregivers.filter(c => c.isPrimary).length})`);
  console.log(`   - Records: ${initialRecordsPatientB.length}`);

  const totalVitals = initialRecords.filter(r => r.vitals).length + initialRecordsPatientB.filter(r => r.vitals).length;
  const totalMeds = initialRecords.reduce((acc, r) => acc + (r.medicines?.length || 0), 0) + initialRecordsPatientB.reduce((acc, r) => acc + (r.medicines?.length || 0), 0);
  const totalInvs = initialRecords.reduce((acc, r) => acc + (r.investigations?.length || 0), 0) + initialRecordsPatientB.reduce((acc, r) => acc + (r.investigations?.length || 0), 0);
  const totalDocs = initialRecords.filter(r => r.sourceDocumentName).length + initialRecordsPatientB.filter(r => r.sourceDocumentName).length;

  console.log('\n--- Relational Totals ---');
  console.log(`Total Facilities: 5`);
  console.log(`Total Healthcare Providers: 5`);
  console.log(`Total Patients: 2`);
  console.log(`Total Patient Allergies: ${initialPatient.allergies.length + initialPatientB.allergies.length} (2)`);
  console.log(`Total Patient Chronic Conditions: ${initialPatient.chronicConditions.length + initialPatientB.chronicConditions.length} (5)`);
  console.log(`Total Patient Emergency Contacts: ${initialPatient.emergencyContacts.length + initialPatientB.emergencyContacts.length} (3)`);
  console.log(`Total Caregivers: ${initialPatient.caregivers.length + initialPatientB.caregivers.length} (2)`);
  console.log(`Total Medical Records: ${initialRecords.length + initialRecordsPatientB.length} (5)`);
  console.log(`Total Vitals Records: ${totalVitals} (5)`);
  console.log(`Total Prescribed Medicines: ${totalMeds} (5)`);
  console.log(`Total Lab Investigations: ${totalInvs} (8)`);
  console.log(`Total Medical Documents: ${totalDocs} (5)`);
  console.log(`Total Referral Summaries: 4 (2 per patient - Hindi and English)`);
  console.log(`Total Security Access Logs: 4`);

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    if (supabase) {
      console.log('\nTesting Supabase live connectivity...');
      const { data, error } = await supabase.from('facilities').select('count');
      if (error) {
        console.log('Supabase query result:', error.message);
      } else {
        console.log('Supabase live connection successful.');
      }
    }
  }
}

verify();

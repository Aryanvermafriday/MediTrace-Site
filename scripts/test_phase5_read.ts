import { patientDataService } from '../src/services/patientDataService';

async function testPhase5Read() {
  console.log('====================================================');
  console.log('PHASE 5A READ-ONLY VALIDATION TEST');
  console.log('====================================================');

  console.log('\n--- 1. Testing Patient A (Ramlal Sharma: MT-PAT-000001) ---');
  const patientA = await patientDataService.fetchPatientProfile('MT-PAT-000001');
  const recordsA = await patientDataService.fetchPatientRecords('MT-PAT-000001');

  console.log('Patient A Loaded:');
  console.log(`- Name: ${patientA?.name} (${patientA?.nameHindi})`);
  console.log(`- MediTrace ID: ${patientA?.mediTraceId}`);
  console.log(`- ABHA ID: ${patientA?.id}`);
  console.log(`- Age/Gender: ${patientA?.age} / ${patientA?.gender}`);
  console.log(`- Facility: ${patientA?.primaryFacility}`);
  console.log(`- Allergies (${patientA?.allergies?.length}):`, patientA?.allergies);
  console.log(`- Chronic Conditions (${patientA?.chronicConditions?.length}):`, patientA?.chronicConditions);
  console.log(`- Emergency Contacts (${patientA?.emergencyContacts?.length}):`, patientA?.emergencyContacts?.map(c => `${c.name} (${c.relationship})`));
  console.log(`- Caregivers (${patientA?.caregivers?.length}):`, patientA?.caregivers?.map(cg => `${cg.name} (${cg.relationship})`));
  console.log(`- Medical Records Count: ${recordsA.length}`);
  recordsA.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ID: ${r.id} | Date: ${r.recordDate} | ${r.title} | Facility: ${r.facility} | Meds: ${r.medicines.length} | Labs: ${r.investigations.length}`);
  });

  console.log('\n--- 2. Testing Patient B (Priya Patel: MT-PAT-000002) ---');
  const patientB = await patientDataService.fetchPatientProfile('MT-PAT-000002');
  const recordsB = await patientDataService.fetchPatientRecords('MT-PAT-000002');

  console.log('Patient B Loaded:');
  console.log(`- Name: ${patientB?.name} (${patientB?.nameHindi})`);
  console.log(`- MediTrace ID: ${patientB?.mediTraceId}`);
  console.log(`- ABHA ID: ${patientB?.id}`);
  console.log(`- Age/Gender: ${patientB?.age} / ${patientB?.gender}`);
  console.log(`- Facility: ${patientB?.primaryFacility}`);
  console.log(`- Allergies (${patientB?.allergies?.length}):`, patientB?.allergies);
  console.log(`- Chronic Conditions (${patientB?.chronicConditions?.length}):`, patientB?.chronicConditions);
  console.log(`- Emergency Contacts (${patientB?.emergencyContacts?.length}):`, patientB?.emergencyContacts?.map(c => `${c.name} (${c.relationship})`));
  console.log(`- Caregivers (${patientB?.caregivers?.length}):`, patientB?.caregivers?.map(cg => `${cg.name} (${cg.relationship})`));
  console.log(`- Medical Records Count: ${recordsB.length}`);
  recordsB.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ID: ${r.id} | Date: ${r.recordDate} | ${r.title} | Facility: ${r.facility} | Meds: ${r.medicines.length} | Labs: ${r.investigations.length}`);
  });

  console.log('\n--- 3. Validation Assertions ---');
  const assertions = [
    { label: 'Patient A exists', pass: Boolean(patientA) },
    { label: 'Patient A ID is MT-PAT-000001', pass: patientA?.mediTraceId === 'MT-PAT-000001' },
    { label: 'Patient A records count is 4', pass: recordsA.length === 4 },
    { label: 'Patient B exists', pass: Boolean(patientB) },
    { label: 'Patient B ID is MT-PAT-000002', pass: patientB?.mediTraceId === 'MT-PAT-000002' },
    { label: 'Patient B records count is 1', pass: recordsB.length === 1 },
  ];

  assertions.forEach(a => {
    console.log(`${a.pass ? '✅ PASS' : '❌ FAIL'}: ${a.label}`);
  });

  const allPass = assertions.every(a => a.pass);
  console.log(`\nOVERALL TEST RESULT: ${allPass ? 'ALL TESTS PASSED' : 'TESTS FAILED'}`);
}

testPhase5Read().catch(console.error);

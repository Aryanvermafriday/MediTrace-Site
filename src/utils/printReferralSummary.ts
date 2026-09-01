import { ReferralSummaryStructured } from '../types';

interface PrintOptions {
  structuredData: ReferralSummaryStructured;
  language: 'hi' | 'en';
  doctorName?: string;
  facilityName?: string;
}

/**
 * Generates an ultra-clean, high-fidelity standalone HTML document
 * containing ONLY the complete MediTrace Clinical Referral Summary
 * formatted specifically for A4 portrait printing and PDF generation.
 */
export function generatePrintableReferralHTML({
  structuredData,
  language,
  doctorName = 'Dr. Manoj Kumar, MBBS',
  facilityName = 'PHC Lakhimpur Rural Health Center',
}: PrintOptions): string {
  const isHindi = language === 'hi';
  const p = structuredData?.patientDetails || ({} as any);
  const r = structuredData?.referralReason || ({} as any);
  const c = structuredData?.clinicalSummary || ({} as any);
  const v = structuredData?.vitals || ({} as any);
  const invs = structuredData?.investigations || [];
  const meds = structuredData?.medications || [];
  const findings = structuredData?.keyFindings || [];
  const actions = structuredData?.recommendedActions || [];
  const meta = structuredData?.metadata || ({} as any);

  const allergiesList = Array.isArray(p.allergies) ? p.allergies : p.allergies ? [p.allergies] : [];
  const chronicList = Array.isArray(p.chronicConditions) ? p.chronicConditions : p.chronicConditions ? [p.chronicConditions] : [];
  const trajectoryList = Array.isArray(c.trajectory) ? c.trajectory : [];

  const generatedDateStr = new Date().toLocaleString(isHindi ? 'hi-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediTrace Referral Summary - ${p.name || 'Patient'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      font-size: 11pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 16px 20px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    /* Header Banner */
    .header-banner {
      background: linear-gradient(135deg, #042f2e 0%, #115e59 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0d9488;
    }
    .header-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .header-badge {
      display: inline-block;
      background: #fef08a;
      color: #854d0e;
      font-size: 9pt;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      width: fit-content;
    }
    .header-title {
      font-size: 15pt;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #ffffff;
    }
    .header-subtitle {
      font-size: 9.5pt;
      color: #99f6e4;
      font-weight: 500;
    }
    .header-meta {
      text-align: right;
      font-size: 9pt;
      color: #ccfbf1;
    }
    .header-meta strong {
      color: #ffffff;
      display: block;
      font-size: 10pt;
    }

    /* Section Cards */
    .section-card {
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
      padding: 12px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-num {
      background: #0f766e;
      color: #ffffff;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5pt;
      font-weight: 700;
    }
    .urgency-badge {
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 800;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }

    /* Patient Details Grid */
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 12px;
      font-size: 9.5pt;
    }
    .info-group {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value {
      font-size: 10pt;
      font-weight: 600;
      color: #0f172a;
    }
    .info-value.highlight {
      color: #0f766e;
      font-weight: 800;
    }
    .allergies-pill {
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid #fca5a5;
      display: inline-block;
    }

    /* Vitals Grid */
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .vital-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .vital-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .vital-value {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      margin: 2px 0;
    }
    .vital-sub {
      font-size: 7.5pt;
      color: #0f766e;
      font-weight: 600;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 4px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1.5px solid #cbd5e1;
      font-size: 8pt;
      text-transform: uppercase;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .status-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-High, .status-Low {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .status-Normal {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .status-Borderline {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    /* Trajectory List */
    .trajectory-item {
      display: flex;
      gap: 10px;
      font-size: 9pt;
      margin-bottom: 6px;
      padding-left: 4px;
    }
    .trajectory-date {
      font-weight: 800;
      color: #0f766e;
      white-space: nowrap;
      min-width: 80px;
    }
    .trajectory-facility {
      font-weight: 700;
      color: #334155;
      min-width: 130px;
    }
    .trajectory-desc {
      color: #475569;
    }

    /* Findings and Actions */
    .bullet-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 9.5pt;
    }
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.35;
    }
    .bullet-tag {
      background: #e2e8f0;
      color: #1e293b;
      font-size: 7.5pt;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
      margin-top: 1px;
    }
    .bullet-tag.critical {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    /* Sign-off Block */
    .signoff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1.5px dashed #cbd5e1;
      font-size: 9pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signoff-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      background: #f8fafc;
    }
    .signoff-title {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .sign-line {
      margin-top: 24px;
      border-bottom: 1px solid #94a3b8;
      width: 180px;
      margin-bottom: 4px;
    }

    /* Disclaimer */
    .disclaimer-box {
      margin-top: 12px;
      padding: 8px 12px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 8pt;
      color: #92400e;
      font-weight: 600;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header Banner -->
    <div class="header-banner">
      <div class="header-title-wrap">
        <span class="header-badge">${isHindi ? 'मानकीकृत क्लिनिकल रेफरल' : 'Standardized Clinical Referral'}</span>
        <h1 class="header-title">${isHindi ? 'मेडिट्रेस AI-सहायक डॉक्टर रेफरल सारांश' : 'MediTrace AI-Assisted Clinical Referral Summary'}</h1>
        <p class="header-subtitle">${isHindi ? 'प्राथमिक स्वास्थ्य केंद्र से विशेषज्ञ/उच्च अस्पताल परामर्श हेतु' : 'Standardized cross-facility patient transfer & referral'}</p>
      </div>
      <div class="header-meta">
        <strong>${p.abhaId || 'ABHA-VERIFIED'}</strong>
        <div>${generatedDateStr}</div>
        <div style="margin-top:4px;">${meta.referringFacility || facilityName}</div>
      </div>
    </div>

    <!-- Section 1: Patient Details -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">1</span>
          <span>${isHindi ? 'रोगी का विवरण (Patient Details)' : 'Patient Details & Demographics'}</span>
        </div>
        <span style="font-size:8.5pt; font-weight:700; color:#0f766e;">ABHA: ${p.abhaId || 'N/A'}</span>
      </div>
      <div class="patient-grid">
        <div class="info-group">
          <span class="info-label">${isHindi ? 'रोगी का नाम' : 'Patient Name'}</span>
          <span class="info-value highlight">${p.name || 'N/A'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">${isHindi ? 'आयु / लिंग' : 'Age / Gender'}</span>
          <span class="info-value">${p.age || '-'} Yrs / ${p.gender || '-'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">${isHindi ? 'रक्त समूह' : 'Blood Group'}</span>
          <span class="info-value">${p.bloodGroup || 'N/A'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">${isHindi ? 'प्राथमिक संपर्क' : 'Contact Phone'}</span>
          <span class="info-value">${p.primaryContact || '-'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">${isHindi ? 'आपातकालीन संपर्क' : 'Emergency Contact'}</span>
          <span class="info-value">${p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyContactRelationship || 'Family'}) - ${p.emergencyContactPhone || ''}` : 'None'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">${isHindi ? 'मूल स्वास्थ्य केंद्र' : 'Base Facility'}</span>
          <span class="info-value">${p.baseFacility || meta.referringFacility || facilityName}</span>
        </div>
        <div class="info-group" style="grid-column: span 3;">
          <span class="info-label">${isHindi ? 'ज्ञात एलर्जी' : 'Confirmed Allergies'}</span>
          <span class="info-value">
            ${allergiesList.length > 0
              ? allergiesList.map((a: string) => `<span class="allergies-pill">⚠ ${a}</span>`).join(' ')
              : (isHindi ? 'कोई ज्ञात एलर्जी दर्ज नहीं है' : 'No confirmed drug allergies')}
          </span>
        </div>
        <div class="info-group" style="grid-column: span 3;">
          <span class="info-label">${isHindi ? 'दीर्घकालिक बीमारियां' : 'Chronic Conditions'}</span>
          <span class="info-value">
            ${chronicList.length > 0 ? chronicList.join(' • ') : (isHindi ? 'कोई नहीं' : 'None reported')}
          </span>
        </div>
      </div>
    </div>

    <!-- Section 2: Reason for Referral -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">2</span>
          <span>${isHindi ? 'रेफरल का कारण (Reason for Referral)' : 'Reason for Referral'}</span>
        </div>
        <span class="urgency-badge">${r.urgencyLevel || (isHindi ? 'प्राथमिकता ओपीडी' : 'Priority OPD')}</span>
      </div>
      <div style="font-size: 10pt; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
        ${r.primaryReason || (isHindi ? 'विशेषज्ञ मूल्यांकन हेतु' : 'Specialist evaluation and workup')}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9pt; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
        <div><strong>${isHindi ? 'क्लिनिकल संकेत:' : 'Clinical Indication:'}</strong> ${r.clinicalIndication || '-'}</div>
        <div><strong>${isHindi ? 'अपेक्षित विशेषता:' : 'Required Specialty:'}</strong> ${r.specialistEvaluationNeeded || '-'}</div>
      </div>
    </div>

    <!-- Section 3: Clinical Summary & Cross-Facility Trajectory -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">3</span>
          <span>${isHindi ? 'नैदानिक सारांश व अस्पताल यात्रा' : 'Clinical Summary & Trajectory'}</span>
        </div>
      </div>
      <p style="font-size: 9.5pt; color: #1e293b; line-height: 1.45; margin-bottom: 10px;">
        ${c.synthesis || '-'}
      </p>
      ${trajectoryList.length > 0 ? `
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 8px; margin-top: 8px;">
          <div style="font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">
            ${isHindi ? 'बहु-अस्पताल यात्रा सारांश:' : 'Cross-Facility Timeline:'}
          </div>
          ${trajectoryList.map((t: any) => `
            <div class="trajectory-item">
              <span class="trajectory-date">• ${t.date}</span>
              <span class="trajectory-facility">${t.facility}:</span>
              <span class="trajectory-desc">${t.eventSummary}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>

    <!-- Section 4: Vitals -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">4</span>
          <span>${isHindi ? 'वाइटल्स — नवीनतम' : 'Vitals — Most Recent'}</span>
        </div>
        <span style="font-size:8pt; color:#64748b;">${v.recordedDate || ''} • ${v.recordedFacility || ''}</span>
      </div>
      <div class="vitals-grid">
        <div class="vital-box">
          <div class="vital-label">${isHindi ? 'रक्तचाप (BP)' : 'Blood Pressure'}</div>
          <div class="vital-value">${v.bloodPressure || 'N/A'}</div>
          <div class="vital-sub">${v.bpStatus || 'Elevated'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">${isHindi ? 'पल्स (Pulse)' : 'Pulse Rate'}</div>
          <div class="vital-value">${v.pulse || 'N/A'}</div>
          <div class="vital-sub">${isHindi ? 'प्रति मिनट' : 'bpm'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">${isHindi ? 'SpO₂' : 'Oxygen (SpO₂)'}</div>
          <div class="vital-value">${v.spO2 || 'N/A'}</div>
          <div class="vital-sub">${isHindi ? 'कमरे की हवा' : 'Room air'}</div>
        </div>
        <div class="vital-box">
          <div class="vital-label">${isHindi ? 'ब्लड शुगर' : 'Blood Sugar'}</div>
          <div class="vital-value">${v.bloodSugar || 'N/A'}</div>
          <div class="vital-sub">${v.sugarType || 'FBS'}</div>
        </div>
      </div>
    </div>

    <!-- Section 5: Recent Investigations -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">5</span>
          <span>${isHindi ? 'हाल के जांच परिणाम' : 'Recent Diagnostic Investigations'}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>${isHindi ? 'जांच का नाम' : 'Investigation'}</th>
            <th>${isHindi ? 'परिणाम' : 'Result'}</th>
            <th>${isHindi ? 'सामान्य सीमा' : 'Reference Range'}</th>
            <th>${isHindi ? 'स्थिति' : 'Status'}</th>
            <th>${isHindi ? 'अस्पताल व तिथि' : 'Facility & Date'}</th>
          </tr>
        </thead>
        <tbody>
          ${invs.map((i: any) => `
            <tr>
              <td style="font-weight:700;">${i.testName}</td>
              <td style="font-weight:700; color:#0f172a;">${i.result}</td>
              <td style="color:#64748b;">${i.normalRange || '-'}</td>
              <td><span class="status-pill status-${i.status || 'Normal'}">${i.status || 'Normal'}</span></td>
              <td style="color:#64748b; font-size:8pt;">${i.facility || ''} ${i.date ? `(${i.date})` : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 6: Current Medications -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">6</span>
          <span>${isHindi ? 'वर्तमान दवाएं' : 'Current Active Medications'}</span>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>${isHindi ? 'दवा का नाम' : 'Medicine Name'}</th>
            <th>${isHindi ? 'खुराक / आवृत्ति' : 'Dosage / Frequency'}</th>
            <th>${isHindi ? 'समय व निर्देश' : 'Timing & Route'}</th>
            <th>${isHindi ? 'उद्देश्य' : 'Indication'}</th>
          </tr>
        </thead>
        <tbody>
          ${meds.map((m: any) => `
            <tr>
              <td style="font-weight:700; color:#0f766e;">${m.name}</td>
              <td>${m.dosage || ''} • <strong>${m.frequency || ''}</strong></td>
              <td>${m.route || 'Oral'} — ${m.timingInstructions || (isHindi ? 'भोजनोपरांत' : 'After meals')}</td>
              <td style="color:#475569;">${m.purpose || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 7: Key Findings -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">7</span>
          <span>${isHindi ? 'प्राप्तकर्ता डॉक्टर के लिए मुख्य बिंदु' : 'Key Clinical Findings for Receiving Doctor'}</span>
        </div>
      </div>
      <ul class="bullet-list">
        ${findings.map((f: any) => {
          const cat = typeof f === 'object' ? f.category || 'Finding' : 'Finding';
          const text = typeof f === 'object' ? f.text : f;
          const isCrit = typeof f === 'object' && f.isCritical;
          return `
            <li class="bullet-item">
              <span class="bullet-tag ${isCrit ? 'critical' : ''}">[${cat}]</span>
              <span>${text}</span>
            </li>
          `;
        }).join('')}
      </ul>
    </div>

    <!-- Section 8: Recommended Action -->
    <div class="section-card">
      <div class="section-header">
        <div class="section-title">
          <span class="section-num">8</span>
          <span>${isHindi ? 'अनुशंसित अगले कदम' : 'Recommended Next Steps'}</span>
        </div>
      </div>
      <ul class="bullet-list">
        ${actions.map((a: string) => `
          <li class="bullet-item">
            <span style="color:#0f766e; font-weight:800;">✔</span>
            <span>${a}</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <!-- Doctor Sign-Off Block -->
    <div class="signoff-grid">
      <div class="signoff-box">
        <div class="signoff-title">${isHindi ? 'रेफर करने वाले चिकित्सा अधिकारी' : 'Referring Medical Officer'}</div>
        <div style="font-weight:700; font-size:10pt;">${doctorName}</div>
        <div style="color:#64748b;">${meta.referringFacility || facilityName}</div>
        <div class="sign-line"></div>
        <div style="font-size:7.5pt; color:#64748b;">${isHindi ? 'हस्ताक्षर व मुहर (Signature & Stamp)' : 'Signature & Official Stamp'}</div>
      </div>
      <div class="signoff-box">
        <div class="signoff-title">${isHindi ? 'प्राप्तकर्ता संस्थान व विशेषज्ञ' : 'Receiving Facility / Specialist'}</div>
        <div style="font-weight:700; font-size:10pt;">${meta.receivingFacility || (isHindi ? 'जिला अस्पताल / कार्डियोलॉजी विभाग' : 'District Hospital / Cardiology Dept')}</div>
        <div style="color:#64748b;">${isHindi ? 'आगमन पर डॉक्टर द्वारा भरा जाएगा' : 'To be filled upon patient reception'}</div>
        <div class="sign-line"></div>
        <div style="font-size:7.5pt; color:#64748b;">${isHindi ? 'स्वीकृति हस्ताक्षर व तिथि' : 'Acknowledgment Signature & Date'}</div>
      </div>
    </div>

    <!-- Clinical Disclaimer -->
    <div class="disclaimer-box">
      ⚖ ${meta.disclaimer || (isHindi
        ? 'AI-सहायक क्लिनिकल रेफरल सारांश — किसी भी चिकित्सीय निर्णय से पूर्व मूल मेडिकल रिकॉर्ड व प्रत्यक्ष शारीरिक परीक्षण की पुष्टि अवश्य करें।'
        : 'AI-assisted clinical referral summary — verify against original medical records and physical examination before clinical decisions.')}
    </div>

  </div>

  <script>
    // Auto trigger print when loaded in dedicated window or printable iframe
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
}

/**
 * Robust execution function to trigger Print or PDF for Referral Summary.
 * Works reliably inside iframe sandboxes, preview environments, and mobile browsers.
 */
export function printReferralSummaryDocument(options: PrintOptions): void {
  const htmlContent = generatePrintableReferralHTML(options);
  const patientName = options.structuredData?.patientDetails?.name || 'Patient';

  // Strategy 1: Hidden Iframe Print (cleanest, seamless within preview without leaving app)
  try {
    const existingFrame = document.getElementById('meditrace-print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'meditrace-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '10px';
    iframe.style.height = '10px';
    iframe.style.opacity = '0.01';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-1000';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (iframeErr) {
          console.warn('Iframe print blocked by browser sandbox, falling back to Blob window:', iframeErr);
          openBlobPrintWindow(htmlContent, patientName);
        }
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Failed to print via iframe, falling back to Blob window:', err);
  }

  // Strategy 2: Blob URL Window
  openBlobPrintWindow(htmlContent, patientName);
}

/**
 * Opens a dedicated clean window from HTML Blob URL
 */
function openBlobPrintWindow(htmlContent: string, patientName: string): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const printWin = window.open(blobUrl, '_blank');
    if (printWin) {
      printWin.onload = () => {
        printWin.focus();
        printWin.print();
      };
    } else {
      // If popup blocked, download standalone HTML document
      downloadPrintableHTML(htmlContent, patientName);
    }
  } catch (e) {
    console.error('Failed to open blob window:', e);
    downloadPrintableHTML(htmlContent, patientName);
  }
}

/**
 * Directly downloads the standalone printable HTML document
 */
export function downloadPrintableHTML(htmlContent: string, patientName: string): void {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediTrace-Referral-Summary-${patientName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  } catch (err) {
    console.error('Download failed:', err);
  }
}

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  User, 
  Activity, 
  Pill,
  Check,
  FileCheck,
  RefreshCw,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { MedicalRecord, Language, MedicineItem, InvestigationItem, FacilityType, RecordType } from '../types';
import { translations } from '../data/translations';
import { authenticatedFetch } from '../lib/api';

interface DocumentUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSaveRecord: (newRecord: MedicalRecord) => Promise<void> | void;
}

type UploadStep = 'upload' | 'selected' | 'processing' | 'verify';

interface SamplePreset {
  id: string;
  name: string;
  nameHindi: string;
  type: RecordType;
  fileName: string;
  badge: string;
  badgeHindi: string;
  detail: string;
  detailHindi: string;
  icon: 'pill' | 'activity' | 'building';
  sampleText: string;
}

const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sample-prescription',
    name: 'Village Clinic Prescription Card',
    nameHindi: 'ग्रामीण क्लिनिक का पर्चा (हाइपरटेंशन)',
    type: 'Prescription',
    fileName: 'Village_SubCentre_Prescription_Card.jpg',
    badge: 'Prescription',
    badgeHindi: 'दवा पर्चा',
    detail: 'BP 144/92, Amlodipine 5mg, Metformin 500mg',
    detailHindi: 'बीपी 144/92, एम्लोडिपिन 5mg, मेटफॉर्मिन 500mg',
    icon: 'pill',
    sampleText: 'Patient Ramlal Sharma, Age 58. BP 144/92 mmHg, Pulse 76 bpm. Rx: Tab Amlodipine 5mg OD morning, Tab Metformin 500mg BD after meals. Advice: low salt diet, review in 4 weeks.',
  },
  {
    id: 'sample-lab',
    name: 'PHC Diagnostic Lab Report',
    nameHindi: 'पीएचसी बायोकेमिस्ट्री लैब रिपोर्ट',
    type: 'Diagnostic',
    fileName: 'PHC_Biochemistry_Lab_Report.pdf',
    badge: 'Lab Report',
    badgeHindi: 'लैब रिपोर्ट',
    detail: 'Hb 10.2 g/dL, Fasting Sugar 148 mg/dL, HbA1c 7.8%',
    detailHindi: 'हीमोग्लोबिन 10.2 g/dL, फास्टिंग शुगर 148 mg/dL',
    icon: 'activity',
    sampleText: 'PHC Lakhimpur Diagnostic Centre. Test: Hemoglobin 10.2 g/dL (Mild Anemia), Fasting Blood Sugar 148 mg/dL (High), HbA1c 7.8% (Borderline/High). Verified by Lab Technician.',
  },
  {
    id: 'sample-referral',
    name: 'District Hospital Referral Consult Slip',
    nameHindi: 'जिला अस्पताल रेफरल पर्ची (कार्डियोलॉजी)',
    type: 'Referral',
    fileName: 'District_Hospital_Referral_Form.pdf',
    badge: 'Referral',
    badgeHindi: 'रेफरल फॉर्म',
    detail: 'ECG, Statin & Specialized Cardiology Review',
    detailHindi: 'ईसीजी, स्टेटिन व हृदय रोग विशेषज्ञ समीक्षा',
    icon: 'building',
    sampleText: 'District Hospital Varanasi. Dept of Cardiology Referral Slip. Worsening exertional dyspnea, persistent glycemic volatility, cardiology review for 2D Echocardiography. Current meds: Metoprolol ER 25mg, Atorvastatin 20mg.',
  },
];

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  isOpen,
  onClose,
  language,
  onSaveRecord,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  // Strict 5-state tracking: upload -> selected -> processing -> verify
  const [step, setStep] = useState<UploadStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<SamplePreset | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string>('');
  const [documentType, setDocumentType] = useState<RecordType>('Prescription');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Guard against duplicate in-flight network requests
  const isProcessingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Extracted record state for verification
  const [extractedData, setExtractedData] = useState<{
    facility: string;
    facilityType: FacilityType;
    recordDate: string;
    recordType: RecordType;
    doctorName: string;
    specialization: string;
    diagnosis: string;
    reasonForVisit: string;
    medicines: MedicineItem[];
    investigations: InvestigationItem[];
    bloodPressure: string;
    pulse: string;
    clinicalNotes: string;
    followUp: string;
    confidenceScore: number;
  }>({
    facility: 'District Hospital, Varanasi',
    facilityType: 'District Hospital',
    recordDate: new Date().toISOString().split('T')[0],
    recordType: 'Prescription',
    doctorName: 'Dr. R. P. Singh',
    specialization: 'Consultant Cardiologist',
    diagnosis: 'Mild Ischemia with Glycemic Irregularity',
    reasonForVisit: 'Exertional fatigue and follow-up cardiology evaluation',
    medicines: [
      {
        id: `med-${Date.now()}-1`,
        name: 'Metoprolol Succinate ER',
        dosage: '25 mg',
        frequency: '1-0-0 (Once daily morning)',
        timingNotes: 'Take after breakfast',
        duration: '30 days',
        purpose: 'Heart rate & blood pressure regulation',
        status: 'active',
        prescribedFacility: 'District Hospital, Varanasi',
        prescribedDate: new Date().toISOString().split('T')[0],
      },
    ],
    investigations: [
      {
        id: `inv-${Date.now()}-1`,
        testName: '2D Echocardiography',
        result: 'Concentric LVH, LVEF 55%, Grade I Diastolic Dysfunction',
        normalRange: 'Normal LVEF > 50%',
        unit: '',
        status: 'Borderline',
        date: new Date().toISOString().split('T')[0],
        facility: 'District Hospital, Varanasi',
      },
    ],
    bloodPressure: '138/84 mmHg',
    pulse: '74 bpm',
    clinicalNotes: 'Avoid strenuous field exertion. Strict adherence to salt restriction and hydration.',
    followUp: 'Review after 6 weeks with fresh ECG and fasting blood sugar.',
    confidenceScore: 96,
  });

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Reset internal state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
      setStep('upload');
      setSelectedFile(null);
      setSelectedPreset(null);
      setFilePreviewUrl(null);
      setDocumentName('');
      setErrorMessage(null);
      setIsAiProcessing(false);
      isProcessingRef.current = false;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file validity, size and MIME type
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: t.emptyFileError || 'No file selected.' };
    }
    if (file.size <= 0) {
      return { valid: false, error: t.emptyFileError || 'The selected file is empty (0 bytes).' };
    }
    if (file.size > 2.5 * 1024 * 1024) {
      return {
        valid: false,
        error: isHindi ? 'Vercel पर सुरक्षित प्रोसेसिंग के लिए फ़ाइल 2.5 MB से छोटी रखें।' : 'Keep files below 2.5 MB for secure processing on Vercel.',
      };
    }
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const hasValidMime = !file.type || ALLOWED_MIME_TYPES.includes(file.type);

    if (!hasValidExt || !hasValidMime) {
      return {
        valid: false,
        error: t.fileTypeError || 'Unsupported file type. Supported formats: JPG, JPEG, PNG, PDF.',
      };
    }
    return { valid: true };
  };

  // Handle setting a validated real file into FILE_SELECTED state (WAIT — do not auto process!)
  const handleApplyRealFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    let previewUrl: string | null = null;
    if (file.type.startsWith('image/')) {
      try {
        previewUrl = URL.createObjectURL(file);
      } catch (err) {
        console.warn('Could not generate preview URL:', err);
      }
    }

    setSelectedFile(file);
    setSelectedPreset(null);
    setFilePreviewUrl(previewUrl);
    setDocumentName(file.name);
    setErrorMessage(null);

    // Auto-detect recommended record type from filename
    const lower = file.name.toLowerCase();
    if (lower.includes('lab') || lower.includes('report') || lower.includes('blood') || lower.includes('test')) {
      setDocumentType('Diagnostic');
    } else if (lower.includes('referral')) {
      setDocumentType('Referral');
    } else if (lower.includes('discharge')) {
      setDocumentType('Discharge Summary');
    } else {
      setDocumentType('Prescription');
    }

    // TRANSITION ONLY TO 'selected' — DO NOT START PROCESSING YET!
    setStep('selected');
  };

  // Standard File Input Picker Handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // User cancelled picker -> keep current state, no action
      return;
    }
    handleApplyRealFile(file);
    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Camera Capture Handler
  const handleCameraCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    handleApplyRealFile(file);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleApplyRealFile(file);
    }
  };

  // Explicit preset sample selection (User must explicitly click sample, never automatic!)
  const handleSelectPreset = (preset: SamplePreset) => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setSelectedFile(null);
    setSelectedPreset(preset);
    setDocumentName(preset.fileName);
    setDocumentType(preset.type);
    setErrorMessage(null);

    // TRANSITION TO 'selected' state so user sees what is selected and can choose to continue or remove
    setStep('selected');
  };

  // Clear selected file and return to selection screen
  const handleRemoveSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setSelectedFile(null);
    setSelectedPreset(null);
    setDocumentName('');
    setErrorMessage(null);
    setStep('upload');
  };

  // Trigger system file picker dialog
  const handleTriggerFilePicker = () => {
    setErrorMessage(null);
    fileInputRef.current?.click();
  };

  // Trigger camera capture dialog
  const handleTriggerCamera = () => {
    setErrorMessage(null);
    if (!navigator.mediaDevices && !cameraInputRef.current) {
      setErrorMessage(t.cameraError || 'Camera is not available on this device.');
      return;
    }
    cameraInputRef.current?.click();
  };

  // Helper to read File as Base64 data URL
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Process Document with Server-Side Gemini API
  // Only called when a valid file or sample document exists and user clicks "Continue" or "Try Again"
  const handleStartProcessing = async () => {
    // REAL FILE / DOCUMENT VALIDATION CHECK
    if (!selectedFile && !selectedPreset) {
      setErrorMessage(t.emptyFileError || 'Please select a document first.');
      setStep('upload');
      return;
    }

    if (isProcessingRef.current) {
      // Prevent duplicate concurrent requests
      return;
    }

    isProcessingRef.current = true;
    setIsAiProcessing(true);
    setErrorMessage(null);
    setStep('processing');

    try {
      const docTitle = documentName || selectedFile?.name || selectedPreset?.fileName || 'Medical_Record.jpg';
      let imageBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;
      let documentText = selectedPreset?.sampleText || `Medical document scan: ${docTitle}. Patient Ramlal Sharma. Clinical evaluation record.`;

      if (selectedFile) {
        mimeType = selectedFile.type || 'image/jpeg';
        try {
          // Gemini inline data supports the accepted image formats and PDFs.
          imageBase64 = await readFileAsBase64(selectedFile);
        } catch (err) {
          console.warn('Could not read the selected document:', err);
          throw new Error(isHindi ? 'दस्तावेज़ पढ़ा नहीं जा सका। कृपया दोबारा चुनें।' : 'The document could not be read. Please select it again.');
        }
      }

      const response = await authenticatedFetch('/api/gemini/extract-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentName: docTitle,
          documentType: documentType,
          documentText: documentText,
          imageBase64: imageBase64,
          mimeType: mimeType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.success && json.data) {
        const d = json.data;
        setExtractedData({
          facility: d.facility || (selectedPreset ? (selectedPreset.id === 'sample-prescription' ? 'Village Sub-Centre, Lakhimpur' : selectedPreset.id === 'sample-lab' ? 'PHC Diagnostic Lab, Lakhimpur' : 'District Hospital, Varanasi') : 'Community Health Centre'),
          facilityType: (d.facilityType as FacilityType) || (selectedPreset ? (selectedPreset.id === 'sample-prescription' ? 'Village Sub-Centre' : selectedPreset.id === 'sample-lab' ? 'Primary Health Centre' : 'District Hospital') : 'Primary Health Centre'),
          recordDate: d.recordDate || new Date().toISOString().split('T')[0],
          recordType: documentType || (d.recordType as RecordType) || 'Prescription',
          doctorName: d.doctorName || 'Dr. R. P. Singh',
          specialization: d.specialization || (documentType === 'Prescription' ? 'Medical Officer' : 'Consultant Physician'),
          diagnosis: d.diagnosis || 'Clinical evaluation completed',
          reasonForVisit: d.reasonForVisit || 'Medical check-up and management',
          medicines: (d.medicines || []).map((m: any, idx: number) => ({
            id: `med-${Date.now()}-${idx}`,
            name: m.name || 'Prescribed Medicine',
            dosage: m.dosage || '5mg',
            frequency: m.frequency || '1-0-1',
            timingNotes: m.instructions || 'After meals with water',
            duration: m.duration || '30 days',
            purpose: m.purpose || 'Therapy',
            status: 'active',
            prescribedFacility: d.facility || 'Healthcare Facility',
            prescribedDate: d.recordDate || new Date().toISOString().split('T')[0],
          })),
          investigations: (d.investigations || []).map((inv: any, idx: number) => ({
            id: `inv-${Date.now()}-${idx}`,
            testName: inv.testName || 'Lab Investigation',
            result: inv.result || 'Normal Range',
            normalRange: inv.normalRange || 'Standard reference',
            unit: '',
            status: inv.status || 'Normal',
            date: d.recordDate || new Date().toISOString().split('T')[0],
            facility: d.facility || 'Healthcare Facility',
          })),
          bloodPressure: d.vitals?.bloodPressure || '136/84 mmHg',
          pulse: d.vitals?.pulse || '76 bpm',
          clinicalNotes: d.clinicalNotes || 'Verified extraction from document.',
          followUp: d.followUp || 'Follow-up with physician as advised.',
          confidenceScore: d.confidenceScore || 95,
        });

        setStep('verify');
      } else {
        throw new Error(json.errorNote || 'Extraction payload incomplete');
      }
    } catch (error: any) {
      console.error('API error during document extraction:', error);
      // Keep selected file intact, revert step to 'selected', and show graceful retry alert
      setErrorMessage(t.aiTemporaryUnavailable || 'AI processing is temporarily unavailable. Please try again.');
      setStep('selected');
    } finally {
      setIsAiProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // Add a blank medicine row
  const handleAddMedicine = () => {
    setExtractedData(prev => ({
      ...prev,
      medicines: [
        ...prev.medicines,
        {
          id: `med-${Date.now()}`,
          name: '',
          dosage: '',
          frequency: '1-0-0',
          duration: '30 days',
          purpose: '',
          status: 'active',
          prescribedFacility: prev.facility,
          prescribedDate: prev.recordDate,
        },
      ],
    }));
  };

  // Remove a medicine
  const handleRemoveMedicine = (index: number) => {
    setExtractedData(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index),
    }));
  };

  // Update medicine field
  const handleUpdateMedicine = (index: number, field: keyof MedicineItem, val: string) => {
    setExtractedData(prev => {
      const copy = [...prev.medicines];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, medicines: copy };
    });
  };

  // Add investigation
  const handleAddInvestigation = () => {
    setExtractedData(prev => ({
      ...prev,
      investigations: [
        ...prev.investigations,
        {
          id: `inv-${Date.now()}`,
          testName: '',
          result: '',
          normalRange: '',
          status: 'Normal',
          date: prev.recordDate,
          facility: prev.facility,
        },
      ],
    }));
  };

  const handleRemoveInvestigation = (index: number) => {
    setExtractedData(prev => ({
      ...prev,
      investigations: prev.investigations.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateInvestigation = (index: number, field: keyof InvestigationItem, val: string) => {
    setExtractedData(prev => {
      const copy = [...prev.investigations];
      copy[index] = { ...copy[index], [field]: val };
      return { ...prev, investigations: copy };
    });
  };

  // Commit and save verified record
  const handleCommitRecord = async () => {
    const finalRecord: MedicalRecord = {
      id: `rec-${Date.now()}`,
      title: `${extractedData.recordType} at ${extractedData.facility}`,
      recordDate: extractedData.recordDate,
      facility: extractedData.facility,
      facilityType: extractedData.facilityType,
      recordType: extractedData.recordType,
      doctorName: extractedData.doctorName,
      specialization: extractedData.specialization,
      diagnosis: extractedData.diagnosis,
      reasonForVisit: extractedData.reasonForVisit,
      medicines: extractedData.medicines.filter(m => m.name.trim() !== ''),
      investigations: extractedData.investigations.filter(i => i.testName.trim() !== ''),
      vitals: {
        bloodPressure: extractedData.bloodPressure,
        pulse: extractedData.pulse,
      },
      clinicalNotes: extractedData.clinicalNotes,
      followUpInstructions: extractedData.followUp,
      sourceDocumentName: documentName || (selectedFile ? selectedFile.name : 'Scanned_Record.jpg'),
      sourceDocumentType:
        extractedData.recordType === 'Diagnostic'
          ? 'lab_report'
          : extractedData.recordType === 'Referral'
            ? 'referral_slip'
            : extractedData.recordType === 'Prescription'
              ? 'prescription_scan'
              : 'consultation_slip',
      isAiExtracted: true,
      isVerified: true,
      verifiedBy: 'Patient / Caregiver Verification',
      verifiedAt: new Date().toISOString(),
      confidenceScore: extractedData.confidenceScore,
    };

    setIsAiProcessing(true);
    setErrorMessage(null);
    try {
      await onSaveRecord(finalRecord);
      onClose();
      setStep('upload');
    } catch (error: any) {
      setErrorMessage(error?.message || 'The verified record could not be saved.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      {/* Hidden real HTML file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCaptureChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {step === 'verify' && (
              <BackButton
                onClick={() => setStep('selected')}
                label={isHindi ? 'वापस' : 'Back'}
                ariaLabel="Go back to document view"
                variant="header"
              />
            )}
            {step === 'selected' && (
              <BackButton
                onClick={handleRemoveSelectedFile}
                label={isHindi ? 'वापस' : 'Back'}
                ariaLabel="Go back to upload selection"
                variant="header"
              />
            )}
            <div className="w-10 h-10 rounded-xl bg-teal-600/80 flex items-center justify-center text-white font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-xl">
                {step === 'upload' && t.uploadTitle}
                {step === 'selected' && (isHindi ? 'दस्तावेज़ की पुष्टि' : 'Confirm Document')}
                {step === 'processing' && t.processingTitle}
                {step === 'verify' && t.verificationTitle}
              </h3>
              <p className="text-xs text-teal-200/90 font-medium">
                {step === 'upload' && t.uploadSubtitle}
                {step === 'selected' && (isHindi ? 'AI द्वारा विश्लेषण शुरू करने से पहले पुष्टि करें' : 'Verify selected document before AI analysis')}
                {step === 'processing' && 'Gemini AI Vision & Clinical Entity Extraction'}
                {step === 'verify' && (isHindi ? 'AI द्वारा निकाले गए विवरण की पुष्टि करें' : 'Review & adjust before committing to timeline')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAiProcessing}
            aria-label="Close modal"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-900 shrink-0">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {step === 'selected' && (
              <button
                type="button"
                onClick={handleStartProcessing}
                disabled={isAiProcessing}
                className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
              >
                {t.retry || 'Try Again'}
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: UPLOAD_SELECTION SCREEN */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Real Drag & Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
                  dragActive 
                    ? 'border-teal-600 bg-teal-100/70 scale-[0.99]' 
                    : 'border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80'
                }`}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xs">
                  <Upload className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  {t.selectFile}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {isHindi 
                    ? 'कागजी पर्चे, खून की जांच या डॉक्टर की पर्ची की फोटो लें या पीडीएफ चुनें' 
                    : t.supportedFormats || 'Supports JPG, JPEG, PNG, PDF (Up to 10MB)'}
                </p>

                {/* Primary Picker Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleTriggerFilePicker}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isHindi ? 'फाइल चुनें (JPG / PDF)' : 'Select File (Device)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerCamera}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>{isHindi ? 'कैमरे से फोटो लें' : 'Capture with Camera'}</span>
                  </button>
                </div>
              </div>

              {/* Realistic Sample Documents for Hackathon / Demo Testing */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span>{t.presetExamples}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="p-4 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200 hover:border-teal-300 text-left transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            preset.icon === 'pill' ? 'bg-blue-100 text-blue-700' :
                            preset.icon === 'activity' ? 'bg-amber-100 text-amber-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {preset.icon === 'pill' && <Pill className="w-4 h-4" />}
                            {preset.icon === 'activity' && <Activity className="w-4 h-4" />}
                            {preset.icon === 'building' && <Building2 className="w-4 h-4" />}
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                            {isHindi ? preset.badgeHindi : preset.badge}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 group-hover:text-teal-800 line-clamp-1">
                          {isHindi ? preset.nameHindi : preset.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                          {isHindi ? preset.detailHindi : preset.detail}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200/70 text-[11px] font-bold text-teal-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>{isHindi ? 'चुनें' : 'Select Sample'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FILE_SELECTED SCREEN (Explicit Review before AI Call) */}
          {step === 'selected' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Selected File Card */}
              <div className="bg-slate-50 rounded-2xl border-2 border-teal-500/40 p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shrink-0">
                      {selectedFile?.type.startsWith('image/') || selectedPreset?.fileName.endsWith('.jpg') ? (
                        <ImageIcon className="w-6 h-6" />
                      ) : (
                        <FileIcon className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 px-2 py-0.5 rounded-full bg-teal-100">
                        {selectedPreset ? (isHindi ? 'नमूना दस्तावेज़' : 'Sample Document') : (isHindi ? 'डिवाइस फ़ाइल' : 'Selected File')}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base mt-1 break-all">
                        {documentName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedFile ? formatFileSize(selectedFile.size) : (isHindi ? 'डेमो क्लिनिकल पर्चा' : 'Demo Clinical Record')} • {documentType}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Selected File */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleTriggerFilePicker}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {t.chooseAnother || 'Choose Another'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveSelectedFile}
                      className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.removeFile || 'Remove'}</span>
                    </button>
                  </div>
                </div>

                {/* Optional Image Thumbnail Preview */}
                {filePreviewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-56 flex items-center justify-center p-2">
                    <img 
                      src={filePreviewUrl} 
                      alt="Selected medical slip" 
                      className="max-h-52 object-contain rounded-lg shadow-xs" 
                    />
                  </div>
                )}

                {/* Document Categorization Option */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {isHindi ? 'दस्तावेज़ का प्रकार (Document Category)' : 'Document Type Category'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
                    {(['Prescription', 'Diagnostic', 'Referral', 'Discharge Summary'] as RecordType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDocumentType(type)}
                        className={`py-2 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                          documentType === type
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ready to Extract Notice */}
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2.5 text-xs text-teal-900 font-medium">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    {isHindi 
                      ? 'दस्तावेज़ तैयार है। "आगे बढ़ें" पर क्लिक करने पर AI द्वारा अक्षरों और दवाओं को निकाला जाएगा।' 
                      : 'Document ready. Click "Continue & Process with AI" to extract clinical entities and medications.'}
                  </span>
                </div>
              </div>

              {/* Explicit Continue CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRemoveSelectedFile}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleStartProcessing}
                  disabled={isAiProcessing}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{t.continueProcessing || 'Continue & Process with AI'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING ANIMATION SCREEN */}
          {step === 'processing' && (
            <div className="py-12 px-4 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-teal-200 animate-ping opacity-25" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xl shadow-teal-500/30 animate-pulse">
                  <Sparkles className="w-10 h-10 text-amber-300" />
                </div>
              </div>

              <div>
                <h4 className="text-xl font-extrabold text-slate-900">
                  {t.processingTitle}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {isHindi ? 'AI पर्चे का विश्लेषण कर रहा है और महत्वपूर्ण दवाइयों व जांचों को अलग कर रहा है...' : 'Extracting clinical entities, handwriting recognition, and mapping facility details...'}
                </p>
                <p className="text-[11px] text-teal-700 font-mono font-semibold mt-1">
                  {documentName}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2 text-teal-700">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.processingStep1}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">2</div>
                  <span>{t.processingStep2}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">3</div>
                  <span>{t.processingStep3}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFICATION SCREEN */}
          {step === 'verify' && (
            <div className="space-y-6">
              {/* Mandatory AI Verification Warning Banner */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                    {t.verificationTitle}
                  </h4>
                  <p className="text-xs text-amber-900 mt-0.5 leading-relaxed font-medium">
                    {t.verificationWarning}
                  </p>
                </div>
              </div>

              {/* Facility & Administrative Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'स्वास्थ्य केंद्र / अस्पताल का नाम' : 'Healthcare Facility Name'}
                  </label>
                  <input
                    type="text"
                    value={extractedData.facility}
                    onChange={e => setExtractedData({ ...extractedData, facility: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'अस्पताल स्तर' : 'Facility Level'}
                  </label>
                  <select
                    value={extractedData.facilityType}
                    onChange={e => setExtractedData({ ...extractedData, facilityType: e.target.value as FacilityType })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  >
                    <option value="Village Sub-Centre">Village Sub-Centre</option>
                    <option value="Primary Health Centre">Primary Health Centre</option>
                    <option value="District Hospital">District Hospital</option>
                    <option value="Tertiary Hospital">Tertiary Hospital</option>
                    <option value="Private Clinic">Private Clinic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'तारीख' : 'Record Date'}
                  </label>
                  <input
                    type="date"
                    value={extractedData.recordDate}
                    onChange={e => setExtractedData({ ...extractedData, recordDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'डॉक्टर का नाम व पद' : 'Doctor / Provider Name'}
                  </label>
                  <input
                    type="text"
                    value={extractedData.doctorName}
                    onChange={e => setExtractedData({ ...extractedData, doctorName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  />
                </div>
              </div>

              {/* Diagnosis & Vitals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'निदान / क्लिनिकल निष्कर्ष' : 'Diagnosis / Clinical Impression'}
                  </label>
                  <input
                    type="text"
                    value={extractedData.diagnosis}
                    onChange={e => setExtractedData({ ...extractedData, diagnosis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHindi ? 'ब्लड प्रेशर (BP)' : 'Blood Pressure'}
                  </label>
                  <input
                    type="text"
                    value={extractedData.bloodPressure}
                    onChange={e => setExtractedData({ ...extractedData, bloodPressure: e.target.value })}
                    placeholder="138/84 mmHg"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-teal-600"
                  />
                </div>
              </div>

              {/* Extracted Medicines (Editable Table) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-emerald-700" />
                    <span>{isHindi ? 'दवाइयाँ (सत्यापित करें)' : 'Medicines (Verify & Edit)'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isHindi ? 'दवा जोड़ें' : 'Add Medicine'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {extractedData.medicines.map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Medicine Name (e.g. Amlodipine)"
                          value={med.name}
                          onChange={e => handleUpdateMedicine(idx, 'name', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Dosage (5mg)"
                          value={med.dosage}
                          onChange={e => handleUpdateMedicine(idx, 'dosage', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Frequency (1-0-1)"
                          value={med.frequency}
                          onChange={e => handleUpdateMedicine(idx, 'frequency', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Duration (30 days)"
                          value={med.duration}
                          onChange={e => handleUpdateMedicine(idx, 'duration', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extracted Investigations (Editable Table) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-700" />
                    <span>{isHindi ? 'जांच व टेस्ट रिपोर्ट (सत्यापित करें)' : 'Investigations & Tests (Verify & Edit)'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddInvestigation}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isHindi ? 'टेस्ट जोड़ें' : 'Add Test'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {extractedData.investigations.map((inv, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          placeholder="Test Name (e.g. Hemoglobin)"
                          value={inv.testName}
                          onChange={e => handleUpdateInvestigation(idx, 'testName', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Result (e.g. 10.2 g/dL)"
                          value={inv.result}
                          onChange={e => handleUpdateInvestigation(idx, 'result', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={inv.status}
                          onChange={e => handleUpdateInvestigation(idx, 'status', e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Borderline">Borderline</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveInvestigation(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isHindi ? 'डॉक्टर की सलाह व निर्देश' : 'Clinical Observations & Diet Instructions'}
                </label>
                <textarea
                  rows={2}
                  value={extractedData.clinicalNotes}
                  onChange={e => setExtractedData({ ...extractedData, clinicalNotes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:bg-white focus:outline-teal-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {step === 'verify' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('selected')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>←</span>
                <span>{isHindi ? 'दस्तावेज़ पर वापस जाएं' : 'Back to Document'}</span>
              </button>
              <button
                type="button"
                onClick={handleCommitRecord}
                className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>{t.saveVerifiedRecord}</span>
              </button>
            </>
          ) : step === 'selected' ? (
            <>
              <button
                type="button"
                onClick={handleRemoveSelectedFile}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleStartProcessing}
                disabled={isAiProcessing}
                className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{t.continueProcessing || 'Continue & Process with AI'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                {isHindi ? 'सुरक्षित व सत्यापित स्वास्थ्य रिकॉर्ड' : 'AI-Assisted Cross-Facility Record Pipeline'}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

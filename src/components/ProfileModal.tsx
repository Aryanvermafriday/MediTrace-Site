import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Heart, 
  AlertTriangle, 
  Building2, 
  QrCode, 
  CheckCircle2, 
  Mail,
  Fingerprint,
  Calendar,
  Globe,
  Pencil,
  Plus,
  Check,
  RefreshCw,
  Info,
  Camera,
  Trash2,
  Upload,
  AlertCircle,
  Star,
  PhoneCall,
  UserCheck
} from 'lucide-react';
import { BackButton } from './common/BackButton';
import { PatientProfile, EmergencyContact, Language } from '../types';
import { translations } from '../data/translations';
import { patientDataService } from '../services/patientDataService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  patient: PatientProfile;
  language: Language;
  onOpenAccountSettings?: () => void;
  onUpdatePatient?: (updated: PatientProfile, toastMessage?: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onBack,
  patient,
  language,
  onOpenAccountSettings,
  onUpdatePatient,
}) => {
  const t = translations[language];
  const isHindi = language === 'hi';

  const handleBack = onBack || onClose;

  // Address editing state - Hooks MUST be called unconditionally at top of component
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);
  const [village, setVillage] = useState<string>(patient.village || '');
  const [post, setPost] = useState<string>(patient.post || '');
  const [district, setDistrict] = useState<string>(patient.district || '');
  const [state, setState] = useState<string>(patient.state || '');
  const [pinCode, setPinCode] = useState<string>(patient.pinCode || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Profile Photo state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoProcessing, setIsPhotoProcessing] = useState<boolean>(false);

  // Emergency Contacts state
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formRelationship, setFormRelationship] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formIsPrimary, setFormIsPrimary] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState<boolean>(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [contactActionError, setContactActionError] = useState<string | null>(null);

  useEffect(() => {
    setVillage(patient.village || '');
    setPost(patient.post || '');
    setDistrict(patient.district || '');
    setState(patient.state || '');
    setPinCode(patient.pinCode || '');
    setAddressError(null);

    if (Array.isArray(patient.emergencyContacts)) {
      setContacts(patient.emergencyContacts);
    } else if (patient.emergencyContact && patient.emergencyContact.name?.trim()) {
      setContacts([
        {
          id: `ec-${patient.mediTraceId || 'legacy'}-1`,
          name: patient.emergencyContact.name,
          relationship: patient.emergencyContact.relationship || 'Emergency Contact',
          phone: patient.emergencyContact.phone || patient.phone || '',
          isPrimary: true,
        }
      ]);
    } else {
      setContacts([]);
    }
  }, [patient]);

  if (!isOpen) return null;

  const initials = patient.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!validTypes.includes(file.type) && !hasValidExt) {
      setPhotoError(t.invalidImageType);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t.fileTooLarge);
      return;
    }

    setPhotoError(null);
    setIsPhotoProcessing(true);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const MAX_DIM = 400;
          let width = img.width;
          let height = img.height;

          if (width > height && width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Image processing is not supported in this browser.');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
          const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, { profilePhoto: dataUrl });
          if (onUpdatePatient) {
            onUpdatePatient(updated, isHindi ? 'प्रोफ़ाइल फ़ोटो सफलतापूर्वक अपडेट की गई' : 'Profile photo updated successfully');
          }
        } catch (error: any) {
          setPhotoError(error?.message || (isHindi ? 'प्रोफ़ाइल फ़ोटो अपडेट नहीं हो सकी।' : 'The profile photo could not be updated.'));
        } finally {
          setIsPhotoProcessing(false);
        }
      };
      img.onerror = () => {
        setPhotoError(t.invalidImageType);
        setIsPhotoProcessing(false);
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setPhotoError(t.invalidImageType);
      setIsPhotoProcessing(false);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    setIsPhotoProcessing(true);
    try {
      const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, { profilePhoto: undefined });
      if (onUpdatePatient) {
        onUpdatePatient(updated, isHindi ? 'प्रोफ़ाइल फ़ोटो हटा दी गई' : 'Profile photo removed');
      }
    } catch (error: any) {
      setPhotoError(error?.message || (isHindi ? 'प्रोफ़ाइल फ़ोटो हटाई नहीं जा सकी।' : 'The profile photo could not be removed.'));
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  const addressParts = [
    patient.village,
    patient.post ? (isHindi ? `डाकघर: ${patient.post}` : `Post: ${patient.post}`) : '',
    patient.district,
    patient.state,
    patient.pinCode ? `PIN: ${patient.pinCode}` : ''
  ].filter(Boolean);
  const hasAddress = Boolean(patient.village || patient.post || patient.district || patient.state || patient.pinCode);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : (isHindi ? 'पता दर्ज नहीं है' : 'Address not added');

  const handleCancelEdit = () => {
    setVillage(patient.village || '');
    setPost(patient.post || '');
    setDistrict(patient.district || '');
    setState(patient.state || '');
    setPinCode(patient.pinCode || '');
    setAddressError(null);
    setIsEditingAddress(false);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setAddressError(null);
    try {
      const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, {
        village: village.trim(),
        post: post.trim(),
        district: district.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
      });
      if (updated && onUpdatePatient) {
        onUpdatePatient(updated, isHindi ? 'निवास पता सफलतापूर्वक अपडेट किया गया' : 'Residential address updated successfully');
      }
      setIsEditingAddress(false);
    } catch (err) {
      console.error('Failed to update address:', err);
      setAddressError(isHindi ? 'पता सहेजा नहीं जा सका। कृपया फिर प्रयास करें।' : 'The address could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const RELATIONSHIP_PRESETS = [
    { en: 'Son', hi: 'बेटा (Son)' },
    { en: 'Daughter', hi: 'बेटी (Daughter)' },
    { en: 'Spouse', hi: 'पति/पत्नी (Spouse)' },
    { en: 'Parent', hi: 'माता/पिता (Parent)' },
    { en: 'Sibling', hi: 'भाई/बहन (Sibling)' },
    { en: 'Doctor', hi: 'डॉक्टर (Doctor)' },
    { en: 'Friend', hi: 'मित्र (Friend)' },
    { en: 'Neighbor', hi: 'पड़ोसी (Neighbor)' },
    { en: 'Other', hi: 'अन्य (Other)' },
  ];

  const handleStartAddContact = () => {
    setFormName('');
    setFormRelationship('');
    setFormPhone('');
    setFormIsPrimary(contacts.length === 0);
    setFormError(null);
    setIsAddingContact(true);
    setEditingContactId(null);
    setDeletingContactId(null);
    setContactActionError(null);
  };

  const handleStartEditContact = (contact: EmergencyContact) => {
    setFormName(contact.name);
    setFormRelationship(contact.relationship);
    setFormPhone(contact.phone);
    setFormIsPrimary(Boolean(contact.isPrimary));
    setFormError(null);
    setIsAddingContact(false);
    setEditingContactId(contact.id);
    setDeletingContactId(null);
    setContactActionError(null);
  };

  const handleCancelContactForm = () => {
    setIsAddingContact(false);
    setEditingContactId(null);
    setFormError(null);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formName.trim().length < 2) {
      setFormError(t.errContactNameRequired);
      return;
    }
    if (!formRelationship.trim()) {
      setFormError(t.errContactRelationshipRequired);
      return;
    }
    const cleanDigits = formPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setFormError(t.errContactPhoneRequired);
      return;
    }

    let formattedPhone = formPhone.trim();
    if (cleanDigits.length === 10) {
      formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    setIsSavingContact(true);
    setContactActionError(null);
    try {
      let updatedList: EmergencyContact[] = [];
      const willBePrimary = formIsPrimary || contacts.length === 0;

      if (isAddingContact) {
        const newContact: EmergencyContact = {
          id: `ec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: formName.trim(),
          relationship: formRelationship.trim(),
          phone: formattedPhone,
          isPrimary: willBePrimary,
        };
        updatedList = willBePrimary
          ? [...contacts.map(c => ({ ...c, isPrimary: false })), newContact]
          : [...contacts, newContact];
      } else if (editingContactId) {
        updatedList = contacts.map(c => {
          if (c.id === editingContactId) {
            return {
              ...c,
              name: formName.trim(),
              relationship: formRelationship.trim(),
              phone: formattedPhone,
              isPrimary: willBePrimary,
            };
          }
          return willBePrimary ? { ...c, isPrimary: false } : c;
        });

        // Ensure at least one contact is primary if list is not empty
        if (!updatedList.some(c => c.isPrimary) && updatedList.length > 0) {
          updatedList[0].isPrimary = true;
        }
      }

      const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, {
        emergencyContacts: updatedList,
      });

      if (updated) {
        setContacts(updatedList);
        setIsAddingContact(false);
        setEditingContactId(null);
        setFormError(null);
        if (onUpdatePatient) {
          onUpdatePatient(updated, t.contactSavedToast);
        }
      }
    } catch (err) {
      console.error('Failed to save emergency contact:', err);
      setFormError(isHindi ? 'संपर्क सहेजा नहीं जा सका। कृपया फिर प्रयास करें।' : 'The contact could not be saved. Please try again.');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setContactActionError(null);
    try {
      let updatedList = contacts.filter(c => c.id !== id);
      if (updatedList.length > 0 && !updatedList.some(c => c.isPrimary)) {
        updatedList[0].isPrimary = true;
      }
      const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, {
        emergencyContacts: updatedList,
      });
      if (updated) {
        setContacts(updatedList);
        setDeletingContactId(null);
        if (editingContactId === id) {
          setIsAddingContact(false);
          setEditingContactId(null);
        }
        if (onUpdatePatient) {
          onUpdatePatient(updated, t.contactDeletedToast);
        }
      }
    } catch (err) {
      console.error('Failed to delete emergency contact:', err);
      setContactActionError(isHindi ? 'संपर्क हटाया नहीं जा सका। कृपया फिर प्रयास करें।' : 'The contact could not be deleted. Please try again.');
    }
  };

  const handleSetPrimary = async (id: string) => {
    setContactActionError(null);
    try {
      const updatedList = contacts.map(c => ({
        ...c,
        isPrimary: c.id === id,
      }));
      const updated = await patientDataService.updatePatientProfile(patient.mediTraceId, {
        emergencyContacts: updatedList,
      });
      if (updated) {
        setContacts(updatedList);
        if (onUpdatePatient) {
          onUpdatePatient(updated, t.contactPrimaryToast);
        }
      }
    } catch (err) {
      console.error('Failed to set primary emergency contact:', err);
      setContactActionError(isHindi ? 'प्राथमिक संपर्क बदला नहीं जा सका। कृपया फिर प्रयास करें।' : 'The primary contact could not be changed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header with Top-Left Back Navigation */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton
              onClick={handleBack}
              label={isHindi ? 'वापस' : 'Back'}
              ariaLabel="Go back"
              variant="header"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-400/40 flex items-center justify-center text-white font-black text-base shadow-inner shrink-0 overflow-hidden">
              {patient.profilePhoto ? (
                <img
                  src={patient.profilePhoto}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{t.myProfile}</span>
              </h2>
              <p className="text-xs text-teal-200/90 font-mono font-medium">
                {patient.mediTraceId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs">
          
          {/* Main Identity Banner with Photo Management */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Avatar + Patient Identity Info */}
              <div className="flex items-center gap-3.5">
                {/* Profile Photo / Avatar Frame */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-teal-700/90 border-2 border-teal-400/40 flex items-center justify-center text-white text-2xl font-black shadow-inner overflow-hidden">
                    {patient.profilePhoto ? (
                      <img
                        src={patient.profilePhoto}
                        alt={patient.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  {patient.bloodGroup && (
                    <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black border border-white shadow-2xs">
                      {patient.bloodGroup.split(' ')[0]}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">
                      {isHindi ? patient.nameHindi : patient.name}
                    </span>
                  </div>

                  <div className="text-slate-600 font-medium">
                    <span>{patient.age} {t.yearsOld} • {isHindi ? patient.genderHindi : patient.gender}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span className={hasAddress ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}>
                      {fullAddress}
                    </span>
                  </div>
                </div>
              </div>

              {/* MediTrace ID Badge */}
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">
                  {t.patientId}
                </span>
                <span className="font-mono font-black text-sm text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block mt-0.5">
                  {patient.mediTraceId}
                </span>
              </div>
            </div>

            {/* Profile Photo Controls Bar */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              {/* Hidden file input */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  id="change-profile-photo-btn"
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isPhotoProcessing}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {isPhotoProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-teal-700" />
                  )}
                  <span>{patient.profilePhoto ? t.changePhoto : t.uploadPhoto}</span>
                </button>

                {patient.profilePhoto && (
                  <button
                    id="remove-profile-photo-btn"
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isPhotoProcessing}
                    className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>{t.removePhoto}</span>
                  </button>
                )}
              </div>

              <span className="text-[10px] text-slate-400 font-medium">
                {t.photoRequirement}
              </span>
            </div>

            {/* Photo Error Banner */}
            {photoError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{photoError}</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* EDITABLE RESIDENTIAL / CONTACT ADDRESS SECTION           */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs">
                    {t.residentialAddress}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isHindi ? 'मरीज का वर्तमान निवास एवं संपर्क पता' : 'Current residential and communication location'}
                  </p>
                </div>
              </div>

              {!isEditingAddress && (
                <button
                  id="edit-address-button"
                  onClick={() => setIsEditingAddress(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  {hasAddress ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-teal-700" />
                      <span>{t.editAddress}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-teal-700" />
                      <span>{t.addAddress}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* View Mode */}
            {!isEditingAddress ? (
              <div className="space-y-2.5">
                {hasAddress ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="font-bold text-slate-900 text-xs leading-relaxed">
                      {fullAddress}
                    </p>

                    {/* Detailed Breakdown Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 text-[10px]">
                      {patient.village && (
                        <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 font-medium">
                          {isHindi ? 'गाँव/गली' : 'Village'}: <strong className="text-slate-900">{patient.village}</strong>
                        </span>
                      )}
                      {patient.post && (
                        <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 font-medium">
                          {isHindi ? 'डाकघर' : 'Post'}: <strong className="text-slate-900">{patient.post}</strong>
                        </span>
                      )}
                      {patient.district && (
                        <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 font-medium">
                          {isHindi ? 'ज़िला' : 'District'}: <strong className="text-slate-900">{patient.district}</strong>
                        </span>
                      )}
                      {patient.state && (
                        <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 font-medium">
                          {isHindi ? 'राज्य' : 'State'}: <strong className="text-slate-900">{patient.state}</strong>
                        </span>
                      )}
                      {patient.pinCode && (
                        <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-slate-700 font-mono font-bold">
                          PIN: {patient.pinCode}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                    <p className="text-xs font-semibold text-slate-500">
                      {t.addressNotAdded}
                    </p>
                    <button
                      id="add-address-empty-button"
                      onClick={() => setIsEditingAddress(true)}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addAddress}</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{t.residentialAddressHelp}</span>
                </div>
              </div>
            ) : (
              /* Edit Mode Form */
              <form onSubmit={handleSaveAddress} className="space-y-3 pt-1 animate-in fade-in duration-150">
                {addressError && (
                  <div role="alert" className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{addressError}</span>
                  </div>
                )}
                <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3">
                  {/* Village / Street Address */}
                  <div>
                    <label htmlFor="edit-address-village" className="block font-bold text-slate-700 mb-1 text-[11px]">
                      {t.villageOrAddress}
                    </label>
                    <input
                      id="edit-address-village"
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder={t.villagePlaceholder}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                    />
                  </div>

                  {/* Post Office & District */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="edit-address-post" className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.postOffice}
                      </label>
                      <input
                        id="edit-address-post"
                        type="text"
                        value={post}
                        onChange={(e) => setPost(e.target.value)}
                        placeholder={t.postPlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-address-district" className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.district}
                      </label>
                      <input
                        id="edit-address-district"
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder={t.districtPlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  {/* State & PIN Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="edit-address-state" className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.state}
                      </label>
                      <input
                        id="edit-address-state"
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder={t.statePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-address-pincode" className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.pinCode}
                      </label>
                      <input
                        id="edit-address-pincode"
                        type="text"
                        maxLength={6}
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                        placeholder={t.pinCodePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Save & Cancel Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{t.saveChanges}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Masked Phone & Optional Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 text-teal-700" />
                <span>{isHindi ? 'सत्यापित मोबाइल (सुरक्षित)' : 'Verified Mobile (Masked)'}</span>
              </span>
              <p className="font-bold text-slate-900 text-sm font-mono">
                {patient.maskedPhone || patient.phone}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1 mb-1">
                <Mail className="w-3 h-3 text-indigo-700" />
                <span>{t.emailOptional}</span>
              </span>
              <p className="font-semibold text-slate-800 text-xs truncate">
                {patient.email || (isHindi ? 'कोई ईमेल नहीं जोड़ा गया' : 'No email linked')}
              </p>
            </div>
          </div>

          {/* Critical Medical Indicators */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-600">
              {isHindi ? 'महत्वपूर्ण मेडिकल सारांश' : 'Critical Medical Summary'}
            </h3>

            {/* Allergies */}
            <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200">
              <span className="font-bold text-red-900 flex items-center gap-1.5 mb-1 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{t.allergies}</span>
              </span>
              <p className="text-red-950 font-semibold text-xs">
                {patient.allergies && patient.allergies.length > 0 
                  ? (isHindi ? (patient.allergiesHindi?.join(', ') || patient.allergies.join(', ')) : patient.allergies.join(', '))
                  : t.noAllergies}
              </p>
            </div>

            {/* Chronic Conditions */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 mb-1.5 text-xs">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>{t.chronicConditions}</span>
              </span>
              <div className="space-y-1 text-slate-800 font-medium">
                {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                  (isHindi ? (patient.chronicConditionsHindi || patient.chronicConditions) : patient.chronicConditions).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                      <span>{c}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-[11px] italic">
                    {isHindi ? 'कोई गंभीर बीमारी दर्ज नहीं' : 'No chronic conditions recorded'}
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contacts Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-600" />
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    {t.emergencyContacts}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black text-[11px]">
                    {contacts.length}
                  </span>
                </div>

                {!isAddingContact && !editingContactId && (
                  <button
                    type="button"
                    onClick={handleStartAddContact}
                    className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addEmergencyContact}</span>
                  </button>
                )}
              </div>

              {contactActionError && (
                <div role="alert" className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{contactActionError}</span>
                </div>
              )}

              {/* Add / Edit Form Card */}
              {(isAddingContact || editingContactId) && (
                <form
                  onSubmit={handleSaveContact}
                  className="p-4 rounded-2xl bg-white border-2 border-teal-600 shadow-sm space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      {isAddingContact ? <Plus className="w-4 h-4 text-teal-700" /> : <Pencil className="w-4 h-4 text-teal-700" />}
                      <span>{isAddingContact ? t.addEmergencyContact : t.editEmergencyContact}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelContactForm}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {formError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Contact Full Name */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.contactName} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder={t.contactNamePlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                      />
                    </div>

                    {/* Relationship */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.contactRelationship} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formRelationship}
                        onChange={(e) => {
                          setFormRelationship(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder={t.contactRelationshipPlaceholder}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900 mb-2"
                      />

                      {/* Quick Relationship Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {RELATIONSHIP_PRESETS.map((rel) => (
                          <button
                            key={rel.en}
                            type="button"
                            onClick={() => {
                              setFormRelationship(isHindi ? rel.hi : rel.en);
                              if (formError) setFormError(null);
                            }}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                              formRelationship === (isHindi ? rel.hi : rel.en)
                                ? 'bg-teal-700 text-white border-teal-700'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isHindi ? rel.hi : rel.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                        {t.contactPhone} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          value={formPhone}
                          onChange={(e) => {
                            setFormPhone(e.target.value);
                            if (formError) setFormError(null);
                          }}
                          placeholder={t.contactPhonePlaceholder}
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:ring-1 focus:ring-teal-600 outline-none text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Primary Status Toggle */}
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsPrimary || contacts.length === 0}
                        disabled={contacts.length === 0}
                        onChange={(e) => setFormIsPrimary(e.target.checked)}
                        className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-600 cursor-pointer"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-slate-800 block">{t.isPrimaryCheckbox}</span>
                        <span className="text-[10px] text-slate-500">
                          {isHindi 
                            ? 'केवल एक प्राथमिक आपातकालीन संपर्क हो सकता है' 
                            : 'Only one contact can be marked as primary'}
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleCancelContactForm}
                      disabled={isSavingContact}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingContact}
                      className="px-4 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      {isSavingContact ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{t.saveChanges}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Contacts List or Empty State */}
              {contacts.length === 0 && !isAddingContact && !editingContactId ? (
                <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 shadow-xs">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs mb-1">
                    {t.noEmergencyContacts}
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mb-3.5">
                    {t.noEmergencyContactsDesc}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAddContact}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addEmergencyContact}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        contact.isPrimary
                          ? 'bg-gradient-to-r from-teal-50/50 to-white border-teal-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            contact.isPrimary ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {contact.isPrimary ? <Star className="w-4 h-4 fill-amber-300 text-amber-300" /> : <Heart className="w-4 h-4 text-red-500" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {contact.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                                {contact.relationship}
                              </span>
                              {contact.isPrimary && (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-0.5 shrink-0">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  <span>{t.primaryContact}</span>
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <a
                                href={`tel:${contact.phone}`}
                                className="font-mono font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1 transition-colors"
                              >
                                <Phone className="w-3 h-3 text-teal-700" />
                                <span>{contact.phone}</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Contact Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!contact.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(contact.id)}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title={t.setAsPrimary}
                            >
                              {t.setAsPrimary}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartEditContact(contact)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={t.editEmergencyContact}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {deletingContactId === contact.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                              <button
                                type="button"
                                onClick={() => handleDeleteContact(contact.id)}
                                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                {isHindi ? 'हटाएं' : 'Delete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingContactId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                              >
                                {t.cancel}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingContactId(contact.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title={t.deleteEmergencyContact}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* ABHA SECTION — KEPT COMPLETELY INTACT AND UNCHANGED      */}
          {/* ======================================================== */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span className="font-black text-emerald-950 text-sm">
                  {t.abhaId} (Ayushman Bharat Digital Mission)
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wide shadow-xs">
                Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/90 p-3 rounded-xl border border-emerald-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block">ABHA Number</span>
                <span className="font-mono font-black text-slate-900 text-xs">{patient.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-600 uppercase block">ABHA Address</span>
                <span className="font-mono font-bold text-teal-800 text-xs">{patient.abhaAddress}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-900 font-semibold pt-1">
              <span>{isHindi ? 'राष्ट्रीय स्वास्थ्य नेटवर्क से लिंक है' : 'Linked to National ABDM Health Grid'}</span>
              <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                QR Payload Ready
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onOpenAccountSettings && (
            <button
              onClick={() => {
                onClose();
                onOpenAccountSettings();
              }}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
            >
              {t.accountSettings} →
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>

      </div>
    </div>
  );
};

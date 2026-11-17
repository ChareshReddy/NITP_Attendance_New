'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Building2,
  ShieldCheck,
  Lock,
  FileText,
  Edit2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Trash2,
  Upload,
  Clock,
  Globe,
  BadgeCheck,
  Users,
  HeartPulse,
  UserCheck,
  PhoneCall,
  KeyRound,
  Activity,
} from 'lucide-react';
import { formatDateToIndian, formatDateTimeToIndian } from '@/lib/dateUtils';
import { isValidEmail, isValidPhone, isValidPassword, isNotFutureDate } from '@/lib/validations';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'personal' | 'employment' | 'security' | 'documents';
}

interface ProfileData {
  id: string;
  userId: string;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  personalEmail: string | null;
  mobileNumber: string | null;
  emergencyContact: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  dateOfJoining: string | null;
  employeeType: string | null;
  department: string | null;
  designation: string | null;
  grade: string | null;
  location: string | null;
  workLocationStatus: string | null;
  employmentStatus: string | null;
  workShift: string | null;
  professionalEmail: string | null;
  bloodGroup: string | null;
  profileImage: string | null;
  timezone: string | null;
  financialDocuments: string | null;
  lastActivityAt?: string | null;
  lastPasswordChangeAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    teamId: string | null;
    managerId: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    team?: { name: string } | null;
    manager?: { name: string } | null;
  };
}

function formatName(nameVal: string | null | undefined): string {
  if (!nameVal) return '-';
  return nameVal
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getInitials(nameVal: string | null | undefined): string {
  if (!nameVal) return 'HR';
  const parts = nameVal.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'User';
  if (role === 'HR_ADMIN') return 'HR / Admin';
  if (role === 'TL') return 'Team Leader';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default function ProfileDrawer({
  isOpen,
  onClose,
  initialTab = 'personal',
}: ProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'security' | 'documents'>(initialTab);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Personal form fields
  const [personalForm, setPersonalForm] = useState({
    mobileNumber: '',
    personalEmail: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: '',
    bloodGroup: '',
    emergencyContact: '',
    currentAddress: '',
    permanentAddress: '',
    timezone: 'Asia/Kolkata',
  });

  // Employment form fields (HR_ADMIN permitted)
  const [employmentForm, setEmploymentForm] = useState({
    designation: '',
    department: '',
    dateOfJoining: '',
    location: '',
    workLocationStatus: '',
    employeeType: '',
    workShift: '',
    employmentStatus: 'Active',
  });

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsEditingPersonal(false);
      setIsEditingEmployment(false);
      setErrorMsg('');
      setSuccessMsg('');
      fetchProfile();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const populateForms = (p: ProfileData) => {
    setPersonalForm({
      mobileNumber: p.mobileNumber || '',
      personalEmail: p.personalEmail || '',
      dateOfBirth: toDateInputValue(p.dateOfBirth),
      gender: p.gender || '',
      maritalStatus: p.maritalStatus || '',
      nationality: p.nationality || '',
      bloodGroup: p.bloodGroup || '',
      emergencyContact: p.emergencyContact || '',
      currentAddress: p.currentAddress || '',
      permanentAddress: p.permanentAddress || '',
      timezone: p.timezone || 'Asia/Kolkata',
    });
    setEmploymentForm({
      designation: p.designation || '',
      department: p.department || '',
      dateOfJoining: toDateInputValue(p.dateOfJoining),
      location: p.location || '',
      workLocationStatus: p.workLocationStatus || '',
      employeeType: p.employeeType || '',
      workShift: p.workShift || '',
      employmentStatus: p.employmentStatus || 'Active',
    });
  };

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users/profile');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load profile');
      }
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        populateForms(data.profile);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setErrorMsg('');
    setSuccessMsg('');
    const errors: Record<string, string> = {};

    if (personalForm.personalEmail && !isValidEmail(personalForm.personalEmail.trim())) {
      errors.personalEmail = 'Invalid email format (e.g. name@domain.com)';
    }
    if (personalForm.mobileNumber && !isValidPhone(personalForm.mobileNumber.trim())) {
      errors.mobileNumber = 'Enter a valid 10-digit Indian phone number';
    }
    if (personalForm.emergencyContact && !isValidPhone(personalForm.emergencyContact.trim())) {
      errors.emergencyContact = 'Enter a valid emergency phone number';
    }
    if (personalForm.dateOfBirth && !isNotFutureDate(personalForm.dateOfBirth)) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('Please correct the highlighted fields before saving.');
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          ...personalForm,
          dateOfBirth: personalForm.dateOfBirth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setSuccessMsg('Personal information updated successfully.');
      setIsEditingPersonal(false);
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setErrorMsg('');
    setSuccessMsg('');
    const errors: Record<string, string> = {};

    if (!employmentForm.designation.trim()) {
      errors.designation = 'Designation is required';
    }
    if (!employmentForm.department.trim()) {
      errors.department = 'Department is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('Please fill in all mandatory employment fields.');
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          ...employmentForm,
          dateOfJoining: employmentForm.dateOfJoining || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update employment details');
      setSuccessMsg('Employment details updated successfully.');
      setIsEditingEmployment(false);
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating employment details.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingImage(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dest', 'profiles');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload image');

      const saveRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          profileImage: uploadData.url,
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || 'Failed to save profile photo');
      }
      window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: uploadData.url }));
      setSuccessMsg('Profile photo updated.');
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const errors: Record<string, string> = {};

    if (!currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!isValidPassword(newPassword)) {
      errors.newPassword = 'New password must be at least 6 characters';
    }
    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Confirm new password is required';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('Please correct the password errors below.');
      return;
    }

    setFormErrors({});
    setSavingPassword(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      setSuccessMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePasswordForm(false);
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const parseDocuments = (): Array<{ name: string; url: string; uploadedAt?: string }> => {
    if (!profile?.financialDocuments) return [];
    try {
      const parsed = JSON.parse(profile.financialDocuments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingDoc(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dest', 'financial');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload document');

      const docs = parseDocuments();
      const updatedDocs = [
        ...docs,
        { name: file.name, url: uploadData.url, uploadedAt: new Date().toISOString() },
      ];
      const saveRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          financialDocuments: JSON.stringify(updatedDocs),
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || 'Failed to save document metadata');
      }
      setSuccessMsg('Document uploaded successfully.');
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading document.');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleDocumentDelete = async (index: number) => {
    if (!profile) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const docs = parseDocuments();
      docs.splice(index, 1);
      const saveRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          financialDocuments: JSON.stringify(docs),
        }),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json();
        throw new Error(err.error || 'Failed to remove document');
      }
      setSuccessMsg('Document removed.');
      await fetchProfile();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing document.');
    }
  };

  if (!isOpen) return null;

  const displayEmpId = profile?.user?.id
    ? profile.user.id.length > 15
      ? profile.user.id.slice(0, 8).toUpperCase()
      : profile.user.id
    : '-';

  const docs = parseDocuments();
  const isHrAdmin = profile?.user?.role === 'HR_ADMIN';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="My Profile"
    >
      {/* Subtle Background Overlay */}
      <div
        className="fixed inset-0 bg-navy-900/25 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />

      {/* Right-Side Slide-Over Drawer */}
      <aside className="relative z-10 w-full max-w-[500px] bg-bg-page h-full shadow-2xl border-l border-border flex flex-col overflow-hidden">
        {/* Top Drawer Title Bar */}
        <div className="bg-card px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-base font-extrabold text-navy-900 font-heading">My Profile</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile drawer"
            className="p-1.5 rounded-lg text-text-muted hover:text-navy-900 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading && !profile ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-xs font-semibold text-text-muted">
              Loading profile details...
            </div>
          ) : profile ? (
            <>
              {/* Feedback Alerts */}
              {errorMsg && (
                <div className="bg-status-danger-bg border border-status-danger/20 text-brand-red px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="bg-status-success-bg border border-status-success/20 text-status-success-text px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 2. PROFILE HEADER */}
              <div className="bg-gradient-to-br from-blue-50/90 via-card to-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
                <div className="relative shrink-0">
                  <div className="w-18 h-18 rounded-full bg-blue-50 border-2 border-card shadow-sm flex items-center justify-center overflow-hidden">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-extrabold text-navy-900 font-heading">
                        {getInitials(profile.user.name)}
                      </span>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    title="Update profile photo"
                    aria-label="Update profile photo"
                    className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-navy-900 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-extrabold text-navy-900 font-heading truncate">
                    {formatName(profile.user.name)}
                  </h3>
                  <span
                    title={profile.user.id}
                    className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-extrabold font-mono tracking-wide"
                  >
                    {displayEmpId}
                  </span>
                  <div className="mt-2 space-y-1 text-xs text-text-muted font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {profile.designation || formatRoleLabel(profile.user.role)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">
                        {profile.department || profile.user.team?.name || 'Not assigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
                {[
                  { id: 'personal' as const, label: 'Personal Info', icon: UserIcon },
                  { id: 'employment' as const, label: 'Employment', icon: Calendar },
                  { id: 'security' as const, label: 'Security', icon: ShieldCheck },
                  { id: 'documents' as const, label: 'Documents', icon: FileText },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 text-[11px] sm:text-xs font-bold whitespace-nowrap rounded-t-xl transition-colors cursor-pointer border-b-2 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border-blue-600'
                          : 'text-text-muted hover:text-navy-900 hover:bg-blue-50/50 border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 3. PERSONAL INFORMATION TAB */}
              {activeTab === 'personal' && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-navy-900 font-heading">
                      Personal Information
                    </h4>
                  </div>

                  {!isEditingPersonal ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <InfoField icon={UserIcon} label="Full Name" value={formatName(profile.user.name)} />
                        <InfoField icon={BadgeCheck} label="Employee ID" value={displayEmpId} title={profile.user.id} />
                        <InfoField icon={Mail} label="Email" value={profile.user.email} />
                        <InfoField icon={Phone} label="Phone" value={profile.mobileNumber || 'Not provided'} />
                        <InfoField
                          icon={Calendar}
                          label="Date of Birth"
                          value={profile.dateOfBirth ? formatDateToIndian(profile.dateOfBirth) : 'Not provided'}
                        />
                        <InfoField icon={Users} label="Gender" value={profile.gender || 'Not provided'} />
                        <InfoField icon={Mail} label="Personal Email" value={profile.personalEmail || 'Not provided'} />
                        <InfoField icon={HeartPulse} label="Blood Group" value={profile.bloodGroup || 'Not provided'} />
                        <InfoField icon={UserCheck} label="Marital Status" value={profile.maritalStatus || 'Not provided'} />
                        <InfoField icon={PhoneCall} label="Emergency Contact" value={profile.emergencyContact || 'Not provided'} />
                        <InfoField icon={Globe} label="Nationality" value={profile.nationality || 'Not provided'} />
                        <InfoField icon={Clock} label="Timezone" value={profile.timezone || 'Asia/Kolkata'} />
                      </div>

                      <div className="pt-2 border-t border-border space-y-3">
                        <InfoField icon={MapPin} label="Current Address" value={profile.currentAddress || 'Not provided'} />
                        <InfoField icon={MapPin} label="Permanent Address" value={profile.permanentAddress || 'Not provided'} />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            populateForms(profile);
                            setIsEditingPersonal(true);
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="bg-card border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Profile</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={handleSavePersonal} className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputField
                          label="Phone Number"
                          value={personalForm.mobileNumber}
                          onChange={(val) => {
                            setPersonalForm({ ...personalForm, mobileNumber: val });
                            if (formErrors.mobileNumber) setFormErrors(prev => ({ ...prev, mobileNumber: '' }));
                          }}
                          placeholder="+91 98765 43210"
                          error={formErrors.mobileNumber}
                        />
                        <InputField
                          label="Personal Email"
                          type="email"
                          value={personalForm.personalEmail}
                          onChange={(val) => {
                            setPersonalForm({ ...personalForm, personalEmail: val });
                            if (formErrors.personalEmail) setFormErrors(prev => ({ ...prev, personalEmail: '' }));
                          }}
                          placeholder="personal@example.com"
                          error={formErrors.personalEmail}
                        />
                        <InputField
                          label="Date of Birth"
                          type="date"
                          value={personalForm.dateOfBirth}
                          onChange={(val) => {
                            setPersonalForm({ ...personalForm, dateOfBirth: val });
                            if (formErrors.dateOfBirth) setFormErrors(prev => ({ ...prev, dateOfBirth: '' }));
                          }}
                          error={formErrors.dateOfBirth}
                        />
                        <div>
                          <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
                            Gender
                          </label>
                          <select
                            value={personalForm.gender}
                            onChange={(e) => setPersonalForm({ ...personalForm, gender: e.target.value })}
                            className="block w-full rounded-xl border border-input-border py-2 px-3 text-xs text-navy-900 bg-card outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          >
                            <option value="">Select</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
                            Marital Status
                          </label>
                          <select
                            value={personalForm.maritalStatus}
                            onChange={(e) => setPersonalForm({ ...personalForm, maritalStatus: e.target.value })}
                            className="block w-full rounded-xl border border-input-border py-2 px-3 text-xs text-navy-900 bg-card outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                          >
                            <option value="">Select</option>
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <InputField
                          label="Blood Group"
                          value={personalForm.bloodGroup}
                          onChange={(val) => setPersonalForm({ ...personalForm, bloodGroup: val })}
                          placeholder="e.g. O+"
                        />
                        <InputField
                          label="Nationality"
                          value={personalForm.nationality}
                          onChange={(val) => setPersonalForm({ ...personalForm, nationality: val })}
                          placeholder="e.g. Indian"
                        />
                        <InputField
                          label="Emergency Contact"
                          value={personalForm.emergencyContact}
                          onChange={(val) => {
                            setPersonalForm({ ...personalForm, emergencyContact: val });
                            if (formErrors.emergencyContact) setFormErrors(prev => ({ ...prev, emergencyContact: '' }));
                          }}
                          placeholder="Name & phone"
                          error={formErrors.emergencyContact}
                        />
                      </div>

                      <InputField
                        label="Current Address"
                        value={personalForm.currentAddress}
                        onChange={(val) => setPersonalForm({ ...personalForm, currentAddress: val })}
                        placeholder="Enter current address"
                      />
                      <InputField
                        label="Permanent Address"
                        value={personalForm.permanentAddress}
                        onChange={(val) => setPersonalForm({ ...personalForm, permanentAddress: val })}
                        placeholder="Enter permanent address"
                      />

                      <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setIsEditingPersonal(false)}
                          className="bg-card hover:bg-blue-50 border border-border text-navy-900 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 4. EMPLOYMENT DETAILS TAB */}
              {activeTab === 'employment' && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-navy-900 font-heading">
                      Employment Details
                    </h4>
                  </div>

                  {!isEditingEmployment ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <InfoField icon={Briefcase} label="Designation" value={profile.designation || 'Not specified'} />
                        <InfoField
                          icon={Building2}
                          label="Department"
                          value={profile.department || profile.user.team?.name || 'Not specified'}
                        />
                        <InfoField
                          icon={Calendar}
                          label="Date of Joining"
                          value={profile.dateOfJoining ? formatDateToIndian(profile.dateOfJoining) : 'Not specified'}
                        />
                        <InfoField
                          icon={UserIcon}
                          label="Reporting Manager"
                          value={profile.user.manager?.name ? formatName(profile.user.manager.name) : 'None'}
                        />
                        <InfoField
                          icon={Activity}
                          label="Employment Status"
                          value={profile.employmentStatus || (profile.user.isActive ? 'Active' : 'Inactive')}
                        />
                        <InfoField icon={MapPin} label="Work Location" value={profile.location || 'Not specified'} />
                        <InfoField icon={Globe} label="Work Mode" value={profile.workLocationStatus || 'Not specified'} />
                        <InfoField icon={BadgeCheck} label="Employee Type" value={profile.employeeType || 'Not specified'} />
                        <InfoField icon={Clock} label="Work Shift" value={profile.workShift || 'Not specified'} />
                        <InfoField
                          icon={Mail}
                          label="Official Email"
                          value={profile.professionalEmail || profile.user.email}
                        />
                      </div>

                      {isHrAdmin && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              populateForms(profile);
                              setIsEditingEmployment(true);
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            className="bg-card border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Employment</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <form onSubmit={handleSaveEmployment} className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputField
                          label="Designation"
                          value={employmentForm.designation}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, designation: val })}
                          placeholder="e.g. HR Executive"
                        />
                        <InputField
                          label="Department"
                          value={employmentForm.department}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, department: val })}
                          placeholder="e.g. HR Department"
                        />
                        <InputField
                          label="Date of Joining"
                          type="date"
                          value={employmentForm.dateOfJoining}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, dateOfJoining: val })}
                        />
                        <InputField
                          label="Work Location"
                          value={employmentForm.location}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, location: val })}
                          placeholder="e.g. Tirupati / Offshore"
                        />
                        <InputField
                          label="Work Mode"
                          value={employmentForm.workLocationStatus}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, workLocationStatus: val })}
                          placeholder="Onsite / Remote / Hybrid"
                        />
                        <InputField
                          label="Employee Type"
                          value={employmentForm.employeeType}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, employeeType: val })}
                          placeholder="Full-time"
                        />
                        <InputField
                          label="Work Shift"
                          value={employmentForm.workShift}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, workShift: val })}
                          placeholder="General Shift (9:00 - 18:00)"
                        />
                        <InputField
                          label="Employment Status"
                          value={employmentForm.employmentStatus}
                          onChange={(val) => setEmploymentForm({ ...employmentForm, employmentStatus: val })}
                          placeholder="Active"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setIsEditingEmployment(false)}
                          className="bg-card hover:bg-blue-50 border border-border text-navy-900 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 5. ACCOUNT & SECURITY TAB */}
              {activeTab === 'security' && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-navy-900 font-heading">
                      Account & Security
                    </h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        profile.user.isActive
                          ? 'bg-status-success-bg text-status-success-text border-status-success/20'
                          : 'bg-status-danger-bg text-brand-red border-status-danger/20'
                      }`}
                    >
                      {profile.user.isActive ? 'Active Account' : 'Inactive Account'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <InfoField
                      icon={ShieldCheck}
                      label="Account Status"
                      value={profile.user.isActive ? 'Active' : 'Deactivated'}
                    />
                    <InfoField
                      icon={BadgeCheck}
                      label="Role & Permissions"
                      value={formatRoleLabel(profile.user.role)}
                    />
                    <InfoField
                      icon={Clock}
                      label="Last Activity / Login"
                      value={
                        profile.lastActivityAt
                          ? formatDateTimeToIndian(profile.lastActivityAt)
                          : 'Active Session'
                      }
                    />
                    <InfoField
                      icon={Calendar}
                      label="Account Created"
                      value={
                        profile.user.createdAt
                          ? formatDateToIndian(profile.user.createdAt)
                          : 'Not available'
                      }
                    />
                  </div>

                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                      <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Security Information</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      Passwords are encrypted with bcrypt and never stored in plain text. All profile and password updates are recorded in the system audit log.
                      {profile.lastPasswordChangeAt
                        ? ` Last password update: ${formatDateTimeToIndian(profile.lastPasswordChangeAt)}.`
                        : ''}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border">
                    {!showChangePasswordForm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePasswordForm(true);
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Change Password</span>
                      </button>
                    ) : (
                      <form onSubmit={handlePasswordSubmit} className="space-y-3 bg-bg-page border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-extrabold text-navy-900">Update Password</h5>
                          <button
                            type="button"
                            onClick={() => {
                              setShowChangePasswordForm(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmNewPassword('');
                            }}
                            className="text-[11px] font-bold text-text-muted hover:text-navy-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                        <InputField
                          label="Current Password"
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(val) => {
                            setCurrentPassword(val);
                            if (formErrors.currentPassword) setFormErrors(prev => ({ ...prev, currentPassword: '' }));
                          }}
                          placeholder="Enter current password"
                          error={formErrors.currentPassword}
                        />
                        <InputField
                          label="New Password"
                          type="password"
                          required
                          value={newPassword}
                          onChange={(val) => {
                            setNewPassword(val);
                            if (formErrors.newPassword) setFormErrors(prev => ({ ...prev, newPassword: '' }));
                          }}
                          placeholder="Minimum 6 characters"
                          error={formErrors.newPassword}
                        />
                        <InputField
                          label="Confirm New Password"
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(val) => {
                            setConfirmNewPassword(val);
                            if (formErrors.confirmNewPassword) setFormErrors(prev => ({ ...prev, confirmNewPassword: '' }));
                          }}
                          placeholder="Re-enter new password"
                          error={formErrors.confirmNewPassword}
                        />
                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={savingPassword}
                            className="bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-colors shadow-sm"
                          >
                            {savingPassword ? 'Saving...' : 'Save Password'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* 6. DOCUMENTS TAB */}
              {activeTab === 'documents' && (
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-navy-900 font-heading">
                      Documents
                    </h4>
                    <label className="bg-card border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
                      <input
                        type="file"
                        onChange={handleDocumentUpload}
                        disabled={uploadingDoc}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {docs.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-border rounded-xl bg-bg-page/60 space-y-1.5">
                      <FileText className="w-7 h-7 text-text-disabled mx-auto" />
                      <p className="text-xs font-bold text-navy-900">No documents available</p>
                      <p className="text-[11px] text-text-muted">
                        Uploaded HR and financial documents for your profile will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {docs.map((doc, idx) => (
                        <div
                          key={`${doc.url}-${idx}`}
                          className="p-3 rounded-xl border border-border bg-blue-50/40 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-navy-900 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              {doc.uploadedAt && (
                                <p className="text-[10px] text-text-muted">
                                  Uploaded {formatDateToIndian(doc.uploadedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View document"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <a
                              href={doc.url}
                              download={doc.name}
                              title="Download document"
                              className="p-1.5 rounded-lg text-navy-900 hover:bg-blue-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDocumentDelete(idx)}
                              title="Remove document"
                              className="p-1.5 rounded-lg text-brand-red hover:bg-status-danger-bg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-6 text-center text-xs text-text-muted">
              Unable to load profile data.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-text-muted leading-tight">{label}</p>
        <p className="text-xs font-bold text-navy-900 mt-0.5 break-words" title={title || value}>
          {value}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-navy-900 uppercase tracking-wider mb-1">
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`block w-full rounded-xl border ${
          error ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'
        } py-2 px-3 text-xs text-navy-900 bg-card outline-none focus:ring-2 placeholder:text-text-disabled transition-all`}
      />
      {error && (
        <p className="mt-1 text-[10px] text-brand-red font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

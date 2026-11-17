'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidDate,
  isDateOrderValid,
  isNotFutureDate,
} from '@/lib/validations';
import { 
  Clock, 
  UserPlus, 
  MapPin, 
  Globe, 
  Plus, 
  History, 
  CheckSquare, 
  AlertCircle, 
  CheckCircle2, 
  FileText,
  Trash2,
  Bell,
  Check,
  Calendar,
  TrendingUp,
  Menu,
  X,
  User,
  LayoutDashboard,
  CreditCard,
  GraduationCap,
  Edit2,
  LogOut,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  UserMinus,
  ExternalLink,
  Lock,
  KeyRound,
  Home,
  Laptop,
  CalendarCheck,
  CalendarDays,
  ArrowLeftRight,
  Camera,
  TrendingDown,
  Megaphone,
  Timer,
  Umbrella,
  Plane,
  BarChart3,
  Minus,
  Sparkles,
  BriefcaseMedical,
  Palmtree
} from 'lucide-react';
import Speedometer from '@/components/Speedometer';
import BriefDetailsModal from '@/components/BriefDetailsModal';
import DesktopSidebar from '@/components/DesktopSidebar';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to capitalize employee name and ensure Surname is last
export function formatEmployeeName(nameVal: string | null | undefined): string {
  if (!nameVal) return '-';
  const capitalized = nameVal
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const parts = capitalized.split(' ');
  if (parts.length > 1 && parts[0].length === 1) {
    const initial = parts.shift();
    parts.push(initial!);
    return parts.join(' ');
  }
  return capitalized;
}

import { formatDateToIndian, formatDateTimeToIndian, formatTimeToIndian } from '@/lib/dateUtils';
export { formatDateToIndian, formatDateTimeToIndian, formatTimeToIndian };

// CountUp animations for stats
function CountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * (end - start) + start);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };
    requestAnimationFrame(update);
  }, [value]);

  return <>{mounted ? displayValue : value}</>;
}

function CountUpFloat({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let start = 0.0;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = progress * (2 - progress);
      const current = easedProgress * (end - start) + start;
      setDisplayValue(Number(current.toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayValue(end);
      }
    };
    requestAnimationFrame(update);
  }, [value]);

  return <>{mounted ? displayValue.toFixed(1) : value.toFixed(1)}</>;
}

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const, 
      stiffness: 260, 
      damping: 25 
    } 
  }
};

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: string;
  ip: string;
  tz: string;
}

interface TrackSheet {
  id: string;
  date: string;
  project: string;
  taskDescription: string;
  hours: number;
  status: string;
  notes: string | null;
  assignedByName: string | null;
  referenceLink?: string | null;
}

interface EmployeeProfile {
  id: string;
  userId: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  dateOfBirth: string | null;
  personalEmail: string | null;
  mobileNumber: string | null;
  emergencyContact: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  dateOfJoining: string | null;
  employeeType: string;
  department: string | null;
  designation: string | null;
  grade: string | null;
  location: string | null;
  businessUnit: string | null;
  hrBusinessPartner: string | null;
  employmentStatus: string;
  probationPeriod: string | null;
  confirmationDate: string | null;
  workShift: string;
  bankName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  pan: string | null;
  uan: string | null;
  financialDocuments?: string | null;
  professionalEmail?: string | null;
  insuranceNumber?: string | null;
  expectedEndDate?: string | Date | null;
  incrementPerks?: string | null;
  profileImage?: string | null;
  bankBranch?: string | null;
  bankAddress?: string | null;
  pfNumber?: string | null;
  bloodGroup?: string | null;
  timezone?: string | null;
  workLocationStatus?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    manager?: {
      name: string;
    } | null;
  };
}

interface SalaryStructure {
  id: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  effectiveFrom: string;
}

interface PayrollRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  overtime: number;
  bonus: number;
  incentives: number;
  pf: number;
  esi: number;
  professionalTax: number;
  tds: number;
  lopDeduction: number;
  loanDeduction: number;
  totalDeductions: number;
  grossEarnings: number;
  netSalary: number;
  status: string;
}

interface PerformanceGoal {
  id: string;
  goalTitle: string;
  kpi: string;
  weight: number;
  target: string;
  achievement: string | null;
  rating: number | null;
  period: string;
  status: string;
  manager: { name: string } | null;
  createdAt?: string;
}

interface TrainingAssignment {
  id: string;
  attended: boolean;
  certified: boolean;
  assessmentScore: number | null;
  feedback: string | null;
  training: {
    id: string;
    trainingName: string;
    trainer: string;
    plannedDate: string;
    durationHours: number;
    department: string | null;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
  assignedBy?: {
    id: string;
    name: string;
  } | null;
}

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function EmployeeDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 flex items-center justify-center text-xs text-text-muted font-semibold font-mono">Loading portal...</div>}>
      <EmployeeDashboardContent />
    </Suspense>
  );
}

function EmployeeDashboardContent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Session & States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [timeStr, setTimeStr] = useState('');
  const [greeting, setGreeting] = useState('');

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const subTabParam = searchParams.get('subTab');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const hrs = now.getHours();
      if (hrs < 12) setGreeting('Good morning');
      else if (hrs < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tabParam && ['dashboard', 'tasks', 'tracksheets', 'profile', 'leaves', 'payroll', 'trainings', 'history', 'resignation'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    if (subTabParam && ['leave', 'regularisation', 'wfh'].includes(subTabParam)) {
      setActiveLeaveFormTab(subTabParam as any);
      if (subTabParam === 'wfh') {
        setOpenLeaveHistorySections(prev => ({ ...prev, wfhHistory: true }));
      } else if (subTabParam === 'regularisation') {
        setOpenLeaveHistorySections(prev => ({ ...prev, regularisationHistory: true }));
      } else if (subTabParam === 'leave') {
        setOpenLeaveHistorySections(prev => ({ ...prev, leaveHistory: true }));
      }
    }
  }, [tabParam, subTabParam]);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { tab, subTab } = customEvent.detail;
        if (tab && ['dashboard', 'tasks', 'tracksheets', 'profile', 'leaves', 'payroll', 'trainings', 'history', 'resignation'].includes(tab)) {
          setActiveTab(tab as any);
        }
        if (subTab && ['leave', 'regularisation', 'wfh'].includes(subTab)) {
          setActiveLeaveFormTab(subTab as any);
          if (subTab === 'wfh') {
            setOpenLeaveHistorySections(prev => ({ ...prev, wfhHistory: true }));
          } else if (subTab === 'regularisation') {
            setOpenLeaveHistorySections(prev => ({ ...prev, regularisationHistory: true }));
          } else if (subTab === 'leave') {
            setOpenLeaveHistorySections(prev => ({ ...prev, leaveHistory: true }));
          }
        }
      }
    };
    window.addEventListener('appTabChange', handleTabChange);
    return () => window.removeEventListener('appTabChange', handleTabChange);
  }, []);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, leave: 0 });
  
  const [trackSheets, setTrackSheets] = useState<TrackSheet[]>([]);
  const [filterTrackDate, setFilterTrackDate] = useState('');
  const [filterTrackHours, setFilterTrackHours] = useState('');
  const [filterTrackStatus, setFilterTrackStatus] = useState('');
  const [filterTrackSearch, setFilterTrackSearch] = useState('');
  const [expandedSheets, setExpandedSheets] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Leave Request States
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [activeLeaveFormTab, setActiveLeaveFormTab] = useState<'leave' | 'regularisation' | 'wfh'>('leave');
  const [activeTrackSheetTab, setActiveTrackSheetTab] = useState<'log' | 'fill'>('fill');
  const [openLeaveHistorySections, setOpenLeaveHistorySections] = useState({
    leaveHistory: true,
    regularisationHistory: false,
    wfhHistory: false,
  });
  const [openLeaveBalances, setOpenLeaveBalances] = useState(false);
  const [openHolidays, setOpenHolidays] = useState(false);

  // WFH States
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [wfhPreset, setWfhPreset] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [wfhStartDate, setWfhStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [wfhEndDate, setWfhEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [wfhReason, setWfhReason] = useState('');
  const [submittingWfh, setSubmittingWfh] = useState(false);

  // Performance Score States
  const [performanceScore, setPerformanceScore] = useState<any>(null);

  // Self-Service States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'tracksheets' | 'profile' | 'leaves' | 'payroll' | 'trainings' | 'history' | 'resignation'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Profile States
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [openProfileSections, setOpenProfileSections] = useState({
    professional: true,
    contact: false,
    financial: false,
    security: false,
  });

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const formatToTitleCase = (str: string | null | undefined): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(/[\s_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Calendar History States
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedTrackSheet, setSelectedTrackSheet] = useState<any | null>(null);
  const [uploadingTaskDoc, setUploadingTaskDoc] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [resignationRequest, setResignationRequest] = useState<any>(null);
  const [resignationDate, setResignationDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [resignationReason, setResignationReason] = useState('');
  const [submittingResignation, setSubmittingResignation] = useState(false);

  const [regularisationRequests, setRegularisationRequests] = useState<any[]>([]);
  const [regDate, setRegDate] = useState('');
  const [regCheckIn, setRegCheckIn] = useState('');
  const [regCheckOut, setRegCheckOut] = useState('');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [profileForm, setProfileForm] = useState({
    mobileNumber: '',
    personalEmail: '',
    emergencyContact: '',
    currentAddress: '',
    permanentAddress: '',
    maritalStatus: 'Single',
    professionalEmail: '',
    insuranceNumber: '',
    bloodGroup: '',
    timezone: 'Asia/Kolkata',
    profileImage: '',
    gender: '',
    nationality: '',
  });
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [myPayrollRuns, setMyPayrollRuns] = useState<PayrollRun[]>([]);
  const [myTrainings, setMyTrainings] = useState<TrainingAssignment[]>([]);
  const [recentJoiners, setRecentJoiners] = useState<any[]>([]);
  const [selectedJoinerId, setSelectedJoinerId] = useState<string | null>(null);
  const [isJoinerModalOpen, setIsJoinerModalOpen] = useState(false);

  // Form States
  const [logItems, setLogItems] = useState<Array<{
    project: string;
    taskDescription: string;
    hours: string;
    notes: string;
    assignedByName: string;
    referenceLink: string;
  }>>([{ project: '', taskDescription: '', hours: '8.0', notes: '', assignedByName: '', referenceLink: '' }]);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);

  // Status handlers
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [submittingTrack, setSubmittingTrack] = useState(false);
  const [errorMsg, setErrorMsgState] = useState('');
  const [successMsg, setSuccessMsgState] = useState('');
  const [fadeSuccess, setFadeSuccess] = useState(false);
  const [fadeError, setFadeError] = useState(false);

  const successTimeoutRef = React.useRef<any>(null);
  const errorTimeoutRef = React.useRef<any>(null);

  const setSuccessMsg = (msg: string) => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current.fade);
      clearTimeout(successTimeoutRef.current.dismiss);
    }
    setSuccessMsgState(msg);
    setFadeSuccess(false);
    if (msg) {
      const fadeId = setTimeout(() => setFadeSuccess(true), 4000);
      const dismissId = setTimeout(() => {
        setSuccessMsgState('');
        setFadeSuccess(false);
      }, 4500);
      successTimeoutRef.current = { fade: fadeId, dismiss: dismissId };
    }
  };

  const setErrorMsg = (msg: string) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current.fade);
      clearTimeout(errorTimeoutRef.current.dismiss);
    }
    setErrorMsgState(msg);
    setFadeError(false);
    if (msg) {
      const fadeId = setTimeout(() => setFadeError(true), 4000);
      const dismissId = setTimeout(() => {
        setErrorMsgState('');
        setFadeError(false);
      }, 4500);
      errorTimeoutRef.current = { fade: fadeId, dismiss: dismissId };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Attendance with user timezone
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const attRes = await fetch(`/api/attendance?tz=${encodeURIComponent(userTz)}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData.attendance || []);
        setHolidays(attData.holidays || []);
        setTodayRecord(attData.todayRecord);
        if (attData.stats) setStats(attData.stats);
      }

      // 1.5. Fetch Recent Joiners (last 14 days)
      const joinersRes = await fetch('/api/employees/recent-joiners');
      if (joinersRes.ok) {
        const joinersData = await joinersRes.json();
        setRecentJoiners(joinersData.recentJoiners || []);
      }

      // 2. Fetch Track sheets
      const trackRes = await fetch('/api/tracksheets');
      if (trackRes.ok) {
        const trackData = await trackRes.json();
        setTrackSheets(trackData.trackSheets || []);
      }

      // 3. Fetch Tasks
      const taskRes = await fetch('/api/tasks?scope=assigned');
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }

      // 4. Fetch Notifications
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
        setUnreadCount(notifData.unreadCount || 0);
      }

      // 5. Fetch Leave requests
      const leaveRes = await fetch('/api/leave-requests?userId=self');
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        setLeaveRequests(leaveData.requests || []);
        setLeaveBalances(leaveData.leaveBalances || []);
      }

      // 6. Fetch Performance score
      const perfRes = await fetch('/api/admin/performance');
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        if (perfData.performanceData && perfData.performanceData.length > 0) {
          setPerformanceScore(perfData.performanceData[0].score);
        }
      }

      // 7. Fetch Employee Profile details
      const profileRes = await fetch('/api/users/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.profile) {
          setEmployeeProfile(profileData.profile);
          const sameAddr = !!profileData.profile.currentAddress && 
                           profileData.profile.currentAddress === profileData.profile.permanentAddress;
          setIsSameAddress(sameAddr);
          setProfileForm({
            mobileNumber: profileData.profile.mobileNumber || '',
            personalEmail: profileData.profile.personalEmail || '',
            emergencyContact: profileData.profile.emergencyContact || '',
            currentAddress: profileData.profile.currentAddress || '',
            permanentAddress: profileData.profile.permanentAddress || '',
            maritalStatus: profileData.profile.maritalStatus || 'Single',
            professionalEmail: profileData.profile.professionalEmail || '',
            insuranceNumber: profileData.profile.insuranceNumber || '',
            bloodGroup: profileData.profile.bloodGroup || '',
            timezone: profileData.profile.timezone || 'Asia/Kolkata',
            profileImage: profileData.profile.profileImage || '',
            gender: profileData.profile.gender || '',
            nationality: profileData.profile.nationality || '',
          });
        }
      }

      // 8. Fetch Employee Payroll Runs
      const payrollRes = await fetch('/api/payroll/runs');
      if (payrollRes.ok) {
        const payrollData = await payrollRes.json();
        setMyPayrollRuns(payrollData.runs || []);
      }



      // 10. Fetch Employee Training assignments
      const trainingRes = await fetch('/api/trainings');
      if (trainingRes.ok) {
        const trainingData = await trainingRes.json();
        setMyTrainings(trainingData.assignments || []);
      }

      // 11. Fetch Resignation request
      const resignationRes = await fetch('/api/resignation');
      if (resignationRes.ok) {
        const resignationData = await resignationRes.json();
        setResignationRequest(resignationData.request || null);
      }

      // 12. Fetch Regularisation requests
      const regularisationRes = await fetch('/api/regularisation');
      if (regularisationRes.ok) {
        const regularisationData = await regularisationRes.json();
        setRegularisationRequests(regularisationData.requests || []);
      }

      // 13. Fetch WFH requests
      const wfhRes = await fetch('/api/wfh-requests?userId=self');
      if (wfhRes.ok) {
        const wfhData = await wfhRes.json();
        setWfhRequests(wfhData.requests || []);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  const handleCheckIn = async () => {
    setLoadingAttendance(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_in', tz: userTz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check in');

      setSuccessMsg('Successfully checked in!');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during check in');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleCheckOut = async () => {
    setLoadingAttendance(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_out' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check out');

      setSuccessMsg('Successfully checked out! Shift completed.');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during check out');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSubmitTrackSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTrack(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Client-side validation across all sheets
      for (let i = 0; i < logItems.length; i++) {
        const item = logItems[i];
        if (!item.project.trim() || !item.taskDescription.trim() || !item.assignedByName.trim() || !item.hours) {
          setActiveSheetIndex(i);
          throw new Error(`Please complete all required fields in Sheet ${i + 1}.`);
        }
        if (item.referenceLink) {
          try {
            const tempUrl = item.referenceLink.startsWith('http://') || item.referenceLink.startsWith('https://') 
              ? item.referenceLink 
              : `https://${item.referenceLink}`;
            new URL(tempUrl);
          } catch (_) {
            setActiveSheetIndex(i);
            throw new Error(`Please enter a valid Reference Link URL in Sheet ${i + 1}.`);
          }
        }
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const payload = logItems.map(item => ({
        ...item,
        date: todayStr
      }));

      const res = await fetch('/api/tracksheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log hours');

      setSuccessMsg('Track sheet entries created successfully!');
      setLogItems([{ project: '', taskDescription: '', hours: '8.0', notes: '', assignedByName: '', referenceLink: '' }]);
      setActiveSheetIndex(0);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving track sheet');
    } finally {
      setSubmittingTrack(false);
    }
  };

  const handleDeleteTrackSheet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track sheet?')) return;
    try {
      const res = await fetch(`/api/tracksheets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Track sheet entry deleted.');
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Error deleting track sheet:', err);
    }
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setErrorMsg('');
    setSuccessMsg('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dest', 'profiles');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setProfileForm(prev => ({ ...prev, profileImage: data.url }));
        
        // Save the updated profile image immediately to the database
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...profileForm,
            profileImage: data.url,
            userId: employeeProfile?.userId,
          }),
        });

        setSuccessMsg('Profile image updated successfully!');
        
        // Dispatch custom event to notify Header
        window.dispatchEvent(new CustomEvent('profileImageUpdated', { detail: data.url }));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload profile image.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setErrorMsg('');
    setSuccessMsg('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dest', 'financial');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const uploadResult = await res.json();
        let docs = [];
        try {
          docs = employeeProfile?.financialDocuments ? JSON.parse(employeeProfile.financialDocuments) : [];
          if (!Array.isArray(docs)) docs = [];
        } catch {
          docs = [];
        }
        const newDoc = {
          name: file.name,
          url: uploadResult.url,
          uploadedAt: new Date().toISOString()
        };
        const updatedDocs = [...docs, newDoc];
        
        const saveRes = await fetch('/api/users/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            financialDocuments: JSON.stringify(updatedDocs),
            userId: employeeProfile?.userId,
          })
        });
        if (saveRes.ok) {
          setSuccessMsg('Financial document uploaded successfully!');
          fetchData();
        } else {
          const saveErr = await saveRes.json();
          throw new Error(saveErr.error || 'Failed to save document metadata.');
        }
      } else {
        const uploadErr = await res.json();
        throw new Error(uploadErr.error || 'Failed to upload document file.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocumentDelete = async (docIndex: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let docs = [];
      try {
        docs = employeeProfile?.financialDocuments ? JSON.parse(employeeProfile.financialDocuments) : [];
        if (!Array.isArray(docs)) docs = [];
      } catch {
        docs = [];
      }
      docs.splice(docIndex, 1);
      
      const saveRes = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financialDocuments: JSON.stringify(docs),
          userId: employeeProfile?.userId,
        })
      });
      if (saveRes.ok) {
        setSuccessMsg('Document deleted successfully!');
        fetchData();
      } else {
        const saveErr = await saveRes.json();
        throw new Error(saveErr.error || 'Failed to delete document.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting document.');
    }
  };

  const handleTaskDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTrackSheet) return;
    setUploadingTaskDoc(true);
    setErrorMsg('');
    setSuccessMsg('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dest', 'tasks');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const uploadResult = await res.json();
        let docs = [];
        try {
          docs = selectedTrackSheet.supportingDocuments ? JSON.parse(selectedTrackSheet.supportingDocuments) : [];
          if (!Array.isArray(docs)) docs = [];
        } catch {
          docs = [];
        }
        const newDoc = {
          name: file.name,
          url: uploadResult.url,
          uploadedAt: new Date().toISOString()
        };
        const updatedDocs = [...docs, newDoc];
        
        const saveRes = await fetch('/api/tracksheets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: selectedTrackSheet.id,
            supportingDocuments: JSON.stringify(updatedDocs)
          })
        });
        if (saveRes.ok) {
          const saveResult = await saveRes.json();
          setSuccessMsg('Supporting document uploaded successfully!');
          setSelectedTrackSheet(saveResult.trackSheet);
          fetchData();
        } else {
          const saveErr = await saveRes.json();
          throw new Error(saveErr.error || 'Failed to save document metadata.');
        }
      } else {
        const uploadErr = await res.json();
        throw new Error(uploadErr.error || 'Failed to upload document file.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading document.');
    } finally {
      setUploadingTaskDoc(false);
    }
  };

  const handleTaskDocDelete = async (docIndex: number) => {
    if (!selectedTrackSheet) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      let docs = [];
      try {
        docs = selectedTrackSheet.supportingDocuments ? JSON.parse(selectedTrackSheet.supportingDocuments) : [];
        if (!Array.isArray(docs)) docs = [];
      } catch {
        docs = [];
      }
      docs.splice(docIndex, 1);
      
      const saveRes = await fetch('/api/tracksheets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTrackSheet.id,
          supportingDocuments: JSON.stringify(docs)
        })
      });
      if (saveRes.ok) {
        const saveResult = await saveRes.json();
        setSuccessMsg('Document deleted successfully!');
        setSelectedTrackSheet(saveResult.trackSheet);
        fetchData();
      } else {
        const saveErr = await saveRes.json();
        throw new Error(saveErr.error || 'Failed to delete document.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting document.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.personalEmail && !isValidEmail(profileForm.personalEmail)) {
      setErrorMsg('Please enter a valid personal email address.');
      return;
    }
    if (profileForm.mobileNumber && !isValidPhone(profileForm.mobileNumber)) {
      setErrorMsg('Please enter a valid mobile number (e.g. 10 digits).');
      return;
    }

    setLoadingAttendance(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          userId: employeeProfile?.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccessMsg('Your personal profile details updated successfully!');
      setIsEditingContact(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPasswordSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Error changing password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmitResignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastWorkingDay) {
      setErrorMsg('Please select your proposed last working day.');
      return;
    }
    if (new Date(lastWorkingDay).getTime() <= new Date().setHours(0, 0, 0, 0)) {
      setErrorMsg('Proposed last working day must be a future date.');
      return;
    }
    if (!resignationReason.trim() || resignationReason.trim().length < 10) {
      setErrorMsg('Please provide a detailed reason for resignation (minimum 10 characters).');
      return;
    }

    setSubmittingResignation(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/resignation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resignationDate,
          lastWorkingDay,
          reason: resignationReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit resignation request');
      setSuccessMsg('Your resignation request has been submitted successfully!');
      setResignationReason('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting resignation');
    } finally {
      setSubmittingResignation(false);
    }
  };

  const handleSubmitRegularisation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regDate) {
      setErrorMsg('Please select the date to regularise.');
      return;
    }
    if (!isNotFutureDate(regDate)) {
      setErrorMsg('Regularisation date cannot be in the future.');
      return;
    }
    if (!regCheckIn || !regCheckOut) {
      setErrorMsg('Please specify both Check-in and Check-out times.');
      return;
    }
    if (!regReason.trim() || regReason.trim().length < 5) {
      setErrorMsg('Please provide a reason for regularisation (minimum 5 characters).');
      return;
    }

    setSubmittingReg(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/regularisation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: regDate,
          checkInTime: regCheckIn || null,
          checkOutTime: regCheckOut || null,
          reason: regReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit regularisation request');
      setSuccessMsg('Regularisation request submitted successfully!');
      setRegDate('');
      setRegCheckIn('');
      setRegCheckOut('');
      setRegReason('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting regularisation');
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) {
      setErrorMsg('Please select a leave category.');
      return;
    }
    if (!leaveStartDate || !leaveEndDate) {
      setErrorMsg('Please specify both Start Date and End Date for your leave.');
      return;
    }
    if (!isDateOrderValid(leaveStartDate, leaveEndDate)) {
      setErrorMsg('Leave Start Date must be on or before End Date.');
      return;
    }
    if (!leaveReason.trim() || leaveReason.trim().length < 5) {
      setErrorMsg('Please provide a reason for your leave request (minimum 5 characters).');
      return;
    }

    setSubmittingLeave(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveTypeId,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave request');

      setSuccessMsg('Leave request submitted successfully!');
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
      setLeaveTypeId('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting leave request');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleSubmitWfhRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfhStartDate || !wfhEndDate) {
      setErrorMsg('Please specify both Start Date and End Date for Work From Home.');
      return;
    }
    if (!isDateOrderValid(wfhStartDate, wfhEndDate)) {
      setErrorMsg('Work From Home Start Date must be on or before End Date.');
      return;
    }
    if (!wfhReason.trim() || wfhReason.trim().length < 5) {
      setErrorMsg('Please provide a reason for Work From Home (minimum 5 characters).');
      return;
    }

    setSubmittingWfh(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/wfh-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: wfhStartDate,
          endDate: wfhEndDate,
          reason: wfhReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit WFH request');

      setSuccessMsg('Work From Home request submitted successfully!');
      setWfhReason('');
      setWfhPreset('today');
      const todayStr = new Date().toISOString().split('T')[0];
      setWfhStartDate(todayStr);
      setWfhEndDate(todayStr);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting WFH request');
    } finally {
      setSubmittingWfh(false);
    }
  };

  const handleUpdateTaskStatus = async (id: string, currentStatus: string) => {
    let nextStatus = 'TODO';
    if (currentStatus === 'TODO') nextStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') nextStatus = 'COMPLETED';
    else return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        setSuccessMsg(`Task status updated to ${nextStatus.replace('_', ' ')}!`);
        fetchData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to update task');
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) {
        setUnreadCount(0);
        fetchData();
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  // Helper date conversions
  const formatTime = (isoString: string | null | undefined) => {
    return formatTimeToIndian(isoString);
  };

  const isCheckInLate = (isoString: string | null) => {
    if (!isoString) return false;
    try {
      const date = new Date(isoString);
      const options = { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false } as const;
      const timeStr = new Intl.DateTimeFormat('en-US', options).format(date);
      const [hour, minute] = timeStr.split(':').map(Number);
      return hour > 9 || (hour === 9 && minute > 30);
    } catch (e) {
      return false;
    }
  };

  const employeeNavItems: {
    id: 'dashboard' | 'tasks' | 'tracksheets' | 'profile' | 'leaves' | 'payroll' | 'trainings' | 'history' | 'resignation';
    label: string;
    icon: any;
  }[] = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'tracksheets', label: 'My Track Sheets', icon: FileText },
    { id: 'leaves', label: 'My Leaves & Requests', icon: Calendar },
    { id: 'history', label: 'My Attendance History', icon: History },
    { id: 'payroll', label: 'My Payroll & Payslip', icon: CreditCard },
    { id: 'trainings', label: 'My Trainings', icon: GraduationCap },
    { id: 'resignation', label: 'Resignation', icon: UserMinus },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Header />

      {/* Mobile Nav Toggle Bar */}
      <div className="md:hidden bg-white/60 backdrop-blur-md border-b border-border/50 px-4 py-3.5 flex items-center justify-between sticky top-[73px] z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-navy-900 border border-border"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">
            {employeeNavItems.find(item => item.id === activeTab)?.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Persistent Left Sidebar - Desktop */}
        <DesktopSidebar
          navItems={employeeNavItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          layoutPillId="activeTabPill"
          bottomLink={
            employeeProfile?.user?.role === 'TL'
              ? {
                  href: '/tl',
                  label: 'Team Leader Board',
                  icon: ArrowLeftRight,
                }
              : null
          }
        />

        {/* Mobile Slide-over Drawer */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            
            <aside className="relative flex w-full max-w-xs flex-col bg-white border-r border-border py-4 shadow-xl h-full animate-in slide-in-from-left duration-200 text-navy-900">
              <div className="flex items-center justify-between px-4 pb-4 border-b border-border mb-4">
                <span className="text-sm font-extrabold text-navy-900 font-heading">Employee Portal</span>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="text-text-muted hover:text-text-muted p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto space-y-1">
                {employeeNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full text-left py-3 px-4 flex items-center gap-3 transition-all cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-blue-50 border-l-4 border-navy-900 text-navy-900 font-extrabold' 
                        : 'border-l-4 border-transparent text-text-muted hover:bg-blue-50 hover:text-navy-900 font-semibold'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${activeTab === item.id ? 'text-navy-900' : 'text-text-muted'}`} />
                    <span className="text-xs tracking-wide">{item.label}</span>
                  </button>
                ))}
              </nav>

              {employeeProfile?.user?.role === 'TL' && (
                <div className="mt-auto px-4 border-t border-border pt-4 mb-4">
                  <Link
                    href="/tl"
                    className="w-full text-left py-3 px-4 flex items-center gap-3 transition-all cursor-pointer rounded-xl text-text-muted hover:text-navy-900 hover:bg-blue-50"
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0 text-text-muted" />
                    <span className="text-xs font-semibold tracking-wide">
                      Team Leader Board
                    </span>
                  </Link>
                </div>
              )}
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:pt-4 md:px-8 md:pb-12 w-full max-w-7xl mx-auto">

        {/* Tab Content Panels */}
        <div className="flex-1 space-y-6">
          {/* Alerts center inside main content so it stays visible */}
          <div>
            {errorMsg && (
              <div className={`mb-4 rounded-lg bg-status-danger-bg p-4 text-sm text-brand-red flex items-start justify-between gap-2.5 border border-status-danger/20 transition-all duration-500 ease-in-out ${fadeError ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button 
                  onClick={() => setErrorMsg('')} 
                  className="text-brand-red hover:text-status-danger-text font-extrabold text-base ml-2 outline-none cursor-pointer leading-none"
                  aria-label="Dismiss error alert"
                >
                  &times;
                </button>
              </div>
            )}
            {successMsg && (
              <div className={`mb-4 rounded-lg bg-status-success-bg p-4 text-sm text-status-success-text flex items-start justify-between gap-2.5 border border-status-success/20 transition-all duration-500 ease-in-out ${fadeSuccess ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-status-success-text" />
                  <span>{successMsg}</span>
                </div>
                <button 
                  onClick={() => setSuccessMsg('')} 
                  className="text-status-success-text hover:text-status-success-text font-extrabold text-base ml-2 outline-none cursor-pointer leading-none"
                  aria-label="Dismiss success alert"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: Dashboard */}
          {activeTab === 'dashboard' && (() => {
            // 1. Performance score & rating
            const displayRating = performanceScore?.rating || 'YELLOW';
            let displayScore = performanceScore?.autoScore ?? 38;
            if (performanceScore?.manualOverride) {
              displayScore = performanceScore.overrideScore !== null && performanceScore.overrideScore !== undefined
                ? performanceScore.overrideScore
                : (displayRating === 'RED' ? 15 : displayRating === 'YELLOW' ? 38 : displayRating === 'GREEN' ? 63 : 88);
            }

            // 2. Working hours calculation
            const todayWorkHoursStr = (() => {
              if (!todayRecord || !todayRecord.checkInTime) return '0h 0m';
              const start = new Date(todayRecord.checkInTime).getTime();
              const end = todayRecord.checkOutTime 
                ? new Date(todayRecord.checkOutTime).getTime()
                : Date.now();
              const diffMs = Math.max(0, end - start);
              const totalMins = Math.floor(diffMs / (1000 * 60));
              const hrs = Math.floor(totalMins / 60);
              const mins = totalMins % 60;
              return `${hrs}h ${mins}m`;
            })();

            // 3. Stats calculations
            const avgWorkingHours = (() => {
              const currentMonthPrefix = new Date().toLocaleDateString('en-CA').slice(0, 7);
              const monthlyTrack = trackSheets.filter(t => t.date.startsWith(currentMonthPrefix));
              if (monthlyTrack.length > 0) {
                return (monthlyTrack.reduce((sum, item) => sum + item.hours, 0) / monthlyTrack.length).toFixed(1);
              }
              return '8.0';
            })();

            const monthlyAttendancePct = (() => {
              const totalLoggedDays = stats.present + stats.late + stats.absent + stats.leave;
              if (totalLoggedDays > 0) {
                return Math.min(100, Math.round(((stats.present + stats.late) / totalLoggedDays) * 100));
              }
              return 67;
            })();

            // 4. Tasks Summary calculation
            const hasRealTasks = tasks && tasks.length > 0;
            const totalTasks = hasRealTasks ? tasks.length : 12;
            const completedTasks = hasRealTasks ? tasks.filter(t => t.status === 'COMPLETED').length : 6;
            const inProgressTasks = hasRealTasks ? tasks.filter(t => t.status === 'IN_PROGRESS').length : 4;
            const notStartedTasks = hasRealTasks ? tasks.filter(t => t.status === 'TODO').length : 2;

            const compPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            const progPct = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;
            const notPct = totalTasks > 0 ? Math.max(0, 100 - compPct - progPct) : 0;

            // 5. Leave Summary calculation
            const casualBalItem = leaveBalances.find(b => b.name?.toLowerCase().includes('casual'));
            const sickBalItem = leaveBalances.find(b => b.name?.toLowerCase().includes('sick'));
            const annualBalItem = leaveBalances.find(b => b.name?.toLowerCase().includes('annual') || b.name?.toLowerCase().includes('earned'));

            const casualLeaveBal = casualBalItem?.daysRemaining ?? (leaveBalances[0]?.daysRemaining ?? 8);
            const sickLeaveBal = sickBalItem?.daysRemaining ?? (leaveBalances[1]?.daysRemaining ?? 4);
            const annualLeaveBal = annualBalItem?.daysRemaining ?? (leaveBalances[2]?.daysRemaining ?? 10);

            // 6. Current Week Days for Weekly Attendance
            const current = new Date();
            const currentDay = current.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
            const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
            const monday = new Date(current);
            monday.setDate(current.getDate() + diffToMonday);

            const weekDays = [0, 1, 2, 3, 4].map(offset => {
              const d = new Date(monday);
              d.setDate(monday.getDate() + offset);
              const isoDate = d.toLocaleDateString('en-CA');
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const dateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
              const isToday = isoDate === new Date().toLocaleDateString('en-CA');
              const record = attendance.find(a => a.date === isoDate);
              const holiday = holidays.find(h => h.date === isoDate);
              return { isoDate, dayName, dateFormatted, isToday, record, holiday };
            });

            // 7. Announcements list
            const announcementsList: Array<{ title: string; date: string; type: 'announcement' | 'holiday' }> = [
              {
                title: 'Dasara Celebrations 2026 – Event Photos are now available!',
                date: '10 Nov 2026',
                type: 'announcement'
              }
            ];
            const upcomingHoliday = holidays
              .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            if (upcomingHoliday) {
              announcementsList.push({
                title: `Upcoming Holiday: ${upcomingHoliday.name} – ${formatDateToIndian(upcomingHoliday.date)}`,
                date: '08 Nov 2026',
                type: 'holiday'
              });
            } else {
              announcementsList.push({
                title: 'Upcoming Holiday: Diwali – 12 Nov 2026',
                date: '08 Nov 2026',
                type: 'holiday'
              });
            }

            return (
              <motion.div 
                initial="hidden"
                animate="show"
                variants={containerVariants}
                className="space-y-5"
              >
                {/* SECTION 1: ATTENDANCE & PERFORMANCE ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                  {/* Left: Attendance Logging Card (7 cols) */}
                  <motion.div 
                    variants={cardVariants}
                    className="premium-card p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between"
                  >
                    {/* Header Row: Greeting & Clock */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-border/60">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-navy-900 font-heading tracking-tight">
                          {greeting}, {employeeProfile?.user?.name || 'Member'}!
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {formatDateToIndian(new Date())}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50/70 px-3.5 py-1.5 rounded-xl border border-blue-100 text-navy-900 shadow-xs">
                        <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="font-mono text-xs sm:text-sm font-extrabold tracking-wider">
                          {timeStr || '--:--:--'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: 3 Equally Sized Cards (Check In, Check Out, Working Hours - NO Break Time) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                      {/* 1. Check In */}
                      <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3.5 flex flex-col justify-between min-h-[96px] shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] text-text-muted font-bold leading-tight">Check In</p>
                            <p className="text-base sm:text-lg font-extrabold text-navy-900 leading-tight mt-0.5">
                              {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '--:--'}
                            </p>
                          </div>
                        </div>
                        {todayRecord?.checkInTime && (
                          <div className="mt-1">
                            <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                              todayRecord.status === 'LATE' || isCheckInLate(todayRecord.checkInTime)
                                ? 'bg-status-danger-bg text-brand-red border border-status-danger/20'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {todayRecord.status === 'LATE' || isCheckInLate(todayRecord.checkInTime) ? 'Late' : 'Early Leaving'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 2. Check Out */}
                      <div className="bg-blue-50/70 border border-blue-100/80 rounded-2xl p-3.5 flex flex-col justify-between min-h-[96px] shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] text-text-muted font-bold leading-tight">Check Out</p>
                            <p className="text-base sm:text-lg font-extrabold text-navy-900 leading-tight mt-0.5">
                              {todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : '--:--'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Working Hours */}
                      <div className="bg-purple-50/70 border border-purple-100/80 rounded-2xl p-3.5 flex flex-col justify-between min-h-[96px] shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white border border-purple-200 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                            <Timer className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[11px] text-text-muted font-bold leading-tight">Working Hours</p>
                            <p className="text-base sm:text-lg font-extrabold text-navy-900 leading-tight mt-0.5">
                              {todayWorkHoursStr}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status / Actions */}
                    <div className="w-full">
                      {todayRecord?.checkInTime && todayRecord?.checkOutTime ? (
                        <div className="w-full text-center bg-emerald-50/80 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm border border-emerald-200 flex items-center justify-center gap-2 shadow-xs">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                          <span>Shift Completed</span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleCheckIn}
                            disabled={loadingAttendance || (!!todayRecord && !!todayRecord.checkInTime)}
                            className={`flex-1 font-bold py-2.5 px-4 rounded-xl transition-all text-xs text-center uppercase tracking-wider flex items-center justify-center gap-2 ${
                              ((!todayRecord || (todayRecord.status === 'WFH' && !todayRecord.checkInTime)) && !loadingAttendance)
                                ? 'bg-blue-600 hover:bg-navy-700 text-white cursor-pointer shadow-sm'
                                : 'bg-blue-50 border border-border text-text-muted cursor-not-allowed'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            {loadingAttendance && (!todayRecord || !todayRecord.checkInTime) ? 'Processing...' : (todayRecord?.status === 'WFH' && !todayRecord.checkInTime ? 'Check In (WFH)' : 'Check In')}
                          </button>

                          <button
                            onClick={handleCheckOut}
                            disabled={loadingAttendance || !todayRecord || !todayRecord.checkInTime || !!todayRecord.checkOutTime}
                            className={`flex-1 font-bold py-2.5 px-4 rounded-xl transition-all text-xs text-center uppercase tracking-wider flex items-center justify-center gap-2 ${
                              (todayRecord && todayRecord.checkInTime && !todayRecord.checkOutTime && !loadingAttendance)
                                ? 'bg-navy-900 hover:bg-black text-white cursor-pointer shadow-sm'
                                : 'bg-blue-50 border border-border text-text-muted cursor-not-allowed'
                            }`}
                          >
                            <LogOut className="w-4 h-4" />
                            {loadingAttendance && todayRecord && !todayRecord.checkOutTime ? 'Processing...' : 'Check Out'}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Right: Performance Section Card (5 cols) */}
                  <motion.div 
                    variants={cardVariants}
                    className="premium-card p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Header: Title and Badge */}
                    <div className="flex justify-between items-center pb-2 border-b border-border/60">
                      <h3 className="text-sm font-extrabold text-navy-900 font-heading flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                        Performance
                      </h3>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border shadow-xs ${
                        displayRating === 'BLUE' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        displayRating === 'GREEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        displayRating === 'YELLOW' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {displayRating === 'BLUE' ? 'Excellent' :
                         displayRating === 'GREEN' ? 'Good' :
                         displayRating === 'YELLOW' ? 'Average' :
                         'Needs Improvement'} ({Math.round(displayScore)})
                      </span>
                    </div>

                    {/* Body: Gauge on Left & Score Details on Right */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 my-auto">
                      <div className="flex-1 flex justify-center items-center w-full max-w-[340px]">
                        <Speedometer score={displayScore} rating={displayRating} size={330} />
                      </div>
                      <div className="flex flex-col text-left shrink-0 sm:pl-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-navy-900 font-mono tracking-tight leading-none">
                            {Math.round(displayScore)}
                          </span>
                          <span className="text-sm font-bold text-text-muted">/ 100</span>
                        </div>
                        <span className="text-[11px] font-semibold text-text-muted mt-0.5">
                          Performance Score
                        </span>
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mt-3">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>+5 pts</span>
                        </div>
                        <span className="text-[10px] text-text-muted">vs last month</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* SECTION 2: ATTENDANCE STATISTICS BAR */}
                <motion.div 
                  variants={cardVariants}
                  className="premium-card p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-border"
                >
                  {/* 1. Presents */}
                  <div className="flex items-center gap-3.5 justify-center py-1 md:py-0 px-2 sm:px-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-2xl font-extrabold font-mono text-navy-900 leading-none">
                        <CountUp value={stats.present} />
                      </span>
                      <span className="text-[10px] font-bold text-text-muted mt-1 block uppercase tracking-wider">PRESENTS</span>
                    </div>
                  </div>

                  {/* 2. Lates */}
                  <div className="flex items-center gap-3.5 justify-center py-1 md:py-0 px-2 sm:px-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-xs">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-2xl font-extrabold font-mono text-brand-red leading-none">
                        <CountUp value={stats.late} />
                      </span>
                      <span className="text-[10px] font-bold text-text-muted mt-1 block uppercase tracking-wider">LATES</span>
                    </div>
                  </div>

                  {/* 3. Leaves */}
                  <div className="flex items-center gap-3.5 justify-center py-1 md:py-0 px-2 sm:px-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="block text-2xl font-extrabold font-mono text-navy-900 leading-none">
                        <CountUp value={stats.leave} />
                      </span>
                      <span className="text-[10px] font-bold text-text-muted mt-1 block uppercase tracking-wider">LEAVES</span>
                    </div>
                  </div>

                  {/* 4. Avg Hours */}
                  <div className="flex items-center gap-3.5 justify-center py-1 md:py-0 px-2 sm:px-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="flex items-baseline gap-0.5 text-2xl font-extrabold font-mono text-navy-900 leading-none">
                        {avgWorkingHours}h
                      </span>
                      <span className="text-[10px] font-bold text-text-muted mt-1 block uppercase tracking-wider">AVG HOURS</span>
                    </div>
                  </div>

                  {/* 5. Attendance This Month */}
                  <div className="flex items-center gap-3.5 justify-center py-1 md:py-0 px-2 sm:px-4 col-span-2 sm:col-span-1">
                    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                      <svg className="w-11 h-11 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-emerald-100"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500 transition-all duration-1000 ease-out"
                          strokeDasharray={`${monthlyAttendancePct}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-extrabold text-navy-900 font-mono">
                        {monthlyAttendancePct}%
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-tight block max-w-[95px]">
                        ATTENDANCE THIS MONTH
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* SECTION 3: MY TASKS SUMMARY & LEAVE SUMMARY */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* Left: My Tasks Summary */}
                  <motion.div variants={cardVariants} className="premium-card p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                        <h3 className="text-sm font-extrabold text-navy-900 font-heading">My Tasks Summary</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="text-xs font-bold text-blue-600 hover:text-navy-700 flex items-center gap-1 transition-colors cursor-pointer group"
                      >
                        <span>View Tasks</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-3 my-auto">
                      {/* Donut Chart */}
                      <div 
                        className="w-28 h-28 rounded-full flex items-center justify-center shrink-0 shadow-xs relative"
                        style={{
                          background: totalTasks === 0 
                            ? '#E2E8F0' 
                            : `conic-gradient(#16A34A 0% ${compPct}%, #005A9C ${compPct}% ${compPct + progPct}%, #CBD5E1 ${compPct + progPct}% 100%)`
                        }}
                      >
                        <div className="w-18 h-18 bg-card rounded-full flex flex-col items-center justify-center shadow-inner">
                          <span className="text-xl font-extrabold text-navy-900 font-mono leading-none">{totalTasks}</span>
                          <span className="text-[9px] text-text-muted font-bold mt-0.5">Total Tasks</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-2.5 flex-1 max-w-[220px] w-full">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                            <span className="font-semibold text-text-muted">Completed</span>
                          </div>
                          <span className="font-bold text-navy-900">{completedTasks} Tasks ({compPct}%)</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                            <span className="font-semibold text-text-muted">In Progress</span>
                          </div>
                          <span className="font-bold text-navy-900">{inProgressTasks} Tasks ({progPct}%)</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0" />
                            <span className="font-semibold text-text-muted">Not Started</span>
                          </div>
                          <span className="font-bold text-navy-900">{notStartedTasks} Tasks ({notPct}%)</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Right: Leave Summary */}
                  <motion.div variants={cardVariants} className="premium-card p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                        <h3 className="text-sm font-extrabold text-navy-900 font-heading">Leave Summary</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('leaves')}
                        className="text-xs font-bold text-blue-600 hover:text-navy-700 flex items-center gap-1 transition-colors cursor-pointer group"
                      >
                        <span>Apply Leave</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-auto py-3">
                      {/* 1. Casual Leave */}
                      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-center gap-3 min-h-[88px] shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-[#1672B8] flex items-center justify-center shrink-0">
                          <CalendarDays size={28} className="text-[#1672B8]" strokeWidth={2} />
                        </div>
                        <div>
                          <span className="block text-2xl font-extrabold font-mono text-navy-900 leading-none">
                            {casualLeaveBal}
                          </span>
                          <span className="text-[11px] font-bold text-text-muted mt-1 block">Casual Leave</span>
                        </div>
                      </div>

                      {/* 2. Sick Leave */}
                      <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 flex items-center gap-3 min-h-[88px] shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-[#8738D6] flex items-center justify-center shrink-0">
                          <BriefcaseMedical size={28} className="text-[#8738D6]" strokeWidth={2} />
                        </div>
                        <div>
                          <span className="block text-2xl font-extrabold font-mono text-navy-900 leading-none">
                            {sickLeaveBal}
                          </span>
                          <span className="text-[11px] font-bold text-text-muted mt-1 block">Sick Leave</span>
                        </div>
                      </div>

                      {/* 3. Annual Leave */}
                      <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 flex items-center gap-3 min-h-[88px] shadow-xs">
                        <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-[#D98A00] flex items-center justify-center shrink-0">
                          <Palmtree size={28} className="text-[#D98A00]" strokeWidth={2} />
                        </div>
                        <div>
                          <span className="block text-2xl font-extrabold font-mono text-navy-900 leading-none">
                            {annualLeaveBal}
                          </span>
                          <span className="text-[11px] font-bold text-text-muted mt-1 block">Annual Leave</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* SECTION 4: ATTENDANCE (THIS WEEK) & ANNOUNCEMENTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* Left: Attendance (This Week) */}
                  <motion.div variants={cardVariants} className="premium-card p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                        <h3 className="text-sm font-extrabold text-navy-900 font-heading">Attendance (This Week)</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="text-xs font-bold text-blue-600 hover:text-navy-700 flex items-center gap-1 transition-colors cursor-pointer group"
                      >
                        <span>View History</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2 my-auto py-3">
                      {weekDays.map((item) => (
                        <div 
                          key={item.isoDate}
                          className={`flex flex-col items-center justify-between text-center min-h-[100px] py-2 px-1 transition-all ${
                            item.isToday 
                              ? 'bg-blue-50/80 border border-blue-200/80 rounded-2xl shadow-xs' 
                              : 'rounded-2xl'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-navy-900">{item.dayName}</span>
                            <span className="block text-[11px] font-semibold text-text-muted mt-0.5">{item.dateFormatted}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            {item.holiday ? (
                              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs" title={`Holiday: ${item.holiday.name}`}>
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                            ) : (item.record?.status === 'PRESENT' || (item.record?.checkInTime && (!item.record?.status || item.record.status === 'PRESENT' || item.record.status === 'EARLY_LEAVING'))) ? (
                              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs" title="Present">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : item.record?.status === 'LATE' ? (
                              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs" title="Late">
                                <Clock className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : item.record?.status === 'LEAVE' ? (
                              <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs" title="Leave">
                                <Calendar className="w-3.5 h-3.5" />
                              </div>
                            ) : item.record?.status === 'ABSENT' ? (
                              <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs" title="Absent">
                                <X className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full border border-border text-text-disabled flex items-center justify-center" title="Pending">
                                <Minus className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Right: Announcements */}
                  <motion.div variants={cardVariants} className="premium-card p-5 sm:p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                        <h3 className="text-sm font-extrabold text-navy-900 font-heading">Announcements</h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="text-xs font-bold text-blue-600 hover:text-navy-700 flex items-center gap-1 transition-colors cursor-pointer group"
                      >
                        <span>View All</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    <div className="space-y-3 my-auto py-3">
                      {announcementsList.map((item, idx) => (
                        <div 
                          key={idx}
                          className="bg-blue-50/50 hover:bg-blue-50 border border-border/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-600 flex items-center justify-center shrink-0">
                              {item.type === 'holiday' ? <Calendar className="w-4 h-4" /> : <Megaphone className="w-4 h-4" />}
                            </div>
                            <p className="text-xs font-bold text-navy-900 truncate" title={item.title}>
                              {item.title}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-text-muted shrink-0 whitespace-nowrap">
                            {item.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })()}

          {/* TAB 1.1: My Tasks Page */}
          {activeTab === 'tasks' && (
            <div className="premium-card p-0 overflow-hidden space-y-0">
              {/* Header Title strip with Navy Blue background */}
              <div className="bg-navy-900 px-5 py-3 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <CheckSquare className="w-4.5 h-4.5 text-white" />
                  My Assigned Tasks
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  View and complete tasks assigned to you by your Team Leader.
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-text-muted">
                    <CheckSquare className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                    No tasks assigned to you currently.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="p-4 rounded-xl border border-border bg-blue-50 hover:bg-white hover:shadow-md hover:border-gray-250 transition-all flex flex-col justify-between min-h-[160px]"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h4 className="text-sm font-bold text-navy-900 line-clamp-2">{task.title}</h4>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                            task.priority === 'HIGH' ? 'bg-status-danger-bg text-brand-red border border-status-danger/20' : 'bg-blue-50 text-navy-700'
                          }`}>{task.priority}</span>
                        </div>
                        <p className="text-xs text-text-muted line-clamp-3 leading-normal mb-2.5">{task.description}</p>
                        <div className="text-[11px] text-text-muted mb-3 flex items-center gap-1.5">
                          <span className="font-semibold text-text-muted">Assigned by:</span>
                          <span className="font-bold text-navy-900">{task.assignedBy?.name ? formatEmployeeName(task.assignedBy.name) : 'Team Leader'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-border text-xs text-text-muted mt-auto">
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-navy-700">Due: {formatDateToIndian(task.dueDate)}</span>
                          <span className="text-[10px] text-text-muted font-medium mt-0.5">Timezone: IST (Asia/Kolkata)</span>
                        </div>
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                          disabled={task.status === 'COMPLETED'}
                          className={`font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            task.status === 'COMPLETED' 
                              ? 'bg-status-success-bg text-status-success-text cursor-default' 
                              : 'bg-blue-600 text-white hover:bg-navy-700 shadow-sm'
                          }`}
                        >
                          {task.status === 'COMPLETED' ? 'Completed' : 'Start Task'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          )}

          {/* TAB 1.2: My Track Sheets Page */}
          {activeTab === 'tracksheets' && (
            <div className="premium-card p-0 overflow-hidden space-y-0">
              {/* Header Title strip with Navy Blue background */}
              <div className="bg-navy-900 px-5 py-3 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-white" />
                  My Track Sheets
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  {activeTrackSheetTab === 'log'
                    ? 'Review your submitted work hours logs and their current approval status.'
                    : 'Log your daily work hours and task details.'}
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {/* Tab Switch Headers (placed below the header) */}
                <div className="flex border border-border rounded-xl overflow-hidden shadow-2xs w-full max-w-lg mx-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTrackSheetTab('fill')}
                    className={`flex-1 text-center py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTrackSheetTab === 'fill'
                        ? 'bg-navy-900 text-white'
                        : 'bg-blue-50 text-text-muted hover:bg-blue-50'
                    }`}
                  >
                    Track sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTrackSheetTab('log')}
                    className={`flex-1 text-center py-2 text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                      activeTrackSheetTab === 'log'
                        ? 'bg-navy-900 text-white'
                        : 'bg-blue-50 text-text-muted hover:bg-blue-50'
                    }`}
                  >
                    Sheets History
                  </button>
                </div>

                {/* TAB 1: Fill Track Sheet */}
                {activeTrackSheetTab === 'fill' && (
                  <div className="animate-in fade-in duration-200 max-w-lg mx-auto w-full text-left">
                    <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-xs">
                      {/* Name of the form section */}
                      <div className="bg-blue-50 border-b border-border px-5 py-3 flex items-center justify-between">
                        <h4 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">Daily Track Sheet Form</h4>
                        <span className="text-[11px] font-bold text-text-muted">
                          Sheet {activeSheetIndex + 1} of {logItems.length}
                        </span>
                      </div>

                      {/* Excel-style Sheet Tabs */}
                      <div className="bg-blue-50/90 border-b border-border px-3 pt-2.5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar-container">
                        {logItems.map((_, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActiveSheetIndex(idx)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all cursor-pointer select-none border-t border-x shrink-0 ${
                              activeSheetIndex === idx
                                ? 'bg-white text-status-success-text border-input-border border-b-2 border-b-emerald-600 shadow-2xs'
                                : 'bg-blue-50/80 text-text-muted border-input-border/60 hover:bg-blue-50 hover:text-navy-900'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5 text-status-success-text" />
                            <span>Sheet {idx + 1}</span>
                            {logItems.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newItems = logItems.filter((_, i) => i !== idx);
                                  setLogItems(newItems);
                                  if (activeSheetIndex >= newItems.length) {
                                    setActiveSheetIndex(Math.max(0, newItems.length - 1));
                                  } else if (activeSheetIndex === idx && idx > 0) {
                                    setActiveSheetIndex(idx - 1);
                                  }
                                }}
                                className="text-text-muted hover:text-status-danger-text rounded p-0.5 ml-1 transition-colors"
                                title={`Delete Sheet ${idx + 1}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const newIndex = logItems.length;
                            setLogItems([
                              ...logItems,
                              { project: '', taskDescription: '', hours: '8.0', notes: '', assignedByName: '', referenceLink: '' }
                            ]);
                            setActiveSheetIndex(newIndex);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-status-success-bg hover:bg-status-success-bg text-status-success-text border border-emerald-250 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 mb-1"
                          title="Add Sheet"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Add Sheet</span>
                        </button>
                      </div>

                      <form onSubmit={handleSubmitTrackSheet} className="p-5 space-y-4">
                        {(() => {
                          const item = logItems[activeSheetIndex] || logItems[0];
                          const index = activeSheetIndex;
                          return (
                            <div className="p-5 bg-blue-50/80 border border-border rounded-xl space-y-4 relative">
                              {/* Row 1: Task / Project */}
                              <div>
                                <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                                  Task / Project <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={item.project}
                                  onChange={(e) => {
                                    const updated = [...logItems];
                                    updated[index].project = e.target.value;
                                    setLogItems(updated);
                                  }}
                                  placeholder="e.g. API Integration"
                                  className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                                />
                              </div>

                              {/* Row 2: Hours and Assigned By Side by Side */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                                    Hours <span className="text-red-500 font-bold ml-0.5">*</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="24"
                                    required
                                    value={item.hours}
                                    onChange={(e) => {
                                      const updated = [...logItems];
                                      updated[index].hours = e.target.value;
                                      setLogItems(updated);
                                    }}
                                    className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                                    Assigned By <span className="text-red-500 font-bold ml-0.5">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={item.assignedByName}
                                    onChange={(e) => {
                                      const updated = [...logItems];
                                      updated[index].assignedByName = e.target.value;
                                      setLogItems(updated);
                                    }}
                                    placeholder="e.g. TL Likith"
                                    className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                                  />
                                </div>
                              </div>

                              {/* Row 3: Task Description */}
                              <div>
                                <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                                  Task Description <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <textarea
                                  rows={3}
                                  required
                                  value={item.taskDescription}
                                  onChange={(e) => {
                                    const updated = [...logItems];
                                    updated[index].taskDescription = e.target.value;
                                    setLogItems(updated);
                                  }}
                                  placeholder="Explain task details..."
                                  className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white resize-y min-h-[60px]"
                                />
                              </div>

                              {/* Row 4: Work Link (optional) */}
                              <div>
                                <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1 optional-label" data-optional="true">Work Link (optional)</label>
                                <input
                                  type="text"
                                  value={item.referenceLink}
                                  onChange={(e) => {
                                    const updated = [...logItems];
                                    updated[index].referenceLink = e.target.value;
                                    setLogItems(updated);
                                  }}
                                  placeholder="e.g. https://github.com/myorg/repo/pull/1"
                                  className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action buttons */}
                        <div className="flex justify-between items-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newIndex = logItems.length;
                              setLogItems([
                                ...logItems,
                                { project: '', taskDescription: '', hours: '8.0', notes: '', assignedByName: '', referenceLink: '' }
                              ]);
                              setActiveSheetIndex(newIndex);
                            }}
                            className="bg-blue-50 hover:bg-blue-50 text-navy-900 border border-border font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Row
                          </button>
                          <button
                            type="submit"
                            disabled={submittingTrack}
                            className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer btn-premium shadow-md"
                          >
                            {submittingTrack ? 'Saving...' : 'Submit sheet'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB 2: Track Sheets Log */}
                {activeTrackSheetTab === 'log' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Filters Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-blue-50 p-4 rounded-xl border border-border">
                      {/* Date Filter */}
                      <div>
                        <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">Filter by Date</label>
                        <input
                          type="date"
                          value={filterTrackDate}
                          onChange={(e) => setFilterTrackDate(e.target.value)}
                          className="block w-full futuristic-input py-1.5 px-2.5 text-xs text-text bg-white"
                        />
                      </div>

                      {/* Search Text Box */}
                      <div>
                        <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">Search Description / Assigned By</label>
                        <input
                          type="text"
                          placeholder="Type to search..."
                          value={filterTrackSearch}
                          onChange={(e) => setFilterTrackSearch(e.target.value)}
                          className="block w-full futuristic-input py-1.5 px-2.5 text-xs text-text bg-white"
                        />
                      </div>

                      {/* Hours Filter */}
                      <div>
                        <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">Filter by Hours</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          placeholder="e.g. 8"
                          value={filterTrackHours}
                          onChange={(e) => setFilterTrackHours(e.target.value)}
                          className="block w-full futuristic-input py-1.5 px-2.5 text-xs text-text bg-white"
                        />
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">Filter by Status</label>
                        <select
                          value={filterTrackStatus}
                          onChange={(e) => setFilterTrackStatus(e.target.value)}
                          className="block w-full futuristic-input py-1.5 px-2.5 text-xs text-text bg-white cursor-pointer"
                        >
                          <option value="">All Status</option>
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                      <table className="w-full table-fixed text-left text-xs relative border-collapse">
                        <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                          <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                            <th className="py-3 px-2 w-[14%] bg-transparent">Date</th>
                            <th className="py-3 px-2 w-[22%] bg-transparent">Task / Project</th>
                            <th className="py-3 px-2 w-[18%] bg-transparent">Assigned By</th>
                            <th className="py-3 px-2 w-[16%] bg-transparent">Work Link</th>
                            <th className="py-3 px-2 w-[14%] bg-transparent">Hours</th>
                            <th className="py-3 px-2 w-[12%] bg-transparent">Status</th>
                            <th className="py-3 px-2 text-center w-[4%] bg-transparent"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(() => {
                            const filteredTrackSheets = trackSheets.filter((item) => {
                              // Date filter
                              if (filterTrackDate) {
                                if (item.date !== filterTrackDate) {
                                  return false;
                                }
                              }
                              
                              // Hours filter
                              if (filterTrackHours) {
                                if (item.hours !== parseFloat(filterTrackHours)) {
                                  return false;
                                }
                              }
                              
                              // Status filter
                              if (filterTrackStatus) {
                                if (item.status !== filterTrackStatus) {
                                  return false;
                                }
                              }
                              
                              // Search filter (assignedByName or taskDescription)
                              if (filterTrackSearch) {
                                const query = filterTrackSearch.toLowerCase();
                                const assigned = (item.assignedByName || '').toLowerCase();
                                const taskDesc = (item.taskDescription || '').toLowerCase();
                                const project = (item.project || '').toLowerCase();
                                if (!assigned.includes(query) && !taskDesc.includes(query) && !project.includes(query)) {
                                  return false;
                                }
                              }
                              
                              return true;
                            });

                            if (filteredTrackSheets.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={7} className="text-center py-12 text-text-muted">
                                    <History className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                                    {trackSheets.length === 0 
                                      ? "No work logged yet. Use the Log Work Hours tab to log work hours."
                                      : "No work logs match your filter criteria."
                                    }
                                  </td>
                                </tr>
                              );
                            }

                            return filteredTrackSheets.map((item) => {
                              const isExpanded = !!expandedSheets[item.id];
                              return (
                                <React.Fragment key={item.id}>
                                  <tr 
                                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                                      isExpanded ? 'bg-blue-50/40' : ''
                                    }`}
                                    onClick={() => setExpandedSheets(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                  >
                                    <td className="py-3 px-2 font-semibold text-navy-900 truncate">{formatDateToIndian(item.date)}</td>
                                    <td className="py-3 px-2 font-semibold text-navy-900 break-words">{item.project}</td>
                                    <td className="py-3 px-2 text-navy-900 font-medium truncate" title={item.assignedByName || 'N/A'}>
                                      {formatEmployeeName(item.assignedByName)}
                                    </td>
                                    <td className="py-3 px-2">
                                      {item.referenceLink ? (
                                        <a
                                          href={item.referenceLink.startsWith('http') ? item.referenceLink : `https://${item.referenceLink}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline font-bold"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View
                                        </a>
                                      ) : (
                                        <span className="text-text-muted font-semibold">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-2 font-extrabold text-navy-900">{item.hours}h</td>
                                    <td className="py-3 px-2">
                                      <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-extrabold border ${
                                        item.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-emerald-250' :
                                        item.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red border-red-250' :
                                        'bg-status-warning-bg text-status-warning-text border-amber-250'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                      <ChevronDown className={`w-4 h-4 text-text-muted mx-auto transition-transform duration-200 ${
                                        isExpanded ? 'rotate-180 text-blue-600' : ''
                                      }`} />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={7} className="p-0 border-t-0 bg-transparent">
                                      <AnimatePresence initial={false}>
                                        {isExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                          >
                                            <div className="px-6 py-4 bg-blue-50/60 rounded-xl m-2 border border-border/50 text-xs text-navy-900 space-y-3">
                                              <div>
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Full Task Description</p>
                                                <p className="text-text-muted mt-0.5 whitespace-pre-wrap leading-relaxed">{item.taskDescription}</p>
                                              </div>
                                              {item.status === 'PENDING' && (
                                                <div className="pt-2 flex items-center gap-3 border-t border-border/40">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteTrackSheet(item.id);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-red/20 text-brand-red bg-status-danger-bg/50 hover:bg-status-danger-bg hover:text-status-danger-text text-xs font-bold transition-all cursor-pointer"
                                                    title="Delete Log"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete Log
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: My Profile */}
          {activeTab === 'profile' && employeeProfile && (
            <div className="w-full max-w-5xl mx-auto">
              <div className="premium-card p-0 overflow-hidden shadow-lg border border-border/80">
                {/* Single Main Header Bar */}
                <div className="bg-navy-900 px-6 py-4 text-white flex items-center justify-between border-b border-navy-900-light">
                  <div className="flex items-center gap-2.5">
                    <User className="w-5 h-5 text-blue-400" />
                    <h2 className="text-base font-bold uppercase tracking-wider text-white font-heading">
                      Employee Profile Details
                    </h2>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* 1. Professional Details (3-Column Layout: Table 1, Table 2, Profile Card) */}
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold">
                          1
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900 font-heading">
                          Professional Details
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
                      {/* Column 1: Core Job Specs */}
                      <div className="w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Employee ID</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">
                                {employeeProfile.id.length > 15 ? 'NITP00021' : employeeProfile.id}
                              </td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Official Email</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5 break-all">
                                {employeeProfile.professionalEmail || employeeProfile.user?.email || 'N/A'}
                              </td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Department</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.department || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Designation</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.designation || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Reporting Manager</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">
                                {employeeProfile.user?.manager?.name || 'N/A'}
                              </td>
                            </tr>
                            <tr className="border-b border-border last:border-b-0">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Employee Type</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.employeeType || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Column 2: Shift, Dates & Location */}
                      <div className="w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Date of Joining</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.dateOfJoining ? formatDateToIndian(employeeProfile.dateOfJoining) : 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Work Shift</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.workShift || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Work Mode</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.workLocationStatus || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Office Location</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.location || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Expected End Date</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.expectedEndDate ? formatDateToIndian(employeeProfile.expectedEndDate) : 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border last:border-b-0">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Increment / Perks</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.incrementPerks || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Column 3: Profile Photo Card with Visible Edit/Camera Icon */}
                      <div className="flex flex-col items-center justify-center p-4 bg-blue-50/60 rounded-2xl border border-border h-full">
                        <div className="relative group flex flex-col items-center">
                          {profileForm.profileImage ? (
                            <img 
                              src={profileForm.profileImage} 
                              alt="Profile Picture" 
                              className="w-28 h-28 rounded-full object-cover border-2 border-white shadow-md"
                            />
                          ) : (
                            <div className="w-28 h-28 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-navy-900/60 shadow-md">
                              <User className="w-14 h-14" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-2 rounded-full bg-navy-900 hover:bg-navy-700 text-white shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
                            title="Change Profile Picture"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          {uploadingImage && (
                            <span className="absolute -bottom-5 text-[9px] text-center text-blue-600 font-bold whitespace-nowrap">
                              Uploading...
                            </span>
                          )}
                        </div>
                        
                        {/* Employee Name */}
                        <h3 className="mt-3 text-sm font-extrabold text-navy-900 font-heading text-center">
                          {formatEmployeeName(employeeProfile?.user?.name)}
                        </h3>
                        {employeeProfile.designation && (
                          <p className="text-xs text-text-muted font-medium text-center mt-0.5">
                            {employeeProfile.designation}
                          </p>
                        )}
                        <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-status-success-bg text-status-success-text border border-status-success/20">
                          Active Employee
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Personal & Contact Details (3-Column Layout: Contact, Personal, Addresses) */}
                  <div className="border-t border-border/80 pt-8">
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold">
                          2
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900 font-heading">
                          Personal & Contact Details
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(!isEditingContact)}
                        className="text-xs font-semibold px-3 py-1 bg-navy-900/5 hover:bg-navy-900/10 text-navy-900 rounded-lg border border-navy-900/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        {isEditingContact ? 'Cancel' : 'Edit Details'}
                      </button>
                    </div>

                    {!isEditingContact ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
                        {/* Column 1: Contact Details */}
                        <div className="w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Personal Email</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5 break-all">{profileForm.personalEmail || employeeProfile.personalEmail || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Mobile Number</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.mobileNumber || employeeProfile.mobileNumber || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Emergency Contact</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.emergencyContact || employeeProfile.emergencyContact || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Column 2: Personal Profile */}
                        <div className="w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Gender</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.gender || employeeProfile.gender || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Marital Status</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.maritalStatus || employeeProfile.maritalStatus || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Blood Group</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.bloodGroup || employeeProfile.bloodGroup || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Nationality</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{profileForm.nationality || employeeProfile.nationality || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Column 3: Addresses */}
                        <div className="w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <tbody>
                              <tr className="border-b border-border">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Current Address</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5 whitespace-pre-line">{profileForm.currentAddress || employeeProfile.currentAddress || 'N/A'}</td>
                              </tr>
                              <tr className="border-b border-border last:border-b-0">
                                <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Permanent Address</td>
                                <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5 whitespace-pre-line">{profileForm.permanentAddress || employeeProfile.permanentAddress || 'N/A'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Column 1: Contact Inputs */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Personal Email</label>
                              <input
                                type="email"
                                required
                                value={profileForm.personalEmail}
                                onChange={(e) => setProfileForm({ ...profileForm, personalEmail: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Number</label>
                              <input
                                type="tel"
                                required
                                value={profileForm.mobileNumber}
                                onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Emergency Contact</label>
                              <input
                                type="text"
                                required
                                value={profileForm.emergencyContact}
                                onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                          </div>

                          {/* Column 2: Personal Details */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Gender</label>
                              <select
                                required
                                value={profileForm.gender}
                                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-2.5 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                              >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Marital Status</label>
                              <select
                                value={profileForm.maritalStatus}
                                onChange={(e) => setProfileForm({ ...profileForm, maritalStatus: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-2.5 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                              >
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Blood Group</label>
                              <select
                                required
                                value={profileForm.bloodGroup}
                                onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-2.5 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                              >
                                <option value="">Select Blood Group</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Nationality</label>
                              <input
                                type="text"
                                required
                                value={profileForm.nationality}
                                onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                                placeholder="e.g. Indian"
                              />
                            </div>
                          </div>

                          {/* Column 3: Addresses */}
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Current Address</label>
                              <textarea
                                rows={2}
                                required
                                value={profileForm.currentAddress}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProfileForm(prev => ({
                                    ...prev,
                                    currentAddress: val,
                                    permanentAddress: isSameAddress ? val : prev.permanentAddress
                                  }));
                                }}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px]"
                              />
                            </div>
                            <div className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                id="sameAsCurrent"
                                checked={isSameAddress}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setIsSameAddress(checked);
                                  if (checked) {
                                    setProfileForm(prev => ({
                                      ...prev,
                                      permanentAddress: prev.currentAddress
                                    }));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-input-border text-blue-600 focus:ring-blue-600 cursor-pointer"
                              />
                              <label htmlFor="sameAsCurrent" className="text-[10px] font-bold text-navy-900 cursor-pointer select-none">
                                Permanent same as Current
                              </label>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 mb-1">Permanent Address</label>
                              <textarea
                                rows={2}
                                required
                                disabled={isSameAddress}
                                value={profileForm.permanentAddress}
                                onChange={(e) => setProfileForm({ ...profileForm, permanentAddress: e.target.value })}
                                className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px] disabled:bg-blue-50/50 disabled:text-text-disabled disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingContact(false)}
                            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-text-muted hover:bg-blue-50 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* 3. Financial & Statutory Details (3-Column Layout: Bank, Statutory IDs, Employment Terms) */}
                  <div className="border-t border-border/80 pt-8">
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold">
                          3
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900 font-heading">
                          Financial & Statutory Details
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
                      {/* Column 1: Bank Details */}
                      <div className="w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Bank Name</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.bankName || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Account Number</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.accountNumber || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">IFSC Code</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.ifsc || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border last:border-b-0">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Bank Branch</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.bankBranch || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Column 2: Statutory Identifications */}
                      <div className="w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">PAN Number</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5 text-navy-900">
                                {employeeProfile.pan ? employeeProfile.pan : 'N/A'}
                              </td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">PF Number</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.pfNumber || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">UAN Number</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.uan || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border last:border-b-0">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Insurance Number</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.insuranceNumber || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Column 3: Employment Terms & Status */}
                      <div className="w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Work Shift</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.workShift || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Work Mode</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.workLocationStatus || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Increment / Perks</td>
                              <td className="py-2.5 px-1 font-extrabold text-navy-900 w-3/5">{employeeProfile.incrementPerks || 'N/A'}</td>
                            </tr>
                            <tr className="border-b border-border last:border-b-0">
                              <td className="py-2.5 px-1 font-bold text-text-muted w-2/5">Verification</td>
                              <td className="py-2.5 px-1 font-extrabold text-status-success-text w-3/5 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-status-success-text shrink-0" />
                                Verified
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* 4. Account Security & Change Password (3-Column Layout for Inputs) */}
                  <div className="border-t border-border/80 pt-8">
                    <div className="flex items-center justify-between pb-3 border-b border-border mb-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-navy-900 text-white text-xs font-bold">
                          4
                        </span>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900 font-heading">
                          Account Security & Change Password
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-text-muted mb-4">
                      Update your login credentials. Your new password will be encrypted & hashed with bcrypt.
                    </p>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      {passwordError && (
                        <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger/20 text-brand-red text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {passwordError}
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-3 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success-text text-xs font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          {passwordSuccess}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-navy-900 mb-1">
                            Current Password <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-navy-900 mb-1">
                            New Password (Min. 6 chars) <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-navy-900 mb-1">
                            Confirm New Password <span className="text-red-500 font-bold ml-0.5">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50"
                        >
                          {passwordLoading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: My Leaves */}
          {/* TAB 3: My Leaves */}
          {/* TAB 3: My Leaves & Requests */}
          {/* TAB 1.3: Leaves & Time-off Requests */}
          {activeTab === 'leaves' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Sticky Request Form */}
                <div className="lg:col-span-5 lg:sticky lg:top-[88px] self-start space-y-6 z-10">
                  <div className="premium-card p-6 lg:p-7 border border-border/60 space-y-5 shadow-md">
                    {/* Tab Switch Headers */}
                    <div className="flex border border-border rounded-xl overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveLeaveFormTab('leave')}
                        className={`flex-1 text-center py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          activeLeaveFormTab === 'leave'
                            ? 'bg-navy-900 text-white shadow-xs'
                            : 'bg-blue-50 text-text-muted hover:bg-blue-50'
                        }`}
                      >
                        Leave
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLeaveFormTab('wfh')}
                        className={`flex-1 text-center py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          activeLeaveFormTab === 'wfh'
                            ? 'bg-navy-900 text-white shadow-xs'
                            : 'bg-blue-50 text-text-muted hover:bg-blue-50'
                        }`}
                      >
                        WFH
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveLeaveFormTab('regularisation')}
                        className={`flex-1 text-center py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                          activeLeaveFormTab === 'regularisation'
                            ? 'bg-navy-900 text-white shadow-xs'
                            : 'bg-blue-50 text-text-muted hover:bg-blue-50'
                        }`}
                      >
                        Regularise
                      </button>
                    </div>

                    {/* Leave Request Tab Content */}
                    {activeLeaveFormTab === 'leave' && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Request Time Off</h4>
                          <p className="text-xs text-text-muted mt-0.5 leading-normal">Submit a new request for planned leaves.</p>
                        </div>
                        <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                              Leave Category <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <select
                              required
                              value={leaveTypeId}
                              onChange={(e) => setLeaveTypeId(e.target.value)}
                              className="block w-full rounded-xl border border-border/90 py-2 px-3 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                            >
                              <option value="">Select leave type</option>
                              {leaveBalances.map((bal) => (
                                <option key={bal.id} value={bal.id}>
                                  {bal.name} ({bal.daysRemaining} left)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                Start Date <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                value={leaveStartDate}
                                onChange={(e) => setLeaveStartDate(e.target.value)}
                                className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                End Date <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="date"
                                required
                                value={leaveEndDate}
                                onChange={(e) => setLeaveEndDate(e.target.value)}
                                className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                              Reason <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={leaveReason}
                              onChange={(e) => setLeaveReason(e.target.value)}
                              placeholder="State reason for leave..."
                              className="block w-full rounded-xl border border-border/90 py-2 px-3 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingLeave}
                            className="w-full bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs md:text-sm py-3 px-4 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50 tracking-wider uppercase"
                          >
                            {submittingLeave ? 'Submitting...' : 'Request Leave'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* WFH Request Tab Content */}
                    {activeLeaveFormTab === 'wfh' && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Laptop className="w-4 h-4 text-blue-600" />
                            Request Work From Home
                          </h4>
                          <p className="text-xs text-text-muted mt-0.5 leading-normal">Submit a WFH request for today, tomorrow, or a custom duration.</p>
                        </div>

                        {/* Quick Presets */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-navy-900 uppercase">Select Duration</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWfhPreset('today');
                                const t = new Date().toISOString().split('T')[0];
                                setWfhStartDate(t);
                                setWfhEndDate(t);
                              }}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                                wfhPreset === 'today'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-navy-700 border-border hover:bg-blue-50'
                              }`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setWfhPreset('tomorrow');
                                const tom = new Date();
                                tom.setDate(tom.getDate() + 1);
                                const tomStr = tom.toISOString().split('T')[0];
                                setWfhStartDate(tomStr);
                                setWfhEndDate(tomStr);
                              }}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                                wfhPreset === 'tomorrow'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-navy-700 border-border hover:bg-blue-50'
                              }`}
                            >
                              Tomorrow
                            </button>
                            <button
                              type="button"
                              onClick={() => setWfhPreset('custom')}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                                wfhPreset === 'custom'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-navy-700 border-border hover:bg-blue-50'
                              }`}
                            >
                              Custom
                            </button>
                          </div>
                        </div>

                        <form onSubmit={handleSubmitWfhRequest} className="space-y-4">
                          {wfhPreset === 'custom' ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                  Start Date <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={wfhStartDate}
                                  onChange={(e) => setWfhStartDate(e.target.value)}
                                  className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                  End Date <span className="text-red-500 font-bold ml-0.5">*</span>
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={wfhEndDate}
                                  onChange={(e) => setWfhEndDate(e.target.value)}
                                  className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs md:text-sm">
                              <span className="text-xs font-bold text-navy-900">
                                {wfhPreset === 'today' ? 'Applying for Today:' : 'Applying for Tomorrow:'}
                              </span>
                              <span className="font-mono font-extrabold text-blue-600">
                                {formatDateToIndian(wfhStartDate)}
                              </span>
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                              Reason for WFH <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={wfhReason}
                              onChange={(e) => setWfhReason(e.target.value)}
                              placeholder="E.g., personal emergency, bad weather, medical reason..."
                              className="block w-full rounded-xl border border-border/90 py-2 px-3 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingWfh}
                            className="w-full bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs md:text-sm py-3 px-4 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50 flex items-center justify-center gap-2 tracking-wider uppercase"
                          >
                            <Laptop className="w-4 h-4" />
                            {submittingWfh ? 'Submitting...' : 'Request Work From Home'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Regularisation Tab Content */}
                    {activeLeaveFormTab === 'regularisation' && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div>
                          <h4 className="text-sm font-bold text-navy-900 uppercase tracking-wider">Attendance Regularisation</h4>
                          <p className="text-xs text-text-muted mt-0.5 leading-normal">Correct a missed check-in/out record for a specific date.</p>
                        </div>
                        <form onSubmit={handleSubmitRegularisation} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                              Date to Regularise <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <input
                              type="date"
                              required
                              value={regDate}
                              onChange={(e) => setRegDate(e.target.value)}
                              className="block w-full rounded-xl border border-border/90 py-2 px-3 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                Check-in Time <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="time"
                                required
                                value={regCheckIn}
                                onChange={(e) => setRegCheckIn(e.target.value)}
                                className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                                Check-out Time <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input
                                type="time"
                                required
                                value={regCheckOut}
                                onChange={(e) => setRegCheckOut(e.target.value)}
                                className="block w-full rounded-xl border border-border/90 py-2 px-2.5 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-navy-900 uppercase mb-1.5">
                              Reason / Explanation <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={regReason}
                              onChange={(e) => setRegReason(e.target.value)}
                              placeholder="E.g., forgot to check-in on arrival..."
                              className="block w-full rounded-xl border border-border/90 py-2 px-3 text-xs md:text-sm text-navy-900 bg-white/90 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submittingReg}
                            className="w-full bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs md:text-sm py-3 px-4 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50 tracking-wider uppercase"
                          >
                            {submittingReg ? 'Submitting...' : 'Submit Request'}
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right Column: Unified History & Balances Card with Continuous Scroll */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="premium-card p-0 overflow-hidden shadow-lg border border-border/80">
                    {/* Single Main Header Bar */}
                    <div className="bg-navy-900 px-6 py-4 text-white flex items-center justify-between border-b border-navy-900-light">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-white font-heading">
                          Requests & Time-Off History
                        </h2>
                      </div>
                    </div>

                    <div className="p-6 space-y-8">
                      {/* Sub-section 1: Leave Request History */}
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-[11px] font-bold">
                              1
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-heading">
                              Leave Request History
                            </h3>
                          </div>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1 border border-border rounded-xl">
                          <table className="min-w-full text-left text-xs relative border-collapse">
                            <thead className="sticky top-0 bg-blue-50 text-text-muted font-bold uppercase tracking-wider z-10 shadow-2xs border-b border-border/60">
                              <tr>
                                <th className="py-2.5 px-3 bg-blue-50">Leave Type</th>
                                <th className="py-2.5 px-3 bg-blue-50">Duration</th>
                                <th className="py-2.5 px-3 bg-blue-50">Reason</th>
                                <th className="py-2.5 px-3 text-center bg-blue-50">Status</th>
                                <th className="py-2.5 px-3 bg-blue-50">Approved By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {leaveRequests.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="text-center py-8 text-text-muted">No leave requests found.</td>
                                </tr>
                              ) : (
                                leaveRequests.map((req) => (
                                  <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="py-3 px-3 font-semibold text-navy-900">{req.leaveType.name}</td>
                                    <td className="py-3 px-3 text-text-muted whitespace-nowrap font-mono text-[11px]">
                                      {formatDateToIndian(req.startDate)} to {formatDateToIndian(req.endDate)}
                                    </td>
                                    <td className="py-3 px-3 text-text-muted max-w-xs truncate" title={req.reason}>
                                      {req.reason}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-extrabold border ${
                                        req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-emerald-250' :
                                        req.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red border-red-250' :
                                        'bg-status-warning-bg text-status-warning-text border-amber-250'
                                      }`}>
                                        {req.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-text-muted">
                                      {req.reviewedBy ? formatEmployeeName(req.reviewedBy.name) : '-'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sub-section 2: Attendance Regularisation History */}
                      <div className="border-t border-border/80 pt-6">
                        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-[11px] font-bold">
                              2
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-heading">
                              Attendance Regularisation History
                            </h3>
                          </div>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1 border border-border rounded-xl">
                          <table className="min-w-full text-left text-xs relative border-collapse">
                            <thead className="sticky top-0 bg-blue-50 text-text-muted font-bold uppercase tracking-wider z-10 shadow-2xs border-b border-border/60">
                              <tr>
                                <th className="py-2.5 px-3 bg-blue-50">Date to Correct</th>
                                <th className="py-2.5 px-3 bg-blue-50">Expected Check-in</th>
                                <th className="py-2.5 px-3 bg-blue-50">Expected Check-out</th>
                                <th className="py-2.5 px-3 bg-blue-50">Reason</th>
                                <th className="py-2.5 px-3 text-center bg-blue-50">Status</th>
                                <th className="py-2.5 px-3 bg-blue-50">Approved By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {regularisationRequests.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="text-center py-8 text-text-muted">No regularisation requests found.</td>
                                </tr>
                              ) : (
                                regularisationRequests.map((req) => (
                                  <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="py-3 px-3 font-semibold text-navy-900 font-mono text-[11px]">{formatDateToIndian(req.date)}</td>
                                    <td className="py-3 px-3 text-text-muted font-mono text-[11px]">{req.checkInTime ? formatTime(req.checkInTime) : '--:--'}</td>
                                    <td className="py-3 px-3 text-text-muted font-mono text-[11px]">{req.checkOutTime ? formatTime(req.checkOutTime) : '--:--'}</td>
                                    <td className="py-3 px-3 text-text-muted max-w-xs truncate" title={req.reason}>
                                      {req.reason}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-extrabold border ${
                                        req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-emerald-250' :
                                        req.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red border-red-250' :
                                        'bg-status-warning-bg text-status-warning-text border-amber-250'
                                      }`}>
                                        {req.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-text-muted">
                                      {req.reviewedBy ? formatEmployeeName(req.reviewedBy.name) : '-'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sub-section 3: Work From Home (WFH) History */}
                      <div className="border-t border-border/80 pt-6">
                        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-[11px] font-bold">
                              3
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-heading">
                              Work From Home (WFH) History
                            </h3>
                          </div>
                        </div>

                        <div className="max-h-[260px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1 border border-border rounded-xl">
                          <table className="min-w-full text-left text-xs relative border-collapse">
                            <thead className="sticky top-0 bg-blue-50 text-text-muted font-bold uppercase tracking-wider z-10 shadow-2xs border-b border-border/60">
                              <tr>
                                <th className="py-2.5 px-3 bg-blue-50">Duration</th>
                                <th className="py-2.5 px-3 bg-blue-50">Reason</th>
                                <th className="py-2.5 px-3 text-center bg-blue-50">Status</th>
                                <th className="py-2.5 px-3 bg-blue-50">Reviewed / Assigned By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {wfhRequests.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center py-8 text-text-muted">No Work From Home records found.</td>
                                </tr>
                              ) : (
                                wfhRequests.map((req) => (
                                  <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="py-3 px-3 font-semibold text-navy-900 whitespace-nowrap font-mono text-[11px]">
                                      {formatDateToIndian(req.startDate)}
                                      {req.startDate !== req.endDate ? ` to ${formatDateToIndian(req.endDate)}` : ' (Single Day)'}
                                      {req.isDirectHrAssignment && (
                                        <span className="ml-1.5 inline-block text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-navy-700 border border-blue-100">
                                          HR Assigned
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-text-muted max-w-xs truncate" title={req.reason}>
                                      {req.reason}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-extrabold border ${
                                        req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-emerald-250' :
                                        req.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red border-red-250' :
                                        'bg-status-warning-bg text-status-warning-text border-amber-250'
                                      }`}>
                                        {req.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-text-muted">
                                      {req.reviewedBy ? formatEmployeeName(req.reviewedBy.name) : (req.status === 'PENDING' ? 'Pending Review' : '-')}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sub-section 4: Leave Balance Status */}
                      <div className="border-t border-border/80 pt-6">
                        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-[11px] font-bold">
                              4
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-heading">
                              Leave Balance Status
                            </h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {leaveBalances.map((bal, idx) => {
                            const balanceAccents = [
                              'bg-status-warning-bg border-amber-250/50 text-status-warning-text',
                              'bg-status-success-bg border-emerald-250/50 text-status-success-text',
                              'bg-blue-50 border-blue-100/50 text-blue-600',
                              'bg-blue-50 border-purple-250/50 text-navy-700'
                            ];
                            const accentClass = balanceAccents[idx % balanceAccents.length];

                            return (
                              <div key={bal.id} className="p-3 rounded-xl border border-border bg-white hover:border-blue-600 transition-colors flex items-center gap-3 shadow-2xs">
                                <div className={`w-10 h-11 rounded-lg border flex flex-col items-center justify-center font-heading leading-none shrink-0 ${accentClass}`}>
                                  <span className="text-[7px] uppercase font-bold tracking-wider">Days</span>
                                  <span className="text-sm font-extrabold font-mono mt-0.5">{bal.daysRemaining}</span>
                                </div>
                                <div className="flex flex-col text-left overflow-hidden min-w-0">
                                  <span className="font-extrabold text-navy-900 text-xs truncate" title={bal.name}>{bal.name}</span>
                                  <span className="text-[10px] text-text-muted font-semibold font-mono mt-0.5">
                                    Used: {bal.daysUsed} / {bal.daysAllowed} days
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sub-section 5: List of Company Holidays */}
                      <div className="border-t border-border/80 pt-6">
                        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy-900 text-white text-[11px] font-bold">
                              5
                            </span>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-heading">
                              List of Company Holidays
                            </h3>
                          </div>
                        </div>

                        {holidays.length === 0 ? (
                          <p className="text-xs text-text-muted py-4 text-center">No upcoming holidays scheduled.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {holidays.map((h, idx) => {
                              const dateObj = new Date(h.date);
                              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
                              const dayStr = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
                              
                              const holidayAccents = [
                                'bg-status-warning-bg border-amber-250 text-status-warning-text',
                                'bg-status-success-bg border-emerald-250 text-status-success-text',
                                'bg-blue-50 border-blue-100 text-blue-600',
                                'bg-blue-50 border-purple-250 text-navy-700'
                              ];
                              const accentClass = holidayAccents[idx % holidayAccents.length];

                              return (
                                <div key={h.id} className="p-2.5 rounded-xl border border-border bg-white hover:border-blue-600 transition-colors flex items-center gap-3 shadow-2xs">
                                  <div className={`w-10 h-11 rounded-lg border flex flex-col items-center justify-center font-heading leading-none shrink-0 ${accentClass}`}>
                                    <span className="text-[9px] uppercase font-bold tracking-wider">{monthStr}</span>
                                    <span className="text-sm font-extrabold font-mono mt-0.5">{dayStr}</span>
                                  </div>
                                  <div className="flex flex-col text-left overflow-hidden min-w-0">
                                    <span className="font-extrabold text-navy-900 text-xs truncate" title={h.name}>{h.name}</span>
                                    <span className="text-[9px] text-text-muted font-semibold font-mono mt-0.5">
                                      {formatDateToIndian(h.date)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: My Payroll */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Salary Structure Info */}
              {employeeProfile && (
                <div className="premium-card p-0 overflow-hidden space-y-0">
                  {/* Header Title strip with Navy Blue background */}
                  <div className="bg-navy-900 px-5 py-3 text-white">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                      <CreditCard className="w-4.5 h-4.5 text-white" />
                      My Salary Structure Breakdown
                    </h3>
                    <p className="text-[10px] text-white/80 mt-0.5">
                      Periodic salary structure values registered under your profile account.
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Pull default values for structure if not explicitly set yet */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-blue-50 p-3.5 rounded-xl border border-border">
                        <span className="block text-[10px] font-bold text-text-muted uppercase">Basic Salary</span>
                        <span className="text-base font-extrabold text-navy-900 mt-1 block">
                          {(myPayrollRuns[0]?.basicSalary || 30000).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-3.5 rounded-xl border border-border">
                        <span className="block text-[10px] font-bold text-text-muted uppercase">HRA Allowance</span>
                        <span className="text-base font-extrabold text-navy-900 mt-1 block">
                          {(myPayrollRuns[0]?.hra || 12000).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-3.5 rounded-xl border border-border">
                        <span className="block text-[10px] font-bold text-text-muted uppercase">Conveyance</span>
                        <span className="text-base font-extrabold text-navy-900 mt-1 block">
                          {(myPayrollRuns[0]?.hra || 3000).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-3.5 rounded-xl border border-border">
                        <span className="block text-[10px] font-bold text-text-muted uppercase">Special Allowance</span>
                        <span className="text-base font-extrabold text-navy-900 mt-1 block">
                          {(myPayrollRuns[0]?.specialAllowance || 5000).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* My Payslips Table */}
              <div className="premium-card p-0 overflow-hidden space-y-0">
                {/* Header Title strip with Navy Blue background */}
                <div className="bg-navy-900 px-5 py-3 text-white">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-white" />
                    My Monthly Payslips
                  </h3>
                  <p className="text-[10px] text-white/80 mt-0.5">
                    Download official digital Excel/PDF payslip documents generated by the HR payroll system.
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6">

                <div className="max-h-[140px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                  <table className="min-w-full text-left text-xs relative border-collapse">
                    <thead className="sticky top-0 bg-white text-text-muted font-bold uppercase tracking-wider z-10 shadow-2xs">
                      <tr className="border-b border-gray-250/50">
                        <th className="py-3 px-2 bg-white">Pay Period</th>
                        <th className="py-3 px-2 text-right bg-white">Gross Earnings (INR)</th>
                        <th className="py-3 px-2 text-right bg-white">Deductions (INR)</th>
                        <th className="py-3 px-2 text-right bg-white">Net Salary (INR)</th>
                        <th className="py-3 px-2 text-center bg-white">Status</th>
                        <th className="py-3 px-2 text-center bg-white">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myPayrollRuns.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-text-muted">No payslips released in system.</td>
                        </tr>
                      ) : (
                        myPayrollRuns.map((run) => (
                          <tr key={run.id} className="hover:bg-blue-50/50">
                            <td className="py-3 px-2 font-bold text-navy-900">
                              {formatDateToIndian(run.periodStart)} to {formatDateToIndian(run.periodEnd)}
                            </td>
                            <td className="py-3 px-2 text-right text-text-muted font-semibold">
                              {run.grossEarnings.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </td>
                            <td className="py-3 px-2 text-right text-text-muted">
                              {run.totalDeductions.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </td>
                            <td className="py-3 px-2 text-right font-extrabold text-navy-900">
                              {run.netSalary.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-status-success-bg text-status-success-text">
                                {run.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <a
                                href={`/api/payroll/runs/export?id=${run.id}`}
                                download
                                className="inline-block bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold px-3.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer"
                              >
                                Download Payslip
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          )}



          {/* TAB 6: Trainings Catalog */}
          {activeTab === 'trainings' && (
            <div className="premium-card p-0 overflow-hidden space-y-0">
              {/* Header Title strip with Navy Blue background */}
              <div className="bg-navy-900 px-5 py-3 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <GraduationCap className="w-4.5 h-4.5 text-white" />
                  My Training Courses & Certifications
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  View specialized training sessions assigned to you and check certification status.
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <div className="py-8 text-center bg-blue-50/80 rounded-2xl border border-border">
                  <p className="text-sm font-semibold text-navy-900">Courses are not yet started.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.4: My Attendance History */}
          {activeTab === 'history' && (
            <div className="premium-card p-0 overflow-hidden animate-in fade-in duration-200 max-w-5xl mx-auto">
              
              {/* Header Banner */}
              <div className="px-6 py-3.5 bg-navy-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <History className="w-4 h-4 text-white shrink-0" />
                  My Attendance History
                </h3>
                
                {/* Controls */}
                <div className="flex items-center gap-2.5">
                  {/* Prev Month */}
                  <button
                    onClick={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(calendarYear - 1);
                      } else {
                        setCalendarMonth(calendarMonth - 1);
                      }
                    }}
                    className="p-1.5 border border-white/20 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white text-xs font-bold bg-white/5"
                    title="Previous Month"
                  >
                    &larr;
                  </button>
                  
                  {/* Month selector */}
                  <select
                    value={calendarMonth}
                    onChange={(e) => setCalendarMonth(Number(e.target.value))}
                    className="rounded-xl border border-white/20 py-1.5 px-2.5 text-xs font-semibold text-white bg-white/10 outline-none focus:border-white/40 transition-all cursor-pointer"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, idx) => (
                      <option key={idx} value={idx} className="text-navy-900 bg-white font-medium">{mName}</option>
                    ))}
                  </select>

                  {/* Year selector */}
                  <select
                    value={calendarYear}
                    onChange={(e) => setCalendarYear(Number(e.target.value))}
                    className="rounded-xl border border-white/20 py-1.5 px-2.5 text-xs font-semibold text-white bg-white/10 outline-none focus:border-white/40 transition-all cursor-pointer"
                  >
                    {Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i).map((yr) => (
                      <option key={yr} value={yr} className="text-navy-900 bg-white font-medium">{yr}</option>
                    ))}
                  </select>

                  {/* Next Month */}
                  <button
                    onClick={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear(calendarYear + 1);
                      } else {
                        setCalendarMonth(calendarMonth + 1);
                      }
                    }}
                    className="p-1.5 border border-white/20 hover:bg-white/10 rounded-xl transition-all cursor-pointer text-white text-xs font-bold bg-white/5"
                    title="Next Month"
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-6 space-y-6">
                
                {/* Stats cards strip */}
                {(() => {
                  const selectedYearMonth = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
                  const monthlyRecords = attendance.filter(r => r.date.startsWith(selectedYearMonth));
                  const monthlyTrack = trackSheets.filter(t => t.date.startsWith(selectedYearMonth));
                  
                  const presents = monthlyRecords.filter(r => ['PRESENT', 'OVERTIME', 'LATE_COMING', 'EARLY_LEAVING', 'MISSING_PUNCH'].includes(r.status)).length;
                  const lates = monthlyRecords.filter(r => r.status === 'LATE_COMING').length;
                  const leaves = monthlyRecords.filter(r => r.status === 'LEAVE').length;
                  const holidays = monthlyRecords.filter(r => r.status === 'HOLIDAY').length;
                  const absents = monthlyRecords.filter(r => r.status === 'ABSENT').length;
                  
                  const avgHrs = monthlyTrack.length > 0 
                    ? (monthlyTrack.reduce((sum, item) => sum + item.hours, 0) / monthlyTrack.length).toFixed(1)
                    : '0.0';

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {/* Present Card */}
                      <div className="premium-card p-4 flex items-center gap-3 border border-border/60 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-status-success-bg border border-status-success/20 flex items-center justify-center text-status-success-text shrink-0 shadow-xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block text-xl font-extrabold font-mono text-status-success-text leading-none">
                            <CountUp value={presents} />
                          </span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block uppercase tracking-wider">Present</span>
                        </div>
                      </div>

                      {/* Late Card */}
                      <div className="premium-card p-4 flex items-center gap-3 border border-border/60 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-status-warning-bg border border-status-warning/20 flex items-center justify-center text-status-warning-text shrink-0 shadow-xs">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block text-xl font-extrabold font-mono text-status-warning-text leading-none">
                            <CountUp value={lates} />
                          </span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block uppercase tracking-wider">Lates</span>
                        </div>
                      </div>

                      {/* Leave Card */}
                      <div className="premium-card p-4 flex items-center gap-3 border border-border/60 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-status-danger-bg border border-status-danger/20 flex items-center justify-center text-status-danger-text shrink-0 shadow-xs">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block text-xl font-extrabold font-mono text-status-danger-text leading-none">
                            <CountUp value={leaves} />
                          </span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block uppercase tracking-wider">Leaves</span>
                        </div>
                      </div>

                      {/* Holiday Card */}
                      <div className="premium-card p-4 flex items-center gap-3 border border-border/60 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-xs">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block text-xl font-extrabold font-mono text-navy-900 leading-none">
                            <CountUp value={holidays} />
                          </span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block uppercase tracking-wider">Holidays</span>
                        </div>
                      </div>

                      {/* Avg Hours Card */}
                      <div className="premium-card p-4 flex items-center gap-3 col-span-2 md:col-span-1 border border-border/60 shadow-2xs">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-border flex items-center justify-center text-text-muted shrink-0 shadow-xs">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <span className="block text-xl font-extrabold font-mono text-text leading-none">
                            {avgHrs}h
                          </span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block uppercase tracking-wider">Avg Hours</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Calendar Grid Section */}
                <div className="border-t border-border pt-6">
                  {/* Week headers */}
                  <div className="grid grid-cols-7 gap-2 mb-3 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dHeader) => (
                      <span key={dHeader} className="text-xs font-bold text-text-muted uppercase tracking-wider">{dHeader}</span>
                    ))}
                  </div>

                  {/* Grid cells */}
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                      const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const cells = [];
                      
                      // Empty cells for alignment
                      for (let i = 0; i < firstDayIndex; i++) {
                        cells.push(<div key={`empty-${i}`} className="bg-blue-50/70 rounded-xl border border-border/60 h-[84px] md:h-[90px]" />);
                      }
                      
                      // Month dates
                      for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
                        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const rec = attendance.find(r => r.date === dateStr);
                        const isWeekend = new Date(calendarYear, calendarMonth, dayNum).getDay() === 0;
                        
                        const hItem = holidays.find(h => h.date === dateStr);
                        const isHoliday = !!hItem || (rec && rec.status === 'HOLIDAY');
                        const holidayName = hItem ? hItem.name : (isHoliday ? "Holiday" : "");

                        // Build events list for the cell
                        const eventStrips = [];
                        if (isHoliday) {
                          eventStrips.push(
                            <div key="hol" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-blue-600 text-white truncate text-left shadow-xs">
                              Holiday
                            </div>
                          );
                          if (holidayName && holidayName !== "Holiday") {
                            eventStrips.push(
                              <div key="hol-name" className="w-full text-[7px] md:text-[8px] font-bold px-1 py-0.5 rounded bg-blue-50 text-navy-700 border border-blue-100 truncate text-left shadow-xs" title={holidayName}>
                                {holidayName}
                              </div>
                            );
                          }
                        } else if (rec) {
                          const status = rec.status;
                          if (['PRESENT', 'OVERTIME', 'LATE_COMING', 'EARLY_LEAVING', 'MISSING_PUNCH'].includes(status)) {
                            const label = status === 'LATE_COMING' ? "Late" : (status === 'OVERTIME' ? "Overtime" : "Present");
                            const labelBg = status === 'LATE_COMING' ? "bg-status-warning" : (status === 'OVERTIME' ? "bg-status-success" : "bg-status-success");
                            eventStrips.push(
                              <div key="pres" className={`w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded text-white truncate text-left shadow-xs ${labelBg}`}>
                                {label}
                              </div>
                            );
                            if (rec.checkInTime) {
                              const isLate = isCheckInLate(rec.checkInTime);
                              eventStrips.push(
                                <div key="checkin" className="w-full text-[7px] md:text-[8px] font-bold px-1 py-0.5 rounded bg-status-success-bg text-status-success-text border border-status-success/20 truncate text-left shadow-xs flex items-center gap-1">
                                  {isLate && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0 inline-block animate-pulse" title="Late Check-in" />
                                  )}
                                  In: {formatTime(rec.checkInTime)}
                                </div>
                              );
                            }
                            if (rec.checkOutTime) {
                              eventStrips.push(
                                <div key="checkout" className="w-full text-[7px] md:text-[8px] font-bold px-1 py-0.5 rounded bg-blue-50 text-text-muted border border-border truncate text-left shadow-xs">
                                  Out: {formatTime(rec.checkOutTime)}
                                </div>
                              );
                            }
                          } else if (status === 'LEAVE') {
                            eventStrips.push(
                              <div key="leave" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-blue-600 text-white truncate text-left shadow-xs">
                                Leave
                              </div>
                            );
                          } else if (status === 'WEEK_OFF') {
                            eventStrips.push(
                              <div key="we" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-blue-50 text-navy-700 truncate text-left shadow-xs">
                                Weekend
                              </div>
                            );
                          } else if (status === 'ABSENT') {
                            eventStrips.push(
                              <div key="abs" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-status-danger text-white truncate text-left shadow-xs">
                                Absent
                              </div>
                            );
                          }
                        } else {
                          if (isWeekend) {
                            eventStrips.push(
                              <div key="we-fallback" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-blue-50 text-navy-700 truncate text-left shadow-xs">
                                Weekend
                              </div>
                            );
                          } else {
                            const today = new Date().toISOString().split('T')[0];
                            if (dateStr < today) {
                              eventStrips.push(
                                <div key="abs-fallback" className="w-full text-[8px] md:text-[9px] font-extrabold px-1 py-0.5 rounded bg-status-danger text-white truncate text-left shadow-xs">
                                  Absent
                                </div>
                              );
                            }
                          }
                        }

                        cells.push(
                          <button
                            key={dayNum}
                            onClick={() => setSelectedCalendarDate(dateStr)}
                            className={`p-1 md:p-1.5 rounded-xl border text-left flex flex-col justify-start h-[84px] md:h-[90px] transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-blue-600 ${
                              isWeekend ? 'bg-blue-50 border-slate-250' : 'bg-white border-border'
                            }`}
                          >
                            <span className={`text-[10px] md:text-xs font-bold font-mono ${isWeekend ? 'text-navy-900/60' : 'text-navy-900'}`}>
                              {dayNum}
                            </span>
                            
                            <div className="w-full flex-1 flex flex-col justify-end mt-0.5 space-y-0.5 overflow-hidden">
                              {eventStrips}
                            </div>
                          </button>
                        );
                      }
                      
                      return cells;
                    })()}
                  </div>

                  {/* Color Legend Block */}
                  <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-border text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-status-success/85 border border-status-success/20/60 block" />
                      <span className="font-semibold text-text">Present / Overtime</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-blue-600/85 border border-blue-100/60 block" />
                      <span className="font-semibold text-text">Leave (Approved)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-blue-600/85 border border-blue-600/60 block" />
                      <span className="font-semibold text-text">Company Holidays</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-status-danger/85 border border-status-danger/20/60 block" />
                      <span className="font-semibold text-text">Absent (No check-in)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-md bg-blue-50/85 border border-input-border/60 block" />
                      <span className="font-semibold text-text">Weekend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-status-warning block animate-pulse" />
                      <span className="font-semibold text-text">Late Check-in (&gt; 09:30 AM)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 8: Resignation Request */}
          {activeTab === 'resignation' && (
            <div className="premium-card p-0 overflow-hidden space-y-0">
              {/* Header Title strip with Navy Blue background */}
              <div className="bg-navy-900 px-5 py-3 text-white">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <UserMinus className="w-4.5 h-4.5 text-white" />
                  Resignation Request
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  Submit your resignation request. Note that only one request can be active.
                </p>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {resignationRequest ? (
                  <div className="animate-in fade-in duration-200 max-w-lg mx-auto w-full text-left">
                    <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-blue-50 border-b border-border px-5 py-3">
                        <h4 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">Submitted Resignation Details</h4>
                      </div>
                      <div className="p-5">
                        <div className="p-5 bg-blue-50 border border-slate-250/85 rounded-xl space-y-3 text-xs text-navy-900">
                          <div className="flex justify-between pb-2 border-b border-border/65">
                            <strong className="text-text-muted font-medium">Status:</strong>
                            <span className={`font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              resignationRequest.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text' :
                              resignationRequest.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red' :
                              'bg-status-warning-bg text-status-warning-text'
                            }`}>
                              {resignationRequest.status}
                            </span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-border/65">
                            <strong className="text-text-muted font-medium">Resignation Date:</strong>
                            <span className="font-bold">{formatDateToIndian(resignationRequest.resignationDate)}</span>
                          </div>
                          <div className="flex justify-between pb-2 border-b border-border/65">
                            <strong className="text-text-muted font-medium">Requested Last Working Day:</strong>
                            <span className="font-bold">{formatDateToIndian(resignationRequest.lastWorkingDay)}</span>
                          </div>
                          <div className="pb-2 border-b border-border/65">
                            <strong className="text-text-muted font-medium block mb-1">Reason:</strong>
                            <p className="text-gray-650 leading-relaxed font-medium">{resignationRequest.reason}</p>
                          </div>
                          {resignationRequest.hrNotes && (
                            <div>
                              <strong className="text-text-muted font-medium block mb-1">HR Notes:</strong>
                              <p className="text-gray-650 leading-relaxed font-medium">{resignationRequest.hrNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-200 max-w-lg mx-auto w-full text-left">
                    <div className="border border-border rounded-2xl overflow-hidden bg-white shadow-xs">
                      <div className="bg-blue-50 border-b border-border px-5 py-3">
                        <h4 className="text-xs font-extrabold text-navy-900 uppercase tracking-wider">Resignation Request Form</h4>
                      </div>

                      <form onSubmit={handleSubmitResignation} className="p-5 space-y-5">
                        <div className="p-6 bg-blue-50 border border-slate-250/85 rounded-xl space-y-5 relative mb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">Resignation Date</label>
                              <input 
                                type="date"
                                required
                                value={resignationDate}
                                onChange={(e) => setResignationDate(e.target.value)}
                                className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                                Last Working Day (Expected) <span className="text-red-500 font-bold ml-0.5">*</span>
                              </label>
                              <input 
                                type="date"
                                required
                                value={lastWorkingDay}
                                onChange={(e) => setLastWorkingDay(e.target.value)}
                                className="block w-full futuristic-input py-2 px-3 text-xs text-text bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-navy-900 uppercase mb-1">
                              Reason for Resignation <span className="text-red-500 font-bold ml-0.5">*</span>
                            </label>
                            <textarea 
                              required
                              rows={4}
                              value={resignationReason}
                              onChange={(e) => setResignationReason(e.target.value)}
                              placeholder="Please state the reason for your resignation..."
                              className="block w-full futuristic-input py-2.5 px-3 text-xs text-text bg-white resize-y min-h-[110px]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={submittingResignation}
                            className="bg-brand-red hover:bg-status-danger hover:shadow-lg hover:shadow-brand-red/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50"
                          >
                            {submittingResignation ? 'Submitting...' : 'Submit Resignation'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>


      {/* Date Detail Modal */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/85 backdrop-blur-lg rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-white/40 space-y-4 text-navy-900">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-sm font-bold font-heading">
                Attendance Details
              </h3>
              <span className="text-xs font-mono font-bold bg-blue-50 text-text-muted px-2 py-0.5 rounded">
                {formatDateToIndian(selectedCalendarDate)}
              </span>
            </div>

            {(() => {
              const rec = attendance.find(r => r.date === selectedCalendarDate);
              const isWeekend = new Date(selectedCalendarDate).getDay() === 0;
              const hItem = holidays.find(h => h.date === selectedCalendarDate);
              const isHoliday = !!hItem || (rec && rec.status === 'HOLIDAY');
              const holidayName = hItem ? hItem.name : (isHoliday ? "Holiday" : "");

              if (isHoliday) {
                return (
                  <div className="text-xs space-y-2.5">
                    <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                      <strong className="text-text-muted font-medium">Status:</strong>
                      <span className="font-extrabold text-blue-600 uppercase">HOLIDAY</span>
                    </p>
                    <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                      <strong className="text-text-muted font-medium">Reason / Name:</strong>
                      <span className="font-bold text-right">{holidayName || 'Company Holiday'}</span>
                    </p>
                    <p className="text-[10px] text-gray-450 italic">This day has been declared a holiday by HR.</p>
                  </div>
                );
              }

              if (!rec) {
                if (isWeekend) {
                  return (
                    <div className="text-xs text-text-muted py-3 space-y-2">
                      <p><strong>Status:</strong> Weekend (Non-Working Day)</p>
                      <p className="italic text-text-muted">No attendance logging required.</p>
                    </div>
                  );
                }
                const today = new Date().toISOString().split('T')[0];
                if (selectedCalendarDate > today) {
                  return (
                    <div className="text-xs text-text-muted py-3 space-y-2">
                      <p><strong>Status:</strong> Future Date</p>
                      <p className="italic text-text-muted">Attendance records will appear once checked in.</p>
                    </div>
                  );
                }
                return (
                  <div className="text-xs text-text-muted py-3 space-y-2">
                    <p><strong>Status:</strong> Absent</p>
                    <p className="italic text-red-650 font-bold">No check-in record found for this day.</p>
                  </div>
                );
              }

              // Found record details
              const workingHours = rec.checkInTime && rec.checkOutTime 
                ? ((new Date(rec.checkOutTime).getTime() - new Date(rec.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(1) + ' hours'
                : (rec.status === 'WEEK_OFF' || rec.status === 'HOLIDAY' ? null : '--');

              return (
                <div className="text-xs space-y-2.5">
                  <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                    <strong className="text-text-muted font-medium">Status:</strong>
                    <span className="font-extrabold uppercase">{rec.status.replace('_', ' ')}</span>
                  </p>
                  <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                    <strong className="text-text-muted font-medium">Check-in:</strong>
                    <span className="font-bold flex items-center gap-1.5">
                      {rec.checkInTime && isCheckInLate(rec.checkInTime) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0 inline-block animate-pulse" title="Late Check-in" />
                      )}
                      {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </p>
                  <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                    <strong className="text-text-muted font-medium">Check-out:</strong>
                    <span className="font-bold">{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </p>
                  {workingHours && (
                    <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                      <strong className="text-text-muted font-medium">Working Hours:</strong>
                      <span className="font-bold font-mono">{workingHours}</span>
                    </p>
                  )}
                  <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                    <strong className="text-text-muted font-medium">Device IP:</strong>
                    <span className="font-mono text-text-muted">{rec.ip || 'Unknown'}</span>
                  </p>
                  <p className="flex justify-between">
                    <strong className="text-text-muted font-medium">Timezone:</strong>
                    <span className="text-text-muted">{rec.tz || 'Asia/Kolkata'}</span>
                  </p>
                </div>
              );
            })()}

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setSelectedCalendarDate(null)}
                className="bg-navy-900 hover:bg-navy-900-light text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer w-full text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Track Sheet Detail Modal */}
      {selectedTrackSheet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border/80 space-y-4 text-navy-900">
            <div className="flex justify-between items-center border-b border-gray-150 pb-3">
              <h3 className="text-sm font-bold font-heading">
                Work Log Details
              </h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                selectedTrackSheet.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text' :
                selectedTrackSheet.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red' :
                'bg-status-warning-bg text-status-warning-text'
              }`}>
                {selectedTrackSheet.status}
              </span>
            </div>

            <div className="text-xs space-y-2.5">
              <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                <strong className="text-text-muted font-medium">Log Date:</strong>
                <span className="font-bold">{formatDateToIndian(selectedTrackSheet.date)}</span>
              </p>
              <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                <strong className="text-text-muted font-medium">Project:</strong>
                <span className="font-bold">{selectedTrackSheet.project}</span>
              </p>
              <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                <strong className="text-text-muted font-medium">Hours:</strong>
                <span className="font-bold font-mono">{selectedTrackSheet.hours} hours</span>
              </p>
              <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                <strong className="text-text-muted font-medium">Assigned By:</strong>
                <span className="font-bold">{formatEmployeeName(selectedTrackSheet.assignedByName)}</span>
              </p>
              {selectedTrackSheet.referenceLink && (
                <p className="flex justify-between border-b border-border pb-1.5 border-border/50">
                  <strong className="text-text-muted font-medium">Work Link:</strong>
                  <a
                    href={selectedTrackSheet.referenceLink.startsWith('http') ? selectedTrackSheet.referenceLink : `https://${selectedTrackSheet.referenceLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-bold"
                  >
                    View Link
                  </a>
                </p>
              )}
              <div className="border-b border-border pb-2 border-border/50">
                <strong className="text-text-muted font-medium block mb-1">Task Description:</strong>
                <p className="text-gray-650 leading-relaxed font-medium">{selectedTrackSheet.taskDescription}</p>
              </div>
              {selectedTrackSheet.notes && (
                <div className="border-b border-border pb-2 border-border/50">
                  <strong className="text-text-muted font-medium block mb-1">Employee Notes:</strong>
                  <p className="text-gray-650 leading-relaxed font-medium">{selectedTrackSheet.notes}</p>
                </div>
              )}
              {selectedTrackSheet.tlComment && (
                <div className="p-3 bg-blue-50 border border-blue-100/60 rounded-xl space-y-1">
                  <strong className="text-[10px] text-navy-700 uppercase font-extrabold block">TL Comment / Feedback</strong>
                  <p className="text-navy-700 leading-normal font-medium">{selectedTrackSheet.tlComment}</p>
                </div>
              )}

              {/* Supporting Documents Section */}
              <div className="pt-2">
                <strong className="text-text-muted font-medium block mb-1.5">Supporting Documents:</strong>
                
                {/* Upload Doc Input */}
                <div className="flex flex-col gap-1.5 mb-3 bg-blue-50 p-2 border border-border rounded-xl">
                  <span className="text-[9px] text-text-muted font-extrabold uppercase">Upload Attachment</span>
                  <div className="flex items-center justify-between gap-2">
                    <input 
                      type="file" 
                      onChange={handleTaskDocUpload}
                      disabled={uploadingTaskDoc}
                      className="text-[10px] text-text-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-navy-900/5 file:text-navy-900 hover:file:bg-navy-900/10 cursor-pointer"
                    />
                    {uploadingTaskDoc && <span className="text-[9px] text-blue-600 animate-pulse">Uploading...</span>}
                  </div>
                </div>

                {(() => {
                  let docs = [];
                  try {
                    docs = selectedTrackSheet.supportingDocuments ? JSON.parse(selectedTrackSheet.supportingDocuments) : [];
                    if (!Array.isArray(docs)) docs = [];
                  } catch {
                    docs = [];
                  }
                  return docs.length === 0 ? (
                    <p className="text-[10px] text-gray-450 italic">No attachments uploaded yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {docs.map((doc: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-xl border border-border text-[11px]">
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-blue-600 hover:underline truncate max-w-[200px]"
                          >
                            {doc.name}
                          </a>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[9px] text-text-muted">
                              {formatDateToIndian(doc.uploadedAt)}
                            </span>
                            <button
                              onClick={() => handleTaskDocDelete(idx)}
                              className="text-brand-red hover:text-status-danger-text cursor-pointer"
                              title="Delete Attachment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedTrackSheet(null)}
                className="bg-navy-900 hover:bg-navy-900-light text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer w-full text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Welcome New Member Modal */}
      <BriefDetailsModal
        isOpen={isJoinerModalOpen}
        onClose={() => {
          setIsJoinerModalOpen(false);
          setSelectedJoinerId(null);
        }}
        employeeId={selectedJoinerId}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { formatDateToIndian, formatDateTimeToIndian, formatTimeToIndian } from '@/lib/dateUtils';
import {
  isValidEmail,
  isValidPhone,
  isValidPAN,
  isValidIFSC,
  isValidUAN,
  isValidAccountNumber,
  isValidPassword,
  isValidDate,
  isDateOrderValid,
  isNotFutureDate,
} from '@/lib/validations';
import { 
  Users, 
  Clock, 
  MapPin, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Trash2, 
  Settings, 
  ShieldAlert, 
  Search,
  UserPlus,
  TrendingUp,
  FileCheck,
  Calendar,
  Bell,
  BookOpen,
  CreditCard,
  Menu,
  X,
  UserMinus,
  CalendarDays,
  KeyRound,
  Lock,
  Award,
  CalendarCheck,
  Home,
  Laptop,
  ChevronDown,
  UserCheck,
  LogOut,
  Layers,
  FileSpreadsheet,
  Calculator
} from 'lucide-react';
import Speedometer from '@/components/Speedometer';
import PerformancePieChart from '@/components/PerformancePieChart';
import DesktopSidebar from '@/components/DesktopSidebar';
import LoginHistoryView from '@/components/admin/LoginHistoryView';
import SalaryDeductionsView from '@/components/admin/SalaryDeductionsView';
import { motion, AnimatePresence } from 'framer-motion';

// Framer motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
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

// Dynamic import of Recharts to prevent SSR window issues
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
  teamId: string | null;
  managerId: string | null;
  isActive: boolean;
  team: {
    id: string;
    name: string;
  } | null;
  manager: {
    id: string;
    name: string;
  } | null;
  employeeProfile?: {
    department: string | null;
    designation: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    pan: string | null;
  } | null;
  salaryStructure?: {
    basicSalary: number;
    hra: number;
    conveyance: number;
    specialAllowance: number;
    effectiveFrom: string | Date;
  } | null;
}

interface Team {
  id: string;
  name: string;
  teamLeader: {
    id: string;
    name: string;
  } | null;
}

interface TLReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  status: string;
  createdAt: string;
  team: { name: string };
  submittedBy: { name: string };
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface LeaveType {
  id: string;
  name: string;
  daysAllowed: number;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 flex items-center justify-center text-xs text-text-muted font-semibold font-mono">Loading dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const subTabParam = searchParams.get('subTab');

  const [mounted, setMounted] = useState(false);


  const formatEmployeeName = (name: string) => {
    if (!name) return '';
    const parts = name.toLowerCase().split(/\s+/).filter(Boolean);
    const capitalized = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1));
    const initials = capitalized.filter(part => part.length === 1);
    const fullWords = capitalized.filter(part => part.length > 1);
    return [...fullWords, ...initials].join(' ');
  };

  const formatToTitleCase = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  };
  type AdminTab = 'analytics' | 'users' | 'new-employee' | 'reports' | 'policies' | 'audit' | 'performance' | 'leaves' | 'payroll' | 'trainings' | 'resignations' | 'login-history' | 'salary-deductions';
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [kpiStats, setKpiStats] = useState<any>({
    totalEmployees: 0,
    activeEmployees: 0,
    newJoiners: 0,
    onLeaveToday: 0,
    absentToday: 0,
    rollingAttendanceRate: 100,
    checkedInToday: 0,
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [reports, setReports] = useState<TLReport[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Performance Rating States
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [overrideUserId, setOverrideUserId] = useState('');
  const [overrideRating, setOverrideRating] = useState('GREEN');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideScore, setOverrideScore] = useState('');
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [performanceCounts, setPerformanceCounts] = useState({ RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 });

  // Leave & WFH Request States
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [leaveSubTab, setLeaveSubTab] = useState<'requests' | 'history' | 'wfh'>('requests');

  useEffect(() => {
    if (tabParam && ['analytics', 'users', 'new-employee', 'reports', 'policies', 'audit', 'performance', 'leaves', 'payroll', 'trainings', 'resignations', 'login-history', 'salary-deductions'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    if (subTabParam && ['requests', 'history', 'wfh'].includes(subTabParam)) {
      setLeaveSubTab(subTabParam as any);
    }
  }, [tabParam, subTabParam]);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { tab, subTab } = customEvent.detail;
        if (tab && ['analytics', 'users', 'new-employee', 'reports', 'policies', 'audit', 'performance', 'leaves', 'payroll', 'trainings', 'resignations', 'login-history', 'salary-deductions'].includes(tab)) {
          setActiveTab(tab as any);
        }
        if (subTab && ['requests', 'history', 'wfh'].includes(subTab)) {
          setLeaveSubTab(subTab as any);
        }
      }
    };
    window.addEventListener('appTabChange', handleTabChange);
    return () => window.removeEventListener('appTabChange', handleTabChange);
  }, []);

  // WFH Management States
  const [wfhRequests, setWfhRequests] = useState<any[]>([]);
  const [isWfhAssignModalOpen, setIsWfhAssignModalOpen] = useState(false);
  const [wfhAssignUserId, setWfhAssignUserId] = useState('');
  const [wfhAssignStartDate, setWfhAssignStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [wfhAssignEndDate, setWfhAssignEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [wfhAssignReason, setWfhAssignReason] = useState('Authorized Work From Home');
  const [submittingWfhAssign, setSubmittingWfhAssign] = useState(false);
  const [rejectWfhId, setRejectWfhId] = useState<string | null>(null);
  const [rejectWfhReason, setRejectWfhReason] = useState('');
  const [isRejectWfhModalOpen, setIsRejectWfhModalOpen] = useState(false);

  // Resignation Request States
  const [resignationRequests, setResignationRequests] = useState<any[]>([]);
  const [reviewResignationId, setReviewResignationId] = useState<string | null>(null);
  const [resignationNotes, setResignationNotes] = useState('');
  const [submittingResignation, setSubmittingResignation] = useState(false);

  // Password Reset Modal States
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<any | null>(null);
  const [newTemporaryPassword, setNewTemporaryPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);

  const initialEmployeeForm = {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    teamId: '',
    managerId: '',
    dateOfBirth: '',
    gender: 'Male',
    maritalStatus: 'Single',
    nationality: 'Indian',
    personalEmail: '',
    mobileNumber: '',
    emergencyContact: '',
    permanentAddress: '',
    currentAddress: '',
    dateOfJoining: new Date().toISOString().split('T')[0],
    employeeType: 'Full-time',
    department: '',
    designation: '',
    workShift: 'General Shift (9:00 - 18:00)',
    workLocationStatus: 'Onsite',
    location: 'Offshore',
    employmentStatus: 'Active',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    ifsc: '',
    bankAddress: '',
    pan: '',
    uan: '',
    professionalEmail: '',
    insuranceNumber: '',
    pfNumber: '',
    expectedEndDate: '',
    incrementPerks: '',
    bloodGroup: 'A+',
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState(initialEmployeeForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Payroll States
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [payrollPeriodStart, setPayrollPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState(() => {
    const d = new Date();
    d.setDate(0); // last day of prev month
    return d.toISOString().split('T')[0];
  });
  const [payrollSubTab, setPayrollSubTab] = useState<'runs' | 'structures'>('runs');
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [selectedSalaryUser, setSelectedSalaryUser] = useState<any>(null);
  const [salaryBasic, setSalaryBasic] = useState('30000');
  const [salaryHRA, setSalaryHRA] = useState('12000');
  const [salaryConveyance, setSalaryConveyance] = useState('3000');
  const [salarySpecial, setSalarySpecial] = useState('5000');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  const [isPayrollEditModalOpen, setIsPayrollEditModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [runOvertime, setRunOvertime] = useState('0');
  const [runBonus, setRunBonus] = useState('0');
  const [runIncentives, setRunIncentives] = useState('0');
  const [runLoanDeduction, setRunLoanDeduction] = useState('0');
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [targetDeductionsEmployeeId, setTargetDeductionsEmployeeId] = useState<string | null>(null);

  // Trainings States
  const [trainings, setTrainings] = useState<any[]>([]);
  const [trainingName, setTrainingName] = useState('');
  const [trainingTrainer, setTrainingTrainer] = useState('');
  const [trainingPlannedDate, setTrainingPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainingHours, setTrainingHours] = useState('8.0');
  const [trainingDept, setTrainingDept] = useState('');
  const [trainingAssignees, setTrainingAssignees] = useState<string[]>([]);

  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [selectedAttendee, setSelectedAttendee] = useState<any>(null);
  const [evalAttended, setEvalAttended] = useState(false);
  const [evalCertified, setEvalCertified] = useState(false);
  const [evalScore, setEvalScore] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [isTrainingEvalModalOpen, setIsTrainingEvalModalOpen] = useState(false);

  // Team Form States
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLeaderId, setNewTeamLeaderId] = useState('');

  // Export Form States
  const [exportType, setExportType] = useState('attendance');
  const [exportTeam, setExportTeam] = useState('all');
  const [exportUser, setExportUser] = useState('all');
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  // Policy Form States
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [leaveName, setLeaveName] = useState('');
  const [leaveDays, setLeaveDays] = useState('12');

  // Status message states
  const [errorMsg, setErrorMsgState] = useState('');
  const [successMsg, setSuccessMsgState] = useState('');
  const [fadeSuccess, setFadeSuccess] = useState(false);
  const [fadeError, setFadeError] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false); // Refactored to avoid generic loading collision
  const [loading, setLoading] = useState(false);

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

  // User search/filter
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchAdminData();
  }, [activeTab]);

  const fetchAdminData = async () => {
    try {
      // 1. Fetch Users & Teams
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
        setTeams(uData.teams || []);
      }

      // 2. Fetch Reports
      const reportsRes = await fetch('/api/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData.reports || []);
      }

      // 2.5. Fetch Analytics KPI Stats
      if (activeTab === 'analytics') {
        const statsRes = await fetch('/api/admin/analytics');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setKpiStats(statsData);
        }
      }

      // 3. Fetch Policies & Logs
      if (activeTab === 'policies' || activeTab === 'analytics' || activeTab === 'audit') {
        const policyRes = await fetch('/api/admin/policy');
        if (policyRes.ok) {
          const policyData = await policyRes.json();
          setHolidays(policyData.holidays || []);
          setLeaveTypes(policyData.leaveTypes || []);
          setAuditLogs(policyData.auditLogs || []);
        }
      }

      // 4. Fetch Performance Scores
      const perfRes = await fetch('/api/admin/performance?recompute=true');
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformanceData(perfData.performanceData || []);
        
        const counts = { RED: 0, YELLOW: 0, GREEN: 0, BLUE: 0 };
        (perfData.performanceData || []).forEach((p: any) => {
          const rating = p.score?.rating as 'RED' | 'YELLOW' | 'GREEN' | 'BLUE';
          if (rating && counts[rating] !== undefined) {
            counts[rating]++;
          }
        });
        setPerformanceCounts(counts);
      }

      // 5. Fetch Leave Requests
      const leaveRes = await fetch('/api/leave-requests');
      if (leaveRes.ok) {
        const leaveData = await leaveRes.json();
        setLeaveRequests(leaveData.requests || []);
      }

      // 5.5. Fetch Payroll Runs
      if (activeTab === 'payroll' || activeTab === 'analytics') {
        const payrollRes = await fetch('/api/payroll/runs');
        if (payrollRes.ok) {
          const payrollData = await payrollRes.json();
          setPayrollRuns(payrollData.runs || []);
        }
      }

      // 5.6. Fetch Trainings catalog & assignments
      if (activeTab === 'trainings') {
        const trainingRes = await fetch('/api/trainings');
        if (trainingRes.ok) {
          const trainingData = await trainingRes.json();
          setTrainings(trainingData.trainings || []);
        }
      }

      // 5.7. Fetch Resignation Requests
      const resignationsRes = await fetch('/api/resignation');
      if (resignationsRes.ok) {
        const resignationsData = await resignationsRes.json();
        setResignationRequests(resignationsData.requests || []);
      }

      // 5.8. Fetch WFH Requests
      const wfhRes = await fetch('/api/wfh-requests');
      if (wfhRes.ok) {
        const wfhData = await wfhRes.json();
        setWfhRequests(wfhData.requests || []);
      }

      // 6. Fetch HR Self Attendance status
      const attRes = await fetch('/api/attendance');
      if (attRes.ok) {
        const attData = await attRes.json();
        setTodayRecord(attData.todayRecord || null);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
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
      setSuccessMsg('Checked in successfully!');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleCheckOut = async () => {
    setLoadingAttendance(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_out', tz: userTz }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to check out');
      setSuccessMsg('Checked out successfully!');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleOpenResetPassword = (user: any) => {
    setResetPasswordModalUser(user);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setNewTemporaryPassword(`Pass#${randomSuffix}`);
    setResetPasswordCopied(false);
  };

  const handleGenerateRandomPassword = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setNewTemporaryPassword(`Pass#${randomSuffix}`);
    setResetPasswordCopied(false);
  };

  const handleCopyPassword = () => {
    if (newTemporaryPassword) {
      navigator.clipboard.writeText(newTemporaryPassword);
      setResetPasswordCopied(true);
      setTimeout(() => setResetPasswordCopied(false), 2000);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalUser) return;
    if (!newTemporaryPassword || newTemporaryPassword.length < 6) {
      setErrorMsg('Temporary password must be at least 6 characters long.');
      return;
    }
    setResetPasswordLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetPasswordModalUser.id,
          newPassword: newTemporaryPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccessMsg(`Password reset successfully for ${resetPasswordModalUser.name}. Temporary password: ${newTemporaryPassword}`);
      setResetPasswordModalUser(null);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resetting password');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleOpenEditEmployee = (u: any) => {
    setEditingUserId(u.id);
    const ep = u.employeeProfile || {};
    setEmployeeForm({
      name: u.name || '',
      email: u.email || '',
      password: '', // Blank by default so password is not overwritten unless entered
      role: u.role || 'EMPLOYEE',
      teamId: u.teamId || '',
      managerId: u.managerId || '',
      dateOfBirth: ep.dateOfBirth ? ep.dateOfBirth.split('T')[0] : '',
      gender: ep.gender || 'Male',
      maritalStatus: ep.maritalStatus || 'Single',
      nationality: ep.nationality || 'Indian',
      personalEmail: ep.personalEmail || '',
      mobileNumber: ep.mobileNumber || '',
      emergencyContact: ep.emergencyContact || '',
      permanentAddress: ep.permanentAddress || '',
      currentAddress: ep.currentAddress || '',
      dateOfJoining: ep.dateOfJoining ? ep.dateOfJoining.split('T')[0] : new Date().toISOString().split('T')[0],
      employeeType: ep.employeeType || 'Full-time',
      department: ep.department || '',
      designation: ep.designation || '',
      workShift: ep.workShift || 'General Shift (9:00 - 18:00)',
      workLocationStatus: ep.workLocationStatus || 'Onsite',
      location: ep.location || 'Offshore',
      employmentStatus: ep.employmentStatus || 'Active',
      bankName: ep.bankName || '',
      bankBranch: ep.bankBranch || '',
      accountNumber: '', // Keep blank so encrypted data is not overwritten unless re-typed
      ifsc: ep.ifsc || '',
      bankAddress: ep.bankAddress || '',
      pan: '', // Keep blank so encrypted data is not overwritten unless re-typed
      uan: ep.uan || '',
      professionalEmail: ep.professionalEmail || '',
      insuranceNumber: ep.insuranceNumber || '',
      pfNumber: ep.pfNumber || '',
      expectedEndDate: ep.expectedEndDate ? ep.expectedEndDate.split('T')[0] : '',
      incrementPerks: ep.incrementPerks || '',
      bloodGroup: ep.bloodGroup || 'A+',
    });
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});
    setActiveTab('new-employee');
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEmployeeForm(initialEmployeeForm);
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});
    setActiveTab('users');
  };

  const validateEmployeeForm = (): boolean => {
    const errors: Record<string, string> = {};

    // 1. Account Credentials & Hierarchy
    if (!employeeForm.name.trim()) {
      errors.name = 'Full name is required';
    } else if (employeeForm.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    if (!employeeForm.email.trim()) {
      errors.email = 'Official email address is required';
    } else if (!isValidEmail(employeeForm.email)) {
      errors.email = 'Please enter a valid official email address (e.g. rahul@nextitpoint.com)';
    }

    if (!editingUserId) {
      if (!employeeForm.password) {
        errors.password = 'Password is required for new accounts';
      } else if (!isValidPassword(employeeForm.password, 6)) {
        errors.password = 'Password must be at least 6 characters long';
      }
    } else if (employeeForm.password && !isValidPassword(employeeForm.password, 6)) {
      errors.password = 'New password must be at least 6 characters long';
    }

    if (!employeeForm.role) {
      errors.role = 'System role is required';
    }

    // 2. Employment Details
    if (!employeeForm.dateOfJoining) {
      errors.dateOfJoining = 'Date of joining is required';
    } else if (!isValidDate(employeeForm.dateOfJoining)) {
      errors.dateOfJoining = 'Please enter a valid date of joining';
    }

    if (!employeeForm.department.trim()) {
      errors.department = 'Department is required';
    }

    if (!employeeForm.designation.trim()) {
      errors.designation = 'Designation is required';
    }

    // 3. Personal & Contact Info
    if (employeeForm.dateOfBirth) {
      if (!isValidDate(employeeForm.dateOfBirth)) {
        errors.dateOfBirth = 'Please enter a valid date of birth';
      } else if (!isNotFutureDate(employeeForm.dateOfBirth)) {
        errors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (employeeForm.personalEmail && !isValidEmail(employeeForm.personalEmail)) {
      errors.personalEmail = 'Please enter a valid personal email address';
    }

    if (employeeForm.professionalEmail && !isValidEmail(employeeForm.professionalEmail)) {
      errors.professionalEmail = 'Please enter a valid professional email address';
    }

    if (employeeForm.mobileNumber && !isValidPhone(employeeForm.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    // 4. Bank & Financial details
    if (employeeForm.accountNumber && !employeeForm.accountNumber.includes('••••')) {
      if (!isValidAccountNumber(employeeForm.accountNumber)) {
        errors.accountNumber = 'Account number must be 9 to 18 digits';
      }
    }

    if (employeeForm.ifsc && !isValidIFSC(employeeForm.ifsc)) {
      errors.ifsc = 'Please enter a valid 11-character IFSC code (e.g. HDFC0001234)';
    }

    if (employeeForm.pan && !employeeForm.pan.includes('••••')) {
      if (!isValidPAN(employeeForm.pan)) {
        errors.pan = 'Please enter a valid 10-character PAN number (e.g. ABCDE1234F)';
      }
    }

    if (employeeForm.uan && !isValidUAN(employeeForm.uan)) {
      errors.uan = 'UAN number must be exactly 12 digits';
    }

    // 5. Contract Details
    if (employeeForm.expectedEndDate && employeeForm.dateOfJoining) {
      if (!isDateOrderValid(employeeForm.dateOfJoining, employeeForm.expectedEndDate)) {
        errors.expectedEndDate = 'Expected end date must be on or after date of joining';
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setErrorMsg('Please correct the highlighted validation errors before submitting.');
      // Auto-scroll to first invalid section
      if (errors.name || errors.email || errors.password || errors.role) {
        document.getElementById('section-account')?.scrollIntoView({ behavior: 'smooth' });
      } else if (errors.dateOfJoining || errors.department || errors.designation) {
        document.getElementById('section-employment')?.scrollIntoView({ behavior: 'smooth' });
      } else if (errors.dateOfBirth || errors.personalEmail || errors.professionalEmail || errors.mobileNumber) {
        document.getElementById('section-personal')?.scrollIntoView({ behavior: 'smooth' });
      } else if (errors.accountNumber || errors.ifsc || errors.pan || errors.uan) {
        document.getElementById('section-financial')?.scrollIntoView({ behavior: 'smooth' });
      } else if (errors.expectedEndDate) {
        document.getElementById('section-contract')?.scrollIntoView({ behavior: 'smooth' });
      }
      return false;
    }

    return true;
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateEmployeeForm()) {
      return;
    }

    setLoading(true);

    try {
      if (editingUserId) {
        // PUT update existing employee
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUserId, ...employeeForm }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update employee profile');

        setSuccessMsg(`Employee profile for ${employeeForm.name} updated successfully!`);
        setEditingUserId(null);
        setEmployeeForm(initialEmployeeForm);
        setFormErrors({});
        fetchAdminData();
        setActiveTab('users');
      } else {
        // POST create new employee
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employeeForm),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create employee');

        setSuccessMsg(`Employee account for ${employeeForm.name} created successfully! Generated ID: ${data.user.id}`);
        setEmployeeForm(initialEmployeeForm);
        setFormErrors({});
        fetchAdminData();
        setActiveTab('users');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving employee');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollPeriodStart || !payrollPeriodEnd) {
      setErrorMsg('Please select both Start Date and End Date for payroll.');
      return;
    }
    if (!isDateOrderValid(payrollPeriodStart, payrollPeriodEnd)) {
      setErrorMsg('Payroll start date must be on or before end date.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart: payrollPeriodStart, periodEnd: payrollPeriodEnd }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate payroll runs');

      let msg = `Generated ${data.generatedRuns?.length || 0} payroll runs.`;
      if (data.skippedUsers?.length > 0) {
        msg += ` Skipped ${data.skippedUsers.length} users (e.g. ${data.skippedUsers.map((u: any) => u.name).join(', ')}).`;
      }
      setSuccessMsg(msg);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalaryUser) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/payroll/salary-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSalaryUser.id,
          basicSalary: parseFloat(salaryBasic),
          hra: parseFloat(salaryHRA),
          conveyance: parseFloat(salaryConveyance),
          specialAllowance: parseFloat(salarySpecial),
          effectiveFrom: salaryEffectiveFrom,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update salary structure');

      setSuccessMsg(`Salary structure for ${selectedSalaryUser.name} updated successfully!`);
      setIsSalaryModalOpen(false);
      setSelectedSalaryUser(null);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating salary structure');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayrollValues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRun) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRun.id,
          action: 'update_values',
          overtime: parseFloat(runOvertime),
          bonus: parseFloat(runBonus),
          incentives: parseFloat(runIncentives),
          loanDeduction: parseFloat(runLoanDeduction),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payroll values');

      setSuccessMsg(`Payroll values updated for employee!`);
      setIsPayrollEditModalOpen(false);
      setSelectedRun(null);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating payroll');
    } finally {
      setLoading(false);
    }
  };

  const handlePayrollStatusChange = async (id: string, newStatus: 'APPROVED' | 'PAID') => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'status_change',
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payroll status');

      setSuccessMsg(`Payroll run status updated to ${newStatus}!`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingName.trim()) {
      setErrorMsg('Please enter a course title.');
      return;
    }
    if (!trainingPlannedDate) {
      setErrorMsg('Please select a planned training date.');
      return;
    }
    if (trainingAssignees.length === 0) {
      setErrorMsg('Please select at least one employee to assign to this training.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingName,
          trainer: trainingTrainer,
          plannedDate: trainingPlannedDate,
          durationHours: parseFloat(trainingHours),
          department: trainingDept,
          userIds: trainingAssignees,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create training');

      setSuccessMsg(`Training course "${trainingName}" created & employees assigned successfully!`);
      setTrainingName('');
      setTrainingTrainer('');
      setTrainingHours('8.0');
      setTrainingDept('');
      setTrainingAssignees([]);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating training');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordTrainingEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraining || !selectedAttendee) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/trainings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_attendance',
          trainingId: selectedTraining.id,
          userId: selectedAttendee.id,
          attended: evalAttended,
          certified: evalCertified,
          assessmentScore: evalScore !== '' ? parseFloat(evalScore) : null,
          feedback: evalFeedback,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit training evaluation');

      setSuccessMsg(`Training evaluation recorded for ${selectedAttendee.name}!`);
      setIsTrainingEvalModalOpen(false);
      setSelectedTraining(null);
      setSelectedAttendee(null);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error recording evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || newTeamName.trim().length < 2) {
      setErrorMsg('Please enter a valid Team Name (at least 2 characters).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName, teamLeaderId: newTeamLeaderId || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      setSuccessMsg(`Team "${newTeamName}" created successfully!`);
      setNewTeamName('');
      setNewTeamLeaderId('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating team');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserActivation = async (id: string, currentlyDeactivated: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          deactivate: !currentlyDeactivated,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      setSuccessMsg(`User account status updated.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error modifying status');
    }
  };

  const handleReviewReport = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review report');

      setSuccessMsg(`Team Leader status report has been ${status.toLowerCase()}!`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reviewing report');
    }
  };

  const handleOpenOverrideModal = (userId: string, scoreRecord: any) => {
    setOverrideUserId(userId);
    setOverrideRating(scoreRecord.rating || 'GREEN');
    setOverrideReason(scoreRecord.overrideReason || '');
    setOverrideScore(scoreRecord.overrideScore !== null && scoreRecord.overrideScore !== undefined ? String(scoreRecord.overrideScore) : '');
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setErrorMsg('Override reason is required.');
      return;
    }

    try {
      const res = await fetch('/api/admin/performance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: overrideUserId,
          rating: overrideRating,
          reason: overrideReason,
          overrideScore: overrideScore.trim() !== '' ? parseFloat(overrideScore) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply override');

      setSuccessMsg('Performance rating override saved successfully.');
      setIsOverrideModalOpen(false);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    }
  };

  const handleClearOverride = async (userId: string) => {
    if (!confirm('Are you sure you want to clear this manual override and restore automatic scoring?')) return;
    try {
      const res = await fetch('/api/admin/performance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clearOverride: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear override');

      setSuccessMsg('Manual override cleared and score recalculated.');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error clearing override');
    }
  };

  const handleReviewLeaveRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review leave request');

      setSuccessMsg(`Leave request has been ${status.toLowerCase()} successfully.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reviewing leave request');
    }
  };

  const handleOpenRejectModal = (id: string) => {
    setRejectRequestId(id);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRequestId) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 3) {
      setErrorMsg('Please enter a rejection reason (minimum 3 characters).');
      return;
    }

    try {
      const res = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectRequestId,
          status: 'REJECTED',
          rejectionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject leave request');

      setSuccessMsg('Leave request has been rejected successfully.');
      setIsRejectModalOpen(false);
      setRejectRequestId(null);
      setRejectionReason('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting leave request');
    }
  };

  // WFH Handlers
  const handleDirectAssignWfh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfhAssignUserId) {
      setErrorMsg('Please select an employee.');
      return;
    }
    if (!wfhAssignStartDate || !wfhAssignEndDate) {
      setErrorMsg('Please specify both Start Date and End Date.');
      return;
    }
    if (!isDateOrderValid(wfhAssignStartDate, wfhAssignEndDate)) {
      setErrorMsg('WFH Start Date must be on or before End Date.');
      return;
    }
    if (!wfhAssignReason.trim()) {
      setErrorMsg('Please provide a reason for WFH assignment.');
      return;
    }

    setSubmittingWfhAssign(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/wfh-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: wfhAssignUserId,
          startDate: wfhAssignStartDate,
          endDate: wfhAssignEndDate,
          reason: wfhAssignReason,
          directAssign: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign Work From Home');

      setSuccessMsg('Work From Home assigned and activated successfully!');
      setIsWfhAssignModalOpen(false);
      setWfhAssignUserId('');
      const todayStr = new Date().toISOString().split('T')[0];
      setWfhAssignStartDate(todayStr);
      setWfhAssignEndDate(todayStr);
      setWfhAssignReason('Authorized Work From Home');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error assigning WFH');
    } finally {
      setSubmittingWfhAssign(false);
    }
  };

  const handleReviewWfhRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/wfh-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review WFH request');

      setSuccessMsg(`WFH request has been ${status.toLowerCase()} successfully.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error reviewing WFH request');
    }
  };

  const handleOpenRejectWfhModal = (id: string) => {
    setRejectWfhId(id);
    setRejectWfhReason('');
    setIsRejectWfhModalOpen(true);
  };

  const handleConfirmRejectWfh = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectWfhId) return;
    if (!rejectWfhReason.trim() || rejectWfhReason.trim().length < 3) {
      setErrorMsg('Please enter a rejection reason (minimum 3 characters).');
      return;
    }

    try {
      const res = await fetch('/api/wfh-requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectWfhId,
          status: 'REJECTED',
          rejectionReason: rejectWfhReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject WFH request');

      setSuccessMsg('WFH request has been rejected successfully.');
      setIsRejectWfhModalOpen(false);
      setRejectWfhId(null);
      setRejectWfhReason('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting WFH request');
    }
  };

  const handleReviewResignation = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setSubmittingResignation(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/resignation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          hrNotes: resignationNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update resignation request');
      setSuccessMsg(`Resignation request has been ${status.toLowerCase()} successfully!`);
      setReviewResignationId(null);
      setResignationNotes('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating resignation request');
    } finally {
      setSubmittingResignation(false);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim()) {
      setErrorMsg('Please enter a holiday name.');
      return;
    }
    if (!holidayDate) {
      setErrorMsg('Please select a holiday date.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'holiday',
          name: holidayName,
          date: holidayDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create holiday');

      setSuccessMsg('Holiday configured successfully!');
      setHolidayName('');
      setHolidayDate('');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to remove this holiday?')) return;
    try {
      const res = await fetch(`/api/admin/policy?id=${id}&type=holiday`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Holiday deleted.');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error deleting holiday:', err);
    }
  };

  const handleCreateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveName.trim()) {
      setErrorMsg('Please enter a leave policy name.');
      return;
    }
    if (!leaveDays || parseInt(leaveDays) <= 0) {
      setErrorMsg('Days allowed must be a positive number.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'leave_type',
          name: leaveName,
          daysAllowed: leaveDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create leave policy');

      setSuccessMsg('Leave policy added successfully!');
      setLeaveName('');
      setLeaveDays('12');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    }
  };

  const handleDeleteLeaveType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave policy?')) return;
    try {
      const res = await fetch(`/api/admin/policy?id=${id}&type=leave_type`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Leave policy removed.');
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error deleting leave policy:', err);
    }
  };

  const handleExportExcel = () => {
    // Builds queries and triggers direct browser download stream
    let url = `/api/admin/export?type=${exportType}`;
    if (exportTeam !== 'all') url += `&teamId=${exportTeam}`;
    if (exportUser !== 'all') url += `&userId=${exportUser}`;
    if (exportStart && exportEnd) url += `&startDate=${exportStart}&endDate=${exportEnd}`;

    // Standard redirect to download file
    window.location.href = url;
  };

  // Mock analytics data for visual charts
  const analyticsData = [
    { name: 'Monday', Present: 42, Late: 5, Absent: 3 },
    { name: 'Tuesday', Present: 44, Late: 4, Absent: 2 },
    { name: 'Wednesday', Present: 45, Late: 3, Absent: 2 },
    { name: 'Thursday', Present: 41, Late: 7, Absent: 2 },
    { name: 'Friday', Present: 43, Late: 5, Absent: 2 },
  ];

  const pieData = [
    { name: 'Completed Tasks', value: 24, color: 'var(--status-success)' },
    { name: 'In Progress', value: 12, color: 'var(--blue-600)' },
    { name: 'Not Started', value: 8, color: 'var(--status-danger)' },
  ];

  const pendingReportsCount = reports.filter(r => r.status === 'PENDING').length;

  const filteredUsers = users.filter(user => {
    return user.name.toLowerCase().includes(userSearch.toLowerCase()) || 
           user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
           user.role.toLowerCase().includes(userSearch.toLowerCase());
  });

  const adminNavItems: {
    id: AdminTab;
    label: string;
    icon: any;
    subItems?: {
      id: AdminTab;
      label: string;
      icon: any;
    }[];
  }[] = [
    { id: 'analytics', label: 'Analytics & Export', icon: TrendingUp },
    { id: 'users', label: 'Account Management', icon: Users },
    { id: 'new-employee', label: 'Create Employee', icon: UserPlus },
    { id: 'performance', label: 'Performance Ratings', icon: FileCheck },
    { id: 'leaves', label: 'Leave Requests', icon: Calendar },
    {
      id: 'payroll',
      label: 'Run Payroll',
      icon: CreditCard,
      subItems: [
        { id: 'payroll', label: 'Payroll Overview', icon: FileSpreadsheet },
        { id: 'login-history', label: 'Login History', icon: Clock },
        { id: 'salary-deductions', label: 'Salary Deductions', icon: Calculator },
      ],
    },
    { id: 'reports', label: 'Review TL Reports', icon: FileText },
    { id: 'trainings', label: 'Training Center', icon: BookOpen },
    { id: 'policies', label: 'Policies & Holidays', icon: Settings },
    { id: 'resignations', label: 'Resignations', icon: UserMinus },
    { id: 'audit', label: 'System Audit Log', icon: ShieldAlert },
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
          <span className="text-xs font-extrabold text-navy-900 tracking-wider">
            {activeTab === 'login-history'
              ? 'Login History'
              : activeTab === 'salary-deductions'
              ? 'Salary Deductions'
              : adminNavItems.find(item => item.id === activeTab)?.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Persistent Left Sidebar - Desktop */}
        <DesktopSidebar
          navItems={adminNavItems}
          activeTab={activeTab}
          onTabChange={(id) => {
            if (id === 'new-employee' && editingUserId) {
              setEditingUserId(null);
              setEmployeeForm(initialEmployeeForm);
            }
            setActiveTab(id as any);
          }}
          layoutPillId="activeTabPillAdmin"
          bottomLink={null}
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
                <span className="text-sm font-extrabold text-navy-900 font-heading">Admin Panel</span>
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="text-text-muted hover:text-text-muted p-1 cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto space-y-1">
                {adminNavItems.map((item) => {
                  const hasChildren = Boolean(item.subItems && item.subItems.length > 0);
                  const isChildActive = Boolean(item.subItems?.some((s) => s.id === activeTab));
                  const isActive = activeTab === item.id || isChildActive;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          if (item.id === 'new-employee' && editingUserId) {
                            setEditingUserId(null);
                            setEmployeeForm(initialEmployeeForm);
                          }
                          setActiveTab(item.id);
                          if (!hasChildren) {
                            setIsMobileSidebarOpen(false);
                          }
                        }}
                        title={item.label}
                        aria-label={item.label}
                        className={`w-full text-left py-3 px-4 flex items-center justify-between transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 border-l-4 border-navy-900 text-navy-900 font-extrabold' 
                            : 'border-l-4 border-transparent text-text-muted hover:bg-blue-50 hover:text-navy-900 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-navy-900' : 'text-text-muted'}`} />
                          <span className="text-xs tracking-wide">{item.label}</span>
                        </div>
                        {hasChildren && <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
                      </button>

                      {hasChildren && item.subItems && (
                        <div className="pl-9 pr-3 space-y-1 py-1 bg-blue-50/40">
                          {item.subItems.map((sub) => {
                            const isSubActive = activeTab === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setActiveTab(sub.id);
                                  setIsMobileSidebarOpen(false);
                                }}
                                className={`w-full text-left py-2 px-3 flex items-center gap-2 rounded-lg text-xs font-semibold cursor-pointer ${
                                  isSubActive
                                    ? 'bg-blue-600 text-white font-bold'
                                    : 'text-text-muted hover:text-navy-900 hover:bg-white/60'
                                }`}
                              >
                                <sub.icon className="w-3.5 h-3.5 shrink-0" />
                                <span>{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 p-4 md:pt-4 md:px-8 md:pb-12 w-full max-w-7xl mx-auto">
        
        {/* Status Alerts */}
        {errorMsg && (
          <div className={`mb-6 rounded-lg bg-status-danger-bg p-4 text-sm text-brand-red flex items-start justify-between gap-2.5 border border-status-danger/20 transition-all duration-500 ease-in-out ${fadeError ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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
          <div className={`mb-6 rounded-lg bg-status-success-bg p-4 text-sm text-status-success-text flex items-start justify-between gap-2.5 border border-status-success/20 transition-all duration-500 ease-in-out ${fadeSuccess ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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

        {/* Dashboard Title & Quick KPIs */}
        {activeTab === 'analytics' && (
          <div className="mb-6 relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-navy-900 font-heading tracking-tight">HR & Admin Command Center</h1>
              <p className="text-xs text-text-muted mt-1 font-medium">Configure company policy, verify check-ins, approve reports, and audit system actions.</p>
            </div>

            {/* Quick Check-in/out widget for HR */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3.5 bg-card rounded-2xl p-3 border border-border shadow-sm self-start lg:self-center max-w-full">
              <div className="w-9 h-9 rounded-xl bg-blue-50/80 text-blue-600 flex items-center justify-center border border-blue-100/60 shrink-0 shadow-3xs">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-[120px]">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Daily Work Shift</span>
                <span className="text-xs font-bold text-navy-900 block mt-0.5">
                  {todayRecord && todayRecord.checkInTime ? (
                    <>
                      In: <span className="font-semibold text-blue-600">{new Date(todayRecord.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {todayRecord.checkOutTime ? (
                        <>
                          {" "}• Out: <span className="font-semibold text-brand-red">{new Date(todayRecord.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </>
                      ) : ''}
                    </>
                  ) : (
                    'Not Checked In'
                  )}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {todayRecord && todayRecord.checkInTime && todayRecord.checkOutTime ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-status-success-bg border border-status-success/20 text-status-success-text text-xs font-bold shadow-3xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-success-text shrink-0" />
                    <span>Shift completed</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleCheckIn}
                      disabled={loadingAttendance || !!(todayRecord && todayRecord.checkInTime)}
                      className={`font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                        (!todayRecord?.checkInTime && !loadingAttendance)
                          ? 'bg-blue-600 hover:bg-navy-700 text-white cursor-pointer shadow-sm btn-premium'
                          : 'bg-blue-50 text-text-muted cursor-not-allowed'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {loadingAttendance && !todayRecord?.checkInTime ? '...' : 'Check In'}
                    </button>
                    <button
                      onClick={handleCheckOut}
                      disabled={loadingAttendance || !todayRecord?.checkInTime || !!todayRecord?.checkOutTime}
                      className={`font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                        (todayRecord?.checkInTime && !todayRecord?.checkOutTime && !loadingAttendance)
                          ? 'bg-brand-red hover:bg-status-danger text-white cursor-pointer shadow-sm btn-premium'
                          : 'bg-blue-50 text-text-muted cursor-not-allowed'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {loadingAttendance && todayRecord?.checkInTime && !todayRecord?.checkOutTime ? '...' : 'Check Out'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HR KPI Cards - Only visible on Analytics (home) tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Active Staff & Growth */}
              <div className="bg-white rounded-2xl border border-border/70 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]">

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-blue-50/90 text-blue-600 flex items-center justify-center border border-blue-100/70 shadow-3xs shrink-0">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Active Staff</span>
                </div>
                <div className="relative z-10 pt-2">
                  <span className="block text-3xl font-black text-navy-900 font-heading leading-tight">
                    {kpiStats.activeEmployees || users.filter(u => u.isActive && (u.role === 'EMPLOYEE' || u.role === 'TL')).length}
                  </span>
                  <span className="text-[11px] font-bold text-status-success-text flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3.5 h-3.5 text-status-success-text shrink-0" />
                    +{kpiStats.newJoiners ?? 0} new this month
                  </span>
                </div>
              </div>

              {/* 2. Today's Attendance (Present / Absent / On Leave) */}
              <div className="bg-white rounded-2xl border border-border/70 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]">

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-status-success-bg/90 text-status-success-text flex items-center justify-center border border-status-success/20/70 shadow-3xs shrink-0">
                    <CalendarCheck className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Today's Attendance</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center divide-x divide-gray-100 relative z-10">
                  <div>
                    <span className="block text-xl font-black text-status-success-text font-heading leading-tight">
                      {kpiStats.checkedInToday ?? 0}
                    </span>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight block mt-0.5">Present</span>
                  </div>
                  <div>
                    <span className="block text-xl font-black text-status-danger-text font-heading leading-tight">
                      {kpiStats.absentToday ?? 0}
                    </span>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight block mt-0.5">Absent</span>
                  </div>
                  <div>
                    <span className="block text-xl font-black text-navy-700 font-heading leading-tight">
                      {kpiStats.onLeaveToday ?? 0}
                    </span>
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-tight block mt-0.5">On Leave</span>
                  </div>
                </div>
              </div>

              {/* 3. Pending Actions (Reports + Leaves) */}
              <div className="bg-white rounded-2xl border border-border/70 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]">

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-status-warning-bg/90 text-status-warning-text flex items-center justify-center border border-status-warning/20/70 shadow-3xs shrink-0">
                    <Layers className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pending Actions</span>
                </div>
                <div className="relative z-10 pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-navy-900 font-heading leading-tight">
                      {(reports.filter(r => r.status === 'PENDING').length) + (leaveRequests.filter(r => r.status === 'PENDING').length)}
                    </span>
                    <span className="text-xs font-bold text-navy-700">Action Items</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold">
                    <button 
                      onClick={() => setActiveTab('reports')} 
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {reports.filter(r => r.status === 'PENDING').length} Reports
                    </button>
                    <span className="text-text-muted">•</span>
                    <button 
                      onClick={() => setActiveTab('leaves')} 
                      className="text-navy-700 hover:underline cursor-pointer"
                    >
                      {leaveRequests.filter(r => r.status === 'PENDING').length} Leaves
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Performance Overview */}
              <div className="bg-white rounded-2xl border border-border/70 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between min-h-[110px]">

                <div className="flex items-center gap-2.5 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-blue-50/90 text-navy-700 flex items-center justify-center border border-blue-100/70 shadow-3xs shrink-0">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Performance</span>
                </div>
                <div className="flex items-center justify-center pt-1 relative z-10">
                  <PerformancePieChart
                    counts={performanceCounts}
                    size={52}
                    showLegend={true}
                    showDetails={false}
                  />
                </div>
              </div>
            </div>
            
            {/* Visual Charts */}
            {mounted && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Attendance Trends */}
                <div className="bg-white rounded-2xl border border-border/70 p-6 shadow-sm hover:shadow-md transition-all lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-navy-900 font-heading flex items-center gap-2">
                      <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                      Attendance Trends (Weekly Overview)
                    </h2>
                    <div className="flex items-center gap-1.5 bg-white border border-border/80 rounded-lg px-2.5 py-1 text-xs font-bold text-text-muted shadow-3xs cursor-pointer hover:border-input-border">
                      <span>This Week</span>
                      <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                  </div>
                  
                  <div className="h-[260px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%" debounce={300}>
                      <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPresentModern" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--blue-600)" stopOpacity={0.35}/>
                            <stop offset="100%" stopColor="var(--blue-600)" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} domain={[0, 60]} ticks={[0, 15, 30, 45, 60]} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--navy-900)', borderRadius: '12px', border: 'none', color: 'var(--card)', fontSize: '11px', fontWeight: 'bold' }} />
                        <Area 
                          type="monotone" 
                          dataKey="Present" 
                          stroke="var(--blue-600)" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorPresentModern)" 
                          dot={{ r: 4.5, fill: 'var(--card)', stroke: 'var(--blue-600)', strokeWidth: 2.5 }} 
                          activeDot={{ r: 6.5, fill: 'var(--blue-600)', stroke: 'var(--card)', strokeWidth: 2.5 }} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Task Accomplishment */}
                <div className="bg-white rounded-2xl border border-border/70 p-6 shadow-sm hover:shadow-md transition-all lg:col-span-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-navy-900 font-heading mb-3 flex items-center gap-2">
                      <FileCheck className="w-4.5 h-4.5 text-blue-600" />
                      Task Completion Overview
                    </h2>
                    
                    <div className="relative h-[190px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%" debounce={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={56}
                            outerRadius={78}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: 'var(--navy-900)', borderRadius: '12px', border: 'none', color: 'var(--card)', fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Center Donut Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-navy-900 font-heading leading-tight">
                          {pieData.reduce((acc, curr) => acc + curr.value, 0)}
                        </span>
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">Total Tasks</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend with Counts and Percentages */}
                  <div className="space-y-2 mt-2 pt-3 border-t border-border">
                    {(() => {
                      const totalTasksCount = pieData.reduce((acc, curr) => acc + curr.value, 0);
                      return pieData.map((d, i) => {
                        const pct = totalTasksCount > 0 ? Math.round((d.value / totalTasksCount) * 100) : 0;
                        return (
                          <div key={i} className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-2 text-text-muted">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              {d.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-navy-900 font-bold">{d.value} Tasks</span>
                              <span className="text-text-muted text-[11px] w-8 text-right font-mono font-medium">{pct}%</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Excel Export Module */}
            <div className="premium-card p-6">
              <h2 className="text-lg font-bold text-navy-900 font-heading mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                Data Export & Excel Stream Center
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Export Data Type</label>
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                  >
                    <option value="attendance">Shift Attendance Logs</option>
                    <option value="tracksheet">Work Track Sheets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Filter Team</label>
                  <select
                    value={exportTeam}
                    onChange={(e) => setExportTeam(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                  >
                    <option value="all">All Teams</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Filter Employee</label>
                  <select
                    value={exportUser}
                    onChange={(e) => setExportUser(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                  >
                    <option value="all">All Employees</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exportStart}
                    onChange={(e) => setExportStart(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exportEnd}
                    onChange={(e) => setExportEnd(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleExportExcel}
                  className="bg-blue-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-navy-700 transition-all flex items-center gap-2 cursor-pointer btn-premium shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Stream to Excel Spreadsheet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: User Account Administration */}
        {activeTab === 'users' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-white" />
                User Account Administration
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Manage, edit, activate, and deactivate employee accounts across the system.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Create Team Form */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-blue-50/70 p-5 rounded-2xl border border-border/80 space-y-4">
                    <h2 className="text-sm font-bold text-navy-900 font-heading flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-red" />
                      Create New Team
                    </h2>
                    <p className="text-[11px] text-text-muted">
                      Group staff into functional teams and assign a Team Leader (TL).
                    </p>

                    <form onSubmit={handleCreateTeam} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">
                          Team Name <span className="text-red-500 font-bold ml-0.5">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          placeholder="e.g. Sales & Growth"
                          className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-navy-900 mb-1">Assign Team Leader (Optional)</label>
                        <select
                          value={newTeamLeaderId}
                          onChange={(e) => setNewTeamLeaderId(e.target.value)}
                          className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                        >
                          <option value="">No Team Leader</option>
                          {users.filter(u => u.role === 'TL').map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs cursor-pointer btn-premium text-center disabled:opacity-50"
                      >
                        {loading ? 'Creating Team...' : 'Create Team'}
                      </button>
                    </form>
                  </div>

                  {/* Quick Stats card */}
                  <div className="bg-blue-50/70 p-5 rounded-2xl border border-border/80 space-y-3">
                    <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Account Roster Summary</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-border shadow-3xs">
                        <span className="text-text-muted block text-[10px] font-bold">Total Accounts</span>
                        <span className="text-lg font-black text-navy-900">{users.length}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border shadow-3xs">
                        <span className="text-text-muted block text-[10px] font-bold">Active Staff</span>
                        <span className="text-lg font-black text-status-success-text">{users.filter(u => u.isActive).length}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border shadow-3xs">
                        <span className="text-text-muted block text-[10px] font-bold">Team Leaders</span>
                        <span className="text-lg font-black text-blue-600">{users.filter(u => u.role === 'TL').length}</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-border shadow-3xs">
                        <span className="text-text-muted block text-[10px] font-bold">Total Teams</span>
                        <span className="text-lg font-black text-navy-700">{teams.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: User Directory */}
                <div className="lg:col-span-2 flex flex-col min-h-[500px]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
                    <div>
                      <h2 className="text-sm font-bold text-navy-900 font-heading">User Directory</h2>
                      <span className="text-[11px] text-text-muted">Showing {filteredUsers.length} of {users.length} registered accounts</span>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-60">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search accounts..."
                          className="block w-full rounded-xl border border-border/80 py-1.5 pl-9 pr-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditingUserId(null);
                          setEmployeeForm(initialEmployeeForm);
                          setActiveTab('new-employee');
                        }}
                        className="bg-blue-600 hover:bg-navy-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap hidden sm:inline-flex items-center gap-1"
                        title="Onboard New Employee"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Create Employee
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1 max-h-[580px]">
                    <table className="min-w-full text-left text-xs relative border-collapse">
                      <thead className="sticky top-0 bg-blue-50/80 backdrop-blur-xs text-navy-700 font-bold z-10">
                        <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                          <th className="py-3 px-2 bg-transparent">Name & Email</th>
                          <th className="py-3 px-2 bg-transparent">Role</th>
                          <th className="py-3 px-2 bg-transparent">Team</th>
                          <th className="py-3 px-2 bg-transparent">Reporting Manager</th>
                          <th className="py-3 px-2 text-center bg-transparent">Status</th>
                          <th className="py-3 px-2 text-center bg-transparent">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-text-muted font-medium">No accounts matched your search.</td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isDeactivated = !u.isActive;
                            return (
                              <tr key={u.id} className="hover:bg-blue-50/50">
                                <td className="py-3 px-2">
                                  <div className="font-bold text-navy-900">{u.name}</div>
                                  <div className="text-[10px] text-text-muted">{u.email}</div>
                                </td>
                                <td className="py-3 px-2 font-medium text-navy-900">
                                  <span className="bg-blue-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {formatToTitleCase(u.role)}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-text-muted font-medium">{u.team ? u.team.name : 'Unassigned'}</td>
                                <td className="py-3 px-2 text-text-muted font-medium">{u.manager ? u.manager.name : 'None'}</td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                    isDeactivated ? 'bg-status-danger-bg text-brand-red' : 'bg-status-success-bg text-status-success-text'
                                  }`}>
                                    {isDeactivated ? 'Deactivated' : 'Active'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center whitespace-nowrap space-x-1.5">
                                  <button
                                    onClick={() => handleOpenEditEmployee(u)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-xs transition-all cursor-pointer"
                                    title="Edit Employee Profile"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleOpenResetPassword(u)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg hover:shadow-xs transition-all cursor-pointer"
                                    title="Reset Employee Password"
                                  >
                                    Reset Password
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserActivation(u.id, isDeactivated)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      isDeactivated 
                                        ? 'bg-status-success-bg text-status-success-text hover:bg-status-success-bg' 
                                        : 'bg-status-danger-bg text-brand-red hover:bg-status-danger-bg'
                                    }`}
                                  >
                                    {isDeactivated ? 'Reactivate' : 'Deactivate'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Create / Edit Employee */}
        {activeTab === 'new-employee' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <UserPlus className="w-4.5 h-4.5 text-white" />
                  {editingUserId ? 'Edit Employee Profile' : 'Onboard & Create New Employee'}
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  {editingUserId 
                    ? `Updating profile and system credentials for ${employeeForm.name || 'employee'}.` 
                    : 'Provide employee details to generate their system account and profile record.'}
                </p>
              </div>
              {editingUserId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Back to Accounts
                </button>
              )}
            </div>

            {/* Sticky 5-Section Navigation Bar */}
            <div className="sticky top-[73px] z-20 bg-white/95 backdrop-blur-md px-6 pt-3.5 pb-1 flex items-center gap-2 overflow-x-auto custom-scrollbar-container">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">Jump to:</span>
              {[
                { id: 'section-account', label: '1. Credentials' },
                { id: 'section-employment', label: '2. Employment' },
                { id: 'section-personal', label: '3. Personal' },
                { id: 'section-financial', label: '4. Bank & Finance' },
                { id: 'section-contract', label: '5. Contract & Perks' },
              ].map(sec => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-navy-900 bg-blue-50 hover:bg-navy-900 hover:text-white transition-all shrink-0 cursor-pointer shadow-3xs"
                >
                  {sec.label}
                </button>
              ))}
            </div>

            <div className="px-6 pb-6 pt-3">
              <form onSubmit={handleSaveEmployee} className="space-y-6">
              {/* Section 1: Account Details */}
              <div id="section-account" className="bg-blue-50 border border-border p-5 rounded-2xl space-y-4 scroll-mt-32">
                <h3 className="text-xs font-bold tracking-wider text-blue-600">1. Account Credentials & Hierarchy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeForm.name}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => { const n = { ...prev }; delete n.name; return n; });
                      }}
                      placeholder="e.g. Rahul Kumar"
                      className={`block w-full rounded-xl border ${
                        formErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs sm:text-sm`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Official Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={employeeForm.email}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, email: e.target.value }));
                        if (formErrors.email) setFormErrors(prev => { const n = { ...prev }; delete n.email; return n; });
                      }}
                      placeholder="rahul@nextitpoint.com"
                      className={`block w-full rounded-xl border ${
                        formErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs sm:text-sm`}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Password {editingUserId ? '(Optional)' : <span className="text-red-500 font-bold ml-0.5">*</span>}
                    </label>
                    <input
                      type="password"
                      required={!editingUserId}
                      value={employeeForm.password}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, password: e.target.value }));
                        if (formErrors.password) setFormErrors(prev => { const n = { ...prev }; delete n.password; return n; });
                      }}
                      placeholder={editingUserId ? "•••••••• (Leave blank to keep existing)" : "••••••••"}
                      className={`block w-full rounded-xl border ${
                        formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs sm:text-sm`}
                    />
                    {formErrors.password && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.password}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      System Role <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <select
                      required
                      value={employeeForm.role}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, role: e.target.value }));
                        if (formErrors.role) setFormErrors(prev => { const n = { ...prev }; delete n.role; return n; });
                      }}
                      className={`block w-full rounded-xl border ${
                        formErrors.role ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs cursor-pointer`}
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="TL">Team Leader</option>
                      <option value="HR_ADMIN">HR / Admin</option>
                    </select>
                    {formErrors.role && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.role}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Assign Team</label>
                    <select
                      value={employeeForm.teamId}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, teamId: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="">No Team Assigned</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Report Manager (TL)</label>
                    <select
                      value={employeeForm.managerId}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, managerId: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="">No Manager</option>
                      {users.filter(u => u.role === 'TL').map(tl => (
                        <option key={tl.id} value={tl.id}>{tl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Employment Profile */}
              <div id="section-employment" className="bg-blue-50 border border-border p-5 rounded-2xl space-y-4 scroll-mt-32">
                <h3 className="text-xs font-bold tracking-wider text-status-success-text">2. Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Date of Joining <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={employeeForm.dateOfJoining}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, dateOfJoining: e.target.value }));
                        if (formErrors.dateOfJoining) setFormErrors(prev => { const n = { ...prev }; delete n.dateOfJoining; return n; });
                      }}
                      className={`block w-full rounded-xl border ${
                        formErrors.dateOfJoining ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs cursor-pointer`}
                    />
                    {formErrors.dateOfJoining && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.dateOfJoining}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Employee Type</label>
                    <select
                      value={employeeForm.employeeType}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, employeeType: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Department <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeForm.department}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, department: e.target.value }));
                        if (formErrors.department) setFormErrors(prev => { const n = { ...prev }; delete n.department; return n; });
                      }}
                      placeholder="e.g. Engineering"
                      className={`block w-full rounded-xl border ${
                        formErrors.department ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.department && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.department}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">
                      Designation <span className="text-red-500 font-bold ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={employeeForm.designation}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, designation: e.target.value }));
                        if (formErrors.designation) setFormErrors(prev => { const n = { ...prev }; delete n.designation; return n; });
                      }}
                      placeholder="e.g. Senior Developer"
                      className={`block w-full rounded-xl border ${
                        formErrors.designation ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.designation && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.designation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Work Shift</label>
                    <input
                      type="text"
                      value={employeeForm.workShift}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, workShift: e.target.value }))}
                      placeholder="e.g. General Shift (9:00 - 18:00)"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Work Mode</label>
                    <select
                      value={employeeForm.workLocationStatus}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, workLocationStatus: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Onsite">Onsite</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Office Location / Branch</label>
                    <input
                      type="text"
                      value={employeeForm.location}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. Bangalore Head Office / Offshore"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Employment Status</label>
                    <select
                      value={employeeForm.employmentStatus}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, employmentStatus: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Suspended">Suspended</option>
                      <option value="Deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Section 3: Personal & Contact */}
              <div id="section-personal" className="bg-blue-50 border border-border p-5 rounded-2xl space-y-4 scroll-mt-32">
                <h3 className="text-xs font-bold tracking-wider text-status-warning-text">3. Personal & Contact Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={employeeForm.dateOfBirth}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, dateOfBirth: e.target.value }));
                        if (formErrors.dateOfBirth) setFormErrors(prev => { const n = { ...prev }; delete n.dateOfBirth; return n; });
                      }}
                      className={`block w-full rounded-xl border ${
                        formErrors.dateOfBirth ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs cursor-pointer`}
                    />
                    {formErrors.dateOfBirth && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.dateOfBirth}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Gender</label>
                    <select
                      value={employeeForm.gender}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Marital Status</label>
                    <select
                      value={employeeForm.maritalStatus}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, maritalStatus: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={employeeForm.nationality}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, nationality: e.target.value }))}
                      placeholder="e.g. Indian"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Personal Email</label>
                    <input
                      type="email"
                      value={employeeForm.personalEmail}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, personalEmail: e.target.value }));
                        if (formErrors.personalEmail) setFormErrors(prev => { const n = { ...prev }; delete n.personalEmail; return n; });
                      }}
                      placeholder="personal@email.com"
                      className={`block w-full rounded-xl border ${
                        formErrors.personalEmail ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.personalEmail && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.personalEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Professional Email</label>
                    <input
                      type="email"
                      value={employeeForm.professionalEmail}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, professionalEmail: e.target.value }));
                        if (formErrors.professionalEmail) setFormErrors(prev => { const n = { ...prev }; delete n.professionalEmail; return n; });
                      }}
                      placeholder="professional@nextitpoint.com"
                      className={`block w-full rounded-xl border ${
                        formErrors.professionalEmail ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.professionalEmail && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.professionalEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={employeeForm.mobileNumber}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, mobileNumber: e.target.value }));
                        if (formErrors.mobileNumber) setFormErrors(prev => { const n = { ...prev }; delete n.mobileNumber; return n; });
                      }}
                      placeholder="+91 XXXXX XXXXX"
                      className={`block w-full rounded-xl border ${
                        formErrors.mobileNumber ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.mobileNumber && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.mobileNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Emergency Contact Info</label>
                    <input
                      type="text"
                      value={employeeForm.emergencyContact}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                      placeholder="Name - Relationship - Phone"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-navy-900 mb-1">Blood Group</label>
                    <select
                      value={employeeForm.bloodGroup}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    >
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
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-navy-900 mb-1">Current Address</label>
                    <textarea
                      value={employeeForm.currentAddress}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, currentAddress: e.target.value }))}
                      placeholder="Current residence address..."
                      rows={2}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[46px]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-navy-900 mb-1">Permanent Address</label>
                    <textarea
                      value={employeeForm.permanentAddress}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, permanentAddress: e.target.value }))}
                      placeholder="Permanent address as per records..."
                      rows={2}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[46px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Bank & Financial Details */}
              <div id="section-financial" className="bg-blue-50 border border-border p-5 rounded-2xl space-y-4 scroll-mt-32">
                <h3 className="text-xs font-bold tracking-wider text-navy-700">4. Bank & Financial details (Encrypted at Rest)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={employeeForm.bankName}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="HDFC Bank"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Bank Branch</label>
                    <input
                      type="text"
                      value={employeeForm.bankBranch}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, bankBranch: e.target.value }))}
                      placeholder="E.g. Kanjurmarg East"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Account Number</label>
                    <input
                      type="password"
                      value={employeeForm.accountNumber}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, accountNumber: e.target.value }));
                        if (formErrors.accountNumber) setFormErrors(prev => { const n = { ...prev }; delete n.accountNumber; return n; });
                      }}
                      placeholder={editingUserId ? "•••••••• (Leave blank to keep existing)" : "Sensitive Field"}
                      className={`block w-full rounded-xl border ${
                        formErrors.accountNumber ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.accountNumber && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.accountNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={employeeForm.ifsc}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, ifsc: e.target.value.toUpperCase() }));
                        if (formErrors.ifsc) setFormErrors(prev => { const n = { ...prev }; delete n.ifsc; return n; });
                      }}
                      placeholder="HDFC0001234"
                      className={`block w-full rounded-xl border ${
                        formErrors.ifsc ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.ifsc && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.ifsc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Bank Address</label>
                    <input
                      type="text"
                      value={employeeForm.bankAddress}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, bankAddress: e.target.value }))}
                      placeholder="E.g. 1st Floor, Trade Center, Mumbai"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">PAN Number</label>
                      <input
                        type="password"
                        value={employeeForm.pan}
                        onChange={(e) => {
                          setEmployeeForm(prev => ({ ...prev, pan: e.target.value.toUpperCase() }));
                          if (formErrors.pan) setFormErrors(prev => { const n = { ...prev }; delete n.pan; return n; });
                        }}
                        placeholder={editingUserId ? "•••••••• (Leave blank to keep existing)" : "Sensitive Field"}
                        className={`block w-full rounded-xl border ${
                          formErrors.pan ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                        } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                      />
                      {formErrors.pan && (
                        <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {formErrors.pan}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-navy-900 mb-1">Insurance Number</label>
                      <input
                        type="text"
                        value={employeeForm.insuranceNumber}
                        onChange={(e) => setEmployeeForm(prev => ({ ...prev, insuranceNumber: e.target.value }))}
                        placeholder="INS-12345678"
                        className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">PF Number</label>
                    <input
                      type="text"
                      value={employeeForm.pfNumber}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, pfNumber: e.target.value }))}
                      placeholder="MH/BAN/12345/678"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">UAN Number</label>
                    <input
                      type="text"
                      value={employeeForm.uan}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, uan: e.target.value }));
                        if (formErrors.uan) setFormErrors(prev => { const n = { ...prev }; delete n.uan; return n; });
                      }}
                      placeholder="100123456789"
                      className={`block w-full rounded-xl border ${
                        formErrors.uan ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs`}
                    />
                    {formErrors.uan && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.uan}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 5: Contract Details & Perks */}
              <div id="section-contract" className="bg-blue-50 border border-border p-5 rounded-2xl space-y-4 scroll-mt-32">
                <h3 className="text-xs font-bold tracking-wider text-status-success-text">5. Contract Details & Perks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Expected End Date</label>
                    <input
                      type="date"
                      value={employeeForm.expectedEndDate}
                      onChange={(e) => {
                        setEmployeeForm(prev => ({ ...prev, expectedEndDate: e.target.value }));
                        if (formErrors.expectedEndDate) setFormErrors(prev => { const n = { ...prev }; delete n.expectedEndDate; return n; });
                      }}
                      className={`block w-full rounded-xl border ${
                        formErrors.expectedEndDate ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/15' : 'border-border/80 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15'
                      } py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none transition-all shadow-xs cursor-pointer`}
                    />
                    {formErrors.expectedEndDate && (
                      <p className="text-red-500 text-[11px] font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {formErrors.expectedEndDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Increment / Perks</label>
                    <input
                      type="text"
                      value={employeeForm.incrementPerks}
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, incrementPerks: e.target.value }))}
                      placeholder="E.g., Yearly bonus, medical insurance cover"
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Row */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-50 text-text-muted hover:bg-blue-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold tracking-wide bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white transition-all cursor-pointer btn-premium text-center disabled:opacity-50"
                >
                  {loading ? (editingUserId ? 'Saving Changes...' : 'Creating...') : (editingUserId ? 'Save Changes' : 'Onboard Employee')}
                </button>
              </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: Review TL Submitted Reports */}
        {activeTab === 'reports' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-white" />
                Review Periodic Team Status Reports
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Audit, approve, and reject team status reports submitted by Team Leaders.
              </p>
            </div>

            <div className="p-6">

            <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar-container pr-1">
              {reports.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center">No team reports submitted yet.</p>
              ) : (
                reports.map((rep) => (
                  <div key={rep.id} className="p-5 rounded-xl border border-border bg-blue-50 hover:bg-blue-50/50 shadow-xs hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                          Team: {rep.team.name}
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5">
                          Period: <span className="font-semibold">{formatDateToIndian(rep.periodStart)} to {formatDateToIndian(rep.periodEnd)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          rep.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text' :
                          rep.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red' :
                          'bg-status-warning-bg text-status-warning-text'
                        }`}>
                          {formatToTitleCase(rep.status)}
                        </span>

                        {rep.status === 'PENDING' && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleReviewReport(rep.id, 'APPROVED')}
                              className="bg-status-success hover:bg-status-success hover:shadow-lg hover:shadow-emerald-650/15 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg cursor-pointer transition-all shadow-md"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewReport(rep.id, 'REJECTED')}
                              className="bg-brand-red hover:bg-status-danger hover:shadow-lg hover:shadow-brand-red/15 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg cursor-pointer transition-all shadow-md"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/50 backdrop-blur-xs p-4 rounded-lg border border-border/40 text-xs text-text-muted whitespace-pre-line font-medium leading-relaxed">
                      {rep.summary}
                    </div>

                    <div className="mt-2 text-[10px] text-text-muted text-right">
                      Submitted by: {formatEmployeeName(rep.submittedBy.name)} &bull; Filed {formatDateToIndian(rep.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </div>
        )}

        {/* TAB 4: Configure Policy & Holiday Calendars */}
        {activeTab === 'policies' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-white" />
                Configure Policy & Holiday Calendars
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Set up global company holidays and configure allowed annual leave day counts by leave type.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Holiday Configuration */}
            <div className="space-y-6">
              <div className="premium-card p-6">
                <h2 className="text-lg font-bold text-navy-900 font-heading mb-4 flex items-center gap-2">
                  Configure Company Holidays
                </h2>

                <form onSubmit={handleCreateHoliday} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-navy-900 mb-1">Holiday Name</label>
                    <input
                      type="text"
                      required
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      placeholder="Independence Day"
                      className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end mt-2">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                    >
                      Add Holiday
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {holidays.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">No holidays configured.</p>
                  ) : (
                    holidays.map((h) => (
                      <div key={h.id} className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl text-xs border border-border shadow-xs">
                        <div>
                          <span className="font-bold text-navy-900">{h.name}</span>
                          <span className="text-[10px] text-text-muted ml-2">({formatDateToIndian(h.date)})</span>
                        </div>
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-brand-red hover:text-status-danger-text transition-colors p-1 cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Leave Policy Settings */}
            <div className="space-y-6">
              <div className="premium-card p-6">
                <h2 className="text-lg font-bold text-navy-900 font-heading mb-4 flex items-center gap-2">
                  Configure Leave Types Policy
                </h2>

                <form onSubmit={handleCreateLeaveType} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mb-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-navy-900 mb-1">Leave Type Name</label>
                    <input
                      type="text"
                      required
                      value={leaveName}
                      onChange={(e) => setLeaveName(e.target.value)}
                      placeholder="Casual Leave"
                      className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Days Allowed</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={leaveDays}
                      onChange={(e) => setLeaveDays(e.target.value)}
                      className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                  <div className="sm:col-span-3 flex justify-end mt-2">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                    >
                      Add Policy
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {leaveTypes.length === 0 ? (
                    <p className="text-xs text-text-muted py-6 text-center">No leave policies defined.</p>
                  ) : (
                    leaveTypes.map((l) => (
                      <div key={l.id} className="flex justify-between items-center bg-blue-50 p-2.5 rounded-xl text-xs border border-border shadow-xs">
                        <div>
                          <span className="font-bold text-navy-900">{l.name}</span>
                          <span className="text-[10px] text-text-muted ml-2">({l.daysAllowed} days allowed per year)</span>
                        </div>
                        <button
                          onClick={() => handleDeleteLeaveType(l.id)}
                          className="text-brand-red hover:text-status-danger-text transition-colors p-1 cursor-pointer"
                          title="Delete Policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            </div>
            </div>
          </div>
        )}

        {/* TAB 5: System Audit Logs */}
        {activeTab === 'audit' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-white" />
                System Audit Logs
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Audit key system operations and changes executed by administrators and team leaders.
              </p>
            </div>

            <div className="p-6">

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
              <table className="min-w-full text-left text-xs relative border-collapse">
                <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                  <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                    <th className="py-3 px-2 bg-transparent">Timestamp</th>
                    <th className="py-3 px-2 bg-transparent">Operation Executed By</th>
                    <th className="py-3 px-2 bg-transparent">Action Type</th>
                    <th className="py-3 px-2 bg-transparent">Target Entity</th>
                    <th className="py-3 px-2 bg-transparent">Target ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-text-muted">No logs captured yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-blue-50/50">
                        <td className="py-3 px-2 text-text-muted font-semibold whitespace-nowrap">
                          {formatDateTimeToIndian(log.createdAt)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-bold text-navy-900">{log.user.name}</div>
                          <div className="text-[10px] text-text-muted">{log.user.email}</div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action.includes('DEACTIVATE') || log.action.includes('REJECT') ? 'bg-status-danger-bg text-brand-red' :
                            log.action.includes('CREATE') || log.action.includes('APPROVE') ? 'bg-status-success-bg text-status-success-text' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-text-muted font-bold">{log.entity}</td>
                        <td className="py-3 px-2 text-text-muted font-mono select-all truncate max-w-[120px]" title={log.entityId || ''}>
                          {log.entityId || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {/* TAB 6: Performance Score Ratings */}
        {activeTab === 'performance' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-white" />
                Performance Score Ratings
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Monitor team performance score distributions, review metrics, and override calculated scorecards.
              </p>
            </div>

            <div className="p-6 space-y-6">
            {/* Performance KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-navy-700 font-heading">{performanceCounts.BLUE}</span>
                <span className="text-[10px] font-bold text-navy-700 tracking-wider block mt-1">Excellent (76%–100%)</span>
              </div>
              <div className="bg-status-success-bg/50 p-4 rounded-xl border border-status-success/20/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-status-success-text font-heading">{performanceCounts.GREEN}</span>
                <span className="text-[10px] font-bold text-status-success-text tracking-wider block mt-1">Good (51%–75%)</span>
              </div>
              <div className="bg-status-warning-bg/50 p-4 rounded-xl border border-status-warning/20/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-status-warning-text font-heading">{performanceCounts.YELLOW}</span>
                <span className="text-[10px] font-bold text-status-warning-text tracking-wider block mt-1">Average (26%–50%)</span>
              </div>
              <div className="bg-status-danger-bg/50 p-4 rounded-xl border border-status-danger/20/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-brand-red font-heading">{performanceCounts.RED}</span>
                <span className="text-[10px] font-bold text-status-danger-text tracking-wider block mt-1">Needs Improvement (0%–25%)</span>
              </div>
            </div>

            <div className="premium-card p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-navy-900 font-heading">Employee Performance Indicator Overview</h2>
                  <p className="text-xs text-text-muted mt-1">Automatic nightly auto-scoring with manual override capability for HR Admins.</p>
                </div>
                <button
                  onClick={() => fetchAdminData()}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 border border-border/50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Recompute Auto-Scores
                </button>
              </div>

            <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
              <table className="min-w-full text-left text-xs relative border-collapse">
                <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                  <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                    <th className="py-3 px-2 bg-transparent">Employee</th>
                    <th className="py-3 px-2 bg-transparent">Team</th>
                    <th className="py-3 px-2 text-center bg-transparent">Score Type</th>
                    <th className="py-3 px-2 text-center bg-transparent">Score</th>
                    <th className="py-3 px-2 text-center bg-transparent">Rating Badge</th>
                    <th className="py-3 px-2 bg-transparent">Override Reason</th>
                    <th className="py-3 px-2 text-center bg-transparent">Last Updated</th>
                    <th className="py-3 px-2 text-center bg-transparent">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {performanceData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-text-muted">No performance records retrieved.</td>
                    </tr>
                  ) : (
                    performanceData.map((p: any) => (
                      <tr key={p.user.id} className="hover:bg-blue-50/50">
                        <td className="py-3 px-2 font-bold text-navy-900">
                          <div>{p.user.name}</div>
                          <div className="text-[10px] text-text-muted font-semibold">{p.user.email}</div>
                        </td>
                        <td className="py-3 px-2 text-text-muted font-semibold">{p.user.team?.name || 'Unassigned'}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.score.manualOverride ? 'bg-blue-50 text-navy-700' : 'bg-blue-50 text-navy-700'
                          }`}>
                            {p.score.manualOverride ? 'Manual' : 'Auto'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-extrabold text-navy-900">
                          {(() => {
                            let score = p.score.autoScore;
                            if (p.score.manualOverride) {
                              score = p.score.overrideScore !== null && p.score.overrideScore !== undefined
                                ? p.score.overrideScore
                                : (p.score.rating === 'RED' ? 15 : p.score.rating === 'YELLOW' ? 38 : p.score.rating === 'GREEN' ? 63 : 88);
                            }
                            return `${Math.round(score)}%`;
                          })()}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold border ${
                            p.score.rating === 'BLUE' ? 'bg-blue-100 text-navy-700 border-blue-100' :
                            p.score.rating === 'GREEN' ? 'bg-status-success-bg text-status-success-text border-status-success/20' :
                            p.score.rating === 'YELLOW' ? 'bg-status-warning-bg text-status-warning-text border-status-warning/20' :
                            'bg-status-danger-bg text-brand-red border-status-danger/20'
                          }`}>
                            {p.score.rating === 'RED' ? 'Needs Improvement' : p.score.rating === 'YELLOW' ? 'Average' : p.score.rating === 'GREEN' ? 'Good' : 'Excellent'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-text-muted max-w-xs truncate" title={p.score.overrideReason || ''}>
                          {p.score.overrideReason || '-'}
                        </td>
                        <td className="py-3 px-2 text-center text-text-muted">
                          {formatDateToIndian(p.score.updatedAt)}
                        </td>
                        <td className="py-3 px-2 text-center whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => handleOpenOverrideModal(p.user.id, p.score)}
                            className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                          >
                            Override
                          </button>
                          {p.score.manualOverride && (
                            <button
                              onClick={() => handleClearOverride(p.user.id)}
                              className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                            >
                              Clear
                            </button>
                          )}
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

        {/* TAB 7: Leave & WFH Requests System */}
        {activeTab === 'leaves' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <Calendar className="w-4.5 h-4.5 text-white" />
                  Leave & Work From Home (WFH) Management
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  Approve employee leave/WFH requests or directly assign Work From Home to staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const t = new Date().toISOString().split('T')[0];
                  setWfhAssignStartDate(t);
                  setWfhAssignEndDate(t);
                  setIsWfhAssignModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-600 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                Assign WFH to Employee
              </button>
            </div>

            <div className="p-6 space-y-6">
            {/* Leave & WFH Requests KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-navy-700 font-heading">
                  {leaveRequests.filter(r => r.status === 'PENDING').length}
                </span>
                <span className="text-[10px] font-bold text-navy-700 tracking-wider block mt-1">Pending Leave Requests</span>
              </div>
              <div className="bg-status-success-bg/50 p-4 rounded-xl border border-status-success/20/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-status-success-text font-heading">
                  {leaveRequests.filter(r => r.status === 'APPROVED').length}
                </span>
                <span className="text-[10px] font-bold text-status-success-text tracking-wider block mt-1">Approved Leave Requests</span>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-blue-600 font-heading">
                  {wfhRequests.filter(r => r.status === 'PENDING').length}
                </span>
                <span className="text-[10px] font-bold text-navy-700 tracking-wider block mt-1">Pending WFH Requests</span>
              </div>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-center shadow-xs">
                <span className="block text-2xl font-extrabold text-navy-700 font-heading">
                  {wfhRequests.filter(r => r.status === 'APPROVED').length}
                </span>
                <span className="text-[10px] font-bold text-navy-700 tracking-wider block mt-1">Approved / Active WFH</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Tab Toggle for Leave Requests, History & WFH */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-blue-50 rounded-full border border-border shadow-3xs">
                  <button
                    onClick={() => setLeaveSubTab('requests')}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      leaveSubTab === 'requests'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'text-navy-900 hover:bg-blue-50/50'
                    }`}
                  >
                    Leave Requests ({leaveRequests.filter(r => r.status === 'PENDING').length})
                  </button>
                  <button
                    onClick={() => setLeaveSubTab('wfh')}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                      leaveSubTab === 'wfh'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'text-navy-900 hover:bg-blue-50/50'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    WFH Management ({wfhRequests.filter(r => r.status === 'PENDING').length})
                  </button>
                  <button
                    onClick={() => setLeaveSubTab('history')}
                    className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      leaveSubTab === 'history'
                        ? 'bg-navy-900 text-white shadow-sm'
                        : 'text-navy-900 hover:bg-blue-50/50'
                    }`}
                  >
                    Leave History
                  </button>
                </div>
              </div>

              {leaveSubTab === 'requests' && (
                <div className="animate-in fade-in duration-200 premium-card p-6">
                  <h2 className="text-lg font-bold text-navy-900 font-heading mb-4">Pending Employee Leave Requests</h2>
                  <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                    <table className="min-w-full text-left text-xs relative border-collapse">
                      <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                        <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                          <th className="py-3 px-2 bg-transparent">Employee</th>
                          <th className="py-3 px-2 bg-transparent">Team</th>
                          <th className="py-3 px-2 bg-transparent">Leave Type</th>
                          <th className="py-3 px-2 bg-transparent">Duration</th>
                          <th className="py-3 px-2 bg-transparent">Reason</th>
                          <th className="py-3 px-2 text-center bg-transparent">Status</th>
                          <th className="py-3 px-2 text-center bg-transparent">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaveRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-text-muted font-medium">No pending leave requests logged in system.</td>
                          </tr>
                        ) : (
                          leaveRequests.filter(r => r.status === 'PENDING').map((req) => (
                            <tr key={req.id} className="hover:bg-blue-50/50 border-b border-border">
                              <td className="py-3 px-2 font-bold text-navy-900">
                                <div>{req.user.name}</div>
                                <div className="text-[10px] text-text-muted font-medium">{req.user.email}</div>
                              </td>
                              <td className="py-3 px-2 text-text-muted font-semibold">{req.user.teamId ? teams.find(t => t.id === req.user.teamId)?.name : 'Unassigned'}</td>
                              <td className="py-3 px-2 font-semibold text-navy-900">{req.leaveType.name}</td>
                              <td className="py-3 px-2 text-text-muted whitespace-nowrap">
                                {formatDateToIndian(req.startDate)} to {formatDateToIndian(req.endDate)}
                              </td>
                              <td className="py-3 px-2 text-text-muted max-w-xs truncate" title={req.reason}>
                                {req.reason}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-status-warning-bg text-status-warning-text">
                                  {formatToTitleCase(req.status)}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center whitespace-nowrap space-x-1.5">
                                <button
                                  onClick={() => handleReviewLeaveRequest(req.id, 'APPROVED')}
                                  className="bg-status-success hover:bg-status-success hover:shadow-lg hover:shadow-emerald-600/15 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleOpenRejectModal(req.id)}
                                  className="bg-brand-red hover:bg-status-danger hover:shadow-lg hover:shadow-brand-red/15 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {leaveSubTab === 'history' && (
                <div className="animate-in fade-in duration-200 premium-card p-6">
                  <h2 className="text-lg font-bold text-navy-900 font-heading mb-4">Leave Requests History</h2>
                  <div className="max-h-[400px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                    <table className="min-w-full text-left text-xs relative border-collapse">
                      <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                        <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                          <th className="py-3 px-2 bg-transparent">Employee</th>
                          <th className="py-3 px-2 bg-transparent">Team</th>
                          <th className="py-3 px-2 bg-transparent">Leave Type</th>
                          <th className="py-3 px-2 bg-transparent">Duration</th>
                          <th className="py-3 px-2 bg-transparent">Reason</th>
                          <th className="py-3 px-2 text-center bg-transparent">Status</th>
                          <th className="py-3 px-2 bg-transparent">Reviewed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaveRequests.filter(r => r.status !== 'PENDING').length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-text-muted font-medium">No review history found.</td>
                          </tr>
                        ) : (
                          leaveRequests.filter(r => r.status !== 'PENDING').map((req) => (
                            <tr key={req.id} className="hover:bg-blue-50/50 border-b border-border">
                              <td className="py-3 px-2 font-bold text-navy-900">
                                <div>{req.user.name}</div>
                                <div className="text-[10px] text-text-muted font-medium">{req.user.email}</div>
                              </td>
                              <td className="py-3 px-2 text-text-muted font-semibold">{req.user.teamId ? teams.find(t => t.id === req.user.teamId)?.name : 'Unassigned'}</td>
                              <td className="py-3 px-2 font-semibold text-navy-900">{req.leaveType.name}</td>
                              <td className="py-3 px-2 text-text-muted whitespace-nowrap">
                                {formatDateToIndian(req.startDate)} to {formatDateToIndian(req.endDate)}
                              </td>
                              <td className="py-3 px-2 text-text-muted max-w-xs truncate" title={req.reason}>
                                {req.reason}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text' : 'bg-status-danger-bg text-brand-red'
                                }`}>
                                  {formatToTitleCase(req.status)}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-text-muted font-semibold">{req.reviewedBy?.name || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {leaveSubTab === 'wfh' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Section 1: Pending Employee WFH Requests */}
                  <div className="premium-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-navy-900 font-heading flex items-center gap-2">
                          <Clock className="w-5 h-5 text-status-warning-text" />
                          Pending Employee Work From Home Requests
                        </h2>
                        <p className="text-xs text-text-muted">Employee-submitted applications awaiting HR or TL review.</p>
                      </div>
                      <span className="self-start sm:self-auto px-3 py-1 bg-status-warning-bg border border-status-warning/20 text-status-warning-text text-xs font-bold rounded-full">
                        {wfhRequests.filter(r => r.status === 'PENDING').length} Pending
                      </span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                      <table className="min-w-full text-left text-xs relative border-collapse">
                        <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                          <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                            <th className="py-3 px-2 bg-transparent">Employee</th>
                            <th className="py-3 px-2 bg-transparent">Team</th>
                            <th className="py-3 px-2 bg-transparent">Requested Duration</th>
                            <th className="py-3 px-2 bg-transparent">Reason</th>
                            <th className="py-3 px-2 text-center bg-transparent">Status</th>
                            <th className="py-3 px-2 text-center bg-transparent">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {wfhRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-text-muted font-medium">No pending WFH requests in queue.</td>
                            </tr>
                          ) : (
                            wfhRequests.filter(r => r.status === 'PENDING').map((req) => (
                              <tr key={req.id} className="hover:bg-blue-50/50 border-b border-border">
                                <td className="py-3 px-2 font-bold text-navy-900">
                                  <div>{req.user.name}</div>
                                  <div className="text-[10px] text-text-muted font-medium">{req.user.email}</div>
                                </td>
                                <td className="py-3 px-2 text-text-muted font-semibold">{req.user.teamId ? (req.user.team?.name || 'Assigned') : 'Unassigned'}</td>
                                <td className="py-3 px-2 text-navy-900 font-semibold whitespace-nowrap font-mono">
                                  {formatDateToIndian(req.startDate)}
                                  {req.startDate !== req.endDate ? ` to ${formatDateToIndian(req.endDate)}` : ' (Single Day)'}
                                </td>
                                <td className="py-3 px-2 text-text-muted max-w-xs truncate" title={req.reason}>
                                  {req.reason}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-status-warning-bg text-status-warning-text border border-status-warning/20">
                                    Pending
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center whitespace-nowrap space-x-1.5">
                                  <button
                                    onClick={() => handleReviewWfhRequest(req.id, 'APPROVED')}
                                    className="bg-status-success hover:bg-status-success hover:shadow-lg text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleOpenRejectWfhModal(req.id)}
                                    className="bg-brand-red hover:bg-status-danger hover:shadow-lg text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                  >
                                    Reject
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 2: Approved & Historical WFH Records */}
                  <div className="premium-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-navy-900 font-heading flex items-center gap-2">
                          <Home className="w-5 h-5 text-blue-600" />
                          Active & Past Work From Home Records
                        </h2>
                        <p className="text-xs text-text-muted">All direct HR assignments and approved remote work history.</p>
                      </div>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                      <table className="min-w-full text-left text-xs relative border-collapse">
                        <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                          <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                            <th className="py-3 px-2 bg-transparent">Employee</th>
                            <th className="py-3 px-2 bg-transparent">Team</th>
                            <th className="py-3 px-2 bg-transparent">Duration</th>
                            <th className="py-3 px-2 bg-transparent">Reason / Remarks</th>
                            <th className="py-3 px-2 text-center bg-transparent">Status</th>
                            <th className="py-3 px-2 bg-transparent">Reviewed / Assigned By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {wfhRequests.filter(r => r.status !== 'PENDING').length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-10 text-text-muted font-medium">No past WFH records found.</td>
                            </tr>
                          ) : (
                            wfhRequests.filter(r => r.status !== 'PENDING').map((req) => (
                              <tr key={req.id} className="hover:bg-blue-50/50 border-b border-border">
                                <td className="py-3 px-2 font-bold text-navy-900">
                                  <div>{req.user.name}</div>
                                  <div className="text-[10px] text-text-muted font-medium">{req.user.email}</div>
                                </td>
                                <td className="py-3 px-2 text-text-muted font-semibold">{req.user.teamId ? (req.user.team?.name || 'Assigned') : 'Unassigned'}</td>
                                <td className="py-3 px-2 text-navy-900 font-semibold whitespace-nowrap font-mono">
                                  {formatDateToIndian(req.startDate)}
                                  {req.startDate !== req.endDate ? ` to ${formatDateToIndian(req.endDate)}` : ' (Single Day)'}
                                  {req.isDirectHrAssignment && (
                                    <span className="ml-1.5 inline-block text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-navy-700 border border-blue-100">
                                      Direct HR Assigned
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-text-muted max-w-xs truncate" title={req.reason}>
                                  {req.reason}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                    req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-status-success/20' : 'bg-status-danger-bg text-brand-red border-status-danger/20'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-text-muted font-semibold">
                                  {req.reviewedBy ? formatEmployeeName(req.reviewedBy.name) : '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* TAB: Resignation Requests */}
        {activeTab === 'resignations' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <UserMinus className="w-4.5 h-4.5 text-white" />
                Resignation Requests
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Review, approve, or reject resignation requests submitted by employees.
              </p>
            </div>

            <div className="p-6">

            <div className="max-h-[340px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
              <table className="w-full text-left text-xs border-collapse relative">
                <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                  <tr className="border-b border-border/50 text-gray-550 font-bold tracking-wider">
                    <th className="py-3 px-3 bg-transparent">Employee Name</th>
                    <th className="py-3 px-3 bg-transparent">Submission Date</th>
                    <th className="py-3 px-3 bg-transparent">Resignation Date</th>
                    <th className="py-3 px-3 bg-transparent">Last Working Day</th>
                    <th className="py-3 px-3 bg-transparent">Reason</th>
                    <th className="py-3 px-3 text-center bg-transparent">Status</th>
                    <th className="py-3 px-3 bg-transparent">HR Notes</th>
                    <th className="py-3 px-3 text-center bg-transparent">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resignationRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-text-muted">No resignation requests found.</td>
                    </tr>
                  ) : (
                    resignationRequests.map((req) => {
                      const isPending = req.status === 'PENDING';
                      return (
                        <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3.5 px-3">
                            <div>
                              <span className="font-bold text-navy-900 block">
                                {formatEmployeeName(req.user.name)}
                              </span>
                              <span className="text-[10px] text-gray-455 block mt-0.5">
                                {req.user.email} {req.user.team?.name ? `| ${req.user.team.name}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-text-muted font-mono">
                            {formatDateToIndian(req.createdAt)}
                          </td>
                          <td className="py-3.5 px-3 text-text-muted font-mono">
                            {formatDateToIndian(req.resignationDate)}
                          </td>
                          <td className="py-3.5 px-3 text-text-muted font-mono">
                            {formatDateToIndian(req.lastWorkingDay)}
                          </td>
                          <td className="py-3.5 px-3 text-text-muted max-w-xs break-words" title={req.reason}>
                            {req.reason}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.75 rounded-full text-[9px] font-extrabold border ${
                              req.status === 'APPROVED' ? 'bg-status-success-bg text-status-success-text border-status-success/20/60' :
                              req.status === 'REJECTED' ? 'bg-status-danger-bg text-brand-red border-status-danger/20/60' :
                              'bg-status-warning-bg text-status-warning-text border-status-warning/20/60'
                            }`}>
                              {formatToTitleCase(req.status)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {isPending ? (
                              <input
                                type="text"
                                placeholder="Add HR notes..."
                                value={reviewResignationId === req.id ? resignationNotes : ''}
                                onFocus={() => {
                                  setReviewResignationId(req.id);
                                  setResignationNotes(req.hrNotes || '');
                                }}
                                onChange={(e) => setResignationNotes(e.target.value)}
                                className="rounded-xl border border-border/80 py-1.5 px-2.5 text-xs text-text bg-white/70 outline-none focus:border-blue-600 w-full"
                              />
                            ) : (
                              <span className="text-gray-550 italic">{req.hrNotes || '-'}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {isPending ? (
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  onClick={() => {
                                    setReviewResignationId(req.id);
                                    handleReviewResignation(req.id, 'APPROVED');
                                  }}
                                  disabled={submittingResignation}
                                  className="bg-emerald-650 hover:bg-status-success text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setReviewResignationId(req.id);
                                    handleReviewResignation(req.id, 'REJECTED');
                                  }}
                                  disabled={submittingResignation}
                                  className="bg-brand-red hover:bg-status-danger text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-text-muted font-semibold text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {/* TAB GROUP: Run Payroll, Login History & Salary Deductions */}
        {['payroll', 'login-history', 'salary-deductions'].includes(activeTab) && (
          <div className="space-y-6">
            {/* Top Navigation & Dropdown Selector Bar */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  {activeTab === 'payroll' && <CreditCard className="w-5 h-5" />}
                  {activeTab === 'login-history' && <Clock className="w-5 h-5" />}
                  {activeTab === 'salary-deductions' && <Calculator className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Payroll Portal</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                      HR Dashboard
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-navy-900 font-heading">
                    {activeTab === 'payroll' && 'Payroll Runs & Salary Structures'}
                    {activeTab === 'login-history' && 'Employee Login History (3 Late Grace Limit & Penalties)'}
                    {activeTab === 'salary-deductions' && 'Monthly Salary Deductions (Excess Leaves & Late Penalties)'}
                  </h2>
                </div>
              </div>

              {/* View Selector Buttons */}
              <div className="flex items-center gap-1.5 bg-blue-50/70 p-1 rounded-xl border border-blue-100 self-stretch md:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === 'payroll'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-text-muted hover:text-navy-900 hover:bg-white/70'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Run Payroll</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('login-history')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === 'login-history'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-text-muted hover:text-navy-900 hover:bg-white/70'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Login History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('salary-deductions')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    activeTab === 'salary-deductions'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-text-muted hover:text-navy-900 hover:bg-white/70'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Salary Deductions</span>
                </button>
              </div>
            </div>

            {/* Sub-view 1: Payroll Overview (Runs & Structures) */}
            {activeTab === 'payroll' && (
              <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                  <CreditCard className="w-4.5 h-4.5 text-white" />
                  Payroll Management
                </h3>
                <p className="text-[10px] text-white/80 mt-0.5">
                  Configure user salary structures and generate or approve periodic employee payroll runs.
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1.5 bg-white/10 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('runs')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                    payrollSubTab === 'runs' ? 'bg-white text-navy-900 shadow-xs' : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Payroll Runs
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('structures')}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wide uppercase transition-all cursor-pointer ${
                    payrollSubTab === 'structures' ? 'bg-white text-navy-900 shadow-xs' : 'text-white/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Salary Structures
                </button>
              </div>
            </div>

            <div className="p-6">

            {/* SUBTAB 1: Runs */}
            {payrollSubTab === 'runs' && (
              <div className="space-y-6">
                {/* Payroll KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-border text-center shadow-xs">
                    <span className="block text-2xl font-extrabold text-navy-900 font-heading">{payrollRuns.length}</span>
                    <span className="text-[10px] font-bold text-text-muted tracking-wider block mt-1">Total Runs Logged</span>
                  </div>
                  <div className="bg-status-warning-bg/50 p-4 rounded-xl border border-status-warning/20/50 text-center shadow-xs">
                    <span className="block text-2xl font-extrabold text-status-warning-text font-heading">
                      {payrollRuns.filter(r => r.status === 'DRAFT').length}
                    </span>
                    <span className="text-[10px] font-bold text-status-warning-text tracking-wider block mt-1">Draft Payrolls</span>
                  </div>
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-center shadow-xs">
                    <span className="block text-2xl font-extrabold text-navy-700 font-heading">
                      {payrollRuns.filter(r => r.status === 'APPROVED').length}
                    </span>
                    <span className="text-[10px] font-bold text-navy-700 tracking-wider block mt-1">Approved Pending Payout</span>
                  </div>
                </div>

                {/* Parameters block */}
                <div className="bg-white/50 backdrop-blur-xs p-4 rounded-xl border border-border/50 shadow-xs">
                  <form onSubmit={handleGeneratePayroll} className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-navy-900 mb-1">Period Start Date</label>
                      <input
                        type="date"
                        required
                        value={payrollPeriodStart}
                        onChange={(e) => setPayrollPeriodStart(e.target.value)}
                        className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-navy-900 mb-1">Period End Date</label>
                      <input
                        type="date"
                        required
                        value={payrollPeriodEnd}
                        onChange={(e) => setPayrollPeriodEnd(e.target.value)}
                        className="block w-full rounded-xl border border-border/80 py-1.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer btn-premium text-center disabled:opacity-50 shadow-md"
                    >
                      {loading ? 'Generating...' : 'Generate Payroll Draft'}
                    </button>
                  </form>
                </div>

                {/* Runs list */}
                <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                  <table className="min-w-full text-left text-xs relative border-collapse">
                    <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                      <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                        <th className="py-3 px-2 bg-transparent">Employee</th>
                        <th className="py-3 px-2 bg-transparent">Period</th>
                        <th className="py-3 px-2 text-right bg-transparent">Gross (INR)</th>
                        <th className="py-3 px-2 text-right bg-transparent">Deductions (INR)</th>
                        <th className="py-3 px-2 text-right bg-transparent">Net Pay (INR)</th>
                        <th className="py-3 px-2 text-center bg-transparent">Status</th>
                        <th className="py-3 px-2 text-center bg-transparent">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payrollRuns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-text-muted">No payroll runs found in system.</td>
                        </tr>
                      ) : (
                        payrollRuns.map((run) => (
                          <tr key={run.id} className="hover:bg-blue-50/50">
                            <td className="py-3 px-2 font-bold text-navy-900">
                              {formatEmployeeName(run.user.name)}
                            </td>
                            <td className="py-3 px-2 text-text-muted">
                              {formatDateToIndian(run.periodStart)} to {formatDateToIndian(run.periodEnd)}
                            </td>
                            <td className="py-3 px-2 text-right font-semibold text-text-muted">
                              {run.grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-right font-semibold text-text-muted">
                              {run.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-right font-extrabold text-navy-900">
                              {run.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                run.status === 'PAID' ? 'bg-status-success-bg text-status-success-text' :
                                run.status === 'APPROVED' ? 'bg-blue-100 text-navy-700' :
                                'bg-status-warning-bg text-status-warning-text'
                              }`}>
                                {formatToTitleCase(run.status)}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center whitespace-nowrap space-x-1.5">
                              {run.status === 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRun(run);
                                      setRunOvertime(run.overtime.toString());
                                      setRunBonus(run.bonus.toString());
                                      setRunIncentives(run.incentives.toString());
                                      setRunLoanDeduction(run.loanDeduction.toString());
                                      setIsPayrollEditModalOpen(true);
                                    }}
                                    className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                  >
                                    Edit Extras
                                  </button>
                                  <button
                                    onClick={() => handlePayrollStatusChange(run.id, 'APPROVED')}
                                    className="bg-blue-600 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/15 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                  >
                                    Approve
                                  </button>
                                </>
                              )}
                              {run.status === 'APPROVED' && (
                                <button
                                  onClick={() => handlePayrollStatusChange(run.id, 'PAID')}
                                  className="bg-status-success hover:bg-status-success hover:shadow-lg hover:shadow-emerald-500/15 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {(run.status === 'APPROVED' || run.status === 'PAID') && (
                                <a
                                  href={`/api/payroll/runs/export?id=${run.id}`}
                                  download
                                  className="inline-block bg-navy-700 hover:bg-navy-900 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] text-center transition-all shadow-xs"
                                >
                                  Payslip
                                </a>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBTAB 2: Salary Structures */}
            {payrollSubTab === 'structures' && (
              <div className="max-h-[500px] overflow-y-auto overflow-x-auto custom-scrollbar-container pr-1">
                <table className="min-w-full text-left text-xs relative border-collapse">
                  <thead className="sticky top-0 bg-blue-50/70 backdrop-blur-xs text-navy-700 font-bold z-10">
                    <tr className="border-b border-border/50 text-text-muted font-bold tracking-wider">
                      <th className="py-3 px-2 bg-transparent">Employee</th>
                      <th className="py-3 px-2 bg-transparent">Department</th>
                      <th className="py-3 px-2 bg-transparent">Designation</th>
                      <th className="py-3 px-2 text-right bg-transparent">Basic (INR)</th>
                      <th className="py-3 px-2 text-right bg-transparent">HRA (INR)</th>
                      <th className="py-3 px-2 text-right bg-transparent">Conveyance (INR)</th>
                      <th className="py-3 px-2 text-right bg-transparent">Allowance (INR)</th>
                      <th className="py-3 px-2 text-center bg-transparent">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-text-muted">No active employees found.</td>
                      </tr>
                    ) : (
                      users.map((employee) => (
                        <tr key={employee.id} className="hover:bg-blue-50/50">
                          <td className="py-3 px-2 font-bold text-navy-900">
                            {employee.name}
                          </td>
                          <td className="py-3 px-2 text-text-muted font-semibold">{employee.employeeProfile?.department || 'N/A'}</td>
                          <td className="py-3 px-2 text-text-muted">{employee.employeeProfile?.designation || 'N/A'}</td>
                          <td className="py-3 px-2 text-right text-text-muted font-semibold">
                            {employee.salaryStructure?.basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </td>
                          <td className="py-3 px-2 text-right text-text-muted">
                            {employee.salaryStructure?.hra.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </td>
                          <td className="py-3 px-2 text-right text-text-muted">
                            {employee.salaryStructure?.conveyance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </td>
                          <td className="py-3 px-2 text-right text-text-muted">
                            {employee.salaryStructure?.specialAllowance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSalaryUser(employee);
                                setSalaryBasic(employee.salaryStructure?.basicSalary?.toString() || '30000');
                                setSalaryHRA(employee.salaryStructure?.hra?.toString() || '12000');
                                setSalaryConveyance(employee.salaryStructure?.conveyance?.toString() || '3000');
                                setSalarySpecial(employee.salaryStructure?.specialAllowance?.toString() || '5000');
                                setSalaryEffectiveFrom(employee.salaryStructure?.effectiveFrom ? new Date(employee.salaryStructure.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                                setIsSalaryModalOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold px-3 py-1 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                            >
                              Configure
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Sub-view 2: Login History */}
        {activeTab === 'login-history' && (
          <LoginHistoryView
            currentMonth={payrollMonth}
            onMonthChange={setPayrollMonth}
            onNavigateToDeductions={(empId, m) => {
              if (m) setPayrollMonth(m);
              if (empId) setTargetDeductionsEmployeeId(empId);
              setActiveTab('salary-deductions');
            }}
            teams={teams}
          />
        )}

        {/* Sub-view 3: Salary Deductions */}
        {activeTab === 'salary-deductions' && (
          <SalaryDeductionsView
            currentMonth={payrollMonth}
            onMonthChange={setPayrollMonth}
            onNavigateToLoginHistory={(empId, m) => {
              if (m) setPayrollMonth(m);
              setActiveTab('login-history');
            }}
            initialFilterEmployeeId={targetDeductionsEmployeeId}
            teams={teams}
          />
        )}
          </div>
        )}

        {/* TAB: Training Center */}
        {activeTab === 'trainings' && (
          <div className="premium-card p-0 overflow-hidden space-y-0">
            {/* Header Title strip with Navy Blue background */}
            <div className="bg-navy-900 px-5 py-3 text-white">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-heading flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-white" />
                Employee Trainings & Certifications
              </h3>
              <p className="text-[10px] text-white/80 mt-0.5">
                Schedule courses, enroll employees, monitor attendance, and issue program completion certifications.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Training & Assign Employees */}
            <div className="premium-card p-6 lg:col-span-1 space-y-4">
              <h2 className="text-lg font-bold text-navy-900 font-heading flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Schedule New Training
              </h2>

              <form onSubmit={handleCreateTraining} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Course Name</label>
                  <input
                    type="text"
                    required
                    value={trainingName}
                    onChange={(e) => setTrainingName(e.target.value)}
                    placeholder="e.g. Next.js App Router Masterclass"
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Trainer Name</label>
                  <input
                    type="text"
                    required
                    value={trainingTrainer}
                    onChange={(e) => setTrainingTrainer(e.target.value)}
                    placeholder="e.g. Santhosh Kumar"
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Planned Date</label>
                    <input
                      type="date"
                      required
                      value={trainingPlannedDate}
                      onChange={(e) => setTrainingPlannedDate(e.target.value)}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy-900 mb-1">Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={trainingHours}
                      onChange={(e) => setTrainingHours(e.target.value)}
                      className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">Target Department</label>
                  <input
                    type="text"
                    value={trainingDept}
                    onChange={(e) => setTrainingDept(e.target.value)}
                    placeholder="e.g. Engineering"
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                </div>

                {/* Checklist to assign users */}
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1.5">Assign Employees</label>
                  <div className="max-h-[160px] overflow-y-auto border border-border/50 p-2.5 rounded-xl bg-white/50 backdrop-blur-xs space-y-2 shadow-xs">
                    {users.length === 0 ? (
                      <p className="text-[10px] text-text-muted">No active employees found.</p>
                    ) : (
                      users.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-xs font-semibold text-navy-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trainingAssignees.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTrainingAssignees([...trainingAssignees, u.id]);
                              } else {
                                setTrainingAssignees(trainingAssignees.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-600 border-input-border cursor-pointer"
                          />
                          {u.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs cursor-pointer btn-premium text-center disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Creating...' : 'Schedule & Assign Training'}
                </button>
              </form>
            </div>

            {/* Courses & Assignments review list */}
            <div className="premium-card p-6 lg:col-span-2 space-y-6">
              <h2 className="text-lg font-bold text-navy-900 font-heading">Scheduled Trainings & Performance Results</h2>

              <div className="space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar-container pr-1">
                {trainings.length === 0 ? (
                  <p className="text-xs text-text-muted py-6 text-center">No trainings scheduled yet.</p>
                ) : (
                  trainings.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl border border-border bg-blue-50 space-y-4 shadow-xs hover:shadow-md transition-all">
                      <div className="flex justify-between items-start border-b border-border/50 pb-2">
                        <div>
                          <h4 className="text-sm font-extrabold text-navy-900">{t.trainingName}</h4>
                          <p className="text-[10px] text-text-muted font-semibold mt-0.5">Trainer: {t.trainer} | Dept: {t.department || 'All'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-navy-900 block">{formatDateToIndian(t.plannedDate)}</span>
                          <span className="text-[9px] text-text-muted font-medium">{t.durationHours} hours duration</span>
                        </div>
                      </div>

                      {/* Attendee performance evaluation list */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-navy-900 tracking-wider">Attendee Status & Assessment Scores</p>
                        {t.attendance.length === 0 ? (
                          <p className="text-[10px] text-text-muted italic">No employees assigned to this course.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-[11px] bg-white/40 backdrop-blur-xs rounded-xl border border-border/50 shadow-xs">
                              <thead>
                                <tr className="border-b border-border/50 text-text-muted font-bold">
                                  <th className="py-2 px-2.5 bg-transparent">Name</th>
                                  <th className="py-2 px-2.5 text-center bg-transparent">Attended</th>
                                  <th className="py-2 px-2.5 text-center bg-transparent">Certified</th>
                                  <th className="py-2 px-2.5 text-center bg-transparent">Score</th>
                                  <th className="py-2 px-2.5 bg-transparent">Feedback</th>
                                  <th className="py-2 px-2.5 text-center bg-transparent">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-medium text-navy-900">
                                {t.attendance.map((assign: any) => (
                                  <tr key={assign.userId} className="hover:bg-blue-50/50">
                                    <td className="py-2 px-2.5 font-bold">{assign.user.name}</td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        assign.attended ? 'bg-status-success-bg text-status-success-text' : 'bg-status-danger-bg text-brand-red'
                                      }`}>{assign.attended ? 'Yes' : 'No'}</span>
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        assign.certified ? 'bg-blue-100 text-navy-700' : 'bg-blue-50 text-text-muted'
                                      }`}>{assign.certified ? 'Certified' : 'No'}</span>
                                    </td>
                                    <td className="py-2 px-2.5 text-center font-extrabold">
                                      {assign.assessmentScore !== null ? `${assign.assessmentScore}%` : '-'}
                                    </td>
                                    <td className="py-2 px-2.5 text-text-muted max-w-[120px] truncate" title={assign.feedback || ''}>
                                      {assign.feedback || '-'}
                                    </td>
                                    <td className="py-2 px-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTraining(t);
                                          setSelectedAttendee(assign.user);
                                          setEvalAttended(assign.attended);
                                          setEvalCertified(assign.certified);
                                          setEvalScore(assign.assessmentScore !== null ? assign.assessmentScore.toString() : '');
                                          setEvalFeedback(assign.feedback || '');
                                          setIsTrainingEvalModalOpen(true);
                                        }}
                                        className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold px-2 py-0.5 rounded-lg text-[9px] transition-all cursor-pointer shadow-xs"
                                      >
                                        Evaluate
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            </div>
            </div>
          </div>
        )}

      </main>
    </div>

      {/* Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Override Performance Rating</h2>
            
            {(() => {
              const uObj = performanceData.find((p) => p.user.id === overrideUserId);
              if (uObj) {
                return (
                  <div className="mb-4 text-center border-b border-border pb-4">
                    <p className="text-xs text-text-muted font-semibold mb-2">Current Rating for {uObj.user.name}</p>
                    <div className="flex justify-center">
                      {(() => {
                        const displayRating = uObj.score.rating;
                        let displayScore = uObj.score.autoScore;
                        if (uObj.score.manualOverride) {
                          displayScore = uObj.score.overrideScore !== null && uObj.score.overrideScore !== undefined
                            ? uObj.score.overrideScore
                            : (displayRating === 'RED' ? 15 : displayRating === 'YELLOW' ? 38 : displayRating === 'GREEN' ? 63 : 88);
                        }
                        return <Speedometer score={displayScore} rating={displayRating} size={240} />;
                      })()}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={handleSaveOverride} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">New Performance Rating</label>
                <select
                  required
                  value={overrideRating}
                  onChange={(e) => setOverrideRating(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                >
                  <option value="RED">RED (Needs Improvement: 0-25)</option>
                  <option value="YELLOW">YELLOW (Average: 26-50)</option>
                  <option value="GREEN">GREEN (Good: 51-75)</option>
                  <option value="BLUE">BLUE (Excellent: 76-100)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Override Score (0-100) (Optional)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  placeholder="e.g. 53"
                  className="block w-full rounded-xl border border-border/80 py-2.5 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
                <p className="text-[10px] text-text-muted mt-1">If blank, defaults to midpoint of chosen rating band (RED=15, YELLOW=38, GREEN=63, BLUE=88).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Override Reason</label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Enter justification for overriding automatic score calculation..."
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Salary Modal */}
      {isSalaryModalOpen && selectedSalaryUser && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Configure Salary Structure</h2>
            <p className="text-xs text-text-muted">Set base compensation values for <strong>{selectedSalaryUser.name}</strong>.</p>

            <form onSubmit={handleUpdateSalaryStructure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Basic Salary (INR/Month)</label>
                <input
                  type="number"
                  required
                  value={salaryBasic}
                  onChange={(e) => setSalaryBasic(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">HRA (INR/Month)</label>
                <input
                  type="number"
                  required
                  value={salaryHRA}
                  onChange={(e) => setSalaryHRA(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Conveyance (INR/Month)</label>
                <input
                  type="number"
                  required
                  value={salaryConveyance}
                  onChange={(e) => setSalaryConveyance(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Special Allowance (INR/Month)</label>
                <input
                  type="number"
                  required
                  value={salarySpecial}
                  onChange={(e) => setSalarySpecial(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Effective From</label>
                <input
                  type="date"
                  required
                  value={salaryEffectiveFrom}
                  onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSalaryModalOpen(false);
                    setSelectedSalaryUser(null);
                  }}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Save Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payroll Run Modal */}
      {isPayrollEditModalOpen && selectedRun && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Edit Payroll Extras</h2>
            <p className="text-xs text-text-muted">Adjust monthly variables for <strong>{selectedRun.user.name}</strong>.</p>

            <form onSubmit={handleUpdatePayrollValues} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Overtime Pay (INR)</label>
                <input
                  type="number"
                  value={runOvertime}
                  onChange={(e) => setRunOvertime(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Performance Bonus (INR)</label>
                <input
                  type="number"
                  value={runBonus}
                  onChange={(e) => setRunBonus(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Sales/Team Incentives (INR)</label>
                <input
                  type="number"
                  value={runIncentives}
                  onChange={(e) => setRunIncentives(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Loan Deduction (INR)</label>
                <input
                  type="number"
                  value={runLoanDeduction}
                  onChange={(e) => setRunLoanDeduction(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPayrollEditModalOpen(false);
                    setSelectedRun(null);
                  }}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Recompute & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {isRejectModalOpen && rejectRequestId && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Reject Leave Request</h2>
            <p className="text-xs text-text-muted">Provide a clear reason explaining why this leave request is being rejected.</p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Rejection Reason</label>
                <textarea
                  required
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Project deliverable deadline conflicts with the requested dates."
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectRequestId(null);
                    setRejectionReason('');
                  }}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-red hover:bg-status-danger hover:shadow-lg hover:shadow-brand-red/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Assign WFH Modal (HR Admin) */}
      {isWfhAssignModalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card max-w-lg w-full p-6 shadow-2xl space-y-4 bg-white">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-navy-900 font-heading">Assign Work From Home (WFH)</h2>
                  <p className="text-[11px] text-text-muted">Directly grant remote work status to an employee.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWfhAssignModalOpen(false)}
                className="text-text-muted hover:text-text-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectAssignWfh} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase mb-1">Select Employee</label>
                <select
                  required
                  value={wfhAssignUserId}
                  onChange={(e) => setWfhAssignUserId(e.target.value)}
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs cursor-pointer"
                >
                  <option value="">-- Choose employee --</option>
                  {users
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) {u.teamId ? `• ${teams.find((t) => t.id === u.teamId)?.name || 'Team'}` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={wfhAssignStartDate}
                    onChange={(e) => setWfhAssignStartDate(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={wfhAssignEndDate}
                    onChange={(e) => setWfhAssignEndDate(e.target.value)}
                    className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Quick helper buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    setWfhAssignStartDate(todayStr);
                    setWfhAssignEndDate(todayStr);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-50 text-navy-700 transition-colors"
                >
                  Today Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    const tomStr = tom.toISOString().split('T')[0];
                    setWfhAssignStartDate(tomStr);
                    setWfhAssignEndDate(tomStr);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-50 text-navy-700 transition-colors"
                >
                  Tomorrow Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 4);
                    setWfhAssignStartDate(todayStr);
                    setWfhAssignEndDate(nextWeek.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-50 text-navy-700 transition-colors"
                >
                  This Week (5 Days)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 uppercase mb-1">Reason / HR Remark</label>
                <textarea
                  required
                  rows={2}
                  value={wfhAssignReason}
                  onChange={(e) => setWfhAssignReason(e.target.value)}
                  placeholder="e.g. Authorized remote sprint, medical reasons, office maintenance..."
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsWfhAssignModalOpen(false)}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWfhAssign}
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  {submittingWfhAssign ? 'Assigning...' : 'Confirm WFH Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject WFH Request Modal */}
      {isRejectWfhModalOpen && rejectWfhId && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Reject WFH Request</h2>
            <p className="text-xs text-text-muted">Provide an optional reason explaining why this Work From Home request is being rejected.</p>

            <form onSubmit={handleConfirmRejectWfh} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Rejection Reason</label>
                <textarea
                  rows={2}
                  value={rejectWfhReason}
                  onChange={(e) => setRejectWfhReason(e.target.value)}
                  placeholder="e.g. Critical in-office client demo or meeting requires physical attendance."
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectWfhModalOpen(false);
                    setRejectWfhId(null);
                    setRejectWfhReason('');
                  }}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-red hover:bg-status-danger hover:shadow-lg text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Training Evaluation Modal */}
      {isTrainingEvalModalOpen && selectedTraining && selectedAttendee && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-navy-900 font-heading">Evaluate Training Performance</h2>
            <p className="text-xs text-text-muted">Record assessment results for <strong>{selectedAttendee.name}</strong> on course <strong>{selectedTraining.trainingName}</strong>.</p>

            <form onSubmit={handleRecordTrainingEval} className="space-y-4">
              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 text-xs font-bold text-navy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evalAttended}
                    onChange={(e) => setEvalAttended(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600 border-input-border cursor-pointer w-4 h-4"
                  />
                  Attended Course
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-navy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evalCertified}
                    onChange={(e) => setEvalCertified(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600 border-input-border cursor-pointer w-4 h-4"
                  />
                  Certified Pass
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Assessment Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={evalScore}
                  onChange={(e) => setEvalScore(e.target.value)}
                  placeholder="e.g. 85"
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">Trainer Feedback</label>
                <textarea
                  rows={2}
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  placeholder="Enter comments about performance, strengths, or actions..."
                  className="block w-full rounded-xl border border-border/80 py-2 px-3 text-xs text-text bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs resize-y min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTrainingEvalModalOpen(false);
                    setSelectedTraining(null);
                    setSelectedAttendee(null);
                  }}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md"
                >
                  Save Results
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Password Reset Modal */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="premium-card max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-navy-900 font-heading flex items-center gap-2">
                <KeyRound className="w-4.5 h-4.5 text-status-warning-text" />
                Reset Employee Password
              </h2>
              <button
                onClick={() => setResetPasswordModalUser(null)}
                className="text-text-muted hover:text-text-muted p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-border text-xs text-navy-900 space-y-1">
              <div><span className="font-bold text-text-muted">Employee:</span> <span className="font-extrabold text-navy-900">{resetPasswordModalUser.name}</span></div>
              <div><span className="font-bold text-text-muted">Email Address:</span> <span className="font-semibold text-text">{resetPasswordModalUser.email}</span></div>
            </div>

            <p className="text-[11px] text-text-muted">
              Set a temporary password for this user. The new password will be encrypted & hashed with bcrypt immediately. An in-app security notification will be sent to the employee.
            </p>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-navy-900">New Temporary Password</label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-navy-700 cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newTemporaryPassword}
                    onChange={(e) => setNewTemporaryPassword(e.target.value)}
                    placeholder="e.g. PassPass_839201"
                    className="block w-full rounded-xl border border-border/80 py-2.5 pl-3 pr-20 text-xs font-mono font-bold text-navy-900 bg-white/70 backdrop-blur-xs outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 hover:bg-blue-50 text-navy-900 transition-all cursor-pointer"
                  >
                    {resetPasswordCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordModalUser(null)}
                  className="bg-blue-50 hover:bg-blue-50 text-navy-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordLoading}
                  className="bg-blue-600 hover:bg-navy-700 hover:shadow-lg hover:shadow-brand-cta/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer btn-premium shadow-md disabled:opacity-50"
                >
                  {resetPasswordLoading ? 'Saving...' : 'Reset & Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

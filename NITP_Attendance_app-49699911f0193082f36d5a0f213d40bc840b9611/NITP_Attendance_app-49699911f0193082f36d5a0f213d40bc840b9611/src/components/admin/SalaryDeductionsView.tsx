'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
  Eye,
  Users,
  ShieldAlert,
  Download,
  Filter,
  X,
  RefreshCw,
  TrendingDown,
  Info,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Calculator,
  ExternalLink,
  Save,
  HelpCircle
} from 'lucide-react';
import { formatDateToIndian } from '@/lib/dateUtils';

interface SalaryDeductionsViewProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onNavigateToLoginHistory: (employeeId?: string, month?: string) => void;
  initialFilterEmployeeId?: string | null;
  teams?: { id: string; name: string }[];
}

export default function SalaryDeductionsView({
  currentMonth,
  onMonthChange,
  onNavigateToLoginHistory,
  initialFilterEmployeeId = null,
  teams = [],
}: SalaryDeductionsViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [allowedLeavesPolicy, setAllowedLeavesPolicy] = useState('2');
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<any | null>(null);
  const [filterDeductionsOnly, setFilterDeductionsOnly] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const fetchDeductions = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/payroll/salary-deductions?month=${currentMonth}&allowedLeaves=${allowedLeavesPolicy}`;
      if (selectedTeam !== 'all') {
        url += `&teamId=${selectedTeam}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch salary deductions');
      }
      const result = await res.json();
      setData(result);

      // If initialFilterEmployeeId was provided, auto-open that employee's modal or focus
      if (initialFilterEmployeeId && result.employees) {
        const found = result.employees.find((e: any) => e.userId === initialFilterEmployeeId);
        if (found) {
          setSelectedEmployeeForModal(found);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching deductions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeductions();
  }, [currentMonth, selectedTeam, allowedLeavesPolicy]);

  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m - 2, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(nextMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const date = new Date(y, m, 1);
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(nextMonth);
  };

  const formatMonthTitle = (mStr: string) => {
    try {
      const [y, m] = mStr.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter((emp: any) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDeduction = filterDeductionsOnly ? emp.deductions.totalDeductedDays > 0 : true;
      return matchesSearch && matchesDeduction;
    });
  }, [data?.employees, searchQuery, filterDeductionsOnly]);

  // Sync to PayrollRun Draft
  const handleSyncToPayroll = async () => {
    if (!data?.employees || data.employees.length === 0) return;
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/payroll/salary-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          employeeDeductionData: data.employees,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to sync deductions');
      setSyncSuccessMsg(result.message || 'Synced successfully to Payroll Runs!');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
      fetchDeductions();
    } catch (err: any) {
      alert(err.message || 'Error syncing deductions');
    } finally {
      setSyncing(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!filteredEmployees.length) return;
    const headers = [
      'Employee Name',
      'Email',
      'Department',
      'Monthly Gross (INR)',
      'Per-Day Rate (INR)',
      'Total Late Logins',
      'Grace Lates (Max 3)',
      'Excess Lates',
      'Late Penalty Days (0.5/ea)',
      'Late Deduction (INR)',
      'Leaves Taken',
      'Leaves Allowed',
      'Excess Leaves',
      'Leave Deduction (INR)',
      'Total Penalty Days',
      'Total Attendance Deduction (INR)',
      'PF (INR)',
      'ESI (INR)',
      'PT (INR)',
      'TDS (INR)',
      'Total Statutory (INR)',
      'Total Deductions (INR)',
      'Net Salary Payable (INR)',
    ];

    const rows = filteredEmployees.map((e: any) => [
      `"${e.name}"`,
      `"${e.email}"`,
      `"${e.department}"`,
      e.salary.grossSalary,
      e.salary.dailyRate,
      e.lateLogins.totalCount,
      e.lateLogins.graceUsed,
      e.lateLogins.excessCount,
      e.lateLogins.penaltyDays,
      e.lateLogins.deductionAmount,
      e.leaves.totalTaken,
      e.leaves.allowedMonthly,
      e.leaves.excessDays,
      e.leaves.deductionAmount,
      e.deductions.totalDeductedDays,
      e.deductions.totalAttendanceDeduction,
      e.deductions.statutory.pf,
      e.deductions.statutory.esi,
      e.deductions.statutory.pt,
      e.deductions.statutory.tds,
      e.deductions.statutory.totalStatutory,
      e.deductions.totalDeductions,
      e.payout.netSalary,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NITP_Salary_Deductions_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-900 font-heading flex items-center gap-2">
              Monthly Salary Deductions & Net Pay
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                Leaves & Late Penalties
              </span>
            </h2>
            <p className="text-xs text-text-muted">
              Itemized salary deduction calculations for late arrivals exceeding 3 grace logins and leaves exceeding monthly allowance.
            </p>
          </div>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-border hover:bg-blue-50 text-navy-900 transition-colors cursor-pointer"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-blue-100 bg-blue-50/60 text-navy-900 font-bold text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>{formatMonthTitle(currentMonth)}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-border hover:bg-blue-50 text-navy-900 transition-colors cursor-pointer"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={fetchDeductions}
            className="p-2 rounded-xl border border-border hover:bg-blue-50 text-text-muted hover:text-navy-900 transition-colors cursor-pointer ml-1"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sync Success Banner */}
      {syncSuccessMsg && (
        <div className="bg-green-50 border border-green-200 text-status-success-text p-3.5 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{syncSuccessMsg}</span>
          </div>
          <button onClick={() => setSyncSuccessMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Connection & Formula Explanation Strip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 p-4 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-bold text-navy-900">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Salary Deduction Formula & Rules:</span>
          </div>
          <div className="text-text-muted text-[11px] leading-relaxed">
            &bull; <strong>Late Login Penalty:</strong> First 3 late logins are grace. Each 4th+ late login = <strong>0.5 day leave deduction</strong> (Daily Wage &times; 0.5).
            <br />
            &bull; <strong>Excess Leaves Penalty:</strong> Leaves taken exceeding monthly allocated allowance ({allowedLeavesPolicy} days) = <strong>1.0 day salary deduction</strong> per excess day.
            <br />
            &bull; <strong>Net Take-Home Pay:</strong> Monthly Gross &minus; (Late Deductions + Leave Deductions + Statutory PF/ESI/PT/TDS).
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-border px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-[10px] font-bold text-navy-900 uppercase">Allowed Leaves/Mo:</span>
            <select
              value={allowedLeavesPolicy}
              onChange={(e) => setAllowedLeavesPolicy(e.target.value)}
              className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer text-xs"
            >
              <option value="1">1 Day</option>
              <option value="1.5">1.5 Days</option>
              <option value="2">2 Days (Standard)</option>
              <option value="2.5">2.5 Days</option>
              <option value="3">3 Days</option>
            </select>
          </div>

          <button
            onClick={() => onNavigateToLoginHistory(undefined, currentMonth)}
            className="bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>View Login History</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Monthly Gross</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900 font-heading">
            &#8377;{(data?.kpis?.totalGrossPayroll || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Base salary pool</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Late Penalties</span>
            <Clock className="w-4 h-4 text-status-warning-text" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-status-warning-text font-heading">
            &#8377;{(data?.kpis?.totalLateDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">&gt;3 late login deductions</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Leave Deductions</span>
            <TrendingDown className="w-4 h-4 text-brand-red" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-brand-red font-heading">
            &#8377;{(data?.kpis?.totalLeaveDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Unpaid / excess leaves</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Policy Deductions</span>
            <ShieldAlert className="w-4 h-4 text-brand-red" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-brand-red font-heading">
            &#8377;{(data?.kpis?.totalAttendanceDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">
            {data?.kpis?.affectedEmployeesCount || 0} employees affected
          </p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Total Net Payable</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-navy-900 font-heading">
            &#8377;{(data?.kpis?.totalNetPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Final amount to disburse</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Table Controls Strip: Two-tier layout for pristine alignment and spacing */}
        <div className="border-b border-border bg-white">
          {/* Tier 1: Title & Primary Disbursal Actions */}
          <div className="p-4 sm:px-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-navy-900 text-sm font-heading whitespace-nowrap">
                    Employee Salary &amp; Deduction Breakdown
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                    {filteredEmployees.length} of {data?.employees?.length || 0} Employees
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Automated attendance deduction calculations and final net take-home salary audit
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-white text-navy-900 hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer h-9"
                title="Export Deductions Sheet as CSV"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleSyncToPayroll}
                disabled={syncing || !filteredEmployees.length}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-navy-700 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 h-9"
                title="Apply calculated attendance deductions to official Payroll Run"
              >
                <Save className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync to Payroll'}</span>
              </button>
            </div>
          </div>

          {/* Tier 2: Search & Filter Toolbar */}
          <div className="px-4 sm:px-5 py-2.5 bg-blue-50/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search input with proper width */}
              <div className="relative w-72 sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by employee name or email..."
                  className="w-full bg-white border border-input-border pl-8 pr-7 py-1.5 rounded-xl text-xs text-text placeholder:text-text-disabled outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-navy-900 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Team filter dropdown */}
              {teams.length > 0 && (
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="bg-white border border-input-border text-xs text-navy-900 py-1.5 px-3 rounded-xl outline-none focus:border-blue-600 cursor-pointer h-9 font-medium shadow-3xs"
                >
                  <option value="all">All Teams</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Deductions only pill toggle */}
              <button
                onClick={() => setFilterDeductionsOnly(!filterDeductionsOnly)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer h-9 shadow-3xs ${
                  filterDeductionsOnly
                    ? 'bg-red-50 border-red-300 text-brand-red font-bold'
                    : 'bg-white border-border text-text-muted hover:bg-blue-50 hover:text-navy-900'
                }`}
              >
                <AlertCircle className={`w-3.5 h-3.5 ${filterDeductionsOnly ? 'text-brand-red' : 'text-text-muted'}`} />
                <span>Deductions Only ({data?.kpis?.affectedEmployeesCount || 0})</span>
              </button>
            </div>

            {/* Clear Filters Reset Button */}
            {(searchQuery || selectedTeam !== 'all' || filterDeductionsOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTeam('all');
                  setFilterDeductionsOnly(false);
                }}
                className="text-xs font-semibold text-blue-600 hover:text-navy-900 cursor-pointer underline whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-16 text-center text-text-muted space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-medium">Computing salary deductions from attendance and leave records...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-brand-red space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={fetchDeductions}
              className="text-xs text-blue-600 underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-blue-50 text-navy-700 font-bold border-b border-border text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5 text-left whitespace-nowrap min-w-[240px]">
                    Employee
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[130px]">
                    Monthly Gross
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[110px]">
                    Daily Wage
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[145px]">
                    <div>Late Logins</div>
                    <div className="text-[9px] font-normal text-text-muted normal-case tracking-normal mt-0.5">
                      (&gt;3 Grace Limit)
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[155px]">
                    <div>Leaves Taken</div>
                    <div className="text-[9px] font-normal text-text-muted normal-case tracking-normal mt-0.5">
                      (Taken / Quota)
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[125px]">
                    <div>Penalty Days</div>
                    <div className="text-[9px] font-normal text-text-muted normal-case tracking-normal mt-0.5">
                      (Late + Leaves)
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[165px]">
                    <div>Attendance Deductions</div>
                    <div className="text-[9px] font-normal text-text-muted normal-case tracking-normal mt-0.5">
                      (Penalty &times; Daily Wage)
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">
                    <div>Statutory Deductions</div>
                    <div className="text-[9px] font-normal text-text-muted normal-case tracking-normal mt-0.5">
                      (PF / ESI / PT)
                    </div>
                  </th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap min-w-[170px] bg-blue-100/60 font-extrabold text-navy-900 border-l border-blue-200/60">
                    <div>Net Take-Home Pay</div>
                    <div className="text-[9px] font-semibold text-blue-700 normal-case tracking-normal mt-0.5">
                      Final Payout Amount
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[115px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-text-muted font-medium">
                      No employee salary deduction records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => {
                    const hasDeductions = emp.deductions.totalDeductedDays > 0;
                    const hasLatePenalty = emp.lateLogins.excessCount > 0;
                    const hasLeavePenalty = emp.leaves.excessDays > 0;

                    return (
                      <tr key={emp.userId} className="hover:bg-blue-50/40 transition-colors">
                        {/* Employee */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="font-bold text-navy-900 text-xs">{emp.name}</div>
                          <div className="text-[11px] text-text-muted mt-0.5 whitespace-nowrap flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-navy-700">{emp.department}</span>
                            <span className="text-text-disabled">&bull;</span>
                            <span>{emp.email}</span>
                          </div>
                          {!emp.hasSalaryStructure && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                No Salary Structure Set
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Monthly Gross */}
                        <td className="py-3.5 px-4 text-right align-middle font-bold text-navy-900 text-xs whitespace-nowrap">
                          &#8377;{emp.salary.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Daily Rate */}
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <div className="text-xs font-semibold text-text">
                            &#8377;{emp.salary.dailyRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">Gross &divide; 30</div>
                        </td>

                        {/* Late Logins Column */}
                        <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <button
                              onClick={() => onNavigateToLoginHistory(emp.userId, currentMonth)}
                              className="group/late inline-flex items-center gap-1 font-bold text-xs text-navy-900 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Click to view full login history"
                            >
                              <span>{emp.lateLogins.totalCount} Late{emp.lateLogins.totalCount === 1 ? '' : 's'}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover/late:opacity-100 text-blue-600" />
                            </button>

                            {hasLatePenalty ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-brand-red border border-red-200 mt-1">
                                {emp.lateLogins.excessCount} excess &bull; {emp.lateLogins.penaltyDays}d penalty
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-muted mt-1 font-medium">
                                {emp.lateLogins.graceUsed}/3 Grace Used
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Leaves Column */}
                        <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-xs text-navy-900">
                              {emp.leaves.totalTaken} Taken / {emp.leaves.allowedMonthly} Allowed
                            </span>
                            {hasLeavePenalty ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-brand-red border border-red-200 mt-1">
                                {emp.leaves.excessDays} Excess Day{emp.leaves.excessDays === 1 ? '' : 's'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-status-success-text bg-green-50 border border-green-200 mt-1">
                                Within Quota
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Penalty Days */}
                        <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                          {hasDeductions ? (
                            <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-brand-red border border-red-200">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{emp.deductions.totalDeductedDays} Day{emp.deductions.totalDeductedDays === 1 ? '' : 's'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold text-text-muted bg-gray-100 border border-gray-200/60">
                              0 Days
                            </span>
                          )}
                        </td>

                        {/* Total Attendance Deductions */}
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          {emp.deductions.totalAttendanceDeduction > 0 ? (
                            <div>
                              <div className="font-bold text-xs text-brand-red">
                                &minus;&#8377;{emp.deductions.totalAttendanceDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-text-muted mt-0.5">
                                Late: &#8377;{emp.deductions.lateDeduction.toLocaleString('en-IN', { maximumFractionDigits: 0 })} &bull; Leave: &#8377;{emp.deductions.leaveDeduction.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-text-muted font-medium text-xs">&#8377;0.00</span>
                              <div className="text-[10px] text-text-disabled mt-0.5">No deductions</div>
                            </div>
                          )}
                        </td>

                        {/* Statutory Deductions */}
                        <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <div className="font-semibold text-xs text-text">
                            {emp.deductions.statutory.totalStatutory > 0 ? (
                              <span className="text-navy-900">&minus;&#8377;{emp.deductions.statutory.totalStatutory.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-text-muted">&#8377;0.00</span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">PF &bull; ESI &bull; PT</div>
                        </td>

                        {/* Net Salary What Employee Gets */}
                        <td className="py-3.5 px-5 text-right align-middle whitespace-nowrap bg-blue-50/50 border-l border-blue-100">
                          <div className="text-sm font-extrabold text-navy-900 font-heading">
                            &#8377;{emp.payout.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] font-bold text-status-success-text mt-0.5 inline-flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                            <span>Take-Home Pay</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                          <button
                            onClick={() => setSelectedEmployeeForModal(emp)}
                            className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            title="View Complete Mathematical Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Breakdown</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Comprehensive Calculation & Receipt Breakdown */}
      {selectedEmployeeForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-heading flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-400" />
                  Salary Deduction Audit: {selectedEmployeeForModal.name}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {selectedEmployeeForModal.department} &bull; {selectedEmployeeForModal.email} &bull; Period:{' '}
                  {formatMonthTitle(currentMonth)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeForModal(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar-container">
              {/* Top Highlights Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-100">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Monthly Gross Salary</span>
                  <span className="text-xl font-extrabold text-navy-900 font-heading block mt-0.5">
                    &#8377;{selectedEmployeeForModal.salary.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Daily Wage: &#8377;{selectedEmployeeForModal.salary.dailyRate}
                  </span>
                </div>

                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100">
                  <span className="text-[10px] uppercase font-bold text-brand-red block">Total Deductions</span>
                  <span className="text-xl font-extrabold text-brand-red font-heading block mt-0.5">
                    &minus;&#8377;{selectedEmployeeForModal.deductions.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-brand-red font-medium">
                    {selectedEmployeeForModal.deductions.totalDeductedDays} days penalized
                  </span>
                </div>

                <div className="bg-green-50 p-3.5 rounded-xl border border-green-100">
                  <span className="text-[10px] uppercase font-bold text-status-success-text block">Net What Employee Gets</span>
                  <span className="text-xl font-extrabold text-navy-900 font-heading block mt-0.5">
                    &#8377;{selectedEmployeeForModal.payout.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-status-success-text font-bold">
                    Net Take-Home Pay
                  </span>
                </div>
              </div>

              {/* SECTION 1: Late Login Penalty Calculation */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    1. Late Login Deductions (3 Grace Logins Policy)
                  </h4>
                  <button
                    onClick={() => {
                      const id = selectedEmployeeForModal.userId;
                      setSelectedEmployeeForModal(null);
                      onNavigateToLoginHistory(id, currentMonth);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-navy-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View in Login History</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted block">Total Late Logins</span>
                    <span className="font-bold text-navy-900">{selectedEmployeeForModal.lateLogins.totalCount} times</span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted block">Grace Allowed</span>
                    <span className="font-bold text-status-success-text">{selectedEmployeeForModal.lateLogins.graceUsed} / 3 Allowed</span>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-brand-red block">Excess Late Logins</span>
                    <span className="font-bold text-brand-red">{selectedEmployeeForModal.lateLogins.excessCount} (4th onwards)</span>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-brand-red block">Late Penalty Days</span>
                    <span className="font-bold text-brand-red">{selectedEmployeeForModal.lateLogins.penaltyDays} days (&times; 0.5)</span>
                  </div>
                </div>

                <div className="bg-blue-50/40 p-2.5 rounded-lg text-xs flex justify-between items-center font-bold">
                  <span className="text-navy-900">
                    Late Deduction: {selectedEmployeeForModal.lateLogins.penaltyDays} days &times; &#8377;{selectedEmployeeForModal.salary.dailyRate}
                  </span>
                  <span className="text-brand-red">
                    &minus;&#8377;{selectedEmployeeForModal.lateLogins.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* SECTION 2: Leaves Penalty Calculation */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    2. Excess Leave Deductions
                  </h4>
                  <span className="text-[11px] text-text-muted">
                    Allocated Quota: {selectedEmployeeForModal.leaves.allowedMonthly} days / month
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted block">Approved Leaves</span>
                    <span className="font-bold text-navy-900">{selectedEmployeeForModal.leaves.approvedDays} days</span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted block">Unexcused Absences</span>
                    <span className="font-bold text-navy-900">{selectedEmployeeForModal.leaves.absentDays} days</span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-text-muted block">Total Leaves Taken</span>
                    <span className="font-bold text-navy-900">{selectedEmployeeForModal.leaves.totalTaken} days</span>
                  </div>
                  <div className="bg-red-50/50 p-2 rounded-lg">
                    <span className="text-[10px] text-brand-red block">Excess Leaves</span>
                    <span className="font-bold text-brand-red">{selectedEmployeeForModal.leaves.excessDays} days</span>
                  </div>
                </div>

                {selectedEmployeeForModal.leaves.breakdown?.length > 0 && (
                  <div className="space-y-1 mt-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Approved Leave Details:</span>
                    {selectedEmployeeForModal.leaves.breakdown.map((l: any) => (
                      <div key={l.id} className="text-[11px] bg-blue-50/30 p-2 rounded-md flex justify-between">
                        <span>{l.leaveType} ({formatDateToIndian(l.startDate)} - {formatDateToIndian(l.endDate)})</span>
                        <span className="font-bold">{l.daysInMonth} days in month</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50/40 p-2.5 rounded-lg text-xs flex justify-between items-center font-bold">
                  <span className="text-navy-900">
                    Leave Deduction: {selectedEmployeeForModal.leaves.excessDays} days &times; &#8377;{selectedEmployeeForModal.salary.dailyRate}
                  </span>
                  <span className="text-brand-red">
                    &minus;&#8377;{selectedEmployeeForModal.leaves.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* SECTION 3: Statutory Deductions & Net Payout Math */}
              <div className="border border-border rounded-xl p-4 space-y-2 bg-blue-50/30">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2">
                  3. Mathematical Reconciliation Statement
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Gross Earnings (Basic + HRA + Allowances):</span>
                    <span className="font-bold text-navy-900">
                      &#8377;{selectedEmployeeForModal.salary.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-brand-red">
                    <span>&minus; Late Login Penalty ({selectedEmployeeForModal.lateLogins.penaltyDays} days):</span>
                    <span className="font-bold">
                      &minus;&#8377;{selectedEmployeeForModal.lateLogins.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-brand-red">
                    <span>&minus; Excess Leaves Penalty ({selectedEmployeeForModal.leaves.excessDays} days):</span>
                    <span className="font-bold">
                      &minus;&#8377;{selectedEmployeeForModal.leaves.deductionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-text-muted border-t border-border pt-1">
                    <span>&minus; Statutory Deductions (PF: &#8377;{selectedEmployeeForModal.deductions.statutory.pf}, ESI: &#8377;{selectedEmployeeForModal.deductions.statutory.esi}, PT: &#8377;{selectedEmployeeForModal.deductions.statutory.pt}, TDS: &#8377;{selectedEmployeeForModal.deductions.statutory.tds}):</span>
                    <span className="font-bold text-navy-900">
                      &minus;&#8377;{selectedEmployeeForModal.deductions.statutory.totalStatutory.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5 border-t-2 border-navy-900 text-sm font-extrabold text-navy-900 font-heading bg-white px-3 rounded-xl shadow-xs mt-2">
                    <span>Net Amount Employee Should Get:</span>
                    <span className="text-blue-600 text-base">
                      &#8377;{selectedEmployeeForModal.payout.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-blue-50/60 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                Status in Payroll Run: <strong>{selectedEmployeeForModal.payrollRunStatus}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedEmployeeForModal(null)}
                  className="px-4 py-2 rounded-xl border border-border bg-white text-navy-900 font-bold text-xs hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Close Audit
                </button>
                <button
                  onClick={async () => {
                    const emp = selectedEmployeeForModal;
                    setSelectedEmployeeForModal(null);
                    await handleSyncToPayroll();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Sync to Payroll Draft</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

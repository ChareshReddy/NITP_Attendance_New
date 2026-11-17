'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
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
  Info
} from 'lucide-react';
import { formatDateToIndian } from '@/lib/dateUtils';

interface LoginHistoryViewProps {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onNavigateToDeductions: (employeeId?: string, month?: string) => void;
  teams?: { id: string; name: string }[];
}

export default function LoginHistoryView({
  currentMonth,
  onMonthChange,
  onNavigateToDeductions,
  teams = [],
}: LoginHistoryViewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [filterPenaltyOnly, setFilterPenaltyOnly] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/payroll/login-history?month=${currentMonth}`;
      if (selectedTeam !== 'all') {
        url += `&teamId=${selectedTeam}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch login history');
      }
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentMonth, selectedTeam]);

  // Quick month navigators
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

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter((emp: any) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPenalty = filterPenaltyOnly ? emp.excessLateCount > 0 : true;
      return matchesSearch && matchesPenalty;
    });
  }, [data?.employees, searchQuery, filterPenaltyOnly]);

  // Filtered detailed logs
  const filteredLogs = useMemo(() => {
    if (!data?.logs) return [];
    return data.logs.filter((log: any) => {
      const matchesSearch =
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPenalty = filterPenaltyOnly ? log.isPenalty : true;
      return matchesSearch && matchesPenalty;
    });
  }, [data?.logs, searchQuery, filterPenaltyOnly]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Month Picker Strip */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy-900 font-heading flex items-center gap-2">
              Login History & Late Arrival Tracker
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                Grace: 3 Max
              </span>
            </h2>
            <p className="text-xs text-text-muted">
              Employees are allowed 3 late logins per month. Each 4th+ late login incurs a 0.5-day salary deduction.
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
            onClick={fetchHistory}
            className="p-2 rounded-xl border border-border hover:bg-blue-50 text-text-muted hover:text-navy-900 transition-colors cursor-pointer ml-1"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Policy Callout Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-navy-900">Official NITP Late Login Policy: </span>
            <span className="text-text-muted">
              Check-in after <strong>9:30 AM</strong> counts as a Late Login. 
              Each employee is permitted <strong>up to 3 late arrivals per calendar month</strong> as grace.
              From the <strong>4th late login onwards</strong>, every late arrival is treated as a <strong>half-day holiday (0.5 day leave penalty)</strong>,
              automatically deducted in the Salary Deductions section.
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigateToDeductions(undefined, currentMonth)}
          className="shrink-0 bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <span>Go to Salary Deductions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-navy-900 font-heading">
            {data?.kpis?.totalEmployees || 0}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Monitored this month</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Check-Ins</span>
            <Clock className="w-4 h-4 text-navy-700" />
          </div>
          <div className="text-2xl font-extrabold text-navy-900 font-heading">
            {data?.kpis?.totalCheckIns || 0}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Recorded punch-ins</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Late Logins</span>
            <AlertTriangle className="w-4 h-4 text-status-warning-text" />
          </div>
          <div className="text-2xl font-extrabold text-status-warning-text font-heading">
            {data?.kpis?.totalLateLogins || 0}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Arrivals after 9:30 AM</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Exceeded Grace (&gt;3)</span>
            <ShieldAlert className="w-4 h-4 text-brand-red" />
          </div>
          <div className="text-2xl font-extrabold text-brand-red font-heading">
            {data?.kpis?.employeesWithPenalties || 0}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Employees with penalties</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Half-Day Deductions</span>
            <TrendingDown className="w-4 h-4 text-brand-red" />
          </div>
          <div className="text-2xl font-extrabold text-navy-900 font-heading flex items-baseline gap-1">
            <span>{data?.kpis?.totalPenaltyDays || 0}</span>
            <span className="text-xs font-semibold text-text-muted">days</span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">Total penalty days</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        {/* Table Controls Strip */}
        <div className="p-4 border-b border-border bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          {/* Sub-tab view switch */}
          <div className="flex gap-1 bg-blue-50/70 p-1 rounded-xl border border-blue-100 self-stretch sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'summary'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-text-muted hover:text-navy-900 hover:bg-white/80'
              }`}
            >
              Employee Summary ({data?.employees?.length || 0})
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-text-muted hover:text-navy-900 hover:bg-white/80'
              }`}
            >
              Daily Login Logs ({data?.logs?.length || 0})
            </button>
          </div>

          {/* Search, Filter & Penalties toggle */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name, email..."
                className="w-full bg-white border border-input-border pl-8 pr-7 py-1.5 rounded-xl text-xs text-text placeholder:text-text-disabled outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-navy-900 cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Team filter */}
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

            {/* Toggle penalty only */}
            <button
              onClick={() => setFilterPenaltyOnly(!filterPenaltyOnly)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer h-9 shadow-3xs ${
                filterPenaltyOnly
                  ? 'bg-red-50 border-red-300 text-brand-red font-bold'
                  : 'bg-white border-border text-text-muted hover:bg-blue-50 hover:text-navy-900'
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 ${filterPenaltyOnly ? 'text-brand-red' : 'text-text-muted'}`} />
              <span>Penalty Only ({data?.kpis?.employeesWithPenalties || 0})</span>
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="py-16 text-center text-text-muted space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs font-medium">Loading login history records...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-brand-red space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
            <button
              onClick={fetchHistory}
              className="text-xs text-blue-600 underline font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* VIEW 1: Employee Summary Table */}
            {viewMode === 'summary' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-navy-700 font-bold border-b border-border text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-5 text-left whitespace-nowrap min-w-[240px]">Employee</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap min-w-[160px]">Department</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[110px]">Check-Ins</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[135px]">Late Logins</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[155px]">Grace Status (Max 3)</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[155px]">Penalty Incurred</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[135px]">Policy Status</th>
                      <th className="py-3.5 px-5 text-right whitespace-nowrap min-w-[145px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-text-muted font-medium">
                          No employee login records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp: any) => {
                        const hasPenalty = emp.excessLateCount > 0;
                        const isAtLimit = emp.totalLateCount === 3;

                        return (
                          <tr key={emp.userId} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-3.5 px-5 align-middle">
                              <div className="font-bold text-navy-900 text-xs">{emp.name}</div>
                              <div className="text-[11px] text-text-muted mt-0.5 whitespace-nowrap">{emp.email}</div>
                            </td>
                            <td className="py-3.5 px-4 align-middle text-text font-medium whitespace-nowrap">
                              <div className="font-semibold text-navy-900">{emp.department}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{emp.designation}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle font-bold text-navy-900 whitespace-nowrap">
                              {emp.checkInCount}
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                              <span
                                className={`inline-flex items-center justify-center font-extrabold text-xs px-2.5 py-0.5 rounded-full ${
                                  emp.totalLateCount === 0
                                    ? 'bg-status-success-bg text-status-success-text'
                                    : emp.totalLateCount <= 3
                                    ? 'bg-status-warning-bg text-status-warning-text'
                                    : 'bg-red-50 text-brand-red border border-red-200'
                                }`}
                              >
                                {emp.totalLateCount} Late{emp.totalLateCount === 1 ? '' : 's'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 font-bold">
                                <span className={emp.totalLateCount > 3 ? 'text-brand-red' : 'text-navy-900'}>
                                  {emp.graceUsed} / 3 Used
                                </span>
                                {emp.graceRemaining > 0 && (
                                  <span className="text-[10px] text-text-muted font-normal">
                                    ({emp.graceRemaining} left)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                              {hasPenalty ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="px-2.5 py-1 rounded-full bg-red-100 text-brand-red font-extrabold text-xs flex items-center gap-1 border border-red-200">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{emp.latePenaltyDays} Day{emp.latePenaltyDays === 1 ? '' : 's'}</span>
                                  </span>
                                  <span className="text-[10px] text-brand-red font-medium mt-0.5">
                                    {emp.excessLateCount} late{emp.excessLateCount === 1 ? '' : 's'} &times; 0.5 day
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-text-muted bg-gray-100">
                                  0 Days
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                              {hasPenalty ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-brand-red border border-red-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Exceeded Limit
                                </span>
                              ) : isAtLimit ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-status-warning-text border border-amber-200">
                                  Grace Exhausted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-status-success-bg text-status-success-text border border-green-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Within Grace
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right align-middle whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedEmployeeModal(emp)}
                                  className="p-1.5 text-navy-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-border/60 hover:border-blue-200"
                                  title="View Late Login Log"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onNavigateToDeductions(emp.userId, currentMonth)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer border border-blue-200/60 shadow-xs"
                                  title="View Salary Deductions for this employee"
                                >
                                  <span>Deductions</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW 2: Detailed Daily Login Logs */}
            {viewMode === 'detailed' && (
              <div className="overflow-x-auto max-h-[600px] custom-scrollbar-container">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-blue-50 text-navy-700 font-bold border-b border-border z-10 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5 text-left whitespace-nowrap min-w-[130px]">Date</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap min-w-[220px]">Employee</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap min-w-[150px]">Department</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">Check-In Time</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">Check-Out Time</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">Punch Status</th>
                      <th className="py-3.5 px-5 text-right whitespace-nowrap min-w-[180px]">Late Policy Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-text-muted font-medium">
                          No detailed logs found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-5 font-bold text-navy-900 whitespace-nowrap align-middle">
                            {formatDateToIndian(log.date)}
                          </td>
                          <td className="py-3 px-4 align-middle">
                            <div className="font-bold text-navy-900 text-xs">{log.userName}</div>
                            <div className="text-[11px] text-text-muted mt-0.5 whitespace-nowrap">{log.userEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-text-muted font-medium align-middle whitespace-nowrap">{log.department}</td>
                          <td className="py-3 px-4 text-center font-bold text-navy-900 whitespace-nowrap align-middle">
                            {log.checkInTime
                              ? new Date(log.checkInTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center text-text-muted whitespace-nowrap align-middle">
                            {log.checkOutTime
                              ? new Date(log.checkOutTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                log.isLate
                                  ? 'bg-status-warning-bg text-status-warning-text'
                                  : 'bg-status-success-bg text-status-success-text'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap align-middle">
                            {log.isLate ? (
                              log.isPenalty ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-brand-red font-extrabold text-xs border border-red-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{log.penaltyLabel}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-warning-bg text-status-warning-text font-bold text-xs border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  <span>{log.penaltyLabel}</span>
                                </span>
                              )
                            ) : (
                              <span className="text-text-muted text-xs font-medium">On-time check-in</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL: Employee Late History Detail */}
      {selectedEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-navy-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base font-heading flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Monthly Late Login Audit: {selectedEmployeeModal.name}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {selectedEmployeeModal.department} &bull; {selectedEmployeeModal.email} &bull; Month:{' '}
                  {formatMonthTitle(currentMonth)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeModal(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar-container">
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Total Late Logins</span>
                  <span className="text-xl font-extrabold text-navy-900 font-heading">
                    {selectedEmployeeModal.totalLateCount}
                  </span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-status-warning-text block">Grace Used</span>
                  <span className="text-xl font-extrabold text-status-warning-text font-heading">
                    {selectedEmployeeModal.graceUsed} / 3
                  </span>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-brand-red block">Penalty Days</span>
                  <span className="text-xl font-extrabold text-brand-red font-heading">
                    {selectedEmployeeModal.latePenaltyDays} days
                  </span>
                </div>
              </div>

              {/* Late Logins List */}
              <div>
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Chronological Late Check-in Sequence
                </h4>
                {selectedEmployeeModal.lateRecords?.length === 0 ? (
                  <p className="text-xs text-text-muted py-6 text-center bg-blue-50/40 rounded-xl border border-border">
                    This employee has 0 late arrivals for {formatMonthTitle(currentMonth)}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedEmployeeModal.lateRecords.map((rec: any) => (
                      <div
                        key={rec.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          rec.isPenalty
                            ? 'bg-red-50/70 border-red-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                              rec.isPenalty ? 'bg-red-200 text-brand-red' : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            #{rec.sequence}
                          </span>
                          <div>
                            <div className="font-bold text-navy-900">{formatDateToIndian(rec.date)}</div>
                            <div className="text-[10px] text-text-muted">
                              Check-In:{' '}
                              {rec.checkInTime
                                ? new Date(rec.checkInTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })
                                : 'Late'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block font-extrabold text-[11px] px-2.5 py-0.5 rounded-md ${
                              rec.isPenalty ? 'bg-brand-red text-white' : 'bg-status-warning-bg text-status-warning-text'
                            }`}
                          >
                            {rec.isPenalty ? '0.5 Day Leave Penalty' : 'Grace Allowed (No deduction)'}
                          </span>
                          {rec.isPenalty && (
                            <div className="text-[10px] text-brand-red font-semibold mt-0.5">
                              Exceeded 3 grace late logins
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-blue-50/60 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-text-muted">
                Deduction rate: 0.5 &times; Daily Wage per excess late login
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedEmployeeModal(null)}
                  className="px-4 py-2 rounded-xl border border-border bg-white text-navy-900 font-bold text-xs hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const empId = selectedEmployeeModal.userId;
                    setSelectedEmployeeModal(null);
                    onNavigateToDeductions(empId, currentMonth);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-navy-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>View in Salary Deductions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

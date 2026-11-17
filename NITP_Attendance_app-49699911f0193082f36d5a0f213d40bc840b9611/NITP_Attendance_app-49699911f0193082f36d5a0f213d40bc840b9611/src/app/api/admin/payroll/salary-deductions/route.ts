import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

async function getAuthUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

// Helper to determine if a check-in time was after 9:30 AM
function isCheckInLate(checkInTime: Date | string | null, timezone: string = 'Asia/Kolkata'): boolean {
  if (!checkInTime) return false;
  try {
    const d = new Date(checkInTime);
    if (isNaN(d.getTime())) return false;
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const formatted = timeFormatter.format(d);
    const [h, m] = formatted.split(':').map(Number);
    return h > 9 || (h === 9 && m > 30);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const caller = await getAuthUser();
    if (!caller || caller.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: HR Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') || defaultMonth; // YYYY-MM
    const userIdFilter = searchParams.get('userId');
    const teamIdFilter = searchParams.get('teamId');
    const monthlyAllowedLeaves = parseFloat(searchParams.get('allowedLeaves') || '2'); // Default 2 paid leaves per month

    // Parse month date range
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format. Expected YYYY-MM' }, { status: 400 });
    }

    const startDate = `${month}-01`;
    const lastDayOfMonth = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    // Filter active employees
    const userWhere: any = { isActive: true };
    if (userIdFilter && userIdFilter !== 'all') {
      userWhere.id = userIdFilter;
    }
    if (teamIdFilter && teamIdFilter !== 'all') {
      userWhere.teamId = teamIdFilter;
    }

    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        team: {
          select: { id: true, name: true },
        },
        salaryStructure: true,
        employeeProfile: {
          select: {
            department: true,
            designation: true,
            employeeType: true,
            timezone: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = users.map(u => u.id);

    // 1. Fetch attendance records for the month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // 2. Fetch approved leave requests overlapping with the month
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        leaveType: {
          select: { name: true },
        },
      },
    });

    // 3. Fetch any existing PayrollRun for this period
    const startPeriodDate = new Date(`${startDate}T00:00:00.000Z`);
    const endPeriodDate = new Date(`${endDate}T23:59:59.999Z`);
    const existingPayrollRuns = await prisma.payrollRun.findMany({
      where: {
        userId: { in: userIds },
        periodStart: { lte: endPeriodDate },
        periodEnd: { gte: startPeriodDate },
      },
    });

    const payrollRunMap = new Map(existingPayrollRuns.map(r => [r.userId, r]));

    // Group attendance by user
    const attendanceByUser = new Map<string, typeof attendanceRecords>();
    for (const record of attendanceRecords) {
      if (!attendanceByUser.has(record.userId)) {
        attendanceByUser.set(record.userId, []);
      }
      attendanceByUser.get(record.userId)!.push(record);
    }

    // Group leaves by user
    const leavesByUser = new Map<string, typeof leaveRequests>();
    for (const req of leaveRequests) {
      if (!leavesByUser.has(req.userId)) {
        leavesByUser.set(req.userId, []);
      }
      leavesByUser.get(req.userId)!.push(req);
    }

    let orgTotalGross = 0;
    let orgTotalLateDeductions = 0;
    let orgTotalLeaveDeductions = 0;
    let orgTotalAttendanceDeductions = 0;
    let orgTotalStatutoryDeductions = 0;
    let orgTotalNetPayable = 0;
    let orgAffectedEmployees = 0;

    const employeeDeductions = [];

    for (const u of users) {
      const records = attendanceByUser.get(u.id) || [];
      const userLeaves = leavesByUser.get(u.id) || [];
      const userTz = u.employeeProfile?.timezone || 'Asia/Kolkata';

      // --- SALARY DETAILS ---
      const hasSalaryStructure = Boolean(u.salaryStructure);
      const basic = u.salaryStructure?.basicSalary || 0;
      const hra = u.salaryStructure?.hra || 0;
      const conveyance = u.salaryStructure?.conveyance || 0;
      const special = u.salaryStructure?.specialAllowance || 0;
      const grossSalary = basic + hra + conveyance + special;
      const dailyRate = grossSalary > 0 ? parseFloat((grossSalary / 30).toFixed(2)) : 0;

      // --- 1. LATE LOGINS & PENALTY ---
      const lateList: any[] = [];
      let absentDaysCount = 0;

      for (const rec of records) {
        if (rec.status === 'ABSENT' || rec.status === 'MISSING_PUNCH') {
          absentDaysCount++;
        }
        const isStatusLate = rec.status === 'LATE' || rec.status === 'LATE_COMING';
        const isTimeLate = isCheckInLate(rec.checkInTime, userTz);
        if (isStatusLate || isTimeLate) {
          lateList.push(rec);
        }
      }

      // Sort late logins chronologically
      lateList.sort((a, b) => a.date.localeCompare(b.date));

      const totalLateCount = lateList.length;
      const graceLates = Math.min(totalLateCount, 3);
      const excessLateCount = Math.max(0, totalLateCount - 3);
      // "from next 4th late login half day considered to be half day holiday"
      const latePenaltyDays = excessLateCount * 0.5;
      const lateDeductionAmount = parseFloat((latePenaltyDays * dailyRate).toFixed(2));

      // Itemized late breakdown for audit
      const lateBreakdown = lateList.map((l, idx) => {
        const seq = idx + 1;
        const isGrace = seq <= 3;
        return {
          id: l.id,
          date: l.date,
          checkInTime: l.checkInTime,
          checkOutTime: l.checkOutTime,
          sequence: seq,
          isGrace,
          penaltyDays: isGrace ? 0 : 0.5,
          tag: isGrace ? `Grace (${seq}/3)` : `0.5 Day Penalty (Late #${seq})`,
        };
      });

      // --- 2. LEAVES & EXCESS DEDUCTION ---
      // "salary must be deducted based on how many leaves that a person took a month more than he/she are got"
      let approvedLeaveDaysInMonth = 0;
      const leaveBreakdown: any[] = [];

      for (const req of userLeaves) {
        let cur = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        let daysForThisReq = 0;

        while (cur <= reqEnd) {
          const curStr = cur.toISOString().split('T')[0];
          if (curStr >= startDate && curStr <= endDate) {
            daysForThisReq++;
            approvedLeaveDaysInMonth++;
          }
          cur.setDate(cur.getDate() + 1);
        }

        leaveBreakdown.push({
          id: req.id,
          leaveType: req.leaveType?.name || 'General Leave',
          startDate: req.startDate,
          endDate: req.endDate,
          daysInMonth: daysForThisReq,
          reason: req.reason,
          lossOfPay: req.lossOfPay,
        });
      }

      // Total leave days taken = approved leave days in this month + unexcused absent days
      const totalLeavesTaken = approvedLeaveDaysInMonth + absentDaysCount;
      const excessLeaveDays = Math.max(0, totalLeavesTaken - monthlyAllowedLeaves);
      const leaveDeductionAmount = parseFloat((excessLeaveDays * dailyRate).toFixed(2));

      // --- 3. TOTAL ATTENDANCE DEDUCTIONS ---
      const totalDeductedDays = parseFloat((latePenaltyDays + excessLeaveDays).toFixed(1));
      const totalAttendanceDeduction = parseFloat((lateDeductionAmount + leaveDeductionAmount).toFixed(2));

      // --- 4. STATUTORY DEDUCTIONS ---
      const pf = basic > 0 ? parseFloat((basic * 0.12).toFixed(2)) : 0;
      const esi = grossSalary > 0 && grossSalary <= 21000 ? parseFloat((grossSalary * 0.0075).toFixed(2)) : 0;
      const pt = grossSalary > 0 ? 200.00 : 0;
      const tds = grossSalary > 25000 ? parseFloat((grossSalary * 0.05).toFixed(2)) : 0;
      const totalStatutory = parseFloat((pf + esi + pt + tds).toFixed(2));

      // --- 5. NET PAYABLE SALARY ---
      const totalDeductions = parseFloat((totalAttendanceDeduction + totalStatutory).toFixed(2));
      const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));
      const netSalaryBeforeStatutory = parseFloat(Math.max(0, grossSalary - totalAttendanceDeduction).toFixed(2));

      if (totalDeductedDays > 0) {
        orgAffectedEmployees++;
      }

      orgTotalGross += grossSalary;
      orgTotalLateDeductions += lateDeductionAmount;
      orgTotalLeaveDeductions += leaveDeductionAmount;
      orgTotalAttendanceDeductions += totalAttendanceDeduction;
      orgTotalStatutoryDeductions += totalStatutory;
      orgTotalNetPayable += netSalary;

      const existingRun = payrollRunMap.get(u.id);

      employeeDeductions.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        department: u.employeeProfile?.department || u.team?.name || 'General',
        designation: u.employeeProfile?.designation || 'Employee',
        teamName: u.team?.name || 'No Team',
        hasSalaryStructure,
        salary: {
          basic,
          hra,
          conveyance,
          special,
          grossSalary,
          dailyRate,
        },
        lateLogins: {
          totalCount: totalLateCount,
          graceUsed: graceLates,
          graceAllowed: 3,
          excessCount: excessLateCount,
          penaltyDays: latePenaltyDays,
          deductionAmount: lateDeductionAmount,
          breakdown: lateBreakdown,
        },
        leaves: {
          approvedDays: approvedLeaveDaysInMonth,
          absentDays: absentDaysCount,
          totalTaken: totalLeavesTaken,
          allowedMonthly: monthlyAllowedLeaves,
          excessDays: excessLeaveDays,
          deductionAmount: leaveDeductionAmount,
          breakdown: leaveBreakdown,
        },
        deductions: {
          totalDeductedDays,
          lateDeduction: lateDeductionAmount,
          leaveDeduction: leaveDeductionAmount,
          totalAttendanceDeduction,
          statutory: {
            pf,
            esi,
            pt,
            tds,
            totalStatutory,
          },
          totalDeductions,
        },
        payout: {
          grossSalary,
          netSalaryBeforeStatutory,
          netSalary,
        },
        payrollRunStatus: existingRun ? existingRun.status : 'NOT_GENERATED',
        payrollRunId: existingRun ? existingRun.id : null,
      });
    }

    const kpis = {
      month,
      monthlyAllowedLeaves,
      totalEmployees: users.length,
      affectedEmployeesCount: orgAffectedEmployees,
      totalGrossPayroll: parseFloat(orgTotalGross.toFixed(2)),
      totalLateDeductions: parseFloat(orgTotalLateDeductions.toFixed(2)),
      totalLeaveDeductions: parseFloat(orgTotalLeaveDeductions.toFixed(2)),
      totalAttendanceDeductions: parseFloat(orgTotalAttendanceDeductions.toFixed(2)),
      totalStatutoryDeductions: parseFloat(orgTotalStatutoryDeductions.toFixed(2)),
      totalNetPayable: parseFloat(orgTotalNetPayable.toFixed(2)),
      averageNetPayable: users.length > 0 ? parseFloat((orgTotalNetPayable / users.length).toFixed(2)) : 0,
    };

    return NextResponse.json({
      success: true,
      month,
      kpis,
      employees: employeeDeductions,
    });
  } catch (error) {
    console.error('Salary Deductions API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Apply calculated deductions to PayrollRun
export async function POST(request: Request) {
  try {
    const caller = await getAuthUser();
    if (!caller || caller.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: HR Admin access required' }, { status: 403 });
    }

    const { month, employeeDeductionData } = await request.json();
    if (!month || !Array.isArray(employeeDeductionData)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startPeriod = new Date(year, monthNum - 1, 1);
    const endPeriod = new Date(year, monthNum, 0);

    let updatedCount = 0;
    let createdCount = 0;

    for (const emp of employeeDeductionData) {
      if (!emp.userId || !emp.salary?.grossSalary) continue;

      const basic = emp.salary.basic;
      const hra = emp.salary.hra;
      const conveyance = emp.salary.conveyance;
      const special = emp.salary.special;
      const gross = emp.salary.grossSalary;
      const lopDeduction = emp.deductions.totalAttendanceDeduction || 0;
      const pf = emp.deductions.statutory.pf || 0;
      const esi = emp.deductions.statutory.esi || 0;
      const pt = emp.deductions.statutory.pt || 200;
      const tds = emp.deductions.statutory.tds || 0;
      const totalDeductions = parseFloat((lopDeduction + pf + esi + pt + tds).toFixed(2));
      const netSalary = parseFloat(Math.max(0, gross - totalDeductions).toFixed(2));

      // Upsert PayrollRun
      const existing = await prisma.payrollRun.findFirst({
        where: {
          userId: emp.userId,
          periodStart: startPeriod,
          periodEnd: endPeriod,
        },
      });

      if (existing) {
        await prisma.payrollRun.update({
          where: { id: existing.id },
          data: {
            lopDeduction,
            totalDeductions,
            netSalary,
          },
        });
        updatedCount++;
      } else {
        await prisma.payrollRun.create({
          data: {
            userId: emp.userId,
            periodStart: startPeriod,
            periodEnd: endPeriod,
            basicSalary: basic,
            hra,
            conveyance,
            specialAllowance: special,
            grossEarnings: gross,
            pf,
            esi,
            professionalTax: pt,
            tds,
            lopDeduction,
            totalDeductions,
            netSalary,
            status: 'DRAFT',
          },
        });
        createdCount++;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: caller.id,
        action: 'SYNC_SALARY_DEDUCTIONS',
        entity: 'PayrollRun',
        entityId: `Month: ${month}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced deductions to payroll! Created: ${createdCount}, Updated: ${updatedCount}`,
      createdCount,
      updatedCount,
    });
  } catch (error) {
    console.error('Apply Deductions error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

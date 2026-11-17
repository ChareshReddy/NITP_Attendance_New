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
    const formatted = timeFormatter.format(d); // "HH:MM"
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
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
        employeeProfile: {
          select: {
            department: true,
            designation: true,
            employeeType: true,
            profileImage: true,
            timezone: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = users.map(u => u.id);

    // Fetch attendance records for this month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: [{ date: 'asc' }, { checkInTime: 'asc' }],
    });

    // Group attendance by user
    const attendanceByUser = new Map<string, typeof attendanceRecords>();
    for (const record of attendanceRecords) {
      if (!attendanceByUser.has(record.userId)) {
        attendanceByUser.set(record.userId, []);
      }
      attendanceByUser.get(record.userId)!.push(record);
    }

    let orgTotalCheckIns = 0;
    let orgTotalLateLogins = 0;
    let orgEmployeesWithPenalties = 0;
    let orgTotalPenaltyDays = 0;

    const employeeSummaries = [];
    const allDetailedLogs = [];

    for (const u of users) {
      const records = attendanceByUser.get(u.id) || [];
      const userTz = u.employeeProfile?.timezone || 'Asia/Kolkata';

      // Identify which records are late logins
      const lateRecords: any[] = [];
      const annotatedRecords: any[] = [];

      for (const rec of records) {
        const isStatusLate = rec.status === 'LATE' || rec.status === 'LATE_COMING';
        const isTimeLate = isCheckInLate(rec.checkInTime, userTz);
        const isLate = isStatusLate || isTimeLate;

        if (rec.checkInTime) {
          orgTotalCheckIns++;
        }

        if (isLate) {
          lateRecords.push(rec);
        }
      }

      // Chronologically order and apply 3-late-grace policy
      // 1st, 2nd, 3rd = Grace Allowed (0 deduction)
      // 4th, 5th, ... = Penalty: Half-day holiday/deduction (0.5 day each)
      const lateLogWithPenalties = lateRecords.map((rec, idx) => {
        const sequence = idx + 1;
        const isGrace = sequence <= 3;
        const isPenalty = sequence > 3;
        const penaltyDays = isPenalty ? 0.5 : 0;
        const penaltyLabel = isGrace
          ? `Grace Allowed (${sequence}/3)`
          : `0.5 Day Leave Penalty (Late #${sequence})`;

        return {
          id: rec.id,
          userId: u.id,
          date: rec.date,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          status: rec.status,
          sequence,
          isGrace,
          isPenalty,
          penaltyDays,
          penaltyLabel,
        };
      });

      const totalLateCount = lateRecords.length;
      const graceUsed = Math.min(totalLateCount, 3);
      const graceRemaining = Math.max(0, 3 - totalLateCount);
      const excessLateCount = Math.max(0, totalLateCount - 3);
      const latePenaltyDays = excessLateCount * 0.5;

      orgTotalLateLogins += totalLateCount;
      if (excessLateCount > 0) {
        orgEmployeesWithPenalties++;
        orgTotalPenaltyDays += latePenaltyDays;
      }

      // Map all user records with sequence information if late
      const lateMap = new Map(lateLogWithPenalties.map(l => [l.id, l]));

      for (const rec of records) {
        const lateInfo = lateMap.get(rec.id);
        const entry = {
          id: rec.id,
          userId: u.id,
          userName: u.name,
          userEmail: u.email,
          department: u.employeeProfile?.department || u.team?.name || 'General',
          date: rec.date,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          status: rec.status,
          isLate: Boolean(lateInfo),
          lateSequence: lateInfo?.sequence || null,
          isGrace: lateInfo?.isGrace || false,
          isPenalty: lateInfo?.isPenalty || false,
          penaltyDays: lateInfo?.penaltyDays || 0,
          penaltyLabel: lateInfo?.penaltyLabel || null,
        };
        annotatedRecords.push(entry);
        allDetailedLogs.push(entry);
      }

      employeeSummaries.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.employeeProfile?.department || u.team?.name || 'General',
        designation: u.employeeProfile?.designation || 'Employee',
        teamName: u.team?.name || 'No Team',
        totalRecords: records.length,
        checkInCount: records.filter(r => r.checkInTime !== null).length,
        totalLateCount,
        graceUsed,
        graceRemaining,
        excessLateCount,
        latePenaltyDays,
        hasPenalty: excessLateCount > 0,
        lateRecords: lateLogWithPenalties,
      });
    }

    // Sort detailed logs by date descending, then name
    allDetailedLogs.sort((a, b) => b.date.localeCompare(a.date) || a.userName.localeCompare(b.userName));

    const kpis = {
      month,
      totalEmployees: users.length,
      totalCheckIns: orgTotalCheckIns,
      totalLateLogins: orgTotalLateLogins,
      employeesWithinGrace: users.length - orgEmployeesWithPenalties,
      employeesWithPenalties: orgEmployeesWithPenalties,
      totalPenaltyDays: orgTotalPenaltyDays,
      policy: {
        maxGraceLogins: 3,
        penaltyPerExcessLate: '0.5 day leave (half day)',
      },
    };

    return NextResponse.json({
      success: true,
      month,
      kpis,
      employees: employeeSummaries,
      logs: allDetailedLogs,
    });
  } catch (error) {
    console.error('Login History API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '@/lib/encryption';
import {
  isValidEmail,
  isValidPhone,
  isValidPAN,
  isValidIFSC,
  isValidUAN,
  isValidAccountNumber,
  isValidPassword,
} from '@/lib/validations';

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        team: true,
        manager: {
          select: { id: true, name: true },
        },
        employeeProfile: true,
      },
      orderBy: { name: 'asc' },
    });

    const decryptedUsers = users.map((u) => {
      if (u.employeeProfile) {
        return {
          ...u,
          employeeProfile: {
            ...u.employeeProfile,
            accountNumber: decrypt(u.employeeProfile.accountNumber),
            pan: decrypt(u.employeeProfile.pan),
          },
        };
      }
      return u;
    });

    const teams = await prisma.team.findMany({
      include: {
        teamLeader: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ users: decryptedUsers, teams });
  } catch (error) {
    console.error('Admin Users GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, email, password, role, teamId, managerId,
      dateOfBirth, gender, maritalStatus, nationality, personalEmail, mobileNumber,
      emergencyContact, permanentAddress, currentAddress, dateOfJoining, employeeType,
      department, designation, grade, location, workLocationStatus, businessUnit, hrBusinessPartner,
      employmentStatus, probationPeriod, confirmationDate, workShift, bankName,
      accountNumber, ifsc, pan, uan, professionalEmail, insuranceNumber, pfNumber,
      bankAddress, bankBranch, expectedEndDate, incrementPerks, bloodGroup, profileImage,
      timezone, financialDocuments
    } = body;

    // Validate mandatory fields
    if (!name || !name.trim() || !email || !password || !role || !dateOfJoining || !department || !designation) {
      return NextResponse.json({ error: 'Missing required fields (Name, Email, Password, Role, Date of Joining, Department, Designation)' }, { status: 400 });
    }

    if (!isValidPassword(password, 6)) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid official email address format' }, { status: 400 });
    }

    if (personalEmail && !isValidEmail(personalEmail)) {
      return NextResponse.json({ error: 'Invalid personal email format' }, { status: 400 });
    }

    if (professionalEmail && !isValidEmail(professionalEmail)) {
      return NextResponse.json({ error: 'Invalid professional email format' }, { status: 400 });
    }

    if (mobileNumber && !isValidPhone(mobileNumber)) {
      return NextResponse.json({ error: 'Invalid mobile number format (e.g. 10 digits)' }, { status: 400 });
    }

    if (pan && !isValidPAN(pan)) {
      return NextResponse.json({ error: 'Invalid PAN number format (expected 10 characters e.g. ABCDE1234F)' }, { status: 400 });
    }

    if (ifsc && !isValidIFSC(ifsc)) {
      return NextResponse.json({ error: 'Invalid IFSC code format (expected 11 characters e.g. HDFC0001234)' }, { status: 400 });
    }

    if (uan && !isValidUAN(uan)) {
      return NextResponse.json({ error: 'Invalid UAN number format (expected 12 digits)' }, { status: 400 });
    }

    if (accountNumber && !isValidAccountNumber(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number format (expected 9 to 18 digits)' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        teamId: teamId || null,
        managerId: managerId || null,
        employeeProfile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender || null,
            maritalStatus: maritalStatus || null,
            nationality: nationality || null,
            personalEmail: personalEmail || null,
            mobileNumber: mobileNumber || null,
            emergencyContact: emergencyContact || null,
            permanentAddress: permanentAddress || null,
            currentAddress: currentAddress || null,
            dateOfJoining: new Date(dateOfJoining),
            employeeType: employeeType || 'Full-time',
            department,
            designation,
            grade: grade || null,
            location: location || null,
            workLocationStatus: workLocationStatus || 'Onsite',
            businessUnit: businessUnit || null,
            hrBusinessPartner: hrBusinessPartner || null,
            employmentStatus: employmentStatus || 'Active',
            probationPeriod: probationPeriod ? parseInt(probationPeriod) : null,
            confirmationDate: confirmationDate ? new Date(confirmationDate) : null,
            workShift: workShift || null,
            bankName: bankName || null,
            accountNumber: accountNumber ? encrypt(accountNumber) : null,
            ifsc: ifsc ? ifsc.toUpperCase() : null,
            pan: pan ? encrypt(pan.toUpperCase()) : null,
            panEncrypted: !!pan,
            uan: uan || null,
            professionalEmail: professionalEmail || null,
            insuranceNumber: insuranceNumber || null,
            pfNumber: pfNumber || null,
            bankAddress: bankAddress || null,
            bankBranch: bankBranch || null,
            expectedEndDate: expectedEndDate ? new Date(expectedEndDate) : null,
            incrementPerks: incrementPerks || null,
            bloodGroup: bloodGroup || null,
            profileImage: profileImage || null,
            timezone: timezone || 'Asia/Kolkata',
            financialDocuments: financialDocuments || null,
          }
        }
      },
    });

    // Auto-create initial PerformanceScore for new staff members
    if (newUser.role === 'EMPLOYEE' || newUser.role === 'TL') {
      try {
        await prisma.performanceScore.create({
          data: {
            userId: newUser.id,
            autoScore: 100,
            rating: 'BLUE',
          },
        });
      } catch (scoreErr) {
        console.error('Error auto-creating performance score for new user:', scoreErr);
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser.id,
      },
    });

    // Create Announcement & fan-out Notifications to all active users (except the new employee)
    try {
      // 1. Create Announcement record
      const announcement = await prisma.announcement.create({
        data: {
          type: 'NEW_EMPLOYEE',
          employeeId: newUser.id,
          title: 'New employee joined',
          message: `${name} has joined ${department} as ${designation}.`,
          createdById: session.user.id,
        },
      });

      // 2. Fetch all active users except the newly created employee
      const activeUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          id: { not: newUser.id },
        },
        select: { id: true },
      });

      if (activeUsers.length > 0) {
        const notifPayload = JSON.stringify({
          type: 'NEW_EMPLOYEE',
          title: 'New employee joined',
          body: `${name} has joined ${department} as ${designation}.`,
          employeeId: newUser.id,
          announcementId: announcement.id,
        });

        await prisma.notification.createMany({
          data: activeUsers.map((u) => ({
            userId: u.id,
            message: notifPayload,
            read: false,
          })),
        });
      }
    } catch (notifErr) {
      // Must not block employee creation if notifications fail
      console.error('Failed to create new employee announcement/notifications:', notifErr);
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Admin Users POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'HR_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id, name, email, password, role, teamId, managerId, deactivate,
      dateOfBirth, gender, maritalStatus, nationality, personalEmail, mobileNumber,
      emergencyContact, permanentAddress, currentAddress, dateOfJoining, employeeType,
      department, designation, grade, location, workLocationStatus, businessUnit, hrBusinessPartner,
      employmentStatus, probationPeriod, confirmationDate, workShift, bankName,
      accountNumber, ifsc, pan, uan, professionalEmail, insuranceNumber, pfNumber,
      bankAddress, bankBranch, expectedEndDate, incrementPerks, bloodGroup, profileImage,
      timezone, financialDocuments
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { employeeProfile: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If email is changing, validate format and ensure uniqueness
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Invalid official email address format' }, { status: 400 });
      }

      const duplicate = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 });
    }

    if (password && password.trim() !== '') {
      if (!isValidPassword(password, 6)) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
    }

    if (personalEmail && !isValidEmail(personalEmail)) {
      return NextResponse.json({ error: 'Invalid personal email format' }, { status: 400 });
    }

    if (professionalEmail && !isValidEmail(professionalEmail)) {
      return NextResponse.json({ error: 'Invalid professional email format' }, { status: 400 });
    }

    if (mobileNumber && !isValidPhone(mobileNumber)) {
      return NextResponse.json({ error: 'Invalid mobile number format (e.g. 10 digits)' }, { status: 400 });
    }

    if (pan && !isValidPAN(pan)) {
      return NextResponse.json({ error: 'Invalid PAN number format (expected 10 characters e.g. ABCDE1234F)' }, { status: 400 });
    }

    if (ifsc && !isValidIFSC(ifsc)) {
      return NextResponse.json({ error: 'Invalid IFSC code format (expected 11 characters e.g. HDFC0001234)' }, { status: 400 });
    }

    if (uan && !isValidUAN(uan)) {
      return NextResponse.json({ error: 'Invalid UAN number format (expected 12 digits)' }, { status: 400 });
    }

    if (accountNumber && !isValidAccountNumber(accountNumber)) {
      return NextResponse.json({ error: 'Invalid account number format (expected 9 to 18 digits)' }, { status: 400 });
    }

    // Build User update data
    const userUpdateData: any = {};
    if (name !== undefined) userUpdateData.name = name;
    if (email !== undefined) userUpdateData.email = email.toLowerCase();
    if (password && password.trim() !== '') {
      userUpdateData.passwordHash = bcrypt.hashSync(password, 10);
    }
    if (role !== undefined) userUpdateData.role = role;
    if (teamId !== undefined) userUpdateData.teamId = teamId || null;
    if (managerId !== undefined) userUpdateData.managerId = managerId || null;
    if (deactivate !== undefined) {
      userUpdateData.isActive = !deactivate;
    }

    // Build EmployeeProfile update/create data
    const profileData: any = {};
    if (dateOfBirth !== undefined) profileData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) profileData.gender = gender || null;
    if (maritalStatus !== undefined) profileData.maritalStatus = maritalStatus || null;
    if (nationality !== undefined) profileData.nationality = nationality || null;
    if (personalEmail !== undefined) profileData.personalEmail = personalEmail || null;
    if (mobileNumber !== undefined) profileData.mobileNumber = mobileNumber || null;
    if (emergencyContact !== undefined) profileData.emergencyContact = emergencyContact || null;
    if (permanentAddress !== undefined) profileData.permanentAddress = permanentAddress || null;
    if (currentAddress !== undefined) profileData.currentAddress = currentAddress || null;
    if (dateOfJoining !== undefined && dateOfJoining !== '') profileData.dateOfJoining = new Date(dateOfJoining);
    if (employeeType !== undefined) profileData.employeeType = employeeType || 'Full-time';
    if (department !== undefined) profileData.department = department;
    if (designation !== undefined) profileData.designation = designation;
    if (grade !== undefined) profileData.grade = grade || null;
    if (location !== undefined) profileData.location = location || null;
    if (workLocationStatus !== undefined) profileData.workLocationStatus = workLocationStatus || null;
    if (businessUnit !== undefined) profileData.businessUnit = businessUnit || null;
    if (hrBusinessPartner !== undefined) profileData.hrBusinessPartner = hrBusinessPartner || null;
    if (employmentStatus !== undefined) profileData.employmentStatus = employmentStatus || 'Active';
    if (probationPeriod !== undefined) profileData.probationPeriod = probationPeriod ? parseInt(probationPeriod) : null;
    if (confirmationDate !== undefined) profileData.confirmationDate = confirmationDate ? new Date(confirmationDate) : null;
    if (workShift !== undefined) profileData.workShift = workShift || null;
    if (bankName !== undefined) profileData.bankName = bankName || null;
    if (ifsc !== undefined) profileData.ifsc = ifsc ? ifsc.toUpperCase() : null;
    if (uan !== undefined) profileData.uan = uan || null;
    if (professionalEmail !== undefined) profileData.professionalEmail = professionalEmail || null;
    if (insuranceNumber !== undefined) profileData.insuranceNumber = insuranceNumber || null;
    if (pfNumber !== undefined) profileData.pfNumber = pfNumber || null;
    if (bankAddress !== undefined) profileData.bankAddress = bankAddress || null;
    if (bankBranch !== undefined) profileData.bankBranch = bankBranch || null;
    if (expectedEndDate !== undefined) profileData.expectedEndDate = expectedEndDate ? new Date(expectedEndDate) : null;
    if (incrementPerks !== undefined) profileData.incrementPerks = incrementPerks || null;
    if (bloodGroup !== undefined) profileData.bloodGroup = bloodGroup || null;
    if (profileImage !== undefined) profileData.profileImage = profileImage || null;
    if (timezone !== undefined) profileData.timezone = timezone || 'Asia/Kolkata';
    if (financialDocuments !== undefined) profileData.financialDocuments = financialDocuments || null;

    // Sensitive field updates: Only encrypt and save if non-empty and not a masked placeholder
    if (accountNumber && accountNumber.trim() !== '' && !accountNumber.includes('••••')) {
      profileData.accountNumber = encrypt(accountNumber);
    }
    if (pan && pan.trim() !== '' && !pan.includes('••••')) {
      profileData.pan = encrypt(pan.toUpperCase());
      profileData.panEncrypted = true;
    }

    const hasProfileUpdates = Object.keys(profileData).length > 0;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...userUpdateData,
        ...(hasProfileUpdates ? {
          employeeProfile: {
            upsert: {
              create: {
                ...profileData,
                dateOfJoining: profileData.dateOfJoining || new Date(),
                department: profileData.department || 'General',
                designation: profileData.designation || 'Staff',
              },
              update: profileData,
            },
          },
        } : {}),
      },
      include: {
        employeeProfile: true,
        team: true,
        manager: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: deactivate !== undefined ? (deactivate ? 'DEACTIVATE_USER' : 'REACTIVATE_USER') : 'UPDATE_USER',
        entity: 'User',
        entityId: id,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin Users PUT error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

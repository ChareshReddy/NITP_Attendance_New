import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { isValidEmail } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email format' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return NextResponse.json({ success: true, message: 'If the email exists, a reset token has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Clean up old reset tokens
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    console.log(`[DEMO PASSWORD RESET] Token for ${user.email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a reset token has been sent.',
      demoToken: token, // Returned in JSON for testing convenience
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isValidEmail, isValidPassword } from '@/lib/validations';

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Reset Password States
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // General Status States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Remembered username on mount
  useEffect(() => {
    const saved = localStorage.getItem('nitp_remembered_user');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  // Clear messages on view changes
  useEffect(() => {
    setError('');
    setSuccess('');
    setFormErrors({});
  }, [view]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: Record<string, string> = {};

    if (!username.trim()) {
      errors.username = 'Employee ID or Official Email is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please fill in all required credentials.');
      return;
    }
    setFormErrors({});
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: username.trim(),
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'DEACTIVATED' || res.error.includes('DEACTIVATED')) {
          throw new Error('Account is deactivated. Please contact HR/Admin.');
        }
        throw new Error('Invalid Employee ID or password');
      }

      if (rememberMe) {
        localStorage.setItem('nitp_remembered_user', username.trim());
      } else {
        localStorage.removeItem('nitp_remembered_user');
      }

      // Fetch user session to determine role redirect
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;

      if (role === 'HR_ADMIN') {
        router.push('/admin');
      } else if (role === 'TL') {
        router.push('/employee');
      } else if (role === 'EMPLOYEE') {
        router.push('/employee');
      } else {
        throw new Error('Unauthorized role');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: Record<string, string> = {};

    if (!forgotEmail.trim()) {
      errors.forgotEmail = 'Official Email Address is required.';
    } else if (!isValidEmail(forgotEmail.trim())) {
      errors.forgotEmail = 'Please enter a valid email format (e.g. name@domain.com).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please provide a valid registered email address.');
      return;
    }
    setFormErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setForgotSuccess(true);
      if (data.demoToken) {
        setDemoToken(data.demoToken);
        setResetToken(data.demoToken);
      }
      setSuccess('If the account exists, a reset token has been generated.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: Record<string, string> = {};

    if (!resetToken.trim()) {
      errors.resetToken = 'Reset token is required.';
    }
    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (!isValidPassword(newPassword)) {
      errors.newPassword = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError('Please correct the validation errors below.');
      return;
    }
    setFormErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      setSuccess('Password reset successfully. Please log in.');
      setView('login');
      setPassword('');
      setDemoToken('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden flex flex-col md:flex-row bg-bg-page text-text font-sans select-none">
      
      {/* =========================================
          LEFT BRAND PANEL (Navy Blue with Dots Decor)
          ========================================= */}
      <aside className="relative w-full md:w-[52%] lg:w-[54%] h-auto md:h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 lg:p-14 overflow-hidden shrink-0 bg-navy-900 bg-gradient-to-br from-navy-900 via-navy-700 to-blue-600">
        
        {/* Subtle Dots & Glow Pattern Background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.15) 0%, transparent 45%),
              radial-gradient(circle at 82% 82%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
              radial-gradient(rgba(255, 255, 255, 0.22) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '100% 100%, 100% 100%, 28px 28px',
          }}
        />

        {/* Top Header: Next IT Point Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center bg-card px-2.5 py-1 rounded-xl shadow-xs border border-border">
            <img 
              src="/logo.png" 
              alt="Next IT Point Logo" 
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </div>

        {/* Center Content: Attendance & Time Tracker Vector Art & Heading */}
        <div className="relative z-10 my-auto py-6 md:py-0 flex flex-col items-center text-center max-w-xl mx-auto">
          
          {/* Custom Attendance Portal Illustration */}
          <div className="w-full max-w-[340px] sm:max-w-[400px] mb-6 drop-shadow-2xl">
            <svg viewBox="0 0 460 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="portal-card-grad" x1="0" y1="0" x2="400" y2="240" gradientUnits="userSpaceOnUse">
                  <stop stopColor="var(--card)" />
                  <stop offset="1" stopColor="var(--blue-50)" />
                </linearGradient>
                <linearGradient id="shield-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="var(--status-success)" />
                  <stop offset="1" stopColor="var(--status-success)" />
                </linearGradient>
                <linearGradient id="clock-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="var(--status-warning)" />
                  <stop offset="1" stopColor="var(--status-warning)" />
                </linearGradient>
                <linearGradient id="checkin-btn-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="var(--blue-600)" />
                  <stop offset="1" stopColor="var(--navy-700)" />
                </linearGradient>
                <filter id="soft-ground-shadow" x="-30%" y="-30%" width="160%" height="180%">
                  <feGaussianBlur stdDeviation="16" />
                </filter>
                <filter id="card-shadow" x="-20" y="-10" width="460" height="260" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="var(--navy-900)" floodOpacity="0.22" />
                </filter>
                <filter id="icon-shadow" x="-10" y="-10" width="80" height="80" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="var(--navy-900)" floodOpacity="0.25" />
                </filter>
                <clipPath id="avatar-circle-clip">
                  <circle cx="358" cy="43" r="11" />
                </clipPath>
                <clipPath id="title-pill-clip">
                  <rect x="172" y="32" width="116" height="22" rx="11" />
                </clipPath>
              </defs>

              {/* Back (layered) card - drifts with anim-float-back in opposite direction */}
              <g className="anim-float-back">
                {/* Background Stacked Card 1 */}
                <rect x="52" y="24" width="310" height="180" rx="18" fill="var(--card)" fillOpacity="0.25" transform="rotate(-4 52 24)" />
                {/* Background Stacked Card 2 */}
                <rect x="70" y="16" width="300" height="180" rx="18" fill="var(--card)" fillOpacity="0.45" transform="rotate(2 70 16)" />
              </g>

              {/* Dynamic Soft Shadow under Front Card - scales and fades as front card rises */}
              <rect
                x="80"
                y="42"
                width="300"
                height="180"
                rx="22"
                fill="var(--navy-900)"
                filter="url(#soft-ground-shadow)"
                className="anim-card-shadow"
              />

              {/* Front Card Layer (moves up/down 10px, slight rotation, 6s ease-in-out) */}
              <g className="anim-float-front">
                {/* Main Attendance Dashboard Card */}
                <g filter="url(#card-shadow)">
                  <rect x="68" y="22" width="324" height="196" rx="18" fill="url(#portal-card-grad)" stroke="var(--border)" strokeWidth="1" />
                  
                  {/* Header bar of the Card */}
                  <rect x="68" y="22" width="324" height="42" rx="18" fill="var(--navy-900)" />
                  <rect x="68" y="50" width="324" height="14" fill="var(--navy-900)" />
                  
                  {/* Window Dots */}
                  <circle cx="92" cy="43" r="4.5" fill="var(--status-danger)" />
                  <circle cx="106" cy="43" r="4.5" fill="var(--status-warning)" />
                  <circle cx="120" cy="43" r="4.5" fill="var(--status-success)" />
                  
                  {/* Center Pill: NITP Portal */}
                  <rect x="172" y="32" width="116" height="22" rx="11" fill="var(--card)" />
                  <g clipPath="url(#title-pill-clip)">
                    <text
                      x="230"
                      y="46.5"
                      textAnchor="middle"
                      fill="var(--navy-900)"
                      fontSize="10.5"
                      fontWeight="700"
                      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      style={{ letterSpacing: '-0.01em', userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      Attendance Portal
                    </text>
                  </g>

                  {/* Dummy profile icon (22px wide on var(--blue-400) circle with var(--status-success) online dot) */}
                  <g>
                    {/* Light blue base circle (var(--blue-400)) with thin white border */}
                    <circle cx="358" cy="43" r="11" fill="var(--blue-400)" stroke="var(--card)" strokeWidth="1" />
                    
                    {/* White person silhouette (head and shoulders) */}
                    <g clipPath="url(#avatar-circle-clip)">
                      {/* Head */}
                      <circle cx="358" cy="39.2" r="3.6" fill="var(--card)" />
                      {/* Shoulders */}
                      <path d="M349.5 52.5 C349.5 47.8 353 45.8 358 45.8 C363 45.8 366.5 47.8 366.5 52.5 Z" fill="var(--card)" />
                    </g>

                    {/* Thin white border ring */}
                    <circle cx="358" cy="43" r="11" fill="none" stroke="var(--card)" strokeWidth="1" />

                    {/* Tiny green online-status dot (var(--status-success)) at bottom right */}
                    <circle cx="366" cy="50.5" r="3" fill="var(--status-success)" stroke="var(--navy-900)" strokeWidth="1.2" />
                  </g>

                  {/* Sub-Header Stats Row */}
                  <rect x="88" y="76" width="70" height="7" rx="3.5" fill="var(--text-disabled)" />
                  <rect x="88" y="88" width="120" height="13" rx="4" fill="var(--navy-900)" />

                  {/* Today's Punch Time Stamp Badge */}
                  <rect x="238" y="74" width="134" height="30" rx="8" fill="var(--blue-50)" stroke="var(--border)" strokeWidth="1" />
                  <circle cx="254" cy="89" r="6" fill="var(--status-success)" />
                  <rect x="268" y="84" width="60" height="5.5" rx="2.5" fill="var(--navy-900)" />
                  <rect x="268" y="92" width="40" height="4" rx="2" fill="var(--text-muted)" />

                  {/* Divider Line */}
                  <line x1="88" y1="116" x2="372" y2="116" stroke="var(--border)" strokeWidth="1" />

                  {/* Weekly Bar Chart Preview */}
                  <rect x="88" y="132" width="14" height="44" rx="4" fill="var(--blue-100)" />
                  <rect x="110" y="124" width="14" height="52" rx="4" fill="var(--blue-400)" />
                  <rect x="132" y="138" width="14" height="38" rx="4" fill="var(--blue-100)" />
                  <rect x="154" y="120" width="14" height="56" rx="4" fill="var(--blue-600)" />
                  <rect x="176" y="128" width="14" height="48" rx="4" fill="var(--navy-700)" />
                  
                  {/* Check In Action Box */}
                  <g filter="url(#card-shadow)">
                    <rect x="234" y="130" width="138" height="44" rx="10" fill="url(#checkin-btn-grad)" />
                    <rect x="254" y="146" width="60" height="6" rx="3" fill="var(--card)" />
                    <path d="M336 148l4 4 4-4" stroke="var(--card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="340" cy="152" r="9" stroke="var(--card)" strokeWidth="1.5" strokeOpacity="0.5" />
                  </g>

                  {/* Status Indicator Bar at bottom */}
                  <rect x="88" y="190" width="80" height="5" rx="2.5" fill="var(--border)" />
                  <rect x="290" y="190" width="82" height="5" rx="2.5" fill="var(--border)" />
                </g>

                {/* Overlapping Floating Shield Badge (Top Right) */}
                <g filter="url(#icon-shadow)">
                  <path d="M380 18c14 0 24-7 24-7v22c0 20-14 33-24 38-10-5-24-18-24-38V11s10 7 24 7z" fill="url(#shield-grad)" />
                  <path d="M372 39l5 5 12-12" stroke="var(--card)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* Overlapping Floating Clock Badge (Bottom Left) */}
                <g filter="url(#icon-shadow)">
                  <circle cx="58" cy="188" r="26" fill="url(#clock-grad)" stroke="var(--card)" strokeWidth="3" />
                  <circle cx="58" cy="188" r="22" fill="var(--status-warning)" fillOpacity="0.2" />
                  {/* Clock Hands */}
                  <circle cx="58" cy="188" r="3" fill="var(--card)" />
                  <path d="M58 174v14l9 6" stroke="var(--card)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Next IT Point Attendance Portal
          </h1>
          <p className="mt-2.5 text-xs sm:text-sm text-blue-50 max-w-md font-normal leading-relaxed">
            Mark daily attendance, submit work timesheets, regularise punches, and manage team requests in real-time.
          </p>
        </div>

        {/* Footer: Legal Notice */}
        <div className="relative z-10 text-[11px] sm:text-xs text-blue-100 font-medium">
          &copy; {new Date().getFullYear()} Next IT Point Intellectual Services Pvt. Ltd.
        </div>
      </aside>


      {/* =========================================
          RIGHT FORM PANE (Dark Sleek Glassmorphism Card)
          ========================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 lg:p-12 overflow-y-auto bg-bg-page relative">
        
        {/* Subtle Ambient Background Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-[420px] relative z-10">
          
          {/* Frosted Modern Card Container */}
          <div className="relative bg-card border border-border rounded-[24px] p-7 sm:p-9 shadow-xl overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3.5px] before:bg-blue-600">
            
            {/* Lock Icon Badge */}
            <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>

            <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
              {view === 'login' && 'Welcome back'}
              {view === 'forgot' && 'Reset your password'}
              {view === 'reset' && 'Create new password'}
            </h2>
            <p className="text-xs sm:text-[13px] text-text-muted mt-1 mb-6">
              {view === 'login' && 'Sign in to your attendance portal.'}
              {view === 'forgot' && 'Enter your email to receive a password reset token.'}
              {view === 'reset' && 'Provide your reset token and your new password.'}
            </p>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-4 rounded-xl bg-status-danger-bg border border-status-danger/30 p-3 text-xs font-semibold text-status-danger-text flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-status-danger shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {success && (
              <div className="mb-4 rounded-xl bg-status-success-bg border border-status-success/30 p-3 text-xs font-semibold text-status-success-text flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="leading-snug">{success}</p>
                  {demoToken && (
                    <div className="mt-2 p-2 bg-blue-50 border border-border rounded font-mono text-xs text-navy-900 select-all break-all">
                      Demo Token: {demoToken}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 1: LOGIN FORM */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                
                {/* Employee ID / Username */}
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Employee ID <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (formErrors.username) setFormErrors(prev => ({ ...prev, username: '' }));
                      }}
                      placeholder="e.g. NITP0021 or rohini.hr@nextitpoint.com"
                      autoComplete="username"
                      className={`w-full bg-card border ${formErrors.username ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'} focus:ring-2 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-text placeholder:text-text-disabled outline-none transition-all`}
                    />
                  </div>
                  {formErrors.username && (
                    <p className="mt-1 text-[11px] text-status-danger font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {formErrors.username}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Password <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password) setFormErrors(prev => ({ ...prev, password: '' }));
                      }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className={`w-full bg-card border ${formErrors.password ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'} focus:ring-2 rounded-xl py-2.5 pl-10 pr-10 text-sm text-text placeholder:text-text-disabled outline-none transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-navy-900 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="mt-1 text-[11px] text-status-danger font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {formErrors.password}
                    </p>
                  )}
                  {/* Forgot Password link directly below password input */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-xs font-medium text-blue-600 hover:text-navy-700 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="pt-0.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-navy-900 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-input-border bg-card text-blue-600 focus:ring-2 focus:ring-blue-600/20 cursor-pointer accent-blue-600"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-navy-700 shadow-md active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center btn-primary"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            )}

            {/* VIEW 2: FORGOT PASSWORD */}
            {view === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (formErrors.forgotEmail) setFormErrors(prev => ({ ...prev, forgotEmail: '' }));
                      }}
                      placeholder="e.g. employee@nextitpoint.com"
                      className={`w-full bg-card border ${formErrors.forgotEmail ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'} focus:ring-2 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-text placeholder:text-text-disabled outline-none transition-all`}
                    />
                  </div>
                  {formErrors.forgotEmail && (
                    <p className="mt-1 text-[11px] text-status-danger font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {formErrors.forgotEmail}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-navy-700 shadow-md transition-all disabled:opacity-50 cursor-pointer btn-primary"
                  >
                    {loading ? 'Generating Token...' : 'Generate Reset Token'}
                  </button>

                  {forgotSuccess && (
                    <button
                      type="button"
                      onClick={() => setView('reset')}
                      className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-blue-600 bg-card hover:bg-blue-50 border border-blue-600 transition-all cursor-pointer btn-secondary"
                    >
                      Go to Reset Password
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-xs font-semibold text-text-muted hover:text-navy-900 text-center mt-2 cursor-pointer transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* VIEW 3: RESET PASSWORD */}
            {view === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    Reset Token <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => {
                      setResetToken(e.target.value);
                      if (formErrors.resetToken) setFormErrors(prev => ({ ...prev, resetToken: '' }));
                    }}
                    placeholder="Paste your reset token"
                    className={`w-full bg-card border ${formErrors.resetToken ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'} focus:ring-2 rounded-xl py-2.5 px-3.5 text-sm text-text placeholder:text-text-disabled outline-none font-mono transition-all`}
                  />
                  {formErrors.resetToken && (
                    <p className="mt-1 text-[11px] text-status-danger font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {formErrors.resetToken}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-900 mb-1.5">
                    New Password <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (formErrors.newPassword) setFormErrors(prev => ({ ...prev, newPassword: '' }));
                      }}
                      placeholder="Min. 6 characters"
                      className={`w-full bg-card border ${formErrors.newPassword ? 'border-status-danger focus:ring-status-danger/20' : 'border-input-border focus:border-blue-600 focus:ring-blue-600/20'} focus:ring-2 rounded-xl py-2.5 pl-10 pr-3.5 text-sm text-text placeholder:text-text-disabled outline-none transition-all`}
                    />
                  </div>
                  {formErrors.newPassword && (
                    <p className="mt-1 text-[11px] text-status-danger font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {formErrors.newPassword}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-navy-700 shadow-md transition-all disabled:opacity-50 cursor-pointer btn-primary"
                  >
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('login')}
                    className="text-xs font-semibold text-text-muted hover:text-navy-900 text-center mt-2 cursor-pointer transition-colors"
                  >
                    Cancel & Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Footer Support Hints */}
            <div className="mt-6 pt-5 border-t border-border text-center text-[11px] text-text-muted space-y-1">
              <p>HR staff: sign in with your administrator credentials.</p>
              <p>
                Need help? Contact HR at{' '}
                <a href="mailto:hr@nextitpoint.com" className="text-blue-600 hover:text-navy-700 hover:underline font-semibold">
                  hr@nextitpoint.com
                </a>
              </p>
            </div>

          </div>
        </div>
      </main>

    </div>
  );
}

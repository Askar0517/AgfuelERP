import React, { useState } from 'react';
import {
  Lock,
  User,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ChevronLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { api, setAuthToken } from '../api/client';
import { AuthUser } from '../types';
import { useNotification } from '../context/NotificationContext';
import { validateEmail } from '../utils/validation';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

type AuthMode = 'login' | 'forgot' | 'reset';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [mode, setMode] = useState<AuthMode>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [capturedResetToken, setCapturedResetToken] = useState<string | null>(null);

  // Reset password state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (typeof document !== 'undefined') {
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('petropulse_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('petropulse_theme', 'light');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    if (!usernameOrEmail.trim()) {
      errors.usernameOrEmail = 'Username or email address is required.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const res = await api.login(usernameOrEmail.trim(), password);
      setAuthToken(res.token);
      notifySuccess('Welcome to AG Fuels ERP', `Authenticated as ${res.user.name} (${res.user.role}).`);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      const msg = err.message || 'Invalid username/email or password.';
      setFormError(msg);
      notifyError('Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const emailErr = validateEmail(forgotEmail);
    if (emailErr) {
      setFieldErrors({ forgotEmail: emailErr });
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotSubmitted(true);
      if (res.resetToken) {
        setCapturedResetToken(res.resetToken);
        setResetToken(res.resetToken);
      }
      notifyInfo(
        'Password Reset Issued',
        'If an account exists with this email, security instructions have been generated.'
      );
    } catch (err: any) {
      setFormError(err.message || 'Unable to process reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: Record<string, string> = {};

    if (!resetToken.trim()) {
      errors.resetToken = 'Valid reset token is required.';
    }
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      await api.resetPassword({
        token: resetToken.trim(),
        newPassword,
      });
      notifySuccess('Password Updated', 'Your password has been changed. Please sign in with your new credentials.');
      setMode('login');
      setPassword('');
      setUsernameOrEmail(forgotEmail);
      setForgotSubmitted(false);
      setCapturedResetToken(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password.';
      setFormError(msg);
      notifyError('Reset Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo accounts for fast evaluation
  const demoAccounts = [
    { label: 'Admin (Owner)', user: 'admin', role: 'OWNER', pass: 'PetroPulse@123' },
    { label: 'Station Manager', user: 'rsharma', role: 'MANAGER', pass: 'PetroPulse@123' },
    { label: 'Attendant', user: 'skumar', role: 'ATTENDANT', pass: 'PetroPulse@123' },
    { label: 'Cashier', user: 'rpatel', role: 'CASHIER', pass: 'PetroPulse@123' },
    { label: 'Auditor', user: 'adeshmukh', role: 'AUDITOR', pass: 'PetroPulse@123' },
  ];

  const fillDemo = (user: string, pass: string) => {
    setUsernameOrEmail(user);
    setPassword(pass);
    setFieldErrors({});
    setFormError(null);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center bg-[#ECEEF2] dark:bg-slate-950 p-3 sm:p-5 lg:p-6 font-sans antialiased selection:bg-[#12544F]/15 selection:text-[#12544F] overflow-y-auto lg:overflow-hidden">
      
      {/* Centered Floating Dual-Panel Card (Reference Image Layout) */}
      <div className="w-full max-w-[440px] sm:max-w-lg lg:max-w-[1040px] xl:max-w-[1100px] max-h-full lg:max-h-[min(620px,94vh)] bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[32px] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.12)] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 lg:p-6 flex flex-col lg:flex-row items-stretch gap-4 lg:gap-6 transition-all duration-300">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: FORM & BRANDING (PREVIOUS CONTENT)              */}
        {/* ============================================================ */}
        <div className="w-full lg:w-[48%] flex flex-col justify-between px-1 sm:px-3 lg:px-4 py-1 sm:py-2">
          
          <div>
            {/* 1. AG Fuels ERP Logo & Brand Name + Theme Toggle */}
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="AG Fuels ERP Logo"
                  className="h-8 sm:h-9 w-auto object-contain drop-shadow-xs"
                />
                <div>
                  <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
                    AG Fuels <span className="text-[#12544F] dark:text-emerald-400">ERP</span>
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                    Forecourt Management Suite
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
              </button>
            </div>

            {/* Form Error Alert */}
            {formError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 p-3 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{formError}</div>
              </div>
            )}

            {/* ============================================================ */}
            {/* MODE: LOGIN FORM */}
            {/* ============================================================ */}
            {mode === 'login' && (
              <div>
                {/* 2 & 3: Heading & Supporting Text */}
                <div className="mb-3 sm:mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Welcome back
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                    Manage your fuel station operations with confidence.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                  {/* 4. Email/Username/Phone Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number, Username, or Email
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => {
                          setUsernameOrEmail(e.target.value);
                          if (fieldErrors.usernameOrEmail) {
                            setFieldErrors((p) => ({ ...p, usernameOrEmail: '' }));
                          }
                        }}
                        placeholder="e.g. 9876543210, admin, or email"
                        className={`w-full rounded-xl border bg-white dark:bg-slate-800 py-2.5 pl-9 pr-3.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition focus:outline-none ${
                          fieldErrors.usernameOrEmail
                            ? 'border-rose-500 ring-2 ring-rose-500/10'
                            : 'border-slate-200 dark:border-slate-700 focus:border-[#12544F] focus:ring-2 focus:ring-[#12544F]/15'
                        }`}
                      />
                    </div>
                    {fieldErrors.usernameOrEmail && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">
                        {fieldErrors.usernameOrEmail}
                      </p>
                    )}
                  </div>

                  {/* 5. Password/PIN Input with Show/Hide Toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password or Security PIN
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((p) => ({ ...p, password: '' }));
                          }
                        }}
                        placeholder="Enter 4-6 digit PIN or password"
                        className={`w-full rounded-xl border bg-white dark:bg-slate-800 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition focus:outline-none ${
                          fieldErrors.password
                            ? 'border-rose-500 ring-2 ring-rose-500/10'
                            : 'border-slate-200 dark:border-slate-700 focus:border-[#12544F] focus:ring-2 focus:ring-[#12544F]/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 text-[11px] text-rose-500 font-medium">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* 6 & 7: Remember Me and Forgot Password */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-[#12544F] focus:ring-[#12544F]"
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setFormError(null);
                        setFieldErrors({});
                      }}
                      className="text-xs text-[#12544F] dark:text-emerald-400 hover:text-[#0E433F] font-semibold transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* 8. Primary "Sign in" Button in Brand Deep Teal #12544F */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] active:scale-[0.99] py-3 text-xs font-bold text-white shadow-sm transition duration-150 cursor-pointer disabled:opacity-50 mt-3"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Demo Credentials Bar for fast role evaluation */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Sparkles className="h-3 w-3 text-[#12544F] dark:text-emerald-400" />
                      Evaluation Credentials
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">PetroPulse@123</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.user}
                        type="button"
                        onClick={() => fillDemo(acc.user, acc.pass)}
                        className={`rounded-lg px-2 py-1 text-[11px] font-semibold border transition cursor-pointer ${
                          usernameOrEmail === acc.user
                            ? 'border-[#12544F] bg-[#12544F]/10 text-[#12544F] dark:text-emerald-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* MODE: FORGOT PASSWORD */}
            {/* ============================================================ */}
            {mode === 'forgot' && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                    }}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Reset Password
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter registered email to issue recovery token
                    </p>
                  </div>
                </div>

                {!forgotSubmitted ? (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Account Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            if (fieldErrors.forgotEmail) {
                              setFieldErrors((p) => ({ ...p, forgotEmail: '' }));
                            }
                          }}
                          placeholder="e.g. user@petropulse.in"
                          className={`w-full rounded-xl border bg-white dark:bg-slate-800 py-2.5 pl-9 pr-3.5 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 transition focus:outline-none ${
                            fieldErrors.forgotEmail
                              ? 'border-rose-500 ring-2 ring-rose-500/10'
                              : 'border-slate-200 dark:border-slate-700 focus:border-[#12544F] focus:ring-2 focus:ring-[#12544F]/15'
                          }`}
                        />
                      </div>
                      {fieldErrors.forgotEmail && (
                        <p className="mt-1 text-[11px] text-rose-500 font-medium">
                          {fieldErrors.forgotEmail}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] py-3 text-xs font-bold text-white shadow-sm transition duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Sending Instructions...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Password Reset Token</span>
                          <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Reset Instructions Dispatched</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        A single-use token was issued for <strong className="font-semibold">{forgotEmail}</strong>.
                      </p>
                      {capturedResetToken && (
                        <div className="mt-1.5 p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 select-all break-all">
                          <span className="text-slate-400 block text-[10px] font-sans">Single-Use Token:</span>
                          {capturedResetToken}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-sm bg-[#12544F] hover:bg-[#0E433F] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Set New Password</span>
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* MODE: RESET PASSWORD */}
            {/* ============================================================ */}
            {mode === 'reset' && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      Set New Password
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter the token and choose your new password
                    </p>
                  </div>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Reset Token
                    </label>
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste single-use token"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#12544F] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#12544F] focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#12544F] focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-xl py-3 text-xs font-bold text-white shadow-sm bg-[#12544F] hover:bg-[#0E433F] transition cursor-pointer disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Confirm & Update Password</span>
                        <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Subtle Footer Text */}
          <div className="mt-4 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400 font-medium">
              Fuel operations. Simplified.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: ENCLOSED VISUAL PANEL (PREVIOUS CONTENT)       */}
        {/* ============================================================ */}
        <div className="w-full lg:w-[52%] hidden lg:flex rounded-[20px] sm:rounded-[24px] overflow-hidden bg-gradient-to-br from-[#FAF7F2] via-[#F4EFE6] to-[#EAE3D6] dark:from-slate-800/90 dark:via-slate-800 dark:to-slate-900 border border-[#E7DFD1] dark:border-slate-700/80 p-4 sm:p-5 flex-col justify-between relative shadow-xs">
          
          {/* Subtle decorative glow circles */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#12544F]/5 dark:bg-emerald-500/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#12544F]/5 dark:bg-emerald-500/5 blur-2xl pointer-events-none" />

          {/* Top Operational Header */}
          <div className="relative z-10 mb-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#12544F]/10 dark:bg-emerald-950/60 border border-[#12544F]/20 dark:border-emerald-800/50 text-[#12544F] dark:text-emerald-300 text-[11px] font-semibold mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#12544F] dark:bg-emerald-400 animate-pulse" />
              <span>Forecourt Metrology & Station Master</span>
            </div>
            <h1 className="text-lg xl:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              Intelligent Multi-Station Forecourt ERP
            </h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2">
              Automated dispenser metering, real-time underground tank dips, and legal metrology reconciliation across your entire station network.
            </p>
          </div>

          {/* Central High-Quality Landscape Illustration Asset */}
          <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center my-1.5 overflow-hidden">
            <div className="h-full max-h-[290px] w-auto max-w-full rounded-xl overflow-hidden border border-[#E5DEC7] dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900 transition hover:shadow-md duration-300 flex items-center justify-center">
              <img
                src="/assets/ag-fuels-station-overview.jpg"
                alt="AG Fuels ERP Smart Station & Underground Tank Monitoring"
                className="max-h-full max-w-full w-auto h-auto object-contain bg-white"
              />
            </div>
          </div>

          {/* Bottom Operational Features Bar */}
          <div className="relative z-10 pt-3 border-t border-[#E5DEC7] dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold">Dispenser Metrology Validated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#12544F] dark:bg-emerald-400" />
              <span className="font-semibold">UST Interstitial Level Probes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold">Continuous POS Meter Sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

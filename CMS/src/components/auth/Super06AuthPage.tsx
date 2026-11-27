'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken, clearToken } from '@/src/lib/api';
import { TurnstileWidget, TurnstileWidgetRef } from '@/src/components/security/turnstile-widget';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { useAppConfig, applyThemeVariables } from '@/src/lib/useAppConfig';
import { useTenantBranding } from '@/src/lib/useTenantBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function Super06AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-light dark:bg-slate-950">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <Super06AuthContent />
    </Suspense>
  );
}

function Super06AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { appConfig } = useAppConfig();
  const { branding } = useTenantBranding();

  const searchMode = searchParams.get('mode') as 'signin' | 'forgot' | 'reset' | null;
  const searchToken = searchParams.get('token') || undefined;
  const searchEmail = searchParams.get('email') || undefined;

  const [mode, setMode] = useState<'signin' | 'forgot' | 'reset'>(
    searchToken ? 'reset' : searchMode ?? 'signin'
  );
  const [resetToken, setResetToken] = useState(searchToken || '');
  const [email, setEmail] = useState(searchEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // 2FA Verification Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMethod, setMfaMethod] = useState<'TOTP' | 'EMAIL_OTP'>('EMAIL_OTP');
  const [mfaMaskedEmail, setMfaMaskedEmail] = useState('');
  const [mfaDevOtp, setMfaDevOtp] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      process.env.NODE_ENV !== 'production');

  useEffect(() => {
    if (searchToken) {
      setResetToken(searchToken);
      setMode('reset');
    }
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchToken, searchEmail]);

  const logoLightUrl = appConfig?.logoLightUrl || branding?.logoUrl || '/logo.webp';
  const logoDarkUrl = appConfig?.logoDarkUrl || branding?.logoDark || '/white-logo.webp';
  const appName = appConfig?.appName || branding?.name || 'Master HRMS';
  const rawFooter = appConfig?.footerText || branding?.footerText;
  const footerText = rawFooter || `© ${new Date().getFullYear()} Master HRMS. All rights reserved.`;

  useEffect(() => {
    const activeColor = branding?.primaryColor || appConfig?.primaryColor || '#0d6efd';
    applyThemeVariables(activeColor);
  }, [branding?.primaryColor, appConfig?.primaryColor]);

  // Redirect immediately if already signed in as super_admin
  useEffect(() => {
    (async () => {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('hrms_auth_token') || localStorage.getItem('auth_token')
          : null;
      if (token) {
        try {
          const user = await api.get('/auth/me');
          if (user?.roles?.includes('super_admin')) {
            router.replace('/super');
            return;
          }
        } catch {
          // Stale token — stay on login page
        }
      }
      setChecking(false);
    })();
  }, [router]);

  const handleTurnstileSuccess = useCallback((t: string) => {
    setTurnstileToken(t);
    setTurnstileReady(true);
    setTurnstileError(false);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
    setTurnstileReady(false);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileReady(false);
    setTurnstileError(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      const msg = 'Please enter your Super Admin email and password.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // In production, wait for Turnstile unless widget errored (backend enforces fail-closed)
    if (!isLocalDev && !turnstileToken && !turnstileError) {
      const msg = 'Please wait for browser security verification to complete.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/super-login', {
        email: cleanEmail,
        password,
        portal: 'super',
        turnstileToken: turnstileToken || undefined,
      });

      if (res.requires2FA) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken || '');
        setMfaMethod(res.twoFactorMethod === 'TOTP' ? 'TOTP' : 'EMAIL_OTP');
        setMfaMaskedEmail(res.maskedEmail || cleanEmail);
        setMfaDevOtp(res.devOtp || '');
        setMfaCode('');
        toast.info(
          res.message ||
          (res.twoFactorMethod === 'TOTP'
            ? 'Enter the 6-digit code from your authenticator app.'
            : 'A 6-digit verification code has been sent to your email.')
        );
        setLoading(false);
        return;
      }

      const roles: string[] = res.roles || res.user?.roles || [];
      if (!roles.includes('super_admin')) {
        clearToken();
        const denied = 'Access Denied: Only Super Administrators can sign in through this portal.';
        setFormError(denied);
        toast.error(denied);
        setLoading(false);
        return;
      }

      setToken(res.token);
      qc.invalidateQueries({ queryKey: ['current-session-user'] });
      qc.invalidateQueries({ queryKey: ['current-profile'] });
      toast.success('Signed in to Master HRMS Super Admin Console.');
      window.location.href = '/super';
    } catch (err: any) {
      clearToken();
      const msg =
        err?.code === 'SUPER_ADMIN_ONLY'
          ? 'Access Denied: Only Super Administrators can sign in through this portal.'
          : err?.response?.data?.error || err?.message || 'Invalid Super Administrator credentials.';
      setFormError(msg);
      toast.error(msg);
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setTurnstileReady(false);
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      const msg = isBackupMode ? 'Please enter your recovery code.' : 'Please enter the 6-digit verification code.';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/2fa/verify-login', {
        mfaToken,
        code: cleanCode,
      });

      const roles: string[] = res.roles || res.user?.roles || [];
      if (!roles.includes('super_admin')) {
        clearToken();
        const denied = 'Access Denied: Account lacks Super Administrator clearance.';
        setFormError(denied);
        toast.error(denied);
        setIsMfaStep(false);
        setLoading(false);
        return;
      }

      setToken(res.token);
      qc.invalidateQueries({ queryKey: ['current-session-user'] });
      toast.success('Super Administrator identity verified.');
      window.location.href = '/super';
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Verification code rejected.';
      setFormError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) return toast.error('Please enter your root email address.');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim(), portal: 'super' });
      toast.success(res.message || 'Recovery instructions sent to your Super Admin email.');
      setMode('reset');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to dispatch recovery email.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!email) return toast.error('Please enter your email.');
    if (!resetToken && (!otpCode || otpCode.length < 6)) {
      return toast.error('Please enter the 6-digit verification code.');
    }
    if (password.length < 8) return toast.error('Password must be at least 8 characters.');
    if (password !== confirmPassword) return toast.error('Passwords do not match.');

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        token: resetToken || undefined,
        code: !resetToken ? otpCode : undefined,
        newPassword: password,
      });
      toast.success(res.message || 'Super Admin password updated! Sign in with your new password.');
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
      setOtpCode('');
      setResetToken('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Password reset failed.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-light dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  const headerTitle = isMfaStep
    ? 'Two-Factor Verification'
    : mode === 'forgot'
      ? 'Recover Root Access'
      : mode === 'reset'
        ? 'Reset Root Password'
        : 'Super Admin Console';

  const headerSubtitle = isMfaStep
    ? mfaMethod === 'TOTP'
      ? 'Enter the 6-digit code from your authenticator app'
      : `Enter the 6-digit code sent to ${mfaMaskedEmail || email}`
    : mode === 'forgot'
      ? 'Enter your platform administrator email to receive a reset code'
      : mode === 'reset'
        ? 'Verify your recovery code and choose a new password'
        : 'Sign in to Master HRMS platform control plane';

  return (
    <div className="min-h-screen bg-light dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-lg p-6 sm:p-8 relative">
        {/* Theme Switcher */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Brand Header matching Master HRMS Root Theme */}
        <div className="text-center mb-6 space-y-3">
          <Link href="/" className="inline-block">
            <img
              src={logoLightUrl}
              alt={appName}
              className="h-10 max-h-10 w-auto object-contain mx-auto dark:hidden"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.webp';
              }}
            />
            <img
              src={logoDarkUrl || logoLightUrl}
              alt={appName}
              className="h-10 max-h-10 w-auto object-contain mx-auto hidden dark:block"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/white-logo.webp';
              }}
            />
          </Link>

          <div className="flex justify-center">
            <Badge
              variant="soft"
              className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold gap-1.5"
            >
              <ShieldCheck className="size-3.5" />
              Platform Root Portal
            </Badge>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{headerTitle}</h1>
            <p className="text-xs text-muted-foreground mt-1">{headerSubtitle}</p>
          </div>
        </div>

        {/* Inline Error Feedback */}
        {formError && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            {formError}
          </div>
        )}

        {isMfaStep ? (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setIsMfaStep(false);
                setMfaCode('');
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </button>

            {mfaDevOtp && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300 flex items-center justify-between">
                <span>Dev Verification Code:</span>
                <button
                  type="button"
                  onClick={() => setMfaCode(mfaDevOtp)}
                  className="font-mono font-bold underline cursor-pointer"
                >
                  {mfaDevOtp}
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="super-mfa-code" className="text-xs font-semibold">
                {isBackupMode ? 'Emergency Recovery Code' : '6-Digit Security Code'}
              </Label>
              <Input
                id="super-mfa-code"
                type="text"
                autoFocus
                maxLength={isBackupMode ? 12 : 6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder={isBackupMode ? 'ABCD1234' : '000000'}
                className="text-center font-mono font-bold tracking-[0.35em] text-base h-11"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Verify Super Admin Clearance
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsBackupMode(!isBackupMode);
                  setMfaCode('');
                }}
                className="text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                {isBackupMode ? 'Use 6-digit security code' : 'Lost device? Use emergency backup code'}
              </button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="super-forgot-email" className="text-xs font-semibold">
                Root Email Address
              </Label>
              <Input
                id="super-forgot-email"
                type="email"
                required
                autoFocus
                placeholder="admin@masterhrms.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Send Recovery Instructions
            </Button>
          </form>
        ) : mode === 'reset' ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setFormError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </button>

            <div className="space-y-1.5">
              <Label htmlFor="super-reset-email" className="text-xs font-semibold">
                Root Email
              </Label>
              <Input
                id="super-reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
            </div>

            {!resetToken && (
              <div className="space-y-1.5">
                <Label htmlFor="super-reset-otp" className="text-xs font-semibold">
                  6-Digit Verification Code
                </Label>
                <Input
                  id="super-reset-otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center font-mono font-bold tracking-[0.35em] text-base h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="super-new-pass" className="text-xs font-semibold">
                New Root Password
              </Label>
              <Input
                id="super-new-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="super-confirm-pass" className="text-xs font-semibold">
                Confirm Password
              </Label>
              <Input
                id="super-confirm-pass"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="h-10"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 font-semibold gap-2">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Save New Password
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="super-email" className="text-xs font-semibold">
                Root Email Address
              </Label>
              <Input
                id="super-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="admin@masterhrms.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="super-password" className="text-xs font-semibold">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setFormError(null);
                  }}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="super-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile — action MUST match backend requireTurnstile("super_login") */}
            <TurnstileWidget
              ref={turnstileRef}
              action="super_login"
              onSuccess={handleTurnstileSuccess}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
            />

            {turnstileError && (
              <div className="flex items-center justify-between text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <span className="text-amber-700 dark:text-amber-400">Security check unavailable.</span>
                <button
                  type="button"
                  onClick={() => {
                    setTurnstileError(false);
                    setTurnstileReady(false);
                    setTurnstileToken('');
                    turnstileRef.current?.reset();
                  }}
                  className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold hover:underline cursor-pointer ml-2"
                >
                  <RefreshCw className="size-3" />
                  Retry
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (!isLocalDev && !turnstileReady && !turnstileError)}
              className="w-full h-10 font-semibold gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Access Super Admin Portal
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Link href="/auth" className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="size-3.5" />
            Tenant Workspace Login
          </Link>
          <span className="truncate text-[11px]">{footerText}</span>
        </div>
      </div>
    </div>
  );
}

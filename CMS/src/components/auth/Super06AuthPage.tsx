'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
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
  Server,
  Building2,
} from 'lucide-react';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { isTenantWorkspaceHost } from '@/src/lib/platform-domain';
import { useAppConfig, applyThemeVariables } from '@/src/lib/useAppConfig';
import { useTenantBranding } from '@/src/lib/useTenantBranding';

export function Super06AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
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
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  // Sync token from URL query params
  useEffect(() => {
    if (searchToken) {
      setResetToken(searchToken);
      setMode('reset');
    }
    if (searchEmail) {
      setEmail(searchEmail);
    }
  }, [searchToken, searchEmail]);

  // 2FA Verification Challenge State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isBackupMode, setIsBackupMode] = useState(false);

  const logoLightUrl = appConfig?.logoLightUrl || branding?.logoUrl || '/logo.webp';
  const logoDarkUrl = appConfig?.logoDarkUrl || branding?.logoDark || '/white-logo.webp';
  const appName = appConfig?.appName || branding?.name || 'Master HRMS';
  const footerText = appConfig?.footerText || branding?.footerText || '© 2026 Master HRMS. All rights reserved.';

  useEffect(() => {
    const activeColor = branding?.primaryColor || appConfig?.primaryColor || '#2563EB';
    applyThemeVariables(activeColor);
  }, [branding?.primaryColor, appConfig?.primaryColor]);

  // Check if session is already authenticated as super_admin
  useEffect(() => {
    (async () => {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('hrms_auth_token') || localStorage.getItem('auth_token')) : null;
      if (token) {
        try {
          const user = await api.get('/auth/me');
          if (user?.roles?.includes('super_admin')) {
            router.push('/super');
            return;
          }
        } catch {}
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: cleanEmail,
        password,
        portal: 'super', // Backend gate: strictly rejects non-super_admin accounts
        turnstileToken: turnstileToken || undefined,
      });

      // Handle 2FA Challenge
      if (res.requires2FA) {
        setIsMfaStep(true);
        setMfaToken(res.mfaToken);
        setMfaCode('');
        toast.info('Two-Factor Authentication code required.');
        setLoading(false);
        return;
      }

      // Explicit Role Gate: ONLY super_admin is permitted
      const roles: string[] = res.roles || res.user?.roles || [];
      const isSuper = roles.includes('super_admin');
      if (!isSuper) {
        clearToken();
        toast.error('Access Denied: Only Super Administrators can log in through this portal.');
        setLoading(false);
        return;
      }

      // Store tokens and clear cache
      setToken(res.token);
      qc.invalidateQueries({ queryKey: ['current-session-user'] });
      qc.invalidateQueries({ queryKey: ['current-profile'] });

      toast.success('Signed in successfully as Root Super Administrator!');
      router.push('/super');
    } catch (err: any) {
      clearToken();
      const msg =
        err?.status === 403 || err?.code === 'SUPER_ADMIN_ONLY'
          ? 'Access Denied: Only Super Administrators can log in through this portal.'
          : err?.message || 'Invalid Super Administrator credentials.';
      toast.error(msg);
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = mfaCode.trim();
    if (!cleanCode) {
      toast.error(isBackupMode ? 'Please enter recovery code' : 'Please enter 6-digit authenticator code');
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
        toast.error('Access Denied: Account lacks Super Administrator clearance.');
        setIsMfaStep(false);
        setLoading(false);
        return;
      }

      setToken(res.token);
      qc.invalidateQueries({ queryKey: ['current-session-user'] });
      toast.success('Root Super Administrator identity verified!');
      router.push('/super');
    } catch (err: any) {
      toast.error(err.message || 'Verification code rejected.');
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your root email.');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim(), portal: 'super' });
      toast.success(res.message || 'Recovery email sent to Super Admin address.');
      setMode('reset');
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch recovery email.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
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
      toast.error(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/20 text-primary border border-primary/30 mb-3">
            <Server className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Super Admin Console</h1>
          <p className="text-xs text-slate-400">Master Root Control & Multi-Tenant Management</p>
        </div>

        {/* Quick credential filler for verified Super Admin */}
        {mode === 'signin' && (
          <div className="mb-4 p-3 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5 text-primary">
                <ShieldCheck className="size-3.5" /> Root Administrator
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Password: admin123</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@masterhrms.com');
                setPassword('admin123');
              }}
              className="w-full text-left py-1.5 px-2 bg-slate-900 hover:bg-slate-700/60 border border-slate-700 rounded text-slate-200 transition-colors flex items-center justify-between"
            >
              <span className="font-mono text-[11px]">admin@masterhrms.com</span>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">One-Click Fill</span>
            </button>
          </div>
        )}

        {isMfaStep ? (
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                {isBackupMode ? 'Emergency Recovery Code' : '6-Digit Security Code'}
              </label>
              <input
                type="text"
                autoFocus
                maxLength={isBackupMode ? 10 : 6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder={isBackupMode ? 'ABCD1234' : '000000'}
                className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-base border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Verify Super Admin Clearance
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setIsBackupMode(!isBackupMode)}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                {isBackupMode ? 'Use Authenticator Code' : 'Lost device? Use emergency backup code'}
              </button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back to sign in
            </button>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Root Email Address</label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Send Recovery Link
            </button>
          </form>
        ) : mode === 'reset' ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" /> Back to sign in
            </button>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            {!resetToken && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-base border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">New Root Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Save New Password
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Root Email</label>
              <input
                type="email"
                required
                autoFocus
                placeholder="admin@hrms.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="************"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pe-10 text-sm border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <TurnstileWidget
              ref={turnstileRef}
              action="super-login"
              onSuccess={(t) => setTurnstileToken(t)}
              onExpire={() => setTurnstileToken('')}
              onError={() => {}}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Access Super Admin Portal
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <Link href="/login" className="hover:text-slate-300">
            ← Tenant Workspace Login
          </Link>
          <span>{footerText}</span>
        </div>
      </div>
    </div>
  );
}

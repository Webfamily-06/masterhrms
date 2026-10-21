'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api, setToken } from '@/src/lib/api';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldCheck,
  ArrowLeft,
  Mail,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ThemeToggle } from '@/src/components/theme-toggle';
import { resolveDefaultRoute, extractRolesFromToken } from '@/src/lib/auth-navigation';

export function Verify2faPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-light dark:bg-slate-950">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <Verify2faContent />
    </Suspense>
  );
}

function Verify2faContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || undefined;
  const qc = useQueryClient();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [mfaToken, setMfaToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_temp_token') : null;
    const email = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_masked_email') : null;
    const setupFlag = typeof window !== 'undefined' ? sessionStorage.getItem('mfa_is_setup') === 'true' : false;

    if (!token) {
      toast.error('No active verification session. Please sign in first.');
      router.push('/login');
      return;
    }

    setMfaToken(token);
    setMaskedEmail(email || 'registered email');
    setIsSetup(setupFlag);

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    setErrorMessage('');
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const updated = [...digits];
      updated[index] = '';
      setDigits(updated);
      return;
    }

    const digit = cleaned.slice(-1);
    const updated = [...digits];
    updated[index] = digit;
    setDigits(updated);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...digits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setDigits(updated);

    const nextFocus = Math.min(pasted.length, 5);
    inputRefs.current[nextFocus]?.focus();

    if (pasted.length === 6) {
      setTimeout(() => {
        executeVerify(pasted);
      }, 100);
    }
  };

  const executeVerify = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await api.post('/auth/2fa/verify-login', {
        mfaToken,
        code: codeToVerify,
      });

      if (res.token) {
        sessionStorage.removeItem('mfa_temp_token');
        sessionStorage.removeItem('mfa_masked_email');
        sessionStorage.removeItem('mfa_is_setup');

        setToken(res.token);
        qc.invalidateQueries({ queryKey: ['current-session-user'] });
        toast.success('Two-factor verification confirmed! Signing in...');

        const verifiedRoles = res.roles || res.user?.roles || extractRolesFromToken(res.token).roles;
        const isSuperAdmin = verifiedRoles.includes('super_admin');
        const isImpersonating = res.isImpersonating || extractRolesFromToken(res.token).isImpersonating;

        if (!isSuperAdmin && res.workspaceUrl && typeof window !== 'undefined') {
          try {
            const currentOrigin = window.location.origin.toLowerCase();
            const targetOrigin = new URL(res.workspaceUrl).origin.toLowerCase();
            if (currentOrigin !== targetOrigin) {
              window.location.href = `${res.workspaceUrl}/auth?token=${res.token}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`;
              return;
            }
          } catch {}
        }

        router.push(resolveDefaultRoute(verifiedRoles, redirect, { isImpersonating }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
      toast.error(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-light dark:bg-slate-950 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-border-color rounded-xl shadow-lg w-full max-w-md p-8 relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to sign in</span>
        </Link>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary border border-primary/20 mb-3">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-title mb-1">Two-Factor Authentication</h1>
          <p className="text-xs text-muted-foreground">
            A 6-digit security code was dispatched to <span className="font-semibold text-foreground">{maskedEmail}</span>
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeVerify(digits.join(''));
          }}
          className="space-y-6"
        >
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="size-11 sm:size-12 text-center text-lg sm:text-xl font-bold font-mono border border-border-color rounded-lg bg-light dark:bg-slate-800 text-title focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join('').length !== 6}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Confirm & Access Workspace
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border-color text-center text-xs text-muted-foreground">
          {cooldown > 0 ? (
            <span>Resend code in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCooldown(30);
                toast.success('New verification code dispatched.');
              }}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

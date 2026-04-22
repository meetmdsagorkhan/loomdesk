'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verificationToken = token ?? '';
  const hasToken = typeof token === 'string' && token.length > 0;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    let cancelled = false;

    async function verifyEmail() {
      try {
        const response = await fetch(
          `/api/email-verification?token=${encodeURIComponent(verificationToken)}`
        );
        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setStatus('error');
          setMessage(data.error ?? 'Failed to verify your email address.');
          return;
        }

        setStatus('success');
        setMessage(data.message ?? 'Your email address has been verified.');
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Failed to verify your email address.');
        }
      }
    }

    void verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [hasToken, verificationToken]);

  const displayStatus = hasToken ? status : 'error';
  const displayMessage = hasToken ? message : 'Verification token is missing.';

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <img src="/logo.png" alt="LoomDesk" className="h-10 w-auto object-contain" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Verify your email</h1>
        <p className="text-muted-foreground">
          We&apos;re confirming that this inbox belongs to your LoomDesk account.
        </p>
      </div>

      <div
        className={`px-4 py-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-sm ${
          displayStatus === 'success'
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300'
            : displayStatus === 'error'
              ? 'bg-red-50/80 dark:bg-red-950/20 text-red-600 dark:text-red-400'
              : 'bg-slate-50/80 dark:bg-slate-900/30 text-slate-600 dark:text-slate-200'
        }`}
      >
        {displayStatus === 'loading' ? (
          <Loader2 size={18} className="animate-spin mt-0.5" />
        ) : displayStatus === 'success' ? (
          <CheckCircle2 size={18} className="mt-0.5" />
        ) : (
          <AlertCircle size={18} className="mt-0.5" />
        )}
        <span>{displayMessage}</span>
      </div>

      <div className="space-y-3">
        <Link
          href="/login?verified=1"
          className="btn-primary inline-flex w-full h-12 items-center justify-center rounded-xl text-base font-medium"
        >
          Back to sign in
        </Link>
        {displayStatus === 'error' && (
          <Link
            href="/resend-verification"
            className="glass-pill inline-flex w-full h-12 items-center justify-center rounded-xl text-base font-medium"
          >
            Send a new verification link
          </Link>
        )}
      </div>
    </div>
  );
}

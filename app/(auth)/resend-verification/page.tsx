'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setPreviewUrl(null);

    try {
      const response = await fetch('/api/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Failed to send verification email');
        return;
      }

      setSuccessMessage(
        data.message ??
          'If that email belongs to an unverified account, a verification link has been sent.'
      );
      setPreviewUrl(data.previewUrl ?? null);
    } catch {
      setError('Failed to send verification email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <img src="/logo.png" alt="LoomDesk" className="h-10 w-auto object-contain" />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Resend verification</h1>
        <p className="text-muted-foreground">
          Enter your email and we&apos;ll send a fresh verification link if the account still needs one.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          {previewUrl && (
            <p>
              Development preview:{' '}
              <a className="underline underline-offset-4" href={previewUrl}>
                Open verification link
              </a>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="email">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="pl-12"
              placeholder="you@example.com"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || email.trim().length === 0}
          className="w-full h-12 text-base font-medium rounded-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending link...
            </>
          ) : (
            'Send verification link'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already verified?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

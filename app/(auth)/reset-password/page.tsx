'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Activity, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Reset token is missing.');
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`/api/reset-password?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error ?? 'Invalid or expired reset link');
        }
      } catch {
        setError('Failed to validate reset link');
      } finally {
        setIsChecking(false);
      }
    };

    void validateToken();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError('Reset token is missing.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Failed to reset password');
        return;
      }

      setSuccessMessage(data.message ?? 'Password updated successfully.');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch {
      setError('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <Activity className="w-8 h-8 text-primary" />
        <span className="text-2xl font-semibold text-foreground">LoomDesk</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Choose a new password</h1>
        <p className="text-muted-foreground">
          Your new password must be at least 8 characters and include upper, lower, number, and special characters.
        </p>
      </div>

      {isChecking && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && !isChecking && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {!isChecking && !successMessage && !error && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="New password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Confirm password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={isLoading || password.length === 0 || confirmPassword.length === 0} className="w-full h-12 text-base font-medium rounded-xl">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

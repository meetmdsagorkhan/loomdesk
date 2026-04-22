'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Activity, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactorFields, setShowTwoFactorFields] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    otp: '',
    recoveryCode: '',
    rememberMe: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>(
    {}
  );
  const verified = searchParams.get('verified') === '1';

  const handleFieldChange = (
    field: keyof LoginFormData,
    value: string | boolean
  ) => {
    setFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  };

  const submitCredentials = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      otp: data.otp,
      recoveryCode: data.recoveryCode,
      rememberMe: data.rememberMe,
      redirect: false,
    });

    if (result?.error) {
      setError(
        'Unable to sign in. Check your email, password, and two-factor code if your account requires one.'
      );
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = loginSchema.safeParse(formData);

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof LoginFormData, string>> = {};

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (field === 'email' || field === 'password') {
          nextErrors[field] = issue.message;
        }
      });

      setFieldErrors(nextErrors);
      return;
    }

    await submitCredentials(parsed.data);
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <Activity className="w-8 h-8 text-primary" />
        <span className="text-2xl font-semibold text-foreground">LoomDesk</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {verified && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6">
          Your email has been verified. You can sign in now.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            disabled={isLoading}
            suppressHydrationWarning
          />
          {fieldErrors.email && (
            <p className="text-destructive text-xs mt-1.5">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Password"
              disabled={isLoading}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-destructive text-xs mt-1.5">{fieldErrors.password}</p>
          )}
        </div>

        <div className="text-right">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground float-left">
            <input
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(event) => handleFieldChange('rememberMe', event.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border border-input"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={() => setShowTwoFactorFields((current) => !current)}
            className="float-left text-sm text-primary hover:underline transition-colors"
          >
            {showTwoFactorFields ? 'Hide 2FA fields' : 'Use 2FA code'}
          </button>
          <Link
            href="/resend-verification"
            className="text-sm text-primary hover:underline transition-colors"
          >
            Need a verification email?
          </Link>
        </div>

        {showTwoFactorFields && (
          <div className="space-y-5 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-foreground mb-2">
                Authentication Code
              </label>
              <input
                id="otp"
                type="text"
                value={formData.otp ?? ''}
                onChange={(event) => handleFieldChange('otp', event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="123456"
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>

            <div>
              <label
                htmlFor="recoveryCode"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Recovery Code
              </label>
              <input
                id="recoveryCode"
                type="text"
                value={formData.recoveryCode ?? ''}
                onChange={(event) => handleFieldChange('recoveryCode', event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="ABCD-1234"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Use either a 6-digit authenticator code or one of your recovery codes.
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-medium rounded-xl bg-slate-800 text-white dark:bg-white dark:text-neutral-900 hover:bg-slate-700 dark:hover:bg-white/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}

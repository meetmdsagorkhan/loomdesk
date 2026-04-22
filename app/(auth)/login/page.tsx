'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

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
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <img src="/logo.png" alt="LoomDesk" className="h-10 w-auto object-contain" />
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
          <Label htmlFor="email" className="mb-2">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            suppressHydrationWarning
          />
          {fieldErrors.email && (
            <p className="text-destructive text-xs mt-1.5">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password" className="mb-2">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              className="pr-12"
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
          <Label className="inline-flex items-center gap-2 text-sm text-muted-foreground float-left">
            <Checkbox
              checked={formData.rememberMe}
              onChange={(event) => handleFieldChange('rememberMe', event.target.checked)}
              disabled={isLoading}
            />
            Remember me
          </Label>
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
              <Label htmlFor="otp" className="mb-2">
                Authentication Code
              </Label>
              <Input
                id="otp"
                type="text"
                value={formData.otp ?? ''}
                onChange={(event) => handleFieldChange('otp', event.target.value)}
                placeholder="123456"
                disabled={isLoading}
                inputMode="numeric"
              />
            </div>

            <div>
              <Label
                htmlFor="recoveryCode"
                className="mb-2"
              >
                Recovery Code
              </Label>
              <Input
                id="recoveryCode"
                type="text"
                value={formData.recoveryCode ?? ''}
                onChange={(event) => handleFieldChange('recoveryCode', event.target.value)}
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
          variant="default"
          className="w-full h-12 text-base font-medium"
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

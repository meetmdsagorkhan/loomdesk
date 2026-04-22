'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { inviteSignupSchema, type InviteSignupFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Badge from '@/components/shared/Badge';

function InviteSignupContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);
  const [formData, setFormData] = useState<InviteSignupFormData>({
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof InviteSignupFormData, string>>
  >({});

  const handleFieldChange = (field: keyof InviteSignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  useEffect(() => {
    if (!token) {
      setInviteError('Invalid invitation link');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/invite/check?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setInviteError(data.error || 'Invalid invitation');
        } else {
          setInviteData({ email: data.email, role: data.role });
        }
      } catch {
        setInviteError('Failed to validate invitation');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = inviteSignupSchema.safeParse(formData);

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof InviteSignupFormData, string>> = {};

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (
          field === 'fullName' ||
          field === 'password' ||
          field === 'confirmPassword'
        ) {
          nextErrors[field] = issue.message;
        }
      });

      setFieldErrors(nextErrors);
      return;
    }

    if (!token) return;

    const data = parsed.data;
    setIsLoading(true);
    setInviteError(null);
    setSuccessMessage(null);
    setVerificationPreviewUrl(null);

    try {
      const response = await fetch('/api/auth/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: data.fullName,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setInviteError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        'Account created successfully. Check your inbox for a verification link before signing in.'
      );
      setVerificationPreviewUrl(result.previewUrl ?? null);
      setIsLoading(false);
    } catch {
      setInviteError('Failed to create account');
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-8 justify-center">
        <img src="/logo.png" alt="LoomDesk" className="h-10 w-auto object-contain" />
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Set up your account</h1>
        <p className="text-muted-foreground">You&apos;ve been invited to join LoomDesk</p>
      </div>

      {isValidating && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {inviteError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3 backdrop-blur-sm">
          <AlertCircle size={18} />
          <span>{inviteError}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm mb-6 space-y-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          {verificationPreviewUrl && (
            <p>
              Development preview:{' '}
              <a className="underline underline-offset-4" href={verificationPreviewUrl}>
                Open verification link
              </a>
            </p>
          )}
        </div>
      )}

      {!isValidating && !inviteError && inviteData && (
        <div className="bg-muted/50 border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Invited as</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="info" label={inviteData.role} />
                <span className="text-sm font-medium text-foreground">{inviteData.email}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isValidating && !inviteError && !successMessage && (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="fullName" className="mb-2">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(event) => handleFieldChange('fullName', event.target.value)}
                className="pl-12"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
            {fieldErrors.fullName && (
              <p className="text-destructive text-xs mt-1.5">{fieldErrors.fullName}</p>
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
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-destructive text-xs mt-1.5">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <Label
                htmlFor="confirmPassword"
                className="mb-2"
              >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(event) =>
                  handleFieldChange('confirmPassword', event.target.value)
                }
                className="pr-12"
                placeholder="Confirm password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-destructive text-xs mt-1.5">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      )}

      {successMessage && (
        <div className="space-y-3">
          <Link
            href="/resend-verification"
            className="btn-primary inline-flex w-full h-12 items-center justify-center rounded-xl text-base font-medium"
          >
            Resend verification email
          </Link>
          <Link
            href="/login"
            className="glass-pill inline-flex w-full h-12 items-center justify-center rounded-xl text-base font-medium"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export default function InviteSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <InviteSignupContent />
    </Suspense>
  );
}

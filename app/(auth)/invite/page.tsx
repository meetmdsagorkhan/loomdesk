'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, Eye, EyeOff, Loader2, Mail, User, AlertCircle } from 'lucide-react';
import { inviteSignupSchema, type InviteSignupFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import Badge from '@/components/shared/Badge';
import { signIn } from '@/auth';

function InviteSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteSignupFormData>({
    resolver: zodResolver(inviteSignupSchema),
  });

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
      } catch (error) {
        setInviteError('Failed to validate invitation');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: InviteSignupFormData) => {
    if (!token) return;

    setIsLoading(true);

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

      // Automatically sign in after account creation
      const signInResult = await signIn('credentials', {
        email: inviteData?.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setInviteError('Account created but failed to sign in. Please try logging in.');
        setIsLoading(false);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setInviteError('Failed to create account');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8 justify-center">
        <Activity className="w-8 h-8 text-primary" />
        <span className="text-2xl font-semibold text-foreground">LoomDesk</span>
      </div>

      {/* Heading */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Set up your account</h1>
        <p className="text-muted-foreground">You've been invited to join LoomDesk</p>
      </div>

      {/* Validation Loading */}
      {isValidating && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {inviteError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{inviteError}</span>
        </div>
      )}

      {/* Invite Info Box */}
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

      {/* Form */}
      {!isValidating && !inviteError && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              id="fullName"
              type="text"
              {...register('fullName')}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="John Doe"
              disabled={isLoading}
            />
          </div>
          {errors.fullName && (
            <p className="text-destructive text-xs mt-1.5">{errors.fullName.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-destructive text-xs mt-1.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
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
    </div>
  );
}

export default function InviteSignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <InviteSignupContent />
    </Suspense>
  );
}

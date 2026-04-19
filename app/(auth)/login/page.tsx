'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});

  const handleFieldChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    const data = parsed.data;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (submitError) {
      console.error('Login error:', submitError);
      setError('Invalid email or password');
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
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
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

        <div className="text-right">
          <a
            href="#"
            className="text-sm text-primary hover:underline transition-colors"
            onClick={(event) => event.preventDefault()}
          >
            Forgot password?
          </a>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-medium rounded-xl"
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

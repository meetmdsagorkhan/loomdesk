'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log('Login form submitted', data);
    setIsLoading(true);
    setError(null);

    try {
      console.log('Calling signIn...');
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      console.log('SignIn result:', result);

      if (result?.error) {
        console.error('SignIn error:', result.error);
        setError('Invalid email or password');
        setIsLoading(false);
      } else {
        console.log('Login successful, redirecting...');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password');
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
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your account</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-destructive text-xs mt-1.5">{errors.email.message}</p>
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

        {/* Forgot Password */}
        <div className="text-right">
          <a
            href="#"
            className="text-sm text-primary hover:underline transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Forgot password?
          </a>
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

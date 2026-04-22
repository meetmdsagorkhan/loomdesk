'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from './GlassCard';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Log error for debugging (could be sent to error tracking service)
    if (typeof window !== 'undefined') {
      console.group('Error Details');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Error Stack:', error.stack);
      console.groupEnd();
    }
  }

  getErrorMessage = () => {
    const error = this.state.error;
    if (!error) return 'An unexpected error occurred';

    // Provide more specific error messages
    if (error.message.includes('fetch')) {
      return 'Failed to load data. Please check your connection and try again.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('permission')) {
      return 'You do not have permission to access this resource.';
    }

    return error.message || 'An unexpected error occurred';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <GlassCard variant="default" padding="lg" className="max-w-md w-full">
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">
                  {this.getErrorMessage()}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="rounded-xl"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="rounded-xl"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="ghost"
                  className="rounded-xl"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
              {this.props.showDetails && this.state.error && (
                <details className="text-left mt-4">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Show error details
                  </summary>
                  <pre className="mt-2 p-3 bg-muted/30 rounded-lg text-xs overflow-auto max-h-32 text-muted-foreground">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="bg-destructive/10 rounded-full p-4">
            <AlertCircle size={48} className="text-destructive" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground">An error occurred while loading this page</p>
        </div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}

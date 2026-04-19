import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-6 p-8">
        <div>
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Page not found</h2>
          <p className="text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        </div>
        <Link href="/dashboard">
          <Button>
            <Home size={16} className="mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

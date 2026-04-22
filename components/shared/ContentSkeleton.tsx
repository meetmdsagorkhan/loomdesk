import { cn } from '@/lib/utils';

interface ContentSkeletonProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
}

export default function ContentSkeleton({ className, lines = 3, showAvatar = false }: ContentSkeletonProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-full bg-muted/50" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-muted/50" />
            <div className="h-3 w-24 rounded bg-muted/50" />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-4 rounded bg-muted/50', i === lines - 1 && 'w-3/4')}
          />
        ))}
      </div>
    </div>
  );
}

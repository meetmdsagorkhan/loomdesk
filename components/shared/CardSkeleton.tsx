import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showActions?: boolean;
  lines?: number;
}

export default function CardSkeleton({
  className,
  showHeader = true,
  showActions = false,
  lines = 3
}: CardSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded skeleton-shimmer" />
            <div className="h-4 w-64 rounded skeleton-shimmer" />
          </div>
          {showActions && (
            <div className="flex gap-2">
              <div className="h-8 w-24 rounded skeleton-shimmer" />
              <div className="h-8 w-24 rounded skeleton-shimmer" />
            </div>
          )}
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-4 rounded skeleton-shimmer', i === lines - 1 && 'w-3/4')}
          />
        ))}
      </div>
    </div>
  );
}

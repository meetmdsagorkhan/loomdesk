import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export default function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Table header */}
      <div className="flex gap-4 px-6 py-3 border-b border-border/60">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-${i}`}
            className={cn('h-4 rounded skeleton-shimmer', i === 0 && 'w-1/4', 'flex-1')}
          />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 px-6 py-4 border-b border-border/40 last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn('h-4 rounded skeleton-shimmer', colIndex === 0 && 'w-1/4', 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

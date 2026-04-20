import { Skeleton } from '@/components/ui/skeleton';

type SkeletonVariant = 'text' | 'card' | 'table-row';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
}

export default function SkeletonLoader({ variant = 'text', count = 1 }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return <Skeleton className="h-4 w-full" />;
      case 'card':
        return <Skeleton className="h-32 w-full rounded-lg" />;
      case 'table-row':
        return (
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        );
      default:
        return <Skeleton className="h-4 w-full" />;
    }
  };

  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

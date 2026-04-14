type SkeletonVariant = 'text' | 'card' | 'table-row';

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
}

export default function SkeletonLoader({ variant = 'text', count = 1 }: SkeletonLoaderProps) {
  const baseClass = 'animate-pulse bg-muted rounded';

  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return <div className={`${baseClass} h-4 w-full`} />;
      case 'card':
        return <div className={`${baseClass} h-32 w-full rounded-2xl`} />;
      case 'table-row':
        return (
          <div className="flex items-center gap-4">
            <div className={`${baseClass} h-4 w-24 rounded`} />
            <div className={`${baseClass} h-4 w-32 rounded`} />
            <div className={`${baseClass} h-4 w-20 rounded`} />
            <div className={`${baseClass} h-4 w-24 rounded`} />
          </div>
        );
      default:
        return <div className={`${baseClass} h-4 w-full`} />;
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

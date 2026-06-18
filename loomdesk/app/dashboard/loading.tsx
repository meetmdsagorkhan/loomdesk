import { BentoGrid, BentoCard } from '@/components/shared/BentoGrid';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="glass-card rounded-2xl p-8 mb-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24 bg-primary/10" />
          <Skeleton className="h-10 w-64 bg-foreground/5" />
          <Skeleton className="h-4 w-96 bg-muted-foreground/10" />
        </div>
      </div>

      <BentoGrid>
        {[1, 2, 3, 4].map((i) => (
          <BentoCard key={i} className="h-32">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20 bg-muted-foreground/10" />
              <Skeleton className="h-8 w-12 bg-foreground/5" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-10 rounded-full bg-success/10" />
                <Skeleton className="h-4 w-16 bg-muted-foreground/10" />
              </div>
            </div>
          </BentoCard>
        ))}

        <BentoCard colSpan={2} rowSpan={2} className="h-96">
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <Skeleton className="h-6 w-32 bg-foreground/5" />
              <Skeleton className="h-6 w-24 rounded-full bg-muted-foreground/10" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full bg-primary/10" />
                    <Skeleton className="h-4 w-24 bg-foreground/5" />
                  </div>
                  <Skeleton className="h-4 w-12 bg-foreground/5" />
                  <Skeleton className="h-6 w-16 rounded-full bg-muted-foreground/10" />
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        <BentoCard className="h-96">
          <div className="space-y-6">
            <Skeleton className="h-4 w-24 bg-muted-foreground/10" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl bg-foreground/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-foreground/5" />
            </div>
            <Skeleton className="h-4 w-20 bg-muted-foreground/10" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((k) => (
                <Skeleton key={k} className="h-8 w-full rounded-lg bg-foreground/5" />
              ))}
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
}

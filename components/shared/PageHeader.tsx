import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import GlassCard from './GlassCard';
import Breadcrumbs from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <GlassCard variant="default" padding="lg" className={cn('mb-8', className)}>
      <div className="space-y-4">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="pl-12 lg:pl-0">
            {badge && (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80 mb-3">
                {badge}
              </p>
            )}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
    </GlassCard>
  );
}

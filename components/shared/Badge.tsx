import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' | 'pink' | 'orange' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/15 text-success border-success/30 backdrop-blur-sm shadow-sm',
  warning: 'bg-warning/15 text-warning border-warning/30 backdrop-blur-sm shadow-sm',
  danger: 'bg-destructive/15 text-destructive border-destructive/30 backdrop-blur-sm shadow-sm',
  info: 'bg-info/15 text-info border-info/30 backdrop-blur-sm shadow-sm',
  default: 'bg-muted/50 text-muted-foreground border-border/50 backdrop-blur-sm shadow-sm',
  purple: 'bg-primary/15 text-primary border-primary/30 backdrop-blur-sm shadow-sm',
  pink: 'bg-pink-500/15 text-pink-600 border-pink-500/30 backdrop-blur-sm shadow-sm dark:text-pink-400',
  orange: 'bg-orange-500/15 text-orange-600 border-orange-500/30 backdrop-blur-sm shadow-sm dark:text-orange-400',
  teal: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 backdrop-blur-sm shadow-sm dark:text-emerald-400',
};

export default function Badge({ variant = 'default', label, className }: BadgeProps) {
  return (
    <ShadcnBadge variant="outline" className={cn("rounded-full px-2.5 py-0.5 font-semibold", variantStyles[variant], className)}>
      {label}
    </ShadcnBadge>
  );
}

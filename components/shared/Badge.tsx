import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20',
  danger: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  default: 'bg-muted text-muted-foreground hover:bg-muted/80',
};

export default function Badge({ variant = 'default', label, className }: BadgeProps) {
  return (
    <ShadcnBadge className={cn(variantStyles[variant], className)}>
      {label}
    </ShadcnBadge>
  );
}

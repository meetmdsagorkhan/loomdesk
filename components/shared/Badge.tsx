import { Badge as ShadcnBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' | 'pink' | 'orange' | 'teal';

interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-600 shadow-md hover:from-emerald-400 hover:to-green-400',
  warning: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-amber-600 shadow-md hover:from-amber-400 hover:to-yellow-400',
  danger: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-red-600 shadow-md hover:from-red-400 hover:to-rose-400',
  info: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-600 shadow-md hover:from-blue-400 hover:to-cyan-400',
  default: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-slate-800 shadow-md hover:from-slate-500 hover:to-slate-600',
  purple: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white border-purple-600 shadow-md hover:from-purple-400 hover:to-violet-400',
  pink: 'bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-pink-600 shadow-md hover:from-pink-400 hover:to-fuchsia-400',
  orange: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-600 shadow-md hover:from-orange-400 hover:to-amber-400',
  teal: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-teal-600 shadow-md hover:from-teal-400 hover:to-cyan-400',
};

export default function Badge({ variant = 'default', label, className }: BadgeProps) {
  return (
    <ShadcnBadge className={cn(variantStyles[variant], className)}>
      {label}
    </ShadcnBadge>
  );
}

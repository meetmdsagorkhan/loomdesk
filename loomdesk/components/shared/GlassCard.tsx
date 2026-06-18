import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type GlassCardVariant = 'default' | 'elevated' | 'bordered' | 'minimal' | 'panel' | 'nav';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: GlassCardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantStyles: Record<GlassCardVariant, string> = {
  default: 'glass-card rounded-2xl',
  elevated: 'glass-card rounded-2xl card-elevation-lg',
  bordered: 'glass-card rounded-2xl border-glass-border',
  minimal: 'glass-card rounded-xl card-elevation-sm',
  panel: 'glass-panel rounded-2xl',
  nav: 'glass-nav rounded-2xl',
};

const paddingStyles: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function GlassCard({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        variantStyles[variant],
        paddingStyles[padding],
        hover && 'hover:translate-y-[-2px]',
        className
      )}
    >
      {children}
    </div>
  );
}

import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function Card({ title, subtitle, children, className, action }: CardProps) {
  return (
    <div className={`rounded-[1.75rem] border border-border bg-card shadow-[0_18px_35px_-24px_rgba(15,23,42,0.28)] ${className || ''}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

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
    <div className={`rounded-3xl bg-card/80 card-elevation-md backdrop-blur-sm ring-1 ring-border/60 ${className || ''}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
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

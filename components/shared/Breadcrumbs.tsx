import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center space-x-1 text-sm text-muted-foreground', className)} aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors duration-200"
        aria-label="Home"
      >
        <Home size={16} className="hover-lift" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-1 text-muted-foreground/50" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors duration-200 hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium" aria-current="page">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

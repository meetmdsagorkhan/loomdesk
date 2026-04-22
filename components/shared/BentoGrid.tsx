import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5", className)}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
}

export function BentoCard({ children, className, colSpan = 1, rowSpan = 1 }: BentoCardProps) {
  const colSpanClasses = {
    1: "col-span-1",
    2: "md:col-span-2 lg:col-span-2",
    3: "md:col-span-2 lg:col-span-3",
  };

  const rowSpanClasses = {
    1: "row-span-1",
    2: "row-span-2",
  };

  return (
    <div className={cn(
      "glass-card rounded-[1.4rem] p-4 md:p-6",
      colSpanClasses[colSpan],
      rowSpanClasses[rowSpan],
      className
    )}>
      {children}
    </div>
  );
}

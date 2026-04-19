'use client';

import { ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, ReactNode>[];
  isLoading?: boolean;
}

export default function DataTable({ columns, data, isLoading }: DataTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
            <div className="animate-pulse bg-muted h-4 w-24 rounded" />
            <div className="animate-pulse bg-muted h-4 w-32 rounded" />
            <div className="animate-pulse bg-muted h-4 w-20 rounded" />
            <div className="animate-pulse bg-muted h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-sm">No data yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border hover:bg-muted/50 transition-colors"
            >
              {columns.map((column) => (
                <td key={column.key} className="py-3 px-4 text-sm text-card-foreground">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

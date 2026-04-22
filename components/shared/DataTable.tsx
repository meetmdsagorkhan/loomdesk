'use client';

import { useState, useMemo } from 'react';
import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlassCard from './GlassCard';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, ReactNode>[];
  isLoading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  emptyAction?: ReactNode;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable({
  columns,
  data,
  isLoading,
  searchable = false,
  sortable = true,
  pagination = false,
  pageSize = 10,
  emptyMessage = 'No data available',
  emptyAction,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;

    return data.filter((row) =>
      columns.some((column) => {
        const value = row[column.key];
        return String(value).toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [data, searchQuery, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1;

  const handleSort = (columnKey: string) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (sortedData.length === 0) {
    return (
      <GlassCard variant="minimal" padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="glass-card flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/30">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
            {emptyAction && <div className="mt-4">{emptyAction}</div>}
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="form-input pl-10"
          />
        </div>
      )}

      <>
        {/* Desktop Table View */}
        <div className="hidden overflow-hidden rounded-2xl border border-white/20 bg-white/20 shadow-[0_16px_48px_rgba(76,92,148,0.16)] dark:bg-slate-900/30 md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-white/35 dark:bg-white/5">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground ${
                      sortable && column.sortable !== false
                        ? 'cursor-pointer transition-colors hover:bg-white/40 dark:hover:bg-white/10'
                        : ''
                    }`}
                    onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {sortable && column.sortable !== false && sortColumn === column.key && (
                        <>
                          {sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="border-b border-white/15 transition-colors last:border-0 hover:bg-white/35 dark:hover:bg-white/5"
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className="py-3.5 text-card-foreground">
                      {row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-4 md:hidden">
          {paginatedData.map((row, rowIndex) => (
            <GlassCard
              key={rowIndex}
              variant="minimal"
              padding="md"
              className="border border-white/20 bg-gradient-to-br from-white/40 via-white/20 to-transparent p-4"
            >
              {columns.map((column) => (
                <div
                  key={column.key}
                  className="flex justify-between border-b border-white/20 py-2 last:border-0"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {column.label}
                  </span>
                  <span className="text-sm text-foreground">{row[column.key]}</span>
                </div>
              ))}
            </GlassCard>
          ))}
        </div>
      </>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

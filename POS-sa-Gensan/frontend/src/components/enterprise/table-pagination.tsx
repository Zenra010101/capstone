"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const TABLE_PAGE_SIZE_OPTIONS = [25, 50, 100, 250] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: TablePageSize) => void;
  /** e.g. "products", "transactions" */
  itemLabel?: string;
  className?: string;
};

export function TablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  itemLabel = "rows",
  className,
}: Props) {
  if (totalCount <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing {start}-{end} of {totalCount} {itemLabel}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              const n = Number(v);
              if (TABLE_PAGE_SIZE_OPTIONS.includes(n as TablePageSize)) {
                onPageSizeChange(n as TablePageSize);
              }
            }}
          >
            <SelectTrigger className="h-8 w-[4.5rem]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[5.5rem] text-center text-sm text-muted-foreground tabular-nums">
          Page {page} of {safeTotalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(safeTotalPages)}
        >
          Last
        </Button>
      </div>
    </div>
  );
}

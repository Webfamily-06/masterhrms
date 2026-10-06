import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Inbox,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyMedia,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export interface Column<T = any> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  showPagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data = [],
  columns = [],
  showPagination = true,
  pageSize: initialPageSize = 15,
  pageSizeOptions = [10, 15, 30, 50, 100],
  loading = false,
  emptyTitle = "No records found",
  emptyMessage = "There are no records to display.",
  emptyIcon,
  className = "",
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (!showPagination) return data;
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize, showPagination]);

  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-shadow">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 border-b border-border/80">
              <TableRow className="hover:bg-transparent border-b border-border/80">
                {columns.map((col, idx) => (
                  <TableHead
                    key={col.key || idx}
                    className={cn(
                      "font-semibold text-[11px] tracking-wider text-muted-foreground uppercase whitespace-nowrap py-3 px-3",
                      getAlignClass(col.align),
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-36 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-8">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs font-medium text-foreground">Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-36 text-center p-0">
                    <Empty variant="plain" size="sm" className="py-8">
                      <EmptyMedia variant="soft" className="size-10 rounded-xl mb-1">
                        {emptyIcon || <Inbox className="size-5 text-muted-foreground/80" />}
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle className="text-sm font-semibold text-foreground">
                          {emptyTitle}
                        </EmptyTitle>
                        <EmptyDescription className="text-xs text-muted-foreground max-w-sm">
                          {emptyMessage}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIdx) => (
                  <TableRow
                    key={row.id || rowIdx}
                    className="hover:bg-muted/40 transition-colors border-b border-border/60 last:border-b-0"
                  >
                    {columns.map((col, colIdx) => {
                      const cellVal = row[col.key];
                      return (
                        <TableCell
                          key={col.key || colIdx}
                          className={cn(
                            "text-xs py-3 px-3",
                            getAlignClass(col.align),
                            col.className
                          )}
                        >
                          {col.render ? col.render(cellVal, row, rowIdx) : (cellVal ?? "—")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {showPagination && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                {pageSizeOptions.map((sz) => (
                  <SelectItem key={sz} value={String(sz)} className="text-xs">
                    {sz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2 font-medium">
              Showing <span className="text-foreground">{Math.min((safePage - 1) * pageSize + 1, data.length)}</span> to{" "}
              <span className="text-foreground">{Math.min(safePage * pageSize, data.length)}</span> of{" "}
              <span className="text-foreground">{data.length}</span> entries
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              title="First Page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 font-semibold text-foreground text-xs">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              title="Next Page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              title="Last Page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


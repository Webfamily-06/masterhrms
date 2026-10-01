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
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className={`space-y-3 ${className}`}>
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={col.key || idx}
                  className={`font-semibold text-xs tracking-wider text-muted-foreground uppercase ${getAlignClass(
                    col.align,
                  )} ${col.className || ""}`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <span className="text-xs font-medium">Loading data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                    <p className="font-semibold text-foreground text-sm">{emptyTitle}</p>
                    <p className="text-xs max-w-sm">{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <TableRow
                  key={row.id || rowIdx}
                  className="hover:bg-muted/40 transition-colors border-b last:border-b-0"
                >
                  {columns.map((col, colIdx) => {
                    const cellVal = row[col.key];
                    return (
                      <TableCell
                        key={col.key || colIdx}
                        className={`text-xs py-3 ${getAlignClass(col.align)} ${
                          col.className || ""
                        }`}
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

      {showPagination && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((sz) => (
                  <SelectItem key={sz} value={String(sz)} className="text-xs">
                    {sz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-2">
              Showing {Math.min((safePage - 1) * pageSize + 1, data.length)} -{" "}
              {Math.min(safePage * pageSize, data.length)} of {data.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="px-2 font-medium">
              Page {safePage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

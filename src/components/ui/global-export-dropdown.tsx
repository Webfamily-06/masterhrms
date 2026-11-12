import * as React from "react";
import { Download, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ExcelIcon, PdfIcon } from "@/components/ui/document-export-icons";
import { cn } from "@/lib/utils";

export interface GlobalExportDropdownProps {
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  isExporting?: boolean;
  selectedCount?: number;
  totalFilteredCount?: number;
  disabled?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
}

export function GlobalExportDropdown({
  onExportExcel,
  onExportPdf,
  isExporting = false,
  selectedCount = 0,
  totalFilteredCount,
  disabled = false,
  className,
  align = "end"
}: GlobalExportDropdownProps) {
  const hasSelection = selectedCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isExporting}
          className={cn("h-9 gap-1.5 text-xs font-medium min-w-[95px] justify-between", className)}
          aria-label="Export options"
        >
          <span className="flex items-center gap-1.5">
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
            ) : (
              <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span>Export</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52 text-xs">
        {hasSelection ? (
          <>
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground py-1">
              Export {selectedCount} selected record{selectedCount > 1 ? "s" : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : totalFilteredCount !== undefined ? (
          <>
            <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground py-1">
              Export {totalFilteredCount} matching record{totalFilteredCount !== 1 ? "s" : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem
          onClick={() => onExportExcel()}
          disabled={isExporting}
          className="cursor-pointer gap-2 py-2 text-xs font-medium focus:bg-muted"
        >
          <ExcelIcon className="h-4 w-4 shrink-0" />
          <span>Export as Excel</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onExportPdf()}
          disabled={isExporting}
          className="cursor-pointer gap-2 py-2 text-xs font-medium focus:bg-muted"
        >
          <PdfIcon className="h-4 w-4 shrink-0" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


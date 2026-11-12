import * as React from "react";
import { Search, X, CheckCircle2, XCircle, Trash2, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GlobalExportDropdown } from "@/components/ui/global-export-dropdown";
import { cn } from "@/lib/utils";

export interface GlobalListActionToolbarProps {
  // Search & Filter
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  filterSlot?: React.ReactNode;

  // Primary Add Action
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionIcon?: React.ReactNode;
  canCreate?: boolean;

  // Selection state
  selectedCount?: number;
  totalFilteredCount?: number;
  onClearSelection?: () => void;
  onSelectAllVisible?: () => void;
  isAllVisibleSelected?: boolean;

  // Bulk Actions
  onBulkActivate?: () => void | Promise<void>;
  onBulkDeactivate?: () => void | Promise<void>;
  onBulkDelete?: () => void | Promise<void>;
  canActivate?: boolean;
  canDeactivate?: boolean;
  canDelete?: boolean;
  isActionLoading?: boolean;

  // Export
  onExportExcel?: () => void | Promise<void>;
  onExportPdf?: () => void | Promise<void>;
  isExporting?: boolean;
  canExport?: boolean;

  className?: string;
  children?: React.ReactNode;
}

export function GlobalListActionToolbar({
  searchPlaceholder = "Search records...",
  searchTerm = "",
  onSearchChange,
  filterSlot,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionIcon = <Plus className="h-4 w-4 mr-1.5 shrink-0" />,
  canCreate = true,
  selectedCount = 0,
  totalFilteredCount,
  onClearSelection,
  onSelectAllVisible,
  isAllVisibleSelected = false,
  onBulkActivate,
  onBulkDeactivate,
  onBulkDelete,
  canActivate = true,
  canDeactivate = true,
  canDelete = true,
  isActionLoading = false,
  onExportExcel,
  onExportPdf,
  isExporting = false,
  canExport = true,
  className,
  children
}: GlobalListActionToolbarProps) {
  const hasSelection = selectedCount > 0;

  // Dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState<"activate" | "deactivate" | "delete" | null>(null);

  const handleConfirmAction = async () => {
    if (confirmDialogOpen === "activate" && onBulkActivate) {
      await onBulkActivate();
    } else if (confirmDialogOpen === "deactivate" && onBulkDeactivate) {
      await onBulkDeactivate();
    } else if (confirmDialogOpen === "delete" && onBulkDelete) {
      await onBulkDelete();
    }
    setConfirmDialogOpen(null);
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg transition-colors",
          hasSelection && "bg-muted/30 border-primary/30",
          className
        )}
      >
        {/* LEFT SECTION */}
        {hasSelection ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="text-xs px-2.5 py-0.5 font-medium bg-primary text-primary-foreground">
              {selectedCount} selected
            </Badge>

            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}

            {/* Bulk Status Actions */}
            {onBulkActivate && canActivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialogOpen("activate")}
                disabled={isActionLoading}
                className="h-8 text-xs font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Activate
              </Button>
            )}

            {onBulkDeactivate && canDeactivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialogOpen("deactivate")}
                disabled={isActionLoading}
                className="h-8 text-xs font-medium text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Deactivate
              </Button>
            )}

            {onBulkDelete && canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialogOpen("delete")}
                disabled={isActionLoading}
                className="h-8 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                Delete
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {onSearchChange && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-8 pr-7 h-9 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {filterSlot}
            {children}
          </div>
        )}

        {/* RIGHT SECTION: Export & Primary Action */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {canExport && onExportExcel && onExportPdf && (
            <GlobalExportDropdown
              onExportExcel={onExportExcel}
              onExportPdf={onExportPdf}
              isExporting={isExporting}
              selectedCount={selectedCount}
              totalFilteredCount={totalFilteredCount}
            />
          )}

          {!hasSelection && onPrimaryAction && canCreate && primaryActionLabel && (
            <Button
              onClick={onPrimaryAction}
              size="sm"
              className="h-9 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {primaryActionIcon}
              <span>{primaryActionLabel}</span>
            </Button>
          )}
        </div>
      </div>

      {/* CONFIRMATION ALERT DIALOGS */}
      <AlertDialog open={confirmDialogOpen !== null} onOpenChange={(open) => !open && setConfirmDialogOpen(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              {confirmDialogOpen === "activate" && `Activate ${selectedCount} Record${selectedCount > 1 ? "s" : ""}?`}
              {confirmDialogOpen === "deactivate" && `Deactivate ${selectedCount} Record${selectedCount > 1 ? "s" : ""}?`}
              {confirmDialogOpen === "delete" && `Delete ${selectedCount} Record${selectedCount > 1 ? "s" : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {confirmDialogOpen === "activate" && (
                `Are you sure you want to activate the ${selectedCount} selected record${selectedCount > 1 ? "s" : ""}? They will become available for assignment and active operations.`
              )}
              {confirmDialogOpen === "deactivate" && (
                `Are you sure you want to deactivate the ${selectedCount} selected record${selectedCount > 1 ? "s" : ""}? Inactive records are archived from general selection but historical associations are preserved.`
              )}
              {confirmDialogOpen === "delete" && (
                `This action cannot be undone. Are you sure you want to permanently delete the ${selectedCount} selected record${selectedCount > 1 ? "s" : ""}? Records with protected dependencies or historical audit associations will be rejected.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isActionLoading}
              className={cn(
                "text-xs h-8 font-medium",
                confirmDialogOpen === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isActionLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Processing...
                </>
              ) : confirmDialogOpen === "activate" ? (
                "Confirm Activate"
              ) : confirmDialogOpen === "deactivate" ? (
                "Confirm Deactivate"
              ) : (
                "Confirm Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "destructive" | "default";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
  isLoading = false,
  icon,
}: ConfirmationDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-6">
        {/* Top Warning/Action Icon */}
        <div className="flex flex-col items-center sm:items-start gap-4">
          <div
            className={cn(
              "size-11 rounded-full grid place-items-center shrink-0",
              isDestructive
                ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {icon ? (
              icon
            ) : isDestructive ? (
              <AlertTriangle className="size-5" />
            ) : null}
          </div>

          <div className="space-y-1.5 text-center sm:text-left w-full">
            <AlertDialogHeader className="text-center sm:text-left p-0 space-y-1">
              <AlertDialogTitle className="text-base font-bold text-foreground">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>

            {children && <div className="pt-2 text-xs">{children}</div>}
          </div>
        </div>

        <AlertDialogFooter className="pt-3 border-t border-border/70 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="text-xs h-8.5 font-medium mt-0"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              buttonVariants({
                variant: isDestructive ? "destructive" : "default",
              }),
              "text-xs h-8.5 font-bold gap-1.5 shadow-2xs",
            )}
          >
            {isLoading && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

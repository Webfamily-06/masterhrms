"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-start justify-between gap-3",
  {
    variants: {
      variant: {
        // Solid variants
        default: "bg-background border border-border text-foreground shadow-sm",
        primary: "bg-primary text-white border-0",
        dark: "bg-slate-900 text-white border-0",
        warning: "bg-amber-500 text-white border-0",
        info: "bg-sky-500 text-white border-0",
        success: "bg-emerald-600 text-white border-0",
        danger: "bg-rose-600 text-white border-0",

        // Transparent / Ghost variants (DreamsERP style)
        "ghost-primary": "bg-primary/10 text-primary border border-primary/20",
        "ghost-dark": "bg-slate-800/10 text-slate-900 dark:text-slate-100 border border-slate-700/20",
        "ghost-warning": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
        "ghost-info": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
        "ghost-success": "bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-600/20",
        "ghost-danger": "bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-600/20",

        // Left Border accents (DreamsERP style)
        "border-primary": "bg-card text-foreground border border-border border-s-4 border-s-primary shadow-xs",
        "border-warning": "bg-card text-foreground border border-border border-s-4 border-s-amber-500 shadow-xs",
        "border-success": "bg-card text-foreground border border-border border-s-4 border-s-emerald-600 shadow-xs",
        "border-danger": "bg-card text-foreground border border-border border-s-4 border-s-rose-600 shadow-xs",

        // Outline variants
        "outline-primary": "bg-transparent text-primary border border-primary",
        "outline-dark": "bg-transparent text-slate-800 dark:text-slate-200 border border-slate-700",
        "outline-warning": "bg-transparent text-amber-600 border border-amber-500",
        "outline-info": "bg-transparent text-sky-600 border border-sky-500",
        "outline-success": "bg-transparent text-emerald-600 border border-emerald-600",
        "outline-danger": "bg-transparent text-rose-600 border border-rose-600",
        destructive: "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  onDismiss?: () => void;
  dismissible?: boolean;
  icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, onDismiss, dismissible, icon, children, ...props }, ref) => {
    const [dismissed, setDismissed] = React.useState(false);

    if (dismissed) return null;

    const handleDismiss = () => {
      setDismissed(true);
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && <span className="shrink-0 text-lg mt-0.5">{icon}</span>}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
        {(dismissible || onDismiss) && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close alert"
            className="shrink-0 -mr-1 -mt-1 p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            <i className="ph ph-x text-sm leading-none block"></i>
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold text-sm leading-tight tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed opacity-90", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };

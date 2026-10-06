import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const emptyVariants = cva(
  "flex flex-col items-center justify-center p-6 text-center select-none",
  {
    variants: {
      variant: {
        default: "border border-dashed border-border/80 bg-muted/20 rounded-2xl",
        card: "border border-border/80 bg-card rounded-xl shadow-xs",
        plain: "",
      },
      size: {
        default: "py-12 px-6",
        sm: "py-6 px-4",
        lg: "py-20 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface EmptyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyVariants> {}

function Empty({ className, variant, size, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(emptyVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex flex-col items-center gap-2", className)}
      {...props}
    />
  );
}

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "soft" }) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        "flex items-center justify-center mb-2 transition-transform duration-200 hover:scale-105",
        variant === "soft"
          ? "size-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs"
          : "size-16 rounded-3xl bg-muted/80 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="empty-title"
      className={cn("font-bold tracking-tight text-foreground text-base sm:text-lg", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn("text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed", className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn("mt-4 flex flex-wrap items-center justify-center gap-2", className)}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  emptyVariants,
};

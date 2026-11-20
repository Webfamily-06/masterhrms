"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modern Web Guidance: Native <dialog> Architecture & Top-Layer Animations
 *
 * Implements:
 * 1. Native <dialog> element promoted to top layer via `showModal()`.
 * 2. Declarative light-dismiss with `closedby="any"` and pointer boundary fallback.
 * 3. Smooth entry via `@starting-style` and discrete exit transitions via `transition-behavior: allow-discrete` and `overlay`.
 * 4. Fallback for browsers with discrete transition quirks (data-closing attribute + getAnimations settlement).
 * 5. Full WCAG accessibility: auto-wired aria-labelledby/aria-describedby, native focus trap, Esc dismissal.
 */

interface ModernDialogContextValue {
  isOpen: boolean;
  requestClose: () => void;
  titleId: string;
  descriptionId: string;
}

const ModernDialogContext = React.createContext<ModernDialogContextValue | null>(null);

function useModernDialogContext() {
  const context = React.useContext(ModernDialogContext);
  if (!context) {
    throw new Error("ModernDialog compound components must be used within a ModernDialog");
  }
  return context;
}

// Probe for browser discrete display transition support
let cachedSupportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (cachedSupportsDisplayTransition !== undefined) return cachedSupportsDisplayTransition;
  if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
    return false;
  }
  try {
    const probe = document.createElement("div");
    probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
    document.body.appendChild(probe);
    void getComputedStyle(probe).display;
    probe.style.display = "none";
    cachedSupportsDisplayTransition = getComputedStyle(probe).display === "block";
    probe.remove();
  } catch {
    cachedSupportsDisplayTransition = false;
  }
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.CSS?.supports?.("overlay", "auto")) && canTransitionDisplay();
}

/**
 * Gracefully close top-layer dialogs, allowing exit animations to play.
 */
async function closeTopLayer(element: HTMLDialogElement, onClosed: () => void) {
  if (!supportsTopLayerExit()) {
    element.setAttribute("data-closing", "");
    const animations = typeof element.getAnimations === "function" ? element.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 600)),
      ]);
    }
    if (!element.hasAttribute("data-closing")) return;
    element.removeAttribute("data-closing");
  }

  if (element.open) {
    element.close();
  }
  onClosed();
}

export interface ModernDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  /**
   * "any": Closes on Escape, click-outside, and programmatic close.
   * "closerequest": Closes on Escape and programmatic close.
   * "none": Closes only via developer action.
   */
  closedBy?: "any" | "closerequest" | "none";
}

export function ModernDialog({
  open,
  onOpenChange,
  children,
  closedBy = "any",
}: ModernDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const isClosingRef = React.useRef(false);

  const requestClose = React.useCallback(() => {
    if (isClosingRef.current) return;
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open) {
      onOpenChange?.(false);
      return;
    }

    isClosingRef.current = true;
    void closeTopLayer(dialog, () => {
      isClosingRef.current = false;
      onOpenChange?.(false);
    });
  }, [onOpenChange]);

  // Synchronize modal state with React `open` prop
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.returnValue = "";
        try {
          dialog.showModal();
        } catch {
          // Fallback if already active in top layer
        }
      }
    } else {
      if (dialog.open && !isClosingRef.current) {
        isClosingRef.current = true;
        void closeTopLayer(dialog, () => {
          isClosingRef.current = false;
        });
      }
    }
  }, [open]);

  // Handle native cancel event (Esc key and native close requests)
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (closedBy === "none") return;
      requestClose();
    };

    const handleClose = () => {
      dialog.returnValue = "";
      if (!isClosingRef.current) {
        onOpenChange?.(false);
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [closedBy, requestClose, onOpenChange]);

  // Fallback for browsers lacking native `closedby="any"` light-dismiss
  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || closedBy !== "any") return;

    if (typeof window !== "undefined" && !("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;

      const isOutside = (e: MouseEvent | PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };

      const handlePointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          requestClose();
        }
        pressedOutside = false;
      };

      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
      return () => {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [closedBy, requestClose]);

  const contextValue = React.useMemo<ModernDialogContextValue>(
    () => ({
      isOpen: open,
      requestClose,
      titleId,
      descriptionId,
    }),
    [open, requestClose, titleId, descriptionId],
  );

  return (
    <ModernDialogContext.Provider value={contextValue}>
      <dialog
        ref={dialogRef}
        {...({ closedby: closedBy } as any)}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="modern-dialog"
      >
        {children}
      </dialog>
    </ModernDialogContext.Provider>
  );
}

export interface ModernDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean;
}

export const ModernDialogContent = React.forwardRef<HTMLDivElement, ModernDialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => {
    const { requestClose } = useModernDialogContext();

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col w-[calc(100vw-2rem)] max-w-lg max-h-[90dvh] gap-4",
          "border border-border/80 bg-background text-foreground p-6 shadow-2xl rounded-2xl",
          "font-sans overflow-hidden focus:outline-none",
          className,
        )}
        {...props}
      >
        {children}

        {showCloseButton && (
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-lg p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none cursor-pointer"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  },
);
ModernDialogContent.displayName = "ModernDialogContent";

export const ModernDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left shrink-0", className)} {...props} />
);
ModernDialogHeader.displayName = "ModernDialogHeader";

export const ModernDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { titleId } = useModernDialogContext();
  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn("text-base font-bold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  );
});
ModernDialogTitle.displayName = "ModernDialogTitle";

export const ModernDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { descriptionId } = useModernDialogContext();
  return (
    <p
      ref={ref}
      id={descriptionId}
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
});
ModernDialogDescription.displayName = "ModernDialogDescription";

export const ModernDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 overflow-y-auto -mx-6 px-6 py-2 text-xs", className)} {...props} />
);
ModernDialogBody.displayName = "ModernDialogBody";

export const ModernDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border/70 shrink-0 mt-2",
      className,
    )}
    {...props}
  />
);
ModernDialogFooter.displayName = "ModernDialogFooter";

export const ModernDialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { requestClose } = useModernDialogContext();

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) {
          requestClose();
        }
      }}
      className={className}
      {...props}
    />
  );
});
ModernDialogClose.displayName = "ModernDialogClose";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  showCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, showCount, maxLength, value, defaultValue, onChange, ...props }, ref) => {
    const [charCount, setCharCount] = React.useState<number>(() => {
      if (typeof value === "string") return value.length;
      if (typeof defaultValue === "string") return defaultValue.length;
      return 0;
    });

    React.useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    const textareaEl = (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-all duration-150 placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        {...props}
      />
    );

    if (showCount && maxLength !== undefined) {
      return (
        <div className="relative w-full">
          {textareaEl}
          <div className="mt-1 flex justify-end text-xs text-muted-foreground">
            <span>
              {charCount} / {maxLength}
            </span>
          </div>
        </div>
      );
    }

    return textareaEl;
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

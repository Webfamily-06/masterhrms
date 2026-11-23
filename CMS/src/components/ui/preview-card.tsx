"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface PreviewCardProps {
  title: string;
  description?: string;
  code?: string;
  children: React.ReactNode;
  className?: string;
}

export function PreviewCard({
  title,
  description,
  code,
  children,
  className,
}: PreviewCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div
      className={cn(
        "preview-card bg-card text-card-foreground rounded-lg border border-border/80 p-5 shadow-sm transition-all hover:border-border",
        className
      )}
    >
      <div className="pb-4 mb-4 flex items-center justify-between flex-wrap gap-2 border-b border-border/60">
        <div>
          <h3 className="text-foreground text-base font-semibold tracking-tight m-0">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {code && (
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="inline-flex items-center gap-1.5 border border-border/80 py-1.5 px-2.5 text-xs font-medium rounded-md bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer"
            aria-expanded={showCode}
          >
            <i
              className={cn(
                "text-sm ph",
                showCode ? "ph-eye-slash" : "ph-code"
              )}
            ></i>
            <span>{showCode ? "Show Preview" : "Show Code"}</span>
          </button>
        )}
      </div>

      {!showCode ? (
        <div className="preview-content rounded-md p-1 min-h-[50px]">
          {children}
        </div>
      ) : (
        <div className="relative mt-2 bg-slate-950 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-hidden">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 z-10 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all border border-slate-700 cursor-pointer shadow-sm"
            aria-label="Copy code to clipboard"
          >
            <i
              className={cn(
                "ph text-xs",
                copied ? "ph-check text-emerald-400" : "ph-copy"
              )}
            ></i>
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          <pre className="max-h-[350px] overflow-auto pr-16 pt-1 text-slate-300 leading-relaxed scrollbar-thin">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DocumentExportIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Genuine inline SVG Excel icon (emerald spreadsheet branding).
 * Uses zero external asset files to eliminate broken image links and missing SVG errors.
 */
export function ExcelIcon({ className, ...props }: DocumentExportIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 text-emerald-600 dark:text-emerald-400 shrink-0 inline-block align-middle", className)}
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h2" />
      <path d="M8 17h2" />
      <path d="M14 13h2" />
      <path d="M14 17h2" />
    </svg>
  );
}

/**
 * Genuine inline SVG CSV icon (blue tabular document branding).
 */
export function CsvIcon({ className, ...props }: DocumentExportIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 text-blue-600 dark:text-blue-400 shrink-0 inline-block align-middle", className)}
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

/**
 * Genuine inline SVG PDF icon (rose/red PDF document branding).
 */
export function PdfIcon({ className, ...props }: DocumentExportIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 text-rose-600 dark:text-rose-400 shrink-0 inline-block align-middle", className)}
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13v4" />
      <path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9" />
      <path d="M13 13v4" />
      <path d="M13 13h1a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-1" />
    </svg>
  );
}

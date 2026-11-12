import * as React from "react";
import { cn } from "@/lib/utils";

export interface DocumentExportIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export function ExcelIcon({ className, ...props }: DocumentExportIconProps) {
  return (
    <img
      src="/excel.svg"
      alt="Excel"
      className={cn("h-4 w-4 shrink-0 object-contain inline-block align-middle", className)}
      {...props}
    />
  );
}

export function PdfIcon({ className, ...props }: DocumentExportIconProps) {
  return (
    <img
      src="/pdf.svg"
      alt="PDF"
      className={cn("h-4 w-4 shrink-0 object-contain inline-block align-middle", className)}
      {...props}
    />
  );
}


import React, { useState } from "react";
import { getCountryFlagUrl, getCountryCode } from "@/lib/flags";
import { cn } from "@/lib/utils";

export interface CountryFlagProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  country?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  xs: "w-4 h-3",
  sm: "w-5 h-3.5",
  md: "w-6 h-4",
  lg: "w-8 h-5.5",
};

export function CountryFlag({
  country,
  className,
  size = "sm",
  alt,
  ...props
}: CountryFlagProps) {
  const [hasError, setHasError] = useState(false);
  const code = getCountryCode(country);
  const flagUrl = getCountryFlagUrl(country);

  if (hasError) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center bg-muted text-[10px] font-bold uppercase rounded-xs border border-border/60 select-none text-muted-foreground",
          SIZE_CLASSES[size],
          className
        )}
        title={country || code}
      >
        {code.toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={flagUrl}
      alt={alt || `${country || code} flag`}
      loading="lazy"
      onError={() => setHasError(true)}
      className={cn(
        "inline-block object-cover rounded-xs border border-border/50 shadow-2xs flex-shrink-0 align-middle",
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}

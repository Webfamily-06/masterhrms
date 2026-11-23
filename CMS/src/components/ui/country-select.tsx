'use client';

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { COUNTRIES, getCountryFlagUrl, getCountryCode } from "@/lib/flags";
import { CountryFlag } from "./country-flag";
import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { cn } from "@/lib/utils";

export interface CountrySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  returnType?: "name" | "code"; // whether onValueChange receives "India" or "IN"
}

export function CountrySelect({
  value,
  onValueChange,
  onChange,
  placeholder = "Select country...",
  disabled = false,
  className,
  returnType = "name",
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const handleChange = (val: string) => {
    if (onValueChange) onValueChange(val);
    if (onChange) onChange(val);
    setOpen(false);
  };

  // Find currently selected country
  const selectedCountry = React.useMemo(() => {
    if (!value) return null;
    const clean = value.trim().toLowerCase();
    return COUNTRIES.find(
      (c) => c.name.toLowerCase() === clean || c.code.toLowerCase() === clean
    );
  }, [value]);

  const filteredCountries = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phoneCode && c.phoneCode.includes(q))
    );
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal bg-card h-9 px-3 text-left border-border/80 hover:bg-muted/40",
            !selectedCountry && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2 truncate">
              <CountryFlag country={selectedCountry.code} size="sm" />
              <span className="truncate text-foreground text-sm font-medium">
                {selectedCountry.name}
              </span>
              <span className="text-xs text-muted-foreground ml-auto pr-1">
                ({selectedCountry.code})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover text-popover-foreground shadow-lg border rounded-lg overflow-hidden" align="start">
        <div className="p-2 border-b border-border/60 bg-muted/30 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground outline-none border-none"
            placeholder="Search country or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1 text-sm divide-y divide-border/20">
          {filteredCountries.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No country found.
            </div>
          ) : (
            filteredCountries.map((country) => {
              const isSelected =
                selectedCountry?.code === country.code ||
                selectedCountry?.name === country.name;
              return (
                <button
                  type="button"
                  key={country.code}
                  onClick={() =>
                    handleChange(returnType === "code" ? country.code : country.name)
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <CountryFlag country={country.code} size="sm" />
                    <span className="truncate">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground ml-2">
                    {country.phoneCode && (
                      <span className="font-mono text-[11px] text-muted-foreground/80">
                        {country.phoneCode}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

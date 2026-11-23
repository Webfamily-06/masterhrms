'use client';

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, getCountryCode } from "@/lib/flags";
import { CountryFlag } from "./country-flag";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "IN",
  placeholder = "98765 43210",
  disabled = false,
  className,
  id,
  name,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Parse dial code and local number from value
  const { initialCountry, initialNumber } = React.useMemo(() => {
    if (!value) {
      const def = COUNTRIES.find(
        (c) => c.code.toLowerCase() === defaultCountry.toLowerCase()
      ) || COUNTRIES[0];
      return { initialCountry: def, initialNumber: "" };
    }

    const trimmed = value.trim();
    if (trimmed.startsWith("+")) {
      // Find matching country by longest dial code prefix
      const match = [...COUNTRIES]
        .filter((c) => c.phoneCode && trimmed.startsWith(c.phoneCode))
        .sort((a, b) => (b.phoneCode?.length || 0) - (a.phoneCode?.length || 0))[0];

      if (match && match.phoneCode) {
        const num = trimmed.slice(match.phoneCode.length).trim();
        return { initialCountry: match, initialNumber: num };
      }
    }

    const def = COUNTRIES.find(
      (c) => c.code.toLowerCase() === defaultCountry.toLowerCase()
    ) || COUNTRIES[0];
    return { initialCountry: def, initialNumber: trimmed };
  }, [value, defaultCountry]);

  const [selectedCountry, setSelectedCountry] = React.useState(initialCountry);
  const [phoneNumber, setPhoneNumber] = React.useState(initialNumber);

  // Sync state if external value changes
  React.useEffect(() => {
    if (initialCountry.code !== selectedCountry.code) {
      setSelectedCountry(initialCountry);
    }
    setPhoneNumber(initialNumber);
  }, [initialCountry, initialNumber]);

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setOpen(false);
    const dial = country.phoneCode || "+1";
    const full = phoneNumber ? `${dial} ${phoneNumber.trim()}` : "";
    if (onChange) onChange(full);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setPhoneNumber(raw);
    const dial = selectedCountry.phoneCode || "+1";
    const full = raw ? `${dial} ${raw.trim()}` : "";
    if (onChange) onChange(full);
  };

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
    <div className={cn("flex rounded-md shadow-2xs border border-border/80 bg-card overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/40 hover:bg-muted/70 text-sm font-medium border-r border-border/70 transition-colors shrink-0 disabled:opacity-50 cursor-pointer select-none"
            title={`Select country dial code (current: ${selectedCountry.name} ${selectedCountry.phoneCode})`}
          >
            <CountryFlag country={selectedCountry.code} size="sm" />
            <span className="font-mono text-xs text-foreground font-semibold">
              {selectedCountry.phoneCode}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
          </button>
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
            {filteredCountries.map((country) => {
              const isSelected = selectedCountry.code === country.code;
              return (
                <button
                  type="button"
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <CountryFlag country={country.code} size="sm" />
                    <span className="truncate">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono text-muted-foreground ml-2">
                    <span>{country.phoneCode}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        name={name}
        type="tel"
        disabled={disabled}
        value={phoneNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        className="border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-1.5 text-sm h-9 flex-1"
      />
    </div>
  );
}

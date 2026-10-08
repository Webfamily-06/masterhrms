import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  keywords?: string[];
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  triggerClassName,
  disabled = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value.toLowerCase() === value?.toLowerCase()),
    [options, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal h-10 px-3 bg-background hover:bg-muted/30 border-input text-sm",
            !selectedOption && "text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-[--radix-popover-trigger-width] min-w-[280px] p-0 shadow-lg border-border", className)}
      >
        <Command
          filter={(itemValue, search) => {
            const opt = options.find((o) => o.value.toLowerCase() === itemValue.toLowerCase());
            if (!opt) return 0;
            const needle = search.toLowerCase().trim();
            if (opt.label.toLowerCase().includes(needle)) return 1;
            if (opt.value.toLowerCase().includes(needle)) return 1;
            if (opt.sublabel && opt.sublabel.toLowerCase().includes(needle)) return 1;
            if (opt.keywords && opt.keywords.some((k) => k.toLowerCase().includes(needle))) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} autoFocus className="h-9 text-sm" />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = option.value.toLowerCase() === value?.toLowerCase();
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between py-2 px-2.5 text-xs cursor-pointer rounded-sm aria-selected:bg-primary/10 aria-selected:text-primary",
                      isSelected && "font-semibold bg-primary/5 text-primary"
                    )}
                  >
                    <span className="truncate pr-2">{option.label}</span>
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-primary transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

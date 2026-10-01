// components/simple-multi-select.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Option = {
  value: string;
  label: string;
};

type MultiSelectProps = {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function SimpleMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
    setSearchTerm('');
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter(item => item !== value));
  };

  const filteredOptions = options.filter(option =>
    !selected.includes(option.value) &&
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`${className ?? ''}`}>
      {/* Input trigger */}
      <div
        className="flex flex-wrap gap-1 p-2 border rounded-md min-h-[38px] cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selected.map(value => {
          const option = options.find(o => o.value === value);
          return (
            <Badge key={value} variant="secondary" className="rounded-sm px-1 font-normal">
              {option?.label || value}
              <button
                type="button"
                className="ml-1 rounded-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(value);
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          );
        })}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 outline-none bg-transparent min-w-[50px] text-sm"
        />
      </div>

      {/* Inline options list — expands modal height, no overflow clipping */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="mt-1 w-full border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-sm">
          {filteredOptions.map(option => (
            <div
              key={option.value}
              className="px-3 py-2 cursor-pointer text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option.value);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
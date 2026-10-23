"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, User, X, Check, Loader2, ChevronsUpDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EligibleRecipient {
  id: string; // Authenticated User ID
  name: string;
  email: string;
  department?: string;
  avatarUrl?: string;
}

interface OrganizationMemberSelectorProps {
  value: string; // Selected userId
  onChange: (userId: string, member?: EligibleRecipient | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function OrganizationMemberSelector({
  value,
  onChange,
  placeholder = "Select an organization member...",
  className,
  disabled = false,
}: OrganizationMemberSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch eligible recipients for authenticated tenant
  const {
    data: members = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EligibleRecipient[]>({
    queryKey: ["eligible-recipients", searchQuery],
    queryFn: async () => {
      const q = searchQuery.trim();
      const endpoint = q
        ? `/api/calendar/eligible-recipients?q=${encodeURIComponent(q)}`
        : `/api/calendar/eligible-recipients`;
      const res = await api.get(endpoint);
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    staleTime: 30000,
  });

  // Track the selected member object even across search filtering
  const selectedMember = useMemo(() => {
    if (!value) return null;
    return members.find((m) => m.id === value) || null;
  }, [value, members]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (member: EligibleRecipient) => {
    onChange(member.id, member);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", null);
    setSearchQuery("");
  };

  // Helper for member initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger: Either Selected Member Chip or Input Button */}
      {selectedMember || value ? (
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-1.5 h-9 rounded-md border border-input bg-background hover:bg-muted/30 transition-colors cursor-pointer text-xs",
            isOpen && "ring-1 ring-teal-600 border-teal-600",
            disabled && "opacity-50 pointer-events-none cursor-not-allowed"
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selectedMember?.avatarUrl ? (
              <img
                src={selectedMember.avatarUrl}
                alt={selectedMember.name}
                className="size-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="size-5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {getInitials(selectedMember?.name || value)}
              </div>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold text-foreground text-xs truncate">
                {selectedMember?.name || "Selected Member"}
              </span>
              {selectedMember?.department && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate hidden sm:inline-block">
                  {selectedMember.department}
                </span>
              )}
              {selectedMember?.email && (
                <span className="text-[11px] text-muted-foreground truncate">
                  ({selectedMember.email})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Clear selection"
            >
              <X className="size-3.5" />
            </button>
            <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-60" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-1.5 h-9 rounded-md border border-input bg-background hover:bg-muted/30 transition-colors text-xs text-left",
            isOpen ? "ring-1 ring-teal-600 border-teal-600" : "text-muted-foreground",
            disabled && "opacity-50 pointer-events-none cursor-not-allowed"
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="flex items-center gap-2 truncate">
            <User className="size-3.5 text-muted-foreground flex-shrink-0" />
            <span>{placeholder}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-60 flex-shrink-0" />
        </button>
      )}

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
          role="listbox"
        >
          {/* Search Header */}
          <div className="flex items-center px-2.5 py-2 border-b border-border/60 bg-muted/20">
            <Search className="size-3.5 text-muted-foreground mr-2 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member by name or email..."
              className="w-full text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-teal-600" />
                <span>Loading organization members...</span>
              </div>
            ) : isError ? (
              <div className="py-4 px-3 text-center text-xs text-destructive flex flex-col items-center gap-1">
                <AlertCircle className="size-4" />
                <span>Failed to load members: {(error as any)?.message || "Network Error"}</span>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-[11px] underline text-teal-600 hover:text-teal-700 mt-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : members.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                {searchQuery ? `No members found matching "${searchQuery}"` : "No eligible organization members found."}
              </div>
            ) : (
              members.map((member) => {
                const isSelected = member.id === value;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleSelect(member)}
                    className={cn(
                      "flex items-center justify-between w-full px-2.5 py-2 text-left rounded-md transition-colors cursor-pointer",
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-100 font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          className="size-7 rounded-full object-cover flex-shrink-0 border border-border/50"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-foreground truncate">{member.name}</p>
                          {member.department && (
                            <span className="text-[10px] bg-muted/80 text-muted-foreground px-1.5 py-0.2 rounded font-normal truncate hidden sm:inline-block">
                              {member.department}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 text-teal-600 flex-shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

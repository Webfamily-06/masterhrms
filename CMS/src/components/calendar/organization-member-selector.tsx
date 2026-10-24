"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, User, X, Check, Loader2, ChevronsUpDown, AlertCircle, Plus, Shield, Eye, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EligibleRecipient {
  id: string; // Authenticated User ID
  name: string;
  email: string;
  department?: string;
  avatarUrl?: string;
}

export interface SelectedShare {
  recipientId: string;
  permission: "view" | "edit";
  name?: string;
  email?: string;
  department?: string;
  avatarUrl?: string;
}

interface OrganizationMemberSelectorProps {
  // Multi-select mode (primary)
  value?: SelectedShare[];
  onChange?: (shares: SelectedShare[]) => void;

  // Single-select mode (backward-compatibility)
  singleValue?: string;
  onSingleChange?: (userId: string, member?: EligibleRecipient | null) => void;

  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function OrganizationMemberSelector({
  value,
  onChange,
  singleValue,
  onSingleChange,
  placeholder = "Search and add organization members...",
  className,
  disabled = false,
  readOnly = false,
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

  // Determine if using multi-select or single-select mode
  const isMulti = value !== undefined && onChange !== undefined;
  const currentShares: SelectedShare[] = useMemo(() => {
    if (isMulti) return value || [];
    if (singleValue) {
      const m = members.find((x) => x.id === singleValue);
      return [
        {
          recipientId: singleValue,
          permission: "view",
          name: m?.name,
          email: m?.email,
          department: m?.department,
          avatarUrl: m?.avatarUrl,
        },
      ];
    }
    return [];
  }, [isMulti, value, singleValue, members]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (member: EligibleRecipient) => {
    if (isMulti && onChange) {
      const existing = currentShares.find((s) => s.recipientId === member.id);
      if (!existing) {
        onChange([
          ...currentShares,
          {
            recipientId: member.id,
            permission: "view",
            name: member.name,
            email: member.email,
            department: member.department,
            avatarUrl: member.avatarUrl,
          },
        ]);
      }
      setIsOpen(false);
      setSearchQuery("");
    } else if (onSingleChange) {
      onSingleChange(member.id, member);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleRemove = (recipientId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isMulti && onChange) {
      onChange(currentShares.filter((s) => s.recipientId !== recipientId));
    } else if (onSingleChange) {
      onSingleChange("", null);
    }
  };

  const handlePermissionChange = (recipientId: string, newPermission: "view" | "edit", e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (isMulti && onChange) {
      onChange(
        currentShares.map((s) => (s.recipientId === recipientId ? { ...s, permission: newPermission } : s))
      );
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div ref={containerRef} className={cn("space-y-2.5 w-full", className)}>
      {/* Trigger / Search Input Button */}
      {!readOnly && (
        <div className="relative">
          <div
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-2 min-h-9 rounded-md border border-input bg-background hover:bg-muted/30 transition-colors cursor-pointer text-xs",
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
            <div className="flex items-center gap-2 text-muted-foreground flex-1 overflow-hidden">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{placeholder}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {currentShares.length} added
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Dropdown Popover */}
          {isOpen && (
            <div
              className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
              style={{ maxHeight: "320px" }}
            >
              {/* Filter Search Input */}
              <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70">
                <Search className="size-3.5 text-muted-foreground shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by name, email, or dept..."
                  className="w-full bg-transparent text-xs border-0 outline-hidden placeholder:text-muted-foreground focus:ring-0 px-1 py-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-1 text-muted-foreground hover:text-foreground rounded"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="max-h-56 overflow-y-auto p-1 text-xs">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-teal-600" />
                    <span>Loading organization members...</span>
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-5 px-3 text-center">
                    <AlertCircle className="size-5 text-rose-500" />
                    <span className="text-rose-600 font-medium">Failed to load members</span>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : members.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">
                    {searchQuery ? `No members found matching "${searchQuery}".` : "No eligible members found."}
                  </div>
                ) : (
                  members.map((member) => {
                    const isAlreadySelected = currentShares.some((s) => s.recipientId === member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => handleSelect(member)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-2 rounded cursor-pointer transition-colors select-none",
                          isAlreadySelected
                            ? "bg-teal-50/70 text-teal-900 font-medium"
                            : "hover:bg-slate-100 text-slate-800"
                        )}
                        role="option"
                        aria-selected={isAlreadySelected}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="size-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="size-7 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] shrink-0 border border-teal-200">
                              {getInitials(member.name)}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0 text-left">
                            <span className="truncate font-medium">{member.name}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="truncate">{member.email}</span>
                              {member.department && (
                                <>
                                  <span>•</span>
                                  <span className="truncate bg-slate-100 text-slate-600 px-1 rounded">
                                    {member.department}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAlreadySelected && <Check className="size-4 text-teal-600 shrink-0 ml-2" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Members Cards List */}
      {currentShares.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between px-0.5">
            <span>Selected Recipients ({currentShares.length}):</span>
            {!readOnly && (
              <span className="text-[10px] text-slate-400">Set individual View / Edit permissions</span>
            )}
          </div>
          <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-0.5">
            {currentShares.map((share) => {
              const memberInfo = members.find((m) => m.id === share.recipientId);
              const displayName = share.name || memberInfo?.name || "Team Member";
              const displayEmail = share.email || memberInfo?.email || "";
              const displayDept = share.department || memberInfo?.department;
              const avatar = share.avatarUrl || memberInfo?.avatarUrl;

              return (
                <div
                  key={share.recipientId}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={displayName}
                        className="size-6 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="size-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[9px] shrink-0">
                        {getInitials(displayName)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{displayName}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {displayDept ? `${displayDept} • ` : ""}
                        {displayEmail}
                      </div>
                    </div>
                  </div>

                  {/* Permission Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!readOnly ? (
                      <select
                        value={share.permission}
                        onChange={(e) => handlePermissionChange(share.recipientId, e.target.value as any, e)}
                        className="text-[11px] font-medium h-7 px-2 py-0.5 rounded border border-input bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-600 cursor-pointer"
                      >
                        <option value="view">View Only</option>
                        <option value="edit">Can Edit</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {share.permission === "edit" ? <Edit3 className="size-2.5 text-blue-600" /> : <Eye className="size-2.5 text-slate-500" />}
                        {share.permission === "edit" ? "Can Edit" : "View Only"}
                      </span>
                    )}

                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleRemove(share.recipientId, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove recipient"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

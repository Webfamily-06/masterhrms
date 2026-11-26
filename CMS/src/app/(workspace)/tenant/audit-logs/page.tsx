'use client';

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspaceSettings } from "@/src/context/workspace-settings-context";

interface LoginHistoryItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string;
  location: string;
  browser: string;
  os: string;
  deviceType: string;
  language: string;
  role: string;
  loginAt: string;
}

export default function TenantAuditLogsPage() {
  const { formatDateTime } = useWorkspaceSettings();

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<"user" | "ip" | "role" | "time">("time");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data, isLoading, isFetching, refetch } = useQuery<{ items: LoginHistoryItem[]; total: number }>({
    queryKey: ["tenant-user-login-history"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/login-history");
      const raw = res?.data || res || {};
      return {
        items: Array.isArray(raw.items) ? raw.items : [],
        total: Number(raw.total || 0),
      };
    },
    refetchInterval: 15_000, // Real-time refresh every 15s
  });

  const allItems = data?.items || [];

  const uniqueRoles = useMemo(
    () => Array.from(new Set(allItems.map((i) => i.role).filter(Boolean))).sort(),
    [allItems]
  );

  const filteredItems = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    const list = allItems.filter((item) => {
      if (roleFilter !== "all" && item.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
      if (deviceFilter !== "all" && item.deviceType.toLowerCase() !== deviceFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        item.userName.toLowerCase().includes(q) ||
        item.userEmail.toLowerCase().includes(q) ||
        item.ipAddress.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.browser.toLowerCase().includes(q) ||
        item.os.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortKey === "time") {
        const diff = new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      const getVal = (x: LoginHistoryItem) => {
        if (sortKey === "ip") return x.ipAddress.toLowerCase();
        if (sortKey === "role") return x.role.toLowerCase();
        return x.userName.toLowerCase();
      };
      return sortDir === "asc" ? getVal(a).localeCompare(getVal(b)) : getVal(b).localeCompare(getVal(a));
    });
    return list;
  }, [allItems, appliedSearch, roleFilter, deviceFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((safePage - 1) * perPage, safePage * perPage);
  const startIdx = filteredItems.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIdx = Math.min(safePage * perPage, filteredItems.length);

  const toggleSort = (key: "user" | "ip" | "role" | "time") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "time" ? "desc" : "asc");
    }
  };

  const activeFilterCount = (roleFilter !== "all" ? 1 : 0) + (deviceFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-5">
      <PageHeader
        title="User Login History"
        description="Real-time login history, IP addresses, devices, browsers, and locations for your organization."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 text-xs gap-1.5"
          >
            <i className={cn("ph ph-arrows-clockwise text-sm", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-4 space-y-4">
          {/* Top Toolbar matching reference screenshot */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedSearch(searchInput);
                setPage(1);
              }}
              className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md"
            >
              <div className="relative flex-1">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value) setAppliedSearch("");
                  }}
                  placeholder="Search by user name..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[124px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                    <i className="ph ph-funnel text-sm" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                    <i className="ph ph-caret-down text-xs opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Role</Label>
                    <Select
                      value={roleFilter}
                      onValueChange={(v) => {
                        setRoleFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Device Type</Label>
                    <Select
                      value={deviceFilter}
                      onValueChange={(v) => {
                        setDeviceFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Devices</SelectItem>
                        <SelectItem value="desktop">Desktop</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="tablet">Tablet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoleFilter("all");
                        setDeviceFilter("all");
                        setPage(1);
                      }}
                      className="w-full h-8 text-xs text-rose-600 hover:bg-rose-500/10"
                    >
                      Reset Filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Login History Table (Exact Reference Layout) */}
          <div className="overflow-x-auto border border-border/80 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("user")}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                    >
                      User <i className="ph ph-arrows-down-up text-xs" />
                    </button>
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("ip")}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                    >
                      IP Address <i className="ph ph-arrows-down-up text-xs" />
                    </button>
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">
                    Location &amp; Device
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("role")}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                    >
                      Role <i className="ph ph-arrows-down-up text-xs" />
                    </button>
                  </th>
                  <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("time")}
                      className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                    >
                      Time <i className="ph ph-arrows-down-up text-xs" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
                      Loading real-time login history...
                    </td>
                  </tr>
                ) : paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted-foreground">
                      No login history records found for your workspace yet.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/35 transition-colors align-middle">
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground leading-tight">{item.userName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.userEmail}</p>
                      </td>
                      <td className="p-3.5 font-medium text-foreground">{item.ipAddress}</td>
                      <td className="p-3.5">
                        <div className="space-y-0.5 leading-snug">
                          <p className="font-semibold text-foreground">{item.location}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.browser} on {item.os}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{item.deviceType}</p>
                          <p className="text-[11px] text-muted-foreground">Lang: {item.language}</p>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {item.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-foreground whitespace-nowrap">
                        {formatDateTime(item.loginAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span>
              Showing {startIdx} to {endIdx} of {filteredItems.length} results
            </span>
            <div className="inline-flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                <i className="ph ph-caret-left mr-1" />
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, safePage - 3), Math.min(totalPages, safePage + 2))
                .map((pNum) => (
                  <Button
                    key={pNum}
                    type="button"
                    size="sm"
                    variant={pNum === safePage ? "default" : "outline"}
                    onClick={() => setPage(pNum)}
                    className={cn(
                      "h-8 w-8 p-0 text-xs",
                      pNum === safePage && "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
                    )}
                  >
                    {pNum}
                  </Button>
                ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
                <i className="ph ph-caret-right ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

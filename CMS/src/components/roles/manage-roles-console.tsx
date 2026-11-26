'use client';

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RoleUserSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface WorkspaceRoleItem {
  id: string;
  name: string;
  label?: string;
  description?: string | null;
  isActive: boolean;
  isSystem: boolean;
  usersCount: number;
  users?: RoleUserSummary[];
  permissionsCount: number;
  permissionCodes: string[];
}

interface PermissionCatalogItem {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
  name: string;
  description?: string | null;
}

const MODULE_TAB_ORDER = [
  "General",
  "HRM",
  "CRM",
  "POS",
  "Accounting",
  "Finance",
  "Projects",
  "Assets",
  "Inventory",
  "Recruitment",
  "Payroll",
  "Support",
];

function normalizeModuleLabel(rawModule: string): string {
  const m = String(rawModule || "General").trim();
  const lower = m.toLowerCase();
  if (lower === "hrm" || lower === "hr" || lower === "hrms") return "HRM";
  if (lower === "crm") return "CRM";
  if (lower === "pos") return "POS";
  if (lower === "core" || lower === "system" || lower === "workspace" || lower === "general" || lower === "platform") {
    return "General";
  }
  return m.charAt(0).toUpperCase() + m.slice(1);
}

function formatResourceHeading(resource: string): string {
  return String(resource || "General")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name?: string): string {
  const parts = String(name || "U").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

export function ManageRolesConsole() {
  const queryClient = useQueryClient();

  // List/Grid state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<"name" | "label">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Create/Edit mode state
  const [editorMode, setEditorMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [moduleSearch, setModuleSearch] = useState("");
  const [activeModuleTab, setActiveModuleTab] = useState<string>("HRM");
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceRoleItem | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery<WorkspaceRoleItem[]>({
    queryKey: ["workspace-roles-list"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/roles");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  const { data: permCatalogData } = useQuery<{
    permissions: PermissionCatalogItem[];
    hrDefaultPermissionCodes: string[];
  }>({
    queryKey: ["workspace-permissions-catalog"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/permissions");
      const raw = res?.data || res || {};
      return {
        permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
        hrDefaultPermissionCodes: Array.isArray(raw.hrDefaultPermissionCodes)
          ? raw.hrDefaultPermissionCodes
          : [],
      };
    },
  });

  const permissions = permCatalogData?.permissions || [];
  const hrDefaultCodes = permCatalogData?.hrDefaultPermissionCodes || [];

  // Group permissions by Module -> Resource
  const permissionsByModule = useMemo(() => {
    const map = new Map<string, Map<string, PermissionCatalogItem[]>>();
    for (const perm of permissions) {
      const mod = normalizeModuleLabel(perm.module);
      if (!map.has(mod)) map.set(mod, new Map());
      const resMap = map.get(mod)!;
      const resKey = perm.resource || "general";
      if (!resMap.has(resKey)) resMap.set(resKey, []);
      resMap.get(resKey)!.push(perm);
    }
    return map;
  }, [permissions]);

  const moduleTabs = useMemo(() => {
    const allMods = Array.from(permissionsByModule.keys());
    const ordered = allMods.sort((a, b) => {
      const ia = MODULE_TAB_ORDER.indexOf(a);
      const ib = MODULE_TAB_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((mod) => {
      if (mod.toLowerCase().includes(q)) return true;
      const resMap = permissionsByModule.get(mod);
      if (!resMap) return false;
      for (const [resName, items] of resMap.entries()) {
        if (resName.toLowerCase().includes(q)) return true;
        if (items.some((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))) {
          return true;
        }
      }
      return false;
    });
  }, [permissionsByModule, moduleSearch]);

  const effectiveTab = moduleTabs.includes(activeModuleTab)
    ? activeModuleTab
    : moduleTabs[0] || "HRM";

  // Mutations
  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const cleanName = roleName.trim();
      const cleanLabel = roleLabel.trim() || cleanName;
      if (!cleanName) throw new Error("Role Name is required.");
      const payload = {
        name: cleanName,
        description: cleanLabel,
        permissionCodes: Array.from(selectedCodes),
        isActive: true,
      };
      if (editorMode === "edit" && editingRoleId) {
        return await api.put(`/workspace/roles/${editingRoleId}`, payload);
      }
      return await api.post("/workspace/roles", payload);
    },
    onSuccess: () => {
      toast.success(editorMode === "edit" ? "Role permissions updated." : "Role created successfully.");
      queryClient.invalidateQueries({ queryKey: ["workspace-roles-list"] });
      setEditorMode("closed");
      setEditingRoleId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save role.");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => api.delete(`/workspace/roles/${roleId}`),
    onSuccess: () => {
      toast.success("Role deleted.");
      queryClient.invalidateQueries({ queryKey: ["workspace-roles-list"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete role.");
    },
  });

  const syncHrDefaultsMutation = useMutation({
    mutationFn: async () => api.post("/workspace/roles/sync-hr-defaults", {}),
    onSuccess: (res: any) => {
      toast.success(res?.message || "HR default permissions synced.");
      queryClient.invalidateQueries({ queryKey: ["workspace-roles-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to sync HR defaults.");
    },
  });

  // Filtered + Sorted + Paginated roles
  const filteredRoles = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    const list = q
      ? roles.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            String(r.label || r.description || "").toLowerCase().includes(q)
        )
      : [...roles];

    list.sort((a, b) => {
      const av = (sortKey === "label" ? a.label || a.name : a.name).toLowerCase();
      const bv = (sortKey === "label" ? b.label || b.name : b.name).toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [roles, appliedSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedRoles = filteredRoles.slice((safePage - 1) * perPage, safePage * perPage);
  const startIdx = filteredRoles.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIdx = Math.min(safePage * perPage, filteredRoles.length);

  const openCreateRole = () => {
    setEditorMode("create");
    setEditingRoleId(null);
    setRoleName("");
    setRoleLabel("");
    setSelectedCodes(new Set());
    setModuleSearch("");
    setActiveModuleTab("HRM");
  };

  const openEditRole = (role: WorkspaceRoleItem) => {
    setEditorMode("edit");
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleLabel(role.description || role.label || role.name);
    setSelectedCodes(new Set(role.permissionCodes || []));
    setModuleSearch("");
    setActiveModuleTab("HRM");
  };

  const togglePermissionCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleResourceGroup = (items: PermissionCatalogItem[]) => {
    const allChecked = items.every((i) => selectedCodes.has(i.code));
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (allChecked) next.delete(item.code);
        else next.add(item.code);
      }
      return next;
    });
  };

  const applyHrDefaultPreset = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      for (const code of hrDefaultCodes) next.add(code);
      return next;
    });
    toast.success(`Applied ${hrDefaultCodes.length} HRM default permissions (Working Days & IP Restrictions skipped).`);
  };

  // =========================================================================
  // CREATE / EDIT ROLE SCREEN (Matches Screenshot 3)
  // =========================================================================
  if (editorMode !== "closed") {
    const currentModuleResources = permissionsByModule.get(effectiveTab) || new Map();
    const q = moduleSearch.trim().toLowerCase();
    const visibleResourceEntries = Array.from(currentModuleResources.entries()).filter(([resKey, items]) => {
      if (!q) return true;
      if (effectiveTab.toLowerCase().includes(q) || resKey.toLowerCase().includes(q)) return true;
      return items.some((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    });

    return (
      <div className="w-full space-y-5">
        <PageHeader
          title={editorMode === "create" ? "Create New Role" : `Edit Role: ${roleName}`}
          description="Configure role identity and module-level granular permissions."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyHrDefaultPreset}
                className="h-9 text-xs gap-1.5"
              >
                <i className="ph ph-magic-wand text-primary" />
                Apply HR Default Permissions
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditorMode("closed")}
                className="h-9 text-xs gap-1.5"
              >
                <i className="ph ph-arrow-left" />
                Back to Roles
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saveRoleMutation.isPending}
                onClick={() => saveRoleMutation.mutate()}
                className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <i className={saveRoleMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
                {editorMode === "create" ? "Create Role" : "Save Changes"}
              </Button>
            </div>
          }
        />

        <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
          <CardContent className="p-6 space-y-5">
            {/* Name & Label Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Enter role name (e.g., HR Manager)"
                  className="h-10 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Label <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Enter role label (e.g., HR)"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            {/* Search Modules / Permissions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  placeholder="Search modules or permissions..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Badge variant="soft" className="text-xs px-3 py-1">
                {selectedCodes.size} Permissions Selected
              </Badge>
            </div>

            {/* Horizontal Module Tabs */}
            <div className="border-b border-border/70 overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max pb-2">
                {moduleTabs.map((mod) => {
                  const resMap = permissionsByModule.get(mod);
                  let modTotal = 0;
                  let modSelected = 0;
                  if (resMap) {
                    for (const items of resMap.values()) {
                      modTotal += items.length;
                      modSelected += items.filter((p) => selectedCodes.has(p.code)).length;
                    }
                  }
                  const active = effectiveTab === mod;
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setActiveModuleTab(mod)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer",
                        active
                          ? "bg-primary/10 text-primary font-semibold border border-primary/25"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <span>{mod}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          modSelected > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {modSelected}/{modTotal}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* HRM Tenant-Only Skip Note */}
            {effectiveTab === "HRM" && (
              <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <i className="ph ph-info text-primary text-base shrink-0" />
                <span>
                  <strong className="text-foreground">Working Days</strong> and{" "}
                  <strong className="text-foreground">IP Restriction</strong> settings are reserved for Tenant Admins only and are intentionally excluded from HRM role permissions.
                </span>
              </div>
            )}

            {/* Permission Group Cards (3-Column Checkbox Matrix matching Screenshot 3) */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-foreground">Permissions</p>
              {visibleResourceEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                  No permissions match your filter in {effectiveTab}.
                </div>
              ) : (
                visibleResourceEntries.map(([resKey, items]) => {
                  const allChecked = items.length > 0 && items.every((i) => selectedCodes.has(i.code));
                  const someChecked = items.some((i) => selectedCodes.has(i.code)) && !allChecked;

                  return (
                    <div
                      key={`${effectiveTab}-${resKey}`}
                      className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-3"
                    >
                      {/* Resource Group Header with Select-All Checkbox */}
                      <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                        <Checkbox
                          checked={allChecked ? true : someChecked ? "indeterminate" : false}
                          onCheckedChange={() => toggleResourceGroup(items)}
                        />
                        <span className="text-xs font-bold text-foreground">
                          {formatResourceHeading(resKey)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">({resKey})</span>
                      </label>

                      {/* 3-Column Checkbox Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 pl-0.5">
                        {items.map((perm) => (
                          <label
                            key={perm.code}
                            className="inline-flex items-center gap-2.5 text-xs text-foreground/90 cursor-pointer select-none hover:text-foreground"
                          >
                            <Checkbox
                              checked={selectedCodes.has(perm.code)}
                              onCheckedChange={() => togglePermissionCode(perm.code)}
                            />
                            <span>{perm.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditorMode("closed")}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saveRoleMutation.isPending}
                onClick={() => saveRoleMutation.mutate()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                <i className={saveRoleMutation.isPending ? "ph ph-spinner-gap animate-spin" : "ph ph-floppy-disk"} />
                {editorMode === "create" ? "Create Role" : "Save Role"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // MANAGE ROLES GRID & LIST VIEW (Matches Screenshots 1 & 2)
  // =========================================================================
  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Manage Roles"
        description="Configure tenant roles, assign granular HRM & module permissions, and monitor assigned users."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncHrDefaultsMutation.isPending}
              onClick={() => syncHrDefaultsMutation.mutate()}
              className="h-9 text-xs gap-1.5"
            >
              <i
                className={
                  syncHrDefaultsMutation.isPending
                    ? "ph ph-spinner-gap animate-spin"
                    : "ph ph-arrows-clockwise"
                }
              />
              Sync HR Defaults
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={openCreateRole}
              className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
              title="Create New Role"
            >
              <i className="ph-bold ph-plus text-sm" />
              Add Role
            </Button>
          </div>
        }
      />

      {/* Search, View Switcher & Page Size Toolbar */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-4 space-y-5">
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
                  placeholder="Search roles..."
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
              <div className="inline-flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <i className="ph ph-list-bullets text-base" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <i className="ph ph-squares-four text-base" />
                </button>
              </div>

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
            </div>
          </div>

          {rolesLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
              Loading workspace roles...
            </div>
          ) : paginatedRoles.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No roles found matching your search.
            </div>
          ) : viewMode === "grid" ? (
            /* ── CARD GRID VIEW (Screenshot 1) ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginatedRoles.map((role) => {
                const roleUsers = role.users || [];
                const extraUsers = Math.max(0, (role.usersCount || roleUsers.length) - 4);
                return (
                  <div
                    key={role.id}
                    className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-colors flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <i className="ph ph-shield text-lg" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{role.name}</p>
                          {role.isSystem && (
                            <span className="text-[10px] text-muted-foreground">System Role</span>
                          )}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditRole(role)}
                          className="size-7 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="Edit Role Permissions"
                        >
                          <i className="ph ph-pencil-simple-line text-base" />
                        </button>
                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(role)}
                            className="size-7 rounded-md flex items-center justify-center text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Role"
                          >
                            <i className="ph ph-trash text-base" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Permissions</span>
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                        {role.permissionsCount}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Users</p>
                      <div className="flex items-center -space-x-1.5 min-h-[28px]">
                        {roleUsers.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground/70">No users assigned</span>
                        ) : (
                          <>
                            {roleUsers.slice(0, 4).map((u) => (
                              <Avatar key={u.id} className="size-7 border-2 border-card" title={u.name}>
                                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.name} /> : null}
                                <AvatarFallback className="text-[10px] font-semibold bg-muted text-foreground">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {extraUsers > 0 && (
                              <span className="size-7 rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-foreground flex items-center justify-center">
                                +{extraUsers}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE LIST VIEW (Screenshot 2) ── */
            <div className="overflow-x-auto border border-border/80 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSortKey("name");
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Name
                        <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSortKey("label");
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        }}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Label
                        <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      Permissions
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      Users
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedRoles.map((role) => {
                    const roleUsers = role.users || [];
                    return (
                      <tr key={role.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 font-medium text-foreground">{role.name.toLowerCase().replace(/\s+/g, "-")}</td>
                        <td className="p-3 font-semibold text-foreground">{role.label || role.name}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                            {role.permissionsCount}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {roleUsers.length === 0 ? (
                              <span className="text-muted-foreground/70">—</span>
                            ) : (
                              roleUsers.slice(0, 5).map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                >
                                  {u.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditRole(role)}
                              className="size-7 rounded-md inline-flex items-center justify-center text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Edit Role"
                            >
                              <i className="ph ph-pencil-simple-line text-base" />
                            </button>
                            {!role.isSystem && (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(role)}
                                className="size-7 rounded-md inline-flex items-center justify-center text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Role"
                              >
                                <i className="ph ph-trash text-base" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span>
              Showing {startIdx} to {endIdx} of {filteredRoles.length} results
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this custom role and its permission assignments. Users assigned to this role should be reassigned first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteTarget && deleteRoleMutation.mutate(deleteTarget.id)}
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

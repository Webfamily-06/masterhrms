import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Users,
  Building2,
  Boxes,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Briefcase,
  Mail,
  Phone,
  UserCheck,
  Building,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types matching backend OrganizationTreeService
export interface OrgTreeNode {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phone: string | null;
  position: string | null;
  status: string;
  joinedAt: string | null;
  avatarUrl?: string | null;
  departmentId: string | null;
  branchId: string | null;
  designationId: string | null;
  managerId: string | null;
  department?: { id: string; name: string } | null;
  branch?: { id: string; name: string; code?: string | null } | null;
  designation?: { id: string; name: string } | null;
  directReportsCount: number;
  totalTeamSize: number;
  depth: number;
  isMatchingSearch?: boolean;
  subordinates: OrgTreeNode[];
}

export interface DepartmentTreeNode {
  id: string;
  name: string;
  description: string | null;
  status: string;
  branch: { id: string; name: string; code?: string | null } | null;
  head: string;
  totalEmployees: number;
  activeEmployees: number;
  designations: Array<{ id: string; name: string; count: number }>;
  employees: Array<{
    id: string;
    name: string;
    employeeCode: string;
    position: string | null;
    designationName: string;
    status: string;
    managerId: string | null;
    managerName?: string | null;
  }>;
}

export function InteractiveOrgTree() {
  // View mode switcher: "employee" vs "department"
  const [viewMode, setViewMode] = useState<"employee" | "department">("employee");

  // Search and Filter states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedDesig, setSelectedDesig] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Canvas zoom & pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Touch and pointer gesture tracking refs
  const hasMovedRef = useRef<boolean>(false);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  // Mobile filter drawer state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Active filter count for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedDept !== "all") count++;
    if (selectedDesig !== "all") count++;
    if (selectedBranch !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [selectedDept, selectedDesig, selectedBranch, statusFilter]);

  const clearFilters = useCallback(() => {
    setSelectedDept("all");
    setSelectedDesig("all");
    setSelectedBranch("all");
    setStatusFilter("all");
    setSearch("");
  }, []);

  // Collapse/Expand nodes tracking
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Slide-Over Drawer state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentTreeNode | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. Fetch Summary KPI stats
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ["org-tree-summary"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/tree/summary");
      return res.data || res;
    },
  });

  // 2. Fetch Employee Tree
  const {
    data: employeeTreeData,
    isLoading: isEmpLoading,
    refetch: refetchEmployeeTree,
  } = useQuery({
    queryKey: [
      "org-tree-employees",
      debouncedSearch,
      selectedDept,
      selectedDesig,
      selectedBranch,
      statusFilter,
    ],
    queryFn: async () => {
      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedDept !== "all") params.departmentId = selectedDept;
      if (selectedDesig !== "all") params.designationId = selectedDesig;
      if (selectedBranch !== "all") params.branchId = selectedBranch;
      if (statusFilter !== "all") params.status = statusFilter;
      params.includeInactive = true;

      const res = await api.get("/hr/organization/tree/employees", { params });
      return res.data || res;
    },
  });

  // 3. Fetch Department Tree
  const {
    data: departmentTreeData,
    isLoading: isDeptLoading,
    refetch: refetchDepartmentTree,
  } = useQuery({
    queryKey: ["org-tree-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/tree/departments");
      return res.data || res;
    },
  });

  // 4. Fetch Master Options for Filters
  const { data: filterOptions } = useQuery({
    queryKey: ["org-tree-filter-options"],
    queryFn: async () => {
      const [branchesRes, deptsRes, desigsRes] = await Promise.all([
        api.get("/hr/organization/branches", { params: { limit: 100 } }),
        api.get("/hr/organization/departments", { params: { limit: 100 } }),
        api.get("/hr/organization/designations", { params: { limit: 100 } }),
      ]);
      return {
        branches: Array.isArray(branchesRes) ? branchesRes : branchesRes.data || [],
        departments: Array.isArray(deptsRes) ? deptsRes : deptsRes.data || [],
        designations: Array.isArray(desigsRes) ? desigsRes : desigsRes.data || [],
      };
    },
  });

  // 5. Fetch Selected Employee Details for Drawer
  const { data: employeeDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["org-tree-employee-detail", selectedEmployeeId],
    enabled: !!selectedEmployeeId,
    queryFn: async () => {
      const res = await api.get(`/hr/organization/tree/employee/${selectedEmployeeId}`);
      return res.data || res;
    },
  });

  // Refresh all queries
  const handleRefresh = useCallback(() => {
    refetchSummary();
    refetchEmployeeTree();
    refetchDepartmentTree();
  }, [refetchSummary, refetchEmployeeTree, refetchDepartmentTree]);

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(Number((s + 0.15).toFixed(2)), 2.0));
  const handleZoomOut = () => setScale((s) => Math.max(Number((s - 0.15).toFixed(2)), 0.3));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    setScale(isMobile ? 0.6 : 0.85);
    setPan({ x: 0, y: 0 });
  };

  // Unified Pointer & Touch Pan & Pinch Controls
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If tapping an interactive button or select, don't start canvas drag
    if ((e.target as HTMLElement).closest("button, input, select, a, [role='button']")) {
      return;
    }

    // Only allow primary mouse click (left button)
    if (e.pointerType === "mouse" && e.button !== 0) return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      hasMovedRef.current = false;
      // Do NOT set pointer capture here on down! Wait for movement > 6px so taps bubble naturally to cards.
    } else if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      pinchStartDistRef.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartScaleRef.current = scale;
      setIsDragging(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 6) {
        hasMovedRef.current = true;
        if (!isDragging) {
          setIsDragging(true);
          // Drag confirmed: capture pointer so drag stays locked to canvas
          try {
            canvasRef.current?.setPointerCapture(e.pointerId);
          } catch {}
        }
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        });
      }
    } else if (activePointers.current.size === 2 && pinchStartDistRef.current && pinchStartDistRef.current > 0) {
      const points = Array.from(activePointers.current.values());
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const ratio = currentDist / pinchStartDistRef.current;
      const targetScale = Math.min(Math.max(Number((pinchStartScaleRef.current * ratio).toFixed(2)), 0.3), 2.0);
      setScale(targetScale);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);

    try {
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (activePointers.current.size === 0) {
      setIsDragging(false);
      pinchStartDistRef.current = null;
      // Allow synthetic click event to see hasMovedRef before resetting it
      if (hasMovedRef.current) {
        setTimeout(() => {
          hasMovedRef.current = false;
        }, 120);
      }
    } else if (activePointers.current.size === 1) {
      const remaining = Array.from(activePointers.current.values())[0];
      dragStartRef.current = {
        x: remaining.x,
        y: remaining.y,
        panX: pan.x,
        panY: pan.y,
      };
      pinchStartDistRef.current = null;
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.05 : -0.05;
      setScale((s) => Math.min(Math.max(Number((s + delta).toFixed(2)), 0.3), 2.0));
    }
  };

  // Expand / Collapse node helpers
  const toggleNodeCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedNodes(new Set());

  const collapseAll = () => {
    if (!employeeTreeData?.orgChart) return;
    const allManagerIds = new Set<string>();
    function collect(nodes: OrgTreeNode[]) {
      for (const n of nodes) {
        if (n.subordinates?.length > 0) {
          allManagerIds.add(n.id);
          collect(n.subordinates);
        }
      }
    }
    collect(employeeTreeData.orgChart);
    setCollapsedNodes(allManagerIds);
  };

  const stats = summaryData || {
    totalEmployees: 0,
    activeEmployees: 0,
    totalDepartments: 0,
    totalBranches: 0,
    totalDesignations: 0,
    totalManagers: 0,
    topExecutivesCount: 0,
    maxHierarchyDepth: 1,
  };

  const orgChartNodes: OrgTreeNode[] = employeeTreeData?.orgChart || [];
  const orphanNodes: OrgTreeNode[] = employeeTreeData?.unassigned || [];
  const departmentNodes: DepartmentTreeNode[] = departmentTreeData?.departments || [];

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header with Breadcrumb and View Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title="Organization Tree"
            description="Explore your organization's reporting structure and department hierarchy."
          />
        </div>

        {/* View Switcher and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher */}
          <div className="inline-flex items-center rounded-lg border bg-muted/60 p-1 text-muted-foreground shadow-sm w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => setViewMode("employee")}
              className={cn(
                "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 sm:py-1.5 text-xs font-semibold transition-all min-h-[40px] sm:min-h-0 active:scale-[0.98]",
                viewMode === "employee"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground text-muted-foreground"
              )}
            >
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              Employee View
            </button>
            <button
              onClick={() => setViewMode("department")}
              className={cn(
                "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 sm:py-1.5 text-xs font-semibold transition-all min-h-[40px] sm:min-h-0 active:scale-[0.98]",
                viewMode === "department"
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:text-foreground text-muted-foreground"
              )}
            >
              <Boxes className="h-3.5 w-3.5 text-purple-500" />
              Department View
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 text-xs font-medium h-10 sm:h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Total Workforce</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.totalEmployees}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              {stats.activeEmployees} Active
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Departments</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.totalDepartments}
            </span>
            <span className="text-[10px] text-muted-foreground">Divisions</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Reporting Managers</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.totalManagers}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium">Supervisors</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Hierarchy Depth</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.maxHierarchyDepth}
            </span>
            <span className="text-[10px] text-muted-foreground">Levels</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Top Executives</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.topExecutivesCount}
            </span>
            <span className="text-[10px] text-purple-600 font-medium">Roots</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground">Active Facilities</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {stats.totalBranches}
            </span>
            <span className="text-[10px] text-muted-foreground">Branches</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Toolbar */}
      <div className="rounded-xl border bg-card p-3.5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search box & Mobile Filter Button */}
          <div className="flex items-center gap-2 w-full lg:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee code, or role..."
                className="pl-9 text-xs h-10 lg:h-9 bg-background w-full rounded-lg"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Mobile Filter Button (Visible on screens < lg) */}
            <div className="lg:hidden flex items-center gap-1.5 shrink-0">
              <Button
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setIsMobileFilterOpen(true)}
                className="h-10 px-3 text-xs font-semibold rounded-lg shrink-0 gap-1.5 min-h-[40px] active:scale-95"
                title="Filters"
                aria-label="Open Filters"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-background text-foreground text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                  className="h-10 px-2 text-xs text-muted-foreground hover:text-foreground min-h-[40px]"
                  title="Clear all filters"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Desktop Filter Dropdowns (Visible on screens >= lg) */}
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            {/* Department */}
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-9 text-xs w-[150px] bg-background">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(filterOptions?.departments || []).map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Designation */}
            <Select value={selectedDesig} onValueChange={setSelectedDesig}>
              <SelectTrigger className="h-9 text-xs w-[150px] bg-background">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {(filterOptions?.designations || []).map((des: any) => (
                  <SelectItem key={des.id} value={des.id}>
                    {des.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Branch */}
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-9 text-xs w-[140px] bg-background">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {(filterOptions?.branches || []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-[120px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 font-medium"
              >
                Reset All
              </Button>
            )}
          </div>
        </div>

        {/* Desktop Canvas Quick Controls Bar (Visible on screens >= md) */}
        <div className="hidden md:flex items-center justify-between border-t pt-2.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">Canvas Controls:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 w-7 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 w-7 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-7 px-2 text-[11px]"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {Math.round(scale * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFitToScreen}
              className="h-7 px-2 text-[11px]"
              title="Fit to Screen"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Fit
            </Button>
          </div>

          {viewMode === "employee" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="h-7 px-2 text-[11px]"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="h-7 px-2 text-[11px]"
              >
                Collapse All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Interactive Organization Chart Canvas Container */}
      <div
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={cn(
          "relative min-h-[480px] h-[65vh] max-h-[750px] w-full overflow-hidden rounded-xl border bg-muted/20 shadow-inner select-none touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          // Dotted grid background
          "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)]"
        )}
      >
        {/* Mobile Floating Responsive Toolbar (Phase 2 - min 44x44px touch targets) */}
        <div
          data-testid="mobile-chart-toolbar"
          className="md:hidden absolute bottom-3 inset-x-3 z-30 flex items-center justify-between p-1.5 sm:p-2 rounded-2xl bg-card/95 backdrop-blur-md border border-border/80 shadow-lg select-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
        >
          {/* Zoom controls with min 44x44px touch targets */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomOut}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-foreground bg-background/80 active:scale-95 transition-transform"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetZoom}
              className="h-11 min-h-[44px] px-2.5 sm:px-3 font-semibold text-xs rounded-xl text-foreground bg-background/80 active:scale-95 transition-transform"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {Math.round(scale * 100)}%
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleZoomIn}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-foreground bg-background/80 active:scale-95 transition-transform"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={handleFitToScreen}
              className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl text-foreground bg-background/80 active:scale-95 transition-transform"
              title="Fit to Screen"
              aria-label="Fit to Screen"
            >
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {viewMode === "employee" && (
              <Button
                variant="outline"
                size="sm"
                onClick={collapsedNodes.size > 0 ? expandAll : collapseAll}
                className="h-11 min-h-[44px] px-2.5 sm:px-3 text-xs font-semibold rounded-xl text-foreground bg-background/80 active:scale-95 transition-transform"
                title={collapsedNodes.size > 0 ? "Expand All" : "Collapse All"}
                aria-label={collapsedNodes.size > 0 ? "Expand All" : "Collapse All"}
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                {collapsedNodes.size > 0 ? "Expand" : "Collapse"}
              </Button>
            )}
          </div>
        </div>
        {/* Live Canvas Zoom/Pan Transform Canvas */}
        <div
          data-testid="org-canvas-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "center 40px",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="w-full flex flex-col items-center pt-8 pb-32"
        >
          {/* ======================================================== */}
          {/* VIEW 1: EMPLOYEE REPORTING HIERARCHY (Reference Image 1) */}
          {/* ======================================================== */}
          {viewMode === "employee" && (
            <div className="space-y-12">
              {isEmpLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card/80 p-8 rounded-xl border shadow-sm">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Synthesizing real organizational hierarchy...
                  </p>
                </div>
              ) : orgChartNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-card/90 rounded-xl border max-w-md shadow-sm">
                  <Users className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">No Reporting Trees Found</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    No active employees matched the filter criteria or have been mapped to a reporting manager.
                  </p>
                </div>
              ) : (
                <div ref={treeContainerRef} className="relative w-fit min-w-full flex flex-wrap items-start justify-center gap-16 p-4">
                  <TreeConnectors
                    containerRef={treeContainerRef}
                    nodes={orgChartNodes}
                    collapsedNodes={collapsedNodes}
                    scale={scale}
                  />
                  {orgChartNodes.map((rootNode) => (
                    <EmployeeHierarchyBranch
                      key={rootNode.id}
                      node={rootNode}
                      collapsedNodes={collapsedNodes}
                      toggleCollapse={toggleNodeCollapse}
                      onSelectEmployee={setSelectedEmployeeId}
                      hasMovedRef={hasMovedRef}
                    />
                  ))}
                </div>
              )}

              {/* Orphan / Standalone Staff Notice if any */}
              {orphanNodes.length > 0 && (
                <div className="mt-16 pt-8 border-t border-border/80 w-full max-w-4xl text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-6">
                    <span>Unlinked Staff ({orphanNodes.length})</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Employees without a mapped manager in current scope
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {orphanNodes.map((node) => (
                      <EmployeeCard
                        key={node.id}
                        node={node}
                        onSelectEmployee={setSelectedEmployeeId}
                        isCollapsed={false}
                        hasSubordinates={false}
                        toggleCollapse={() => {}}
                        hasMovedRef={hasMovedRef}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: DEPARTMENT HIERARCHY (Reference Image 2)          */}
          {/* ======================================================== */}
          {viewMode === "department" && (
            <div className="w-full flex flex-col items-center space-y-10">
              {isDeptLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 bg-card/80 p-8 rounded-xl border shadow-sm">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                  <p className="text-sm font-medium text-foreground">
                    Constructing departmental divisions & teams...
                  </p>
                </div>
              ) : departmentNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-card/90 rounded-xl border max-w-md shadow-sm">
                  <Boxes className="h-10 w-10 text-muted-foreground/60 mb-3" />
                  <h4 className="text-sm font-semibold text-foreground">No Departments Found</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    No departments are registered for this workspace organization.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-5xl flex flex-col items-center space-y-8">
                  {/* Organization Root Card */}
                  <div className="flex flex-col items-center">
                    <div className="rounded-xl border-2 border-purple-500/40 bg-card p-4 shadow-md text-center min-w-[280px]">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 mb-2 font-bold">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground">Corporate Enterprise Root</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {stats.totalDepartments} Divisions • {stats.totalEmployees} Total Staff
                      </p>
                    </div>

                    {/* Hierarchy Stem Connector */}
                    <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500 to-indigo-500" />
                  </div>

                  {/* Connected Department Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {departmentNodes.map((dept) => (
                      <DepartmentCard
                        key={dept.id}
                        department={dept}
                        onSelectDepartment={setSelectedDepartment}
                        hasMovedRef={hasMovedRef}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Slide-Over Detail Drawer: Employee Profile */}
      <Sheet
        open={Boolean(selectedEmployeeId)}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6 font-sans">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Employee Hierarchy Profile
            </SheetTitle>
            <SheetDescription className="text-xs">
              Authoritative reporting connections and structural placement.
            </SheetDescription>
          </SheetHeader>

          {isDetailLoading || !employeeDetail ? (
            <div className="py-20 text-center text-xs text-muted-foreground font-sans">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
              Loading profile details...
            </div>
          ) : (
            <div className="space-y-6 pt-5 text-sm font-sans">
              {/* Header Profile Badge */}
              <div className="flex items-start gap-3.5 p-4 rounded-xl border bg-muted/30">
                <Avatar className="h-12 w-12 rounded-xl border border-border shadow-xs overflow-hidden shrink-0">
                  {employeeDetail.avatarUrl && (
                    <AvatarImage
                      src={employeeDetail.avatarUrl}
                      alt={employeeDetail.name}
                      className="aspect-square h-full w-full object-cover"
                    />
                  )}
                  <AvatarFallback className="rounded-xl font-bold text-base bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 select-none">
                    {employeeDetail.firstName.charAt(0)}
                    {employeeDetail.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate">
                    {employeeDetail.name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {employeeDetail.position}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px] font-medium tracking-tight">
                      {employeeDetail.employeeCode}
                    </Badge>
                    <Badge
                      variant={employeeDetail.status === "active" ? "default" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {employeeDetail.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Organizational Placement */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Organizational Placement
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-[10px] text-muted-foreground block">Department</span>
                    <span className="font-semibold text-foreground">
                      {employeeDetail.department?.name || "Unassigned"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card">
                    <span className="text-[10px] text-muted-foreground block">Branch</span>
                    <span className="font-semibold text-foreground">
                      {employeeDetail.branch?.name || "Headquarters"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-card col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Job Designation</span>
                    <span className="font-semibold text-foreground">
                      {employeeDetail.designation?.name || "Standard Role"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reporting Manager Chain */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reports To (Manager Lineage)
                </h5>
                {employeeDetail.manager ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {employeeDetail.manager.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {employeeDetail.manager.position}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Direct Manager
                        </Badge>
                      </div>
                    </div>

                    {/* Upward Lineage Ancestors */}
                    {employeeDetail.managerChain.length > 1 && (
                      <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500/40 text-xs">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Executive Upward Chain:
                        </span>
                        {employeeDetail.managerChain.slice(1).map((mgr: any) => (
                          <div key={mgr.id} className="text-[11px] text-foreground font-medium">
                            ↑ {mgr.name} <span className="text-muted-foreground">({mgr.position})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-3 rounded-lg border bg-muted/20">
                    👑 Top-level executive: This role does not report to any subordinate in the workspace.
                  </p>
                )}
              </div>

              {/* Direct Reports Subordinates */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Direct Subordinates
                  </h5>
                  <Badge variant="secondary" className="text-[10px]">
                    {employeeDetail.directReportsCount} Staff
                  </Badge>
                </div>

                {employeeDetail.subordinates.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {employeeDetail.subordinates.map((sub: any) => (
                      <div
                        key={sub.id}
                        onClick={() => setSelectedEmployeeId(sub.id)}
                        className="flex items-center justify-between p-2 rounded-lg border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                            {sub.avatarUrl && (
                              <AvatarImage
                                src={sub.avatarUrl}
                                alt={sub.name}
                                className="aspect-square h-full w-full object-cover"
                              />
                            )}
                            <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground select-none">
                              {sub.firstName ? sub.firstName.charAt(0) : sub.name?.charAt(0) || "U"}
                              {sub.lastName ? sub.lastName.charAt(0) : ""}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{sub.name}</p>
                            <p className="text-[11px] text-muted-foreground">{sub.position}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-primary flex items-center gap-0.5">
                          View <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-3 rounded-lg border bg-muted/20">
                    No direct subordinates assigned to this employee.
                  </p>
                )}
              </div>

              {/* Contact Information (Safe only) */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate">{employeeDetail.email}</span>
                </div>
                {employeeDetail.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <span>{employeeDetail.phone}</span>
                  </div>
                )}
              </div>

              {/* Link to Official Employee Master Record */}
              <div className="pt-2">
                <a
                  href={`/hr/employees/${employeeDetail.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 h-11 min-h-[44px] rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all shadow-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Full Employee Master Profile
                </a>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 6. Slide-Over Detail Drawer: Department Details */}
      <Sheet
        open={Boolean(selectedDepartment)}
        onOpenChange={(open) => !open && setSelectedDepartment(null)}
      >
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-6 font-sans">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="h-4 w-4 text-purple-600" />
              Department Division Details
            </SheetTitle>
            <SheetDescription className="text-xs">
              Departmental organizational structure and workforce distribution.
            </SheetDescription>
          </SheetHeader>

          {selectedDepartment && (
            <div className="space-y-6 pt-5 text-sm">
              <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/20">
                <h4 className="font-bold text-foreground text-base">
                  {selectedDepartment.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDepartment.description || "No official department description provided."}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-[10px]">
                    {selectedDepartment.branch?.name || "Corporate Headquarters"}
                  </Badge>
                  <Badge variant="default" className="text-[10px]">
                    {selectedDepartment.status}
                  </Badge>
                </div>
              </div>

              {/* Department Head Warning / Fallback Notice */}
              <div className="p-3 rounded-lg border bg-muted/40 text-xs">
                <span className="font-semibold text-foreground block mb-0.5">
                  Assigned Department Head:
                </span>
                <span className="text-muted-foreground italic">
                  {selectedDepartment.head}
                </span>
              </div>

              {/* Headcount Breakdown */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg border bg-card text-center">
                  <span className="text-xl font-bold text-foreground block">
                    {selectedDepartment.totalEmployees}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Total Members</span>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center">
                  <span className="text-xl font-bold text-emerald-600 block">
                    {selectedDepartment.activeEmployees}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Active Staff</span>
                </div>
              </div>

              {/* Designation Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Job Roles in this Department
                </h5>
                <div className="space-y-1.5">
                  {selectedDepartment.designations.map((des) => (
                    <div
                      key={des.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs"
                    >
                      <span className="font-medium text-foreground">{des.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {des.count} Staff
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Members List */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Departmental Roster
                </h5>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedDepartment.employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedDepartment(null);
                        setSelectedEmployeeId(emp.id);
                      }}
                      className="p-2.5 rounded-lg border hover:border-primary/40 hover:bg-muted/30 cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{emp.name}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {emp.employeeCode}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {emp.position}
                      </p>
                      {emp.managerName && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                          Reports to: {emp.managerName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 7. Mobile Filter Bottom/Side Sheet (Phase 3) */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6 font-sans">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filter Organization Hierarchy
            </SheetTitle>
            <SheetDescription className="text-xs">
              Filter employee nodes and reporting relationships across the workspace.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-5 text-xs">
            {/* Department */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-11 text-xs w-full bg-background min-h-[44px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(filterOptions?.departments || []).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Designation</label>
              <Select value={selectedDesig} onValueChange={setSelectedDesig}>
                <SelectTrigger className="h-11 text-xs w-full bg-background min-h-[44px]">
                  <SelectValue placeholder="All Designations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {(filterOptions?.designations || []).map((des: any) => (
                    <SelectItem key={des.id} value={des.id}>
                      {des.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Branch</label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-11 text-xs w-full bg-background min-h-[44px]">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {(filterOptions?.branches || []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 text-xs w-full bg-background min-h-[44px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(true)}
              className="flex-1 h-11 text-xs font-semibold rounded-xl min-h-[44px]"
            >
              Reset
            </Button>
            <Button
              variant="default"
              onClick={() => setIsMobileFilterOpen(false)}
              className="flex-1 h-11 text-xs font-semibold rounded-xl min-h-[44px]"
            >
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 8. Confirmation Dialog for Resetting Organization Filters */}
      <ConfirmationDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Organization Filters"
        description="Are you sure you want to reset all active filters? This will restore the complete organization hierarchy view."
        confirmLabel="Reset Filters"
        cancelLabel="Keep Filters"
        onConfirm={() => {
          clearFilters();
          setShowResetConfirm(false);
          setIsMobileFilterOpen(false);
        }}
      />
    </div>
  );
}

// =========================================================================
// SUBCOMPONENT: Organization Tree Connectors (Dynamic SVG Geometry)
// =========================================================================
interface TreeConnectorsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodes: OrgTreeNode[];
  collapsedNodes: Set<string>;
  scale: number;
}

function TreeConnectors({ containerRef, nodes, collapsedNodes, scale }: TreeConnectorsProps) {
  const [paths, setPaths] = useState<string[]>([]);

  const calculateConnectors = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newPaths: string[] = [];

    function traverse(node: OrgTreeNode) {
      if (collapsedNodes.has(node.id)) return;
      if (!node.subordinates || node.subordinates.length === 0) return;

      const parentEl = container.querySelector<HTMLElement>(`[data-node-id="${node.id}"]`);
      if (!parentEl) return;

      const parentRect = parentEl.getBoundingClientRect();
      const parentX = (parentRect.left - containerRect.left) / scale + parentRect.width / (2 * scale);
      const parentBottom = (parentRect.bottom - containerRect.top) / scale;

      const visibleChildEls: Array<{ el: HTMLElement; node: OrgTreeNode }> = [];
      for (const sub of node.subordinates) {
        const childEl = container.querySelector<HTMLElement>(`[data-node-id="${sub.id}"]`);
        if (childEl) {
          visibleChildEls.push({ el: childEl, node: sub });
        }
      }

      if (visibleChildEls.length === 0) return;

      const childCoords = visibleChildEls.map(({ el }) => {
        const r = el.getBoundingClientRect();
        return {
          x: (r.left - containerRect.left) / scale + r.width / (2 * scale),
          top: (r.top - containerRect.top) / scale,
        };
      });

      if (childCoords.length === 1) {
        const child = childCoords[0];
        if (Math.abs(parentX - child.x) < 2) {
          newPaths.push(
            `M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} L ${child.x.toFixed(1)} ${child.top.toFixed(1)}`
          );
        } else {
          const midY = (parentBottom + child.top) / 2;
          newPaths.push(
            `M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} V ${midY.toFixed(1)} H ${child.x.toFixed(1)} V ${child.top.toFixed(1)}`
          );
        }
      } else {
        const minX = Math.min(...childCoords.map((c) => c.x));
        const maxX = Math.max(...childCoords.map((c) => c.x));
        const minTop = Math.min(...childCoords.map((c) => c.top));
        const busY = parentBottom + Math.max(16, (minTop - parentBottom) / 2);

        // 1. Vertical stem from parent bottom anchor to bus line
        newPaths.push(`M ${parentX.toFixed(1)} ${parentBottom.toFixed(1)} V ${busY.toFixed(1)}`);

        // 2. Horizontal bus bar spanning from leftmost child to rightmost child
        const busLeft = Math.min(minX, parentX);
        const busRight = Math.max(maxX, parentX);
        newPaths.push(`M ${busLeft.toFixed(1)} ${busY.toFixed(1)} H ${busRight.toFixed(1)}`);

        // 3. Vertical branches from horizontal bus to each child top anchor
        for (const child of childCoords) {
          newPaths.push(`M ${child.x.toFixed(1)} ${busY.toFixed(1)} V ${child.top.toFixed(1)}`);
        }
      }

      // Recurse for visible children
      for (const sub of node.subordinates) {
        traverse(sub);
      }
    }

    for (const root of nodes) {
      traverse(root);
    }

    setPaths(newPaths);
  }, [containerRef, nodes, collapsedNodes, scale]);

  useLayoutEffect(() => {
    let active = true;
    const scheduleUpdate = () => {
      if (!active) return;
      calculateConnectors();
    };

    const frameId = requestAnimationFrame(scheduleUpdate);
    const timer = setTimeout(scheduleUpdate, 60);

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      scheduleUpdate();
    });
    observer.observe(container);

    window.addEventListener("resize", scheduleUpdate);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [calculateConnectors]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0 w-full h-full overflow-visible"
      style={{ overflow: "visible" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          className="text-indigo-500/80 dark:text-indigo-400/80"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// =========================================================================
// SUBCOMPONENT: Employee Hierarchy Recursive Branch (Reference Image 1)
// =========================================================================
interface EmployeeBranchProps {
  node: OrgTreeNode;
  collapsedNodes: Set<string>;
  toggleCollapse: (id: string, e: React.MouseEvent) => void;
  onSelectEmployee: (id: string) => void;
  hasMovedRef?: React.RefObject<boolean>;
}

function EmployeeHierarchyBranch({
  node,
  collapsedNodes,
  toggleCollapse,
  onSelectEmployee,
  hasMovedRef,
}: EmployeeBranchProps) {
  const isCollapsed = collapsedNodes.has(node.id);
  const hasSubordinates = node.subordinates && node.subordinates.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <EmployeeCard
        node={node}
        isCollapsed={isCollapsed}
        hasSubordinates={hasSubordinates}
        toggleCollapse={toggleCollapse}
        onSelectEmployee={onSelectEmployee}
        hasMovedRef={hasMovedRef}
      />

      {/* Subordinates Row */}
      {hasSubordinates && !isCollapsed && (
        <div className="flex flex-col items-center w-full pt-10">
          <div className="flex justify-center gap-8">
            {node.subordinates.map((sub) => (
              <EmployeeHierarchyBranch
                key={sub.id}
                node={sub}
                collapsedNodes={collapsedNodes}
                toggleCollapse={toggleCollapse}
                onSelectEmployee={onSelectEmployee}
                hasMovedRef={hasMovedRef}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENT: Single Employee Node Card (Reference Image 1)
// =========================================================================
interface EmployeeCardProps {
  node: OrgTreeNode;
  isCollapsed: boolean;
  hasSubordinates: boolean;
  toggleCollapse: (id: string, e: React.MouseEvent) => void;
  onSelectEmployee: (id: string) => void;
  hasMovedRef?: React.RefObject<boolean>;
}

function EmployeeCard({
  node,
  isCollapsed,
  hasSubordinates,
  toggleCollapse,
  onSelectEmployee,
  hasMovedRef,
}: EmployeeCardProps) {
  const isMatch = node.isMatchingSearch;

  return (
    <div
      data-node-id={node.id}
      onClick={(e) => {
        if (hasMovedRef?.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onSelectEmployee(node.id);
      }}
      className={cn(
        "interactive-node group relative z-10 flex flex-col w-[250px] rounded-xl border bg-card p-3.5 shadow-sm transition-all duration-200 cursor-pointer select-none",
        "hover:shadow-md hover:border-indigo-500/60 hover:-translate-y-0.5 active:scale-[0.99]",
        isMatch && "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/5 shadow-md",
        node.depth === 0 ? "border-purple-500/40 bg-purple-500/[0.02]" : "border-border"
      )}
    >
      {/* Top Accent Strip */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 rounded-t-xl",
          node.depth === 0
            ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"
            : hasSubordinates
            ? "bg-gradient-to-r from-indigo-500 to-purple-500"
            : "bg-muted-foreground/30"
        )}
      />

      {/* Top Row: Avatar + Status + Code */}
      <div className="flex items-center justify-between gap-2 pt-1 mb-2">
        <div className="flex items-center gap-2">
          {/* Avatar with Image & Initials Fallback */}
          <Avatar className="h-9 w-9 border border-border shadow-xs shrink-0">
            {node.avatarUrl && (
              <AvatarImage
                src={node.avatarUrl}
                alt={node.name}
                className="aspect-square h-full w-full object-cover"
              />
            )}
            <AvatarFallback
              className={cn(
                "font-bold text-xs select-none",
                node.depth === 0
                  ? "bg-purple-600 text-white"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
              )}
            >
              {node.firstName.charAt(0)}
              {node.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div>
            <span className="text-[10px] font-medium tracking-tight text-muted-foreground block leading-tight">
              {node.employeeCode}
            </span>
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full mr-1",
                node.status === "active" ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            <span className="text-[10px] text-muted-foreground capitalize font-medium">
              {node.status}
            </span>
          </div>
        </div>

        {node.depth === 0 && (
          <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-purple-600">
            Executive
          </Badge>
        )}
      </div>

      {/* Name and Title */}
      <div className="text-left mb-2">
        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-indigo-600 transition-colors">
          {node.name}
        </h4>
        <p className="text-[11px] text-muted-foreground truncate font-medium">
          {node.position}
        </p>
      </div>

      {/* Department & Branch Tag */}
      <div className="flex flex-wrap items-center gap-1 mb-2.5">
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground truncate max-w-[140px]">
          {node.department?.name || "General"}
        </span>
        {node.branch?.name && (
          <span className="inline-flex items-center rounded-md bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground truncate max-w-[85px]">
            {node.branch.name}
          </span>
        )}
      </div>

      {/* Bottom Action: Direct Reports Expand / Collapse Button */}
      {hasSubordinates ? (
        <button
          onClick={(e) => toggleCollapse(node.id, e)}
          className={cn(
            "w-full mt-auto inline-flex items-center justify-between rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors",
            isCollapsed
              ? "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {node.directReportsCount} Direct Report{node.directReportsCount > 1 ? "s" : ""}
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
      ) : (
        <div className="text-[10px] text-muted-foreground/60 text-center py-1 border-t mt-auto">
          Individual Contributor
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SUBCOMPONENT: Department Card (Reference Image 2)
// =========================================================================
interface DepartmentCardProps {
  department: DepartmentTreeNode;
  onSelectDepartment: (dept: DepartmentTreeNode) => void;
  hasMovedRef?: React.RefObject<boolean>;
}

function DepartmentCard({ department, onSelectDepartment, hasMovedRef }: DepartmentCardProps) {
  return (
    <div
      onClick={(e) => {
        if (hasMovedRef?.current) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onSelectDepartment(department);
      }}
      className="group relative flex flex-col rounded-xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-purple-500/50 transition-all cursor-pointer select-none active:scale-[0.99]"
    >
      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-purple-500 to-indigo-500" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <Building className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground group-hover:text-purple-600 transition-colors">
              {department.name}
            </h4>
            <span className="text-[11px] text-muted-foreground">
              {department.branch?.name || "Corporate Tech Campus"}
            </span>
          </div>
        </div>
        <Badge
          variant={department.status === "active" ? "default" : "secondary"}
          className="text-[10px] capitalize"
        >
          {department.status}
        </Badge>
      </div>

      {/* Department Head Fallback Notice */}
      <div className="p-2 rounded-lg bg-muted/40 border text-xs mb-3">
        <span className="text-[10px] text-muted-foreground block">Department Head</span>
        <span className="font-medium text-foreground italic">{department.head}</span>
      </div>

      {/* Headcount Stat Pill */}
      <div className="grid grid-cols-2 gap-2 text-center mb-4">
        <div className="rounded-lg border bg-muted/20 p-2">
          <span className="text-base font-bold text-foreground block">
            {department.totalEmployees}
          </span>
          <span className="text-[10px] text-muted-foreground">Total Staff</span>
        </div>
        <div className="rounded-lg border bg-muted/20 p-2">
          <span className="text-base font-bold text-emerald-600 block">
            {department.activeEmployees}
          </span>
          <span className="text-[10px] text-muted-foreground">Active Staff</span>
        </div>
      </div>

      {/* Designation Tags Preview */}
      <div className="space-y-1 mb-4">
        <span className="text-[10px] text-muted-foreground font-semibold block">Key Roles:</span>
        <div className="flex flex-wrap gap-1">
          {department.designations.slice(0, 3).map((des) => (
            <span
              key={des.id}
              className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {des.name} ({des.count})
            </span>
          ))}
          {department.designations.length > 3 && (
            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{department.designations.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-purple-600 font-semibold group-hover:translate-x-0.5 transition-transform">
        <span>Inspect Division Roster</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  );
}


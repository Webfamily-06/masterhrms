'use client';

import { useState, useRef, useMemo } from "react";
import { createFileRoute } from "@/src/lib/router-compat";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  UploadCloud,
  X,
  Loader2,
  UserCheck,
  Calendar,
  Gift,
  DollarSign,
  Trophy,
  Award,
  Star,
  Zap,
  Heart,
  Users,
  Medal,
  Crown,
  ShieldCheck,
  Sparkles,
  Search,
} from "lucide-react";

export interface AwardTypeRecord {
  id?: string;
  name: string;
  icon?: string;
  description?: string;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
  requiresApproval?: boolean;
  allowPeerNomination?: boolean;
  allowSelfNomination?: boolean;
  workflowId?: string | null;
  workflow?: {
    id: string;
    name: string;
    entityType?: string;
    isActive?: boolean;
    steps?: Array<{
      id: string;
      stepOrder: number;
      name: string;
      approverType: string;
      approverValue?: string | null;
    }>;
  } | null;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    awards?: number;
  };
}

const DEFAULT_ICON_OPTIONS = [
  { label: "Trophy", value: "Trophy" },
  { label: "Award / Ribbon", value: "Award" },
  { label: "Star", value: "Star" },
  { label: "Zap / Innovation", value: "Zap" },
  { label: "Heart / Customer Care", value: "Heart" },
  { label: "Medal", value: "Medal" },
  { label: "Crown / Leadership", value: "Crown" },
  { label: "Users / Teamwork", value: "Users" },
  { label: "Shield / Compliance", value: "ShieldCheck" },
  { label: "Sparkles / Excellence", value: "Sparkles" },
];

function renderAwardIcon(iconName?: string | null, className = "h-4 w-4") {
  switch ((iconName || "").toLowerCase()) {
    case "star":
      return <Star className={className} />;
    case "award":
      return <Award className={className} />;
    case "zap":
      return <Zap className={className} />;
    case "heart":
      return <Heart className={className} />;
    case "medal":
      return <Medal className={className} />;
    case "crown":
      return <Crown className={className} />;
    case "users":
      return <Users className={className} />;
    case "shieldcheck":
    case "shield":
      return <ShieldCheck className={className} />;
    case "sparkles":
      return <Sparkles className={className} />;
    case "trophy":
    default:
      return <Trophy className={className} />;
  }
}

function AwardTypesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AwardTypeRecord | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Lifecycle confirmation states
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<AwardTypeRecord | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<AwardTypeRecord | null>(null);
  const [deleteConflictMessage, setDeleteConflictMessage] = useState<string | null>(null);

  // Upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form data for Award Type
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    icon: string;
    imageUrl: string;
    imageStoragePath: string;
    requiresApproval: boolean;
    allowPeerNomination: boolean;
    allowSelfNomination: boolean;
    workflowId: string;
    status: "active" | "inactive";
  }>({
    name: "",
    description: "",
    icon: "Trophy",
    imageUrl: "",
    imageStoragePath: "",
    requiresApproval: true,
    allowPeerNomination: true,
    allowSelfNomination: false,
    workflowId: "",
    status: "active",
  });

  // Form data for Employee Award Assignment
  const [assignData, setAssignData] = useState<{
    employeeId: string;
    awardTypeId: string;
    awardDate: string;
    giftItem: string;
    giftAmount: string;
    description: string;
    presentedBy: string;
  }>({
    employeeId: "",
    awardTypeId: "",
    awardDate: new Date().toISOString().split("T")[0],
    giftItem: "",
    giftAmount: "0",
    description: "",
    presentedBy: "Executive Committee",
  });

  // Master List Hook
  const {
    data: awardTypes,
    total,
    page,
    limit,
    totalPages,
    setPage,
    setLimit,
    search,
    setSearch,
    counts,
    isLoading,
    refetch,
  } = useMasterList<AwardTypeRecord>({
    endpoint: "/hr/organization/award-types",
    queryKey: "award-types-list",
    defaultLimit: 10,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    extraParams: statusFilter !== "all" ? { status: statusFilter } : {},
  });

  // Fetch employees for quick assignment
  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-quick-list"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=200");
      return unwrapArray(res);
    },
    staleTime: 60000,
  });

  // Fetch available workflows for Award Nomination
  const { data: workflows = [] } = useQuery({
    queryKey: ["award-workflows-options"],
    queryFn: async () => {
      try {
        const res = await api.get("/awards/workflows");
        return res?.data || res || [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      name: "",
      description: "",
      icon: "Trophy",
      imageUrl: "",
      imageStoragePath: "",
      requiresApproval: true,
      allowPeerNomination: true,
      allowSelfNomination: false,
      workflowId: "",
      status: "active",
    });
    setIsFormModalOpen(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (record: AwardTypeRecord) => {
    setEditingRecord(record);
    setFormData({
      name: record.name,
      description: record.description || "",
      icon: record.icon || "Trophy",
      imageUrl: record.imageUrl || "",
      imageStoragePath: record.imageStoragePath || "",
      requiresApproval: record.requiresApproval !== undefined ? record.requiresApproval : true,
      allowPeerNomination: record.allowPeerNomination !== undefined ? record.allowPeerNomination : true,
      allowSelfNomination: record.allowSelfNomination !== undefined ? record.allowSelfNomination : false,
      workflowId: record.workflowId || "",
      status: record.status || "active",
    });
    setIsFormModalOpen(true);
  };

  // Handle open Assign Modal
  const handleOpenAssign = (awardType?: AwardTypeRecord) => {
    setAssignData({
      employeeId: "",
      awardTypeId: awardType?.id || "",
      awardDate: new Date().toISOString().split("T")[0],
      giftItem: awardType?.name || "",
      giftAmount: "0",
      description: "",
      presentedBy: "Executive Committee",
    });
    setIsAssignModalOpen(true);
  };

  // Upload image mutation
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5MB.");
      return;
    }

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only PNG, JPG, WEBP, or SVG image files are supported.");
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    if (editingRecord?.id) {
      uploadFormData.append("awardTypeId", editingRecord.id);
    }

    try {
      setIsUploadingImage(true);
      const res = await api.upload("/hr/organization/award-types/upload", uploadFormData);
      const data = res?.data || res;
      setFormData((prev) => ({
        ...prev,
        imageUrl: data.url,
        imageStoragePath: data.imageStoragePath,
      }));
      toast.success("Award image uploaded successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to upload image.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: "",
      imageStoragePath: "",
    }));
  };

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error("Award Title is required.");
      }
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        icon: formData.icon || "Trophy",
        imageUrl: formData.imageUrl || null,
        imageStoragePath: formData.imageStoragePath || null,
        requiresApproval: formData.requiresApproval,
        allowPeerNomination: formData.allowPeerNomination,
        allowSelfNomination: formData.allowSelfNomination,
        workflowId: formData.requiresApproval && formData.workflowId ? formData.workflowId : null,
        status: formData.status,
      };

      if (editingRecord?.id) {
        return await api.put(`/hr/organization/award-types/${editingRecord.id}`, payload);
      } else {
        return await api.post("/hr/organization/award-types", payload);
      }
    },
    onSuccess: () => {
      toast.success(
        editingRecord ? "Award Type updated successfully" : "Award Type created successfully"
      );
      setIsFormModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to save Award Type");
    },
  });

  // Status toggle mutation (Activate / De-activate)
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "inactive" }) => {
      return await api.put(`/hr/organization/award-types/${id}`, { status: newStatus });
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.newStatus === "inactive" ? "Award Type de-activated" : "Award Type activated"
      );
      setStatusConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update status");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/organization/award-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Award Type deleted successfully");
      setDeleteConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || "Failed to delete Award Type";
      if (err.status === 409 || err.response?.status === 409 || msg.includes("Cannot delete") || msg.includes("linked to it")) {
        setDeleteConflictMessage(msg);
      } else {
        toast.error(msg);
        setDeleteConfirmTarget(null);
      }
    },
  });

  // Assign Award Mutation
  const assignAwardMutation = useMutation({
    mutationFn: async () => {
      if (!assignData.employeeId) {
        throw new Error("Please select an employee.");
      }
      if (!assignData.awardTypeId) {
        throw new Error("Please select an Award Type.");
      }
      return await api.post("/api/awards", {
        employeeId: assignData.employeeId,
        awardTypeId: assignData.awardTypeId,
        awardDate: assignData.awardDate,
        giftItem: assignData.giftItem || "Recognition Award",
        giftAmount: Number(assignData.giftAmount) || 0,
        description: assignData.description.trim() || null,
        presentedBy: assignData.presentedBy.trim() || "Management",
      });
    },
    onSuccess: () => {
      toast.success("Award successfully granted and recorded!");
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-awards"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to assign award.");
    },
  });

  // Active Award Types for dropdown in assignment modal
  const activeAwardTypes = useMemo(() => {
    return (awardTypes || []).filter((at) => at.status !== "inactive");
  }, [awardTypes]);

  return (
    <div className="space-y-6">
      {/* Page Header — Decorative icon removed per Phase 6 requirements */}
      <PageHeader
        title="Employee Award Types"
        description="Recognition categories, merit badges, and excellence award designations."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => handleOpenAssign()}
              className="h-9 gap-2 text-xs font-medium"
            >
              <UserCheck className="h-4 w-4 text-primary" />
              Assign Award
            </Button>
            <Button onClick={handleOpenAdd} className="h-9 gap-2 text-xs font-medium">
              <Plus className="h-4 w-4" />
              Add Award Type
            </Button>
          </div>
        }
      />

      {/* Authoritative Aggregate Summary Cards */}
      <StatsOverviewGrid columns={3}>
        <StatCard
          title="Total Award Categories"
          value={counts?.total ?? total}
          icon={Trophy}
          variant="info"
          className="bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card border-amber-200/80 hover:border-amber-400 dark:border-amber-800/40 dark:hover:border-amber-700 hover:shadow-xs transition-all duration-200"
          description="Registered employee achievement awards"
        />
        <StatCard
          title="Active Award Types"
          value={(counts as any)?.activeTypes ?? counts?.active ?? 0}
          icon={Star}
          variant="success"
          className="bg-gradient-to-br from-emerald-50/70 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-800/40 dark:hover:border-emerald-700 hover:shadow-xs transition-all duration-200"
          description="Active recognition types ready for assignment"
        />
        <StatCard
          title="Total Awards Issued"
          value={(counts as any)?.totalAwardsIssued ?? 0}
          icon={Award}
          variant="default"
          className="bg-gradient-to-br from-blue-50/70 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card border-blue-200/80 hover:border-blue-400 dark:border-blue-800/40 dark:hover:border-blue-700 hover:shadow-xs transition-all duration-200"
          description="Total employee recognition honors conferred"
        />
      </StatsOverviewGrid>

      {/* Filter and Search Toolbar */}
      <FilterToolbar
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search award types by title or description..."
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Award Types Responsive Table */}
      <div className="rounded-lg border bg-card shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-16">Badge</TableHead>
              <TableHead className="min-w-[180px]">Award Title</TableHead>
              <TableHead className="min-w-[190px]">Workflow & Governance</TableHead>
              <TableHead className="min-w-[220px]">Description</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-28 text-center">Conferred</TableHead>
              <TableHead className="w-28">Created</TableHead>
              <TableHead className="text-right w-44">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Loading award types...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : awardTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Trophy className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-xs font-semibold text-foreground">No award types found</p>
                    <p className="text-[11px] text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "Try clearing your filters or search terms."
                        : "Click 'Add Award Type' to configure your first recognition category."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              awardTypes.map((at) => {
                const isInactive = at.status === "inactive";
                const awardCount = at._count?.awards ?? 0;
                return (
                  <TableRow
                    key={at.id || at.name}
                    className={`transition-colors hover:bg-muted/30 ${
                      isInactive ? "opacity-75 bg-muted/10" : ""
                    }`}
                  >
                    {/* Badge / Icon */}
                    <TableCell>
                      {at.imageUrl ? (
                        <div className="h-9 w-9 rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center p-0.5">
                          <img
                            src={at.imageUrl}
                            alt={at.name}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              // Image load fallback to icon
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                          {renderAwardIcon(at.icon, "h-4 w-4")}
                        </div>
                      )}
                    </TableCell>

                    {/* Award Title */}
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <span>{at.name}</span>
                        {at.icon && !at.imageUrl && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({at.icon})
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Workflow & Governance */}
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {at.requiresApproval ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>{at.workflow?.name || "Multi-Stage Workflow"}</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 flex items-center gap-1"
                          >
                            <UserCheck className="h-3 w-3" />
                            <span>Direct HR Issue</span>
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className={at.allowPeerNomination ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                            Peer: {at.allowPeerNomination ? "Yes" : "No"}
                          </span>
                          <span>•</span>
                          <span className={at.allowSelfNomination ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                            Self: {at.allowSelfNomination ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <p className="text-xs text-muted-foreground line-clamp-2" title={at.description || ""}>
                        {at.description || "—"}
                      </p>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge
                        variant={isInactive ? "secondary" : "default"}
                        className={`text-[10px] font-medium px-2 py-0.5 capitalize ${
                          isInactive
                            ? "bg-muted text-muted-foreground hover:bg-muted"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                        }`}
                      >
                        {isInactive ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>

                    {/* Usage / Employees Awarded */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{awardCount}</span>
                      </div>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {at.createdAt ? format(new Date(at.createdAt), "dd MMM yyyy") : "—"}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Assign */}
                        {!isInactive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAssign(at)}
                            className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            title="Assign to Employee"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline ml-1">Assign</span>
                          </Button>
                        )}

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(at)}
                          className="h-8 px-2 text-xs"
                          title="Edit Award Type"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Lifecycle Deactivate / Activate */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatusConfirmTarget(at)}
                          className={`h-8 px-2 text-xs ${
                            isInactive ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"
                          }`}
                          title={isInactive ? "Re-activate" : "De-activate"}
                        >
                          {isInactive ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteConflictMessage(null);
                            setDeleteConfirmTarget(at);
                          }}
                          className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Award Type"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Server Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20 text-xs">
            <span className="text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} award types
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(page - 1, 1))}
                disabled={page <= 1}
                className="h-7 px-2.5 text-xs"
              >
                Previous
              </Button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-7 px-2.5 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT AWARD TYPE MODAL */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingRecord ? "Edit Award Type" : "Add New Award Type"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure recognition title, custom badge icon/image, description, and status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {/* Award Title */}
            <div className="space-y-1.5">
              <Label htmlFor="at-name" className="text-xs font-medium">
                Award Title *
              </Label>
              <Input
                id="at-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Employee of the Month, Star Performer"
                required
                className="text-xs h-9"
              />
            </div>

            {/* Custom Image Upload Area */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center justify-between">
                <span>Award Badge / Image (Optional)</span>
                <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP, SVG (max 5MB)</span>
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleImageFileChange}
              />

              {formData.imageUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="h-14 w-14 rounded-md border bg-card flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img
                      src={formData.imageUrl}
                      alt="Award Badge Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      Custom Badge Uploaded
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="h-7 text-[11px] px-2"
                      >
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        className="h-7 text-[11px] px-2 text-destructive hover:bg-destructive/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors"
                >
                  {isUploadingImage ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Uploading image...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6 text-muted-foreground/60 mb-1" />
                      <p className="text-xs font-medium text-foreground">Click to upload custom badge</p>
                      <p className="text-[10px] text-muted-foreground">
                        Drag & drop or browse from local disk
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fallback Icon Identifier */}
            <div className="space-y-1.5">
              <Label htmlFor="at-icon" className="text-xs font-medium">
                Fallback Icon Identifier
              </Label>
              <Select
                value={formData.icon}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, icon: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select icon..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        {renderAwardIcon(opt.value, "h-3.5 w-3.5 text-amber-500")}
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="at-desc" className="text-xs font-medium">
                Description & Criteria
              </Label>
              <Textarea
                id="at-desc"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Recognition criteria, eligibility requirements, and purpose..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val: "active" | "inactive") =>
                  setFormData((prev) => ({ ...prev, status: val }))
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">
                    Active (Can be conferred to employees)
                  </SelectItem>
                  <SelectItem value="inactive" className="text-xs">
                    Inactive (Deactivated from selection)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* GOVERNANCE & APPROVAL WORKFLOW SETTINGS */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Governance & Approval Controls
              </h4>

              {/* Requires Approval Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label htmlFor="at-req-approval" className="text-xs font-medium cursor-pointer">
                    Require Multi-Stage Approval
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    When enabled, nominations must be verified through the workflow engine before official awards are issued.
                  </p>
                </div>
                <Switch
                  id="at-req-approval"
                  checked={formData.requiresApproval}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, requiresApproval: checked }))
                  }
                />
              </div>

              {/* Approval Workflow Selector */}
              {formData.requiresApproval && (
                <div className="space-y-1.5">
                  <Label htmlFor="at-workflow" className="text-xs font-medium flex items-center justify-between">
                    <span>Assigned Approval Workflow</span>
                    <span className="text-[10px] text-muted-foreground">Per-award-type binding</span>
                  </Label>
                  <Select
                    value={formData.workflowId || "default"}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, workflowId: val === "default" ? "" : val }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Default Multi-Stage Chain (Manager → Dept → HR)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs font-medium">
                        Default Chain (Automatic Multi-Level Workflow)
                      </SelectItem>
                      {workflows.map((wf: any) => (
                        <SelectItem key={wf.id} value={wf.id} className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>{wf.name}</span>
                            {wf.steps && (
                              <span className="text-[10px] text-muted-foreground">
                                ({wf.steps.length} step{wf.steps.length === 1 ? "" : "s"})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Peer Nomination Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label htmlFor="at-peer-nom" className="text-xs font-medium cursor-pointer">
                    Allow Peer Nominations
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Allow non-manager colleagues to nominate coworkers across departments for this award.
                  </p>
                </div>
                <Switch
                  id="at-peer-nom"
                  checked={formData.allowPeerNomination}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, allowPeerNomination: checked }))
                  }
                />
              </div>

              {/* Self Nomination Switch */}
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div className="space-y-0.5 pr-2">
                  <Label htmlFor="at-self-nom" className="text-xs font-medium cursor-pointer">
                    Allow Self Nominations
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Allow employees to submit self-applications with supporting achievement documentation.
                  </p>
                </div>
                <Switch
                  id="at-self-nom"
                  checked={formData.allowSelfNomination}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, allowSelfNomination: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-9 text-xs gap-1.5">
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editingRecord ? "Save Changes" : "Create Award Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ASSIGN AWARD MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Confer Employee Award
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Officially recognize an employee and issue a certificate of excellence.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignAwardMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {/* Select Employee */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Select Employee *</Label>
              <Select
                value={assignData.employeeId}
                onValueChange={(val) => setAssignData((prev) => ({ ...prev, employeeId: val }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-xs">
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || "No Code"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Award Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Award Type *</Label>
              <Select
                value={assignData.awardTypeId}
                onValueChange={(val) => {
                  const selected = activeAwardTypes.find((t) => t.id === val);
                  setAssignData((prev) => ({
                    ...prev,
                    awardTypeId: val,
                    giftItem: selected?.name || prev.giftItem,
                  }));
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select active award type..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeAwardTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id!} className="text-xs">
                      <div className="flex items-center gap-2">
                        {renderAwardIcon(at.icon, "h-3.5 w-3.5 text-amber-500")}
                        <span>{at.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Award Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Conferred Date *</Label>
              <Input
                type="date"
                value={assignData.awardDate}
                onChange={(e) => setAssignData((prev) => ({ ...prev, awardDate: e.target.value }))}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Recognition Reason / Citation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recognition Citation / Reason</Label>
              <Textarea
                value={assignData.description}
                onChange={(e) => setAssignData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Reason for honor, milestone exceeded, or special contribution..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Presented By & Gift Item in 2 columns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Presented By</Label>
                <Input
                  value={assignData.presentedBy}
                  onChange={(e) => setAssignData((prev) => ({ ...prev, presentedBy: e.target.value }))}
                  placeholder="e.g. CEO, Department Head"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Gift / Reward Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={assignData.giftAmount}
                  onChange={(e) => setAssignData((prev) => ({ ...prev, giftAmount: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignAwardMutation.isPending}
                className="h-9 text-xs gap-1.5"
              >
                {assignAwardMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confer Award
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* STATUS TOGGLE CONFIRMATION */}
      <ConfirmationDialog
        open={Boolean(statusConfirmTarget)}
        onOpenChange={(open) => !open && setStatusConfirmTarget(null)}
        title={
          statusConfirmTarget?.status === "inactive"
            ? "Re-activate Award Type?"
            : "De-activate Award Type?"
        }
        description={
          statusConfirmTarget?.status === "inactive"
            ? `Re-activating '${statusConfirmTarget?.name}' will allow HR administrators to confer this award to employees again.`
            : `De-activating '${statusConfirmTarget?.name}' will prevent new awards from selecting it. Existing historical employee records will be strictly preserved.`
        }
        confirmLabel={statusConfirmTarget?.status === "inactive" ? "Re-activate" : "De-activate"}
        onConfirm={() => {
          if (!statusConfirmTarget?.id) return;
          toggleStatusMutation.mutate({
            id: statusConfirmTarget.id,
            newStatus: statusConfirmTarget.status === "inactive" ? "active" : "inactive",
          });
        }}
        variant={statusConfirmTarget?.status === "inactive" ? "default" : "destructive"}
        isLoading={toggleStatusMutation.isPending}
      />

      {/* DELETE CONFIRMATION & DEPENDENCY CONFLICT DIALOG */}
      <ConfirmationDialog
        open={Boolean(deleteConfirmTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmTarget(null);
            setDeleteConflictMessage(null);
          }
        }}
        title={deleteConflictMessage ? "Cannot Delete Referenced Award Type" : "Delete Award Type?"}
        description={
          deleteConflictMessage ||
          `Are you sure you want to permanently delete '${deleteConfirmTarget?.name}'? This action cannot be undone.`
        }
        confirmLabel={deleteConflictMessage ? "I Understand" : "Delete Permanently"}
        onConfirm={() => {
          if (deleteConflictMessage) {
            setDeleteConfirmTarget(null);
            setDeleteConflictMessage(null);
            return;
          }
          if (deleteConfirmTarget?.id) {
            deleteMutation.mutate(deleteConfirmTarget.id);
          }
        }}
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export default AwardTypesPage;

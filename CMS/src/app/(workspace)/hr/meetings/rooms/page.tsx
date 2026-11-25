"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  DoorOpen,
  MapPin,
  Monitor,
  Users,
  Wrench,
  Eye,
  Edit,
  Trash2,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Link2,
  Copy,
  Hash,
  Lock,
} from "lucide-react";

interface MeetingRoomItem {
  id: string;
  name: string;
  description?: string;
  roomType: "physical" | "virtual" | string;
  location?: string;
  bookingUrl?: string;
  capacity: number;
  amenities?: string;
  equipment: string[];
  meetingsCount: number;
  isActive: boolean;
  status: "active" | "inactive";
}

export default function HrMeetingRoomsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MeetingRoomItem | null>(null);
  const [viewTarget, setViewTarget] = useState<MeetingRoomItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingRoomItem | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<"physical" | "virtual" | "">("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formBookingUrl, setFormBookingUrl] = useState("");
  const [formEquipment, setFormEquipment] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive" | "">("active");

  const { data: rooms = [], isLoading } = useQuery<MeetingRoomItem[]>({
    queryKey: ["hr-meeting-rooms"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/rooms");
      return unwrapArray<MeetingRoomItem>(res);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      name: string;
      description?: string;
      roomType: string;
      capacity: number;
      location?: string;
      bookingUrl?: string;
      equipment?: string;
      status: string;
    }) => {
      if (payload.id) {
        return api.put(`/hr/meetings/rooms/${payload.id}`, payload);
      }
      return api.post("/hr/meetings/rooms", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-rooms"] });
      toast.success(editTarget ? "Meeting room updated." : "Meeting room created.");
      setFormOpen(false);
      setEditTarget(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save room.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api.patch(`/hr/meetings/rooms/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-rooms"] });
      toast.success("Room status updated.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/hr/meetings/rooms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-rooms"] });
      toast.success("Meeting room deleted.");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete room.");
    },
  });

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormType("");
    setFormCapacity("");
    setFormLocation("");
    setFormBookingUrl("");
    setFormEquipment("");
    setFormStatus("active");
  }

  function openAdd() {
    resetForm();
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(r: MeetingRoomItem) {
    setEditTarget(r);
    setFormName(r.name || "");
    setFormDescription(r.description || "");
    setFormType(r.roomType === "virtual" ? "virtual" : "physical");
    setFormCapacity(String(r.capacity ?? ""));
    setFormLocation(r.location || "");
    setFormBookingUrl(r.bookingUrl || "");
    setFormEquipment(r.amenities || (r.equipment || []).join(", "));
    setFormStatus(r.isActive ? "active" : "inactive");
    setFormOpen(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formType || !formCapacity || !formStatus) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (formType === "virtual" && !formBookingUrl.trim()) {
      toast.error("Booking URL is required for Virtual rooms.");
      return;
    }
    saveMutation.mutate({
      id: editTarget?.id,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      roomType: formType,
      capacity: Math.max(1, Number(formCapacity) || 10),
      location: formType === "physical" ? formLocation.trim() || undefined : undefined,
      bookingUrl: formType === "virtual" ? formBookingUrl.trim() || undefined : undefined,
      equipment: formEquipment.trim() || undefined,
      status: formStatus,
    });
  }

  const kpis = useMemo(() => {
    const total = rooms.length;
    const active = rooms.filter((r) => r.isActive).length;
    const physical = rooms.filter((r) => r.roomType !== "virtual").length;
    const virtual = rooms.filter((r) => r.roomType === "virtual").length;
    return { total, active, physical, virtual };
  }, [rooms]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (selectedType !== "all" && r.roomType !== selectedType) return false;
      if (q) {
        const hay = `${r.name} ${r.location || ""} ${r.description || ""} ${r.amenities || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rooms, search, selectedType]);

  const tabCounts = useMemo(
    () => ({
      all: baseFiltered.length,
      active: baseFiltered.filter((r) => r.isActive).length,
      inactive: baseFiltered.filter((r) => !r.isActive).length,
    }),
    [baseFiltered]
  );

  const filteredAndSorted = useMemo(() => {
    const list =
      activeTab === "all"
        ? baseFiltered
        : baseFiltered.filter((r) => (activeTab === "active" ? r.isActive : !r.isActive));
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });
  }, [baseFiltered, activeTab, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const startIdx = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, filteredAndSorted.length);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      <PageHeader
        title="Meeting Rooms"
        description="Manage rooms and spaces available for meetings."
        actions={
          <Button
            onClick={openAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Meeting Room
          </Button>
        }
      />

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Total Rooms</div>
            <div className="text-2xl font-bold text-foreground">{kpis.total}</div>
            <div className="text-xs text-muted-foreground">All rooms</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-slate-500/10 border border-slate-500/15 text-slate-600 flex items-center justify-center">
            <DoorOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Active Rooms</div>
            <div className="text-2xl font-bold text-foreground">{kpis.active}</div>
            <div className="text-xs font-medium text-emerald-600">Currently active</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <DoorOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Physical Rooms</div>
            <div className="text-2xl font-bold text-foreground">{kpis.physical}</div>
            <div className="text-xs font-medium text-emerald-600">On-site rooms</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <MapPin className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Virtual Rooms</div>
            <div className="text-2xl font-bold text-foreground">{kpis.virtual}</div>
            <div className="text-xs font-medium text-blue-600">Online rooms</div>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
            <Monitor className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar + Tabs */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border/60">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-9"
            />
          </div>

          <Select
            value={selectedType}
            onValueChange={(v) => {
              setSelectedType(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedType("all");
                setActiveTab("all");
                setPage(1);
              }}
              className="h-9 gap-1.5"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </div>
        </div>

        <div className="px-4 flex items-center gap-1 overflow-x-auto bg-card">
          {(
            [
              { key: "all", label: "All", count: tabCounts.all, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
              { key: "active", label: "Active", count: tabCounts.active, icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
              { key: "inactive", label: "Inactive", count: tabCounts.inactive, icon: <XCircle className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/80 bg-muted/50">
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 w-12">
                  #
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  <button
                    type="button"
                    onClick={() => setSortAsc(!sortAsc)}
                    className="inline-flex items-center gap-1 hover:text-foreground uppercase"
                  >
                    Name
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Location
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Capacity
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Equipment
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Meetings
                </th>
                <th className="text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Status
                </th>
                <th className="text-right text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Loading meeting rooms...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    No meeting rooms found.
                  </td>
                </tr>
              ) : (
                paginated.map((room, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const isVirtual = room.roomType === "virtual";

                  return (
                    <tr key={room.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-medium text-muted-foreground">{rowNum}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isVirtual
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {isVirtual ? (
                              <Monitor className="h-4 w-4" />
                            ) : (
                              <MapPin className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{room.name}</div>
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium mt-0.5 ${
                                isVirtual
                                  ? "bg-blue-500/10 text-blue-600"
                                  : "bg-emerald-500/10 text-emerald-600"
                              }`}
                            >
                              {isVirtual ? "Virtual" : "Physical"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {isVirtual ? (
                          room.bookingUrl ? (
                            <a
                              href={room.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium text-xs"
                            >
                              Join Link
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Online</span>
                          )
                        ) : (
                          <span className="text-xs text-foreground">{room.location || "-"}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground text-xs">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {room.capacity}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          {room.equipment?.length || 0} items
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border border-border/80 bg-muted/30 px-2 text-xs font-medium text-foreground">
                          {room.meetingsCount ?? 0}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={room.isActive}
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: room.id,
                                isActive: !room.isActive,
                              })
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                              room.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                                room.isActive ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-muted-foreground">
                            {room.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="View Details"
                            onClick={() => setViewTarget(room)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Edit Room"
                            onClick={() => openEdit(room)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title="Delete Room"
                            onClick={() => setDeleteTarget(room)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startIdx}</span> to{" "}
            <span className="font-semibold text-foreground">{endIdx}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredAndSorted.length}</span>{" "}
            results
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                « Previous
              </Button>
              <Button
                variant="primary"
                size="xs"
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              >
                {safePage}
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next »
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Meeting Room Modal */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) {
            setEditTarget(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Meeting Room" : "Add New Meeting Room"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Room Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Conference Room A"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description of the room and its purpose"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Type <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as "physical" | "virtual")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Capacity <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                placeholder="e.g. 10"
                required
              />
            </div>

            {formType === "virtual" ? (
              <div className="space-y-1.5">
                <Label>
                  Booking URL <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="url"
                  value={formBookingUrl}
                  onChange={(e) => setFormBookingUrl(e.target.value)}
                  placeholder="https://webinar.company.com/room1"
                  required
                />
              </div>
            ) : formType === "physical" ? (
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="e.g. First Floor, North Wing"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Input
                value={formEquipment}
                onChange={(e) => setFormEquipment(e.target.value)}
                placeholder="e.g. Projector, Whiteboard, TV Screen"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as "active" | "inactive")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Meeting Room Details Modal */}
      <Dialog open={Boolean(viewTarget)} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {viewTarget && (
            <>
              <div
                className={`px-6 py-5 border-b border-border/60 flex items-center gap-3.5 ${
                  viewTarget.roomType === "virtual"
                    ? "bg-blue-50/70 dark:bg-blue-950/20"
                    : "bg-emerald-50/70 dark:bg-emerald-950/20"
                }`}
              >
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    viewTarget.roomType === "virtual"
                      ? "bg-blue-500/15 text-blue-600"
                      : "bg-emerald-500/15 text-emerald-600"
                  }`}
                >
                  {viewTarget.roomType === "virtual" ? (
                    <Monitor className="h-5 w-5" />
                  ) : (
                    <MapPin className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {viewTarget.name}
                  </DialogTitle>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium mt-1 ${
                      viewTarget.roomType === "virtual"
                        ? "bg-blue-500/15 text-blue-600"
                        : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    {viewTarget.roomType === "virtual" ? "Virtual" : "Physical"}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-5 text-sm">
                <div>
                  <div className="text-xs font-bold text-foreground mb-3">Basic Info</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                        <Lock className="h-3.5 w-3.5" />
                        Status
                      </div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${
                            viewTarget.isActive
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                          }`}
                        >
                          {viewTarget.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Users className="h-3.5 w-3.5" />
                        Capacity
                      </div>
                      <div className="font-bold text-base text-foreground">
                        {viewTarget.capacity}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-foreground mb-3">Room Details</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        {viewTarget.roomType === "virtual" ? (
                          <>
                            <Link2 className="h-3.5 w-3.5" />
                            Booking URL
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3.5 w-3.5" />
                            Location
                          </>
                        )}
                      </div>
                      {viewTarget.roomType === "virtual" && viewTarget.bookingUrl ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={viewTarget.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium text-xs truncate"
                          >
                            {viewTarget.bookingUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(viewTarget.bookingUrl || "");
                              toast.success("Booking URL copied.");
                            }}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            title="Copy URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="font-medium text-foreground text-xs">
                          {viewTarget.location || "-"}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Hash className="h-3.5 w-3.5" />
                        Meetings
                      </div>
                      <div>
                        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border border-border/80 bg-muted/30 px-2 text-xs font-semibold text-foreground">
                          {viewTarget.meetingsCount ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {viewTarget.equipment && viewTarget.equipment.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-foreground mb-2">Equipment</div>
                    <div className="flex flex-wrap gap-1.5">
                      {viewTarget.equipment.map((eq, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2.5 py-0.5 text-xs font-medium"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-bold text-foreground mb-1">Description</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {viewTarget.description || "No description provided."}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Meeting Room</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

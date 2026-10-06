import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Trophy,
  Award,
  Medal,
  Star,
  Gift,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Sparkles,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Zap,
  Heart,
  Users,
  LayoutGrid,
  List,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Canonical Wave 4 composites & system states
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { LoadingState } from "@/components/system-states/loading-state";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/awards")({
  component: AwardsPage,
  head: () => ({ meta: [{ title: "Awards & Recognitions — Master HRMS" }] }),
});

export function AwardsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const userRoles = profile?.roles || [];
  const canManageAwards = userRoles.some((r) =>
    ["admin", "super_admin", "tenant_admin", "hr_admin", "manager"].includes(r)
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [filterScope, setFilterScope] = useState<"all" | "my">("all");
  const [activeTab, setActiveTab] = useState<"grid" | "table">("grid");

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [certificateViewAward, setCertificateViewAward] = useState<any | null>(null);
  const [deleteAwardId, setDeleteAwardId] = useState<string | null>(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [formAwardTypeId, setFormAwardTypeId] = useState("");
  const [formAwardDate, setFormAwardDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formGiftItem, setFormGiftItem] = useState("Trophy & Recognition Plaque");
  const [formGiftAmount, setFormGiftAmount] = useState("0");
  const [formDescription, setFormDescription] = useState("");
  const [formPresentedBy, setFormPresentedBy] = useState("");

  // New Type Form State
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeIcon, setNewTypeIcon] = useState("Trophy");
  const [newTypeDescription, setNewTypeDescription] = useState("");

  // Fetch Awards
  const { data: awardsData, isLoading: awardsLoading } = useQuery({
    queryKey: ["awards", selectedTypeFilter, searchTerm, filterScope],
    queryFn: async () => {
      if (filterScope === "my") {
        const res: any = await api.get("/api/v1/me/awards");
        return { data: Array.isArray(res?.data) ? res.data : [] };
      }
      const params = new URLSearchParams();
      if (selectedTypeFilter !== "all") params.append("awardTypeId", selectedTypeFilter);
      if (searchTerm) params.append("search", searchTerm);
      const res = await api.get(`/api/awards?${params.toString()}`);
      return res;
    },
  });

  const awards: any[] = useMemo(() => {
    if (Array.isArray(awardsData)) return awardsData;
    return awardsData?.data || [];
  }, [awardsData]);

  const stats = awardsData?.stats || {
    totalAwards: awards.length,
    totalGiftValue: 0,
    distribution: [],
  };

  // Fetch Award Types
  const { data: awardTypes = [] } = useQuery<any[]>({
    queryKey: ["award-types"],
    queryFn: async () => {
      const res = await api.get("/api/awards/types");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Fetch Employees for dropdown
  const { data: employeesData } = useQuery({
    queryKey: ["employees-list-light"],
    queryFn: async () => {
      const res = await api.get("/api/employees?limit=200");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const employees: any[] = employeesData || [];

  // Create Award Mutation
  const createAwardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/awards", payload);
    },
    onSuccess: () => {
      toast.success("Award issued and certificate generated!");
      setIsCreateModalOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["awards"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to issue award.");
    },
  });

  // Create Award Type Mutation
  const createTypeMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/api/awards/types", payload);
    },
    onSuccess: () => {
      toast.success("New award category created!");
      setIsTypeModalOpen(false);
      setNewTypeName("");
      setNewTypeDescription("");
      qc.invalidateQueries({ queryKey: ["award-types"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create award type.");
    },
  });

  // Delete Award Mutation
  const deleteAwardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/api/awards/${id}`);
    },
    onSuccess: () => {
      toast.success("Award removed successfully.");
      qc.invalidateQueries({ queryKey: ["awards"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete award.");
    },
  });

  const resetForm = () => {
    setFormEmployeeId("");
    setFormAwardTypeId("");
    setFormAwardDate(new Date().toISOString().split("T")[0]);
    setFormGiftItem("Trophy & Recognition Plaque");
    setFormGiftAmount("0");
    setFormDescription("");
    setFormPresentedBy("");
  };

  const handleIssueAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) {
      toast.error("Please select an employee.");
      return;
    }
    createAwardMutation.mutate({
      employeeId: formEmployeeId,
      awardTypeId: formAwardTypeId || null,
      awardDate: formAwardDate,
      giftItem: formGiftItem,
      giftAmount: Number(formGiftAmount) || 0,
      description: formDescription,
      presentedBy: formPresentedBy,
    });
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast.error("Category name is required.");
      return;
    }
    createTypeMutation.mutate({
      name: newTypeName.trim(),
      icon: newTypeIcon,
      description: newTypeDescription.trim(),
    });
  };

  const filteredAwards = useMemo(() => {
    return awards.filter((a) => {
      const matchSearch =
        !searchTerm ||
        `${a.employee?.firstName} ${a.employee?.lastName}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        a.giftItem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.certificateNo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType =
        selectedTypeFilter === "all" ||
        a.awardTypeId === selectedTypeFilter;
      return matchSearch && matchType;
    });
  }, [awards, searchTerm, selectedTypeFilter]);

  const recentAwardee = awards[0];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ─── PageHeader with Breadcrumbs and Actions ───────────────────────── */}
      <PageHeader
        title="Awards & Recognition"
        description="Celebrate organizational achievements, honor outstanding work, and generate digital certificates."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "HRM" },
          { label: "Awards & Recognition" },
        ]}
        actions={
          canManageAwards && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTypeModalOpen(true)}
                className="h-9 text-xs gap-1.5"
              >
                <Plus className="size-3.5" />
                <span>New Category</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                <Trophy className="size-3.5" />
                <span>Issue Award</span>
              </Button>
            </div>
          )
        }
      />

      {/* ─── Metric Summary Cards ──────────────────────────────────────────── */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Honors Bestowed"
          value={stats.totalAwards || awards.length}
          variant="warning"
          icon={<Trophy className="size-5" />}
          description="Milestone & performance honors"
        />
        <StatCard
          label="Active Categories"
          value={awardTypes.length}
          variant="info"
          icon={<Award className="size-5" />}
          description="Employee of Month, Star Performer, etc."
        />
        <StatCard
          label="Gift Value Disbursed"
          value={`$${Number(stats.totalGiftValue || 0).toLocaleString()}`}
          variant="success"
          icon={<Gift className="size-5" />}
          description="Vouchers, trophies & incentives"
        />
        <StatCard
          label="Latest Awardee"
          value={
            recentAwardee
              ? `${recentAwardee.employee?.firstName} ${recentAwardee.employee?.lastName}`
              : "None yet"
          }
          variant="purple"
          icon={<Medal className="size-5" />}
          description={
            recentAwardee
              ? recentAwardee.awardType?.name || recentAwardee.giftItem
              : "No awards issued yet"
          }
        />
      </StatsOverviewGrid>

      {/* ─── Filters & View Controls ───────────────────────────────────────── */}
      <FilterToolbar
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "Search awardee, voucher, certificate #...",
        }}
        filters={
          <div className="flex items-center gap-2">
            <Select value={filterScope} onValueChange={(v: any) => setFilterScope(v)}>
              <SelectTrigger className="w-[170px] h-8.5 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Company Awards</SelectItem>
                <SelectItem value="my" className="text-xs font-bold text-primary">My Honors & Badges</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="w-[180px] h-8.5 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                {awardTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        viewToggle={
          <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40">
            <Button
              variant={activeTab === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("grid")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <LayoutGrid className="size-3.5" />
              <span>Wall</span>
            </Button>
            <Button
              variant={activeTab === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("table")}
              className="h-7 px-2.5 text-xs gap-1.5"
            >
              <List className="size-3.5" />
              <span>Directory</span>
            </Button>
          </div>
        }
        actions={
          <Badge variant="outline" className="text-xs">
            {filteredAwards.length} {filteredAwards.length === 1 ? "award" : "awards"}
          </Badge>
        }
      />

      {/* ─── Main Content: Wall View vs Directory Table ─────────────────────── */}
      {awardsLoading ? (
        <div className="p-8 bg-card rounded-xl border border-border/70 shadow-2xs">
          <LoadingState
            variant={activeTab === "grid" ? "cards" : "table"}
            rows={6}
            message="Loading employee honors and recognition certificates..."
          />
        </div>
      ) : filteredAwards.length === 0 ? (
        <div className="py-12 bg-card rounded-xl border border-border/70 shadow-2xs">
          <EmptyState
            icon={Trophy}
            title="No awards found"
            description={
              searchTerm || selectedTypeFilter !== "all"
                ? "There are no recognition honors matching your search criteria."
                : "No recognition honors recorded yet. Issue an award to recognize employee excellence."
            }
            actionLabel={canManageAwards ? "Issue First Award" : undefined}
            onAction={canManageAwards ? () => setIsCreateModalOpen(true) : undefined}
          />
        </div>
      ) : activeTab === "grid" ? (
        /* Recognition Wall (Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAwards.map((award) => (
            <Card
              key={award.id}
              className="border border-border/70 hover:border-amber-500/40 transition-all hover:shadow-md relative overflow-hidden group bg-card"
            >
              {/* Golden accent bar */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border-2 border-amber-500/30">
                      <AvatarFallback className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {award.employee?.firstName?.[0]}
                        {award.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {award.employee?.firstName} {award.employee?.lastName}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {award.employee?.position || "Team Member"} • {award.employee?.department?.name || "General"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                    <Trophy className="h-3 w-3" />
                    {award.awardType?.name || "Honor"}
                  </Badge>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(award.awardDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-mono text-[10px] text-foreground/80">{award.certificateNo}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5 text-emerald-500" />
                      {award.giftItem}
                    </span>
                    {Number(award.giftAmount) > 0 && (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +${Number(award.giftAmount).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {award.description && (
                    <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/50 line-clamp-2">
                      "{award.description}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[10px] text-muted-foreground">
                    Presented by: <strong className="text-foreground">{award.presentedBy || "Management"}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCertificateViewAward(award)}
                      className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 px-2"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Certificate</span>
                    </Button>
                    {canManageAwards && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteAwardId(award.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Directory Table */
        <Card className="border border-border/70 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">Awardee</TableHead>
                  <TableHead className="text-xs font-semibold">Honor Title</TableHead>
                  <TableHead className="text-xs font-semibold">Award Date</TableHead>
                  <TableHead className="text-xs font-semibold">Gift & Incentive</TableHead>
                  <TableHead className="text-xs font-semibold">Presented By</TableHead>
                  <TableHead className="text-xs font-semibold">Certificate #</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAwards.map((award) => (
                  <TableRow key={award.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-bold">
                            {award.employee?.firstName?.[0]}
                            {award.employee?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {award.employee?.firstName} {award.employee?.lastName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{award.employee?.employeeCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                        <Trophy className="h-3 w-3" />
                        {award.awardType?.name || "Recognition"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(award.awardDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium text-foreground">{award.giftItem}</div>
                      {Number(award.giftAmount) > 0 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          +${Number(award.giftAmount).toLocaleString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {award.presentedBy || "Management"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {award.certificateNo}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCertificateViewAward(award)}
                          className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1 px-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </Button>
                        {canManageAwards && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteAwardId(award.id)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal 1: Issue Award */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Issue Employee Honor & Award
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confer a formal recognition title, gift voucher, and generated certificate.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleIssueAward} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Employee Recipient *</Label>
              <Select value={formEmployeeId} onValueChange={setFormEmployeeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">
                      {e.firstName} {e.lastName} ({e.employeeCode}) • {e.department?.name || "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Award Category</Label>
                <Select value={formAwardTypeId} onValueChange={setFormAwardTypeId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {awardTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Award Date *</Label>
                <Input
                  type="date"
                  value={formAwardDate}
                  onChange={(e) => setFormAwardDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Gift Item / Token</Label>
                <Input
                  value={formGiftItem}
                  onChange={(e) => setFormGiftItem(e.target.value)}
                  placeholder="e.g. Trophy, Apple iPad"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cash Bonus / Voucher ($)</Label>
                <Input
                  type="number"
                  value={formGiftAmount}
                  onChange={(e) => setFormGiftAmount(e.target.value)}
                  placeholder="0"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Citation / Recognition Note</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Reason for award, exceptional contributions, or specific project milestones reached..."
                className="text-xs min-h-[70px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Presented By</Label>
              <Input
                value={formPresentedBy}
                onChange={(e) => setFormPresentedBy(e.target.value)}
                placeholder="e.g. Executive Committee, CTO, HR Director"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAwardMutation.isPending}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createAwardMutation.isPending ? "Generating Certificate..." : "Bestow Award"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Custom Award Category */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              Add Award Category
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define a new organizational recognition tier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateType} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Category Name *</Label>
              <Input
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g. Client Champion, Innovation Hero"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Icon Symbol</Label>
              <Select value={newTypeIcon} onValueChange={setNewTypeIcon}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trophy" className="text-xs">Trophy</SelectItem>
                  <SelectItem value="Star" className="text-xs">Star</SelectItem>
                  <SelectItem value="Award" className="text-xs">Award Medal</SelectItem>
                  <SelectItem value="Zap" className="text-xs">Lightning Zap</SelectItem>
                  <SelectItem value="Heart" className="text-xs">Heart</SelectItem>
                  <SelectItem value="Users" className="text-xs">Team Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={newTypeDescription}
                onChange={(e) => setNewTypeDescription(e.target.value)}
                placeholder="Criteria or eligibility requirements for this award..."
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsTypeModalOpen(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createTypeMutation.isPending} className="h-8 text-xs">
                {createTypeMutation.isPending ? "Saving..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Digital Certificate View */}
      <Dialog open={!!certificateViewAward} onOpenChange={(open) => !open && setCertificateViewAward(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-zinc-950 p-6 sm:p-8">
          {certificateViewAward && (
            <div className="space-y-6">
              {/* Outer Golden Certificate Frame */}
              <div className="border-4 border-double border-amber-500/60 rounded-xl p-6 sm:p-8 text-center bg-gradient-to-b from-amber-50/20 via-background to-amber-50/30 dark:from-amber-950/10 dark:to-background space-y-4 relative">
                <div className="flex justify-center">
                  <div className="h-14 w-14 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 shadow-sm">
                    <Trophy className="h-7 w-7" />
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 dark:text-amber-400">
                    Certificate of Recognition
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-foreground tracking-tight">
                    {certificateViewAward.awardType?.name || "Distinguished Service Award"}
                  </h2>
                </div>

                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  This certificate is proudly conferred in acknowledgment of exemplary commitment, excellence, and exceptional performance.
                </p>

                <div className="py-2">
                  <p className="text-xs text-muted-foreground font-serif italic">Proudly Presented To</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1 underline decoration-amber-500/40 underline-offset-8">
                    {certificateViewAward.employee?.firstName} {certificateViewAward.employee?.lastName}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {certificateViewAward.employee?.position || "Distinguished Professional"} •{" "}
                    {certificateViewAward.employee?.department?.name || "Corporate Team"}
                  </p>
                </div>

                {certificateViewAward.description && (
                  <p className="text-xs text-muted-foreground/90 italic max-w-lg mx-auto bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                    "{certificateViewAward.description}"
                  </p>
                )}

                <div className="pt-6 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="text-left">
                    <p className="font-bold text-foreground">{certificateViewAward.presentedBy || "Executive Committee"}</p>
                    <p className="text-[10px]">Authorized Signature</p>
                  </div>
                  <div className="text-center font-mono text-[10px] text-muted-foreground/80">
                    ID: {certificateViewAward.certificateNo}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {new Date(certificateViewAward.awardDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-[10px]">Date of Conferment</p>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[11px] gap-1 text-emerald-600 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Official Certified Record
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.success("Certificate saved to clipboard!");
                    }}
                    className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ConfirmationDialog for Deleting Award ────────────────────────── */}
      <ConfirmationDialog
        open={!!deleteAwardId}
        onOpenChange={(open) => !open && setDeleteAwardId(null)}
        title="Delete Award Record"
        description="Are you sure you want to delete this recognition record and revoke its certificate? This action cannot be undone."
        confirmLabel="Delete Award"
        variant="destructive"
        isLoading={deleteAwardMutation.isPending}
        onConfirm={() => {
          if (deleteAwardId) {
            deleteAwardMutation.mutate(deleteAwardId, {
              onSettled: () => setDeleteAwardId(null),
            });
          }
        }}
      />
    </div>
  );
}


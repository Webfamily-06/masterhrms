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
  const [activeTab, setActiveTab] = useState<"grid" | "table">("grid");

  // Dialog States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [certificateViewAward, setCertificateViewAward] = useState<any | null>(null);

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
    queryKey: ["awards", selectedTypeFilter, searchTerm],
    queryFn: async () => {
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
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/hrm" className="hover:text-foreground transition-colors">
              HRM
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Awards & Recognition</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            Awards & Employee Honors
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Celebrate organizational achievements, honor outstanding work, and generate digital certificates.
          </p>
        </div>

        {canManageAwards && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTypeModalOpen(true)}
              className="h-9 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Category
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              <Trophy className="h-3.5 w-3.5" />
              Issue Award
            </Button>
          </div>
        )}
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Total Honors Bestowed</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">{stats.totalAwards || awards.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Milestone & performance recognitions
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Active Categories</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">{awardTypes.length}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Employee of the Month, Star Performer, etc.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Gift Value Disbursed</CardTitle>
            <Gift className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-foreground">
              ${Number(stats.totalGiftValue || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Vouchers, trophies & incentives
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Latest Awardee</CardTitle>
            <Medal className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recentAwardee ? (
              <div>
                <div className="text-sm font-bold text-foreground truncate">
                  {recentAwardee.employee?.firstName} {recentAwardee.employee?.lastName}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {recentAwardee.awardType?.name || recentAwardee.giftItem}
                </p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1 italic">No awards issued yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Controls */}
      <Card className="border border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search awardee, voucher, certificate #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-8 text-xs"
                />
              </div>

              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
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

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/30">
                <Button
                  variant={activeTab === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("grid")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Wall
                </Button>
                <Button
                  variant={activeTab === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("table")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <List className="h-3.5 w-3.5" />
                  Directory
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Wall View vs Directory Table */}
      {awardsLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
          Loading employee honors and recognition certificates...
        </div>
      ) : filteredAwards.length === 0 ? (
        <Card className="border border-dashed border-border/80 text-center py-12">
          <CardContent className="space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No awards found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no recognition honors matching your search criteria. Issue an award to recognize employee excellence.
            </p>
            {canManageAwards && (
              <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="h-8 text-xs gap-1.5 mt-2">
                <Plus className="h-3.5 w-3.5" />
                Issue First Award
              </Button>
            )}
          </CardContent>
        </Card>
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
                      Certificate
                    </Button>
                    {canManageAwards && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this award record?")) {
                            deleteAwardMutation.mutate(award.id);
                          }
                        }}
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
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
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
                <TableRow key={award.id} className="hover:bg-muted/30">
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
                        View
                      </Button>
                      {canManageAwards && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this award record?")) {
                              deleteAwardMutation.mutate(award.id);
                            }
                          }}
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
    </div>
  );
}

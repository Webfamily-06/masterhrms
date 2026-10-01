import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  RotateCcw,
  Archive,
  Megaphone,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/campaigns")({
  component: MarketingCampaignsPage,
  head: () => ({ meta: [{ title: "Marketing Campaigns — Growth & Promotion" }] }),
});

interface Campaign {
  id: string;
  tenantId: string;
  campaignCode: string;
  name: string;
  campaignType: string;
  channel: string;
  budget: string | number;
  spent: string | number;
  currency: string;
  period: string | null;
  periodValue: number | null;
  targetAudience: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CampaignsResponse {
  data: Campaign[];
  total: number;
  stats: {
    total: number;
    active: number;
    completed: number;
    archived: number;
    totalBudget: number;
    totalSpent: number;
  };
}

const CAMPAIGN_TYPES = [
  "Promotional",
  "Brand Awareness",
  "Lead Generation",
  "Email Drip",
  "Referral",
  "Content Marketing",
  "Public Relations",
];

const CHANNELS = [
  "Email",
  "Social Media",
  "Google Ads",
  "Webinar",
  "Multi-channel",
  "Direct Mail",
  "Affiliate",
];

const AUDIENCES = ["Customers", "Leads", "Subscribers", "Enterprise Buyers", "All Contacts"];

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD"];

const PERIODS = ["Days", "Weeks", "Months"];

export function MarketingCampaignsPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();

  const [activeTab, setActiveTab] = useState<"active" | "completed" | "archived">("active");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Campaign | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    campaignCode: "",
    name: "",
    campaignType: "Promotional",
    channel: "Email",
    budget: "",
    spent: "0",
    currency: "USD",
    period: "Months",
    periodValue: "1",
    targetAudience: "Customers",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "active",
  });

  // Queries
  const { data, isLoading } = useQuery<CampaignsResponse>({
    queryKey: ["campaigns", activeTab, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append("status", activeTab);
      if (search) params.append("search", search);
      return api.get(`/campaigns?${params}`);
    },
  });

  const campaigns = data?.data ?? [];
  const stats = data?.stats ?? {
    total: 0,
    active: 0,
    completed: 0,
    archived: 0,
    totalBudget: 0,
    totalSpent: 0,
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newCamp: typeof form) => api.post("/campaigns", newCamp),
    onSuccess: () => {
      toast.success("Campaign created successfully");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setDrawerOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to create campaign"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.put(`/campaigns/${id}`, data),
    onSuccess: () => {
      toast.success("Campaign updated successfully");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setDrawerOpen(false);
      setEditItem(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Failed to update campaign"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/campaigns/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Campaign marked as ${vars.status}`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to change campaign status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => {
      toast.success("Campaign deleted successfully");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete campaign"),
  });

  const resetForm = () => {
    setForm({
      campaignCode: "",
      name: "",
      campaignType: "Promotional",
      channel: "Email",
      budget: "",
      spent: "0",
      currency: "USD",
      period: "Months",
      periodValue: "1",
      targetAudience: "Customers",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      status: "active",
    });
    setEditItem(null);
  };

  const handleOpenEdit = (camp: Campaign) => {
    setEditItem(camp);
    setForm({
      campaignCode: camp.campaignCode,
      name: camp.name,
      campaignType: camp.campaignType,
      channel: camp.channel,
      budget: String(camp.budget),
      spent: String(camp.spent),
      currency: camp.currency,
      period: camp.period || "Months",
      periodValue: camp.periodValue ? String(camp.periodValue) : "1",
      targetAudience: camp.targetAudience || "Customers",
      description: camp.description || "",
      startDate: camp.startDate ? new Date(camp.startDate).toISOString().split("T")[0] : "",
      endDate: camp.endDate ? new Date(camp.endDate).toISOString().split("T")[0] : "",
      status: camp.status,
    });
    setDrawerOpen(true);
  };

  const exportAsExcel = () => {
    if (campaigns.length === 0) {
      toast.error("No campaigns to export");
      return;
    }
    const headers = ["Campaign Code", "Name", "Type", "Channel", "Budget", "Spent", "Currency", "Start Date", "Status"];
    const rows = campaigns.map((c) => [
      c.campaignCode,
      `"${c.name.replace(/"/g, '""')}"`,
      c.campaignType,
      c.channel,
      c.budget,
      c.spent,
      c.currency,
      c.startDate ? format(new Date(c.startDate), "yyyy-MM-dd") : "",
      c.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `campaigns_${activeTab}_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported CSV successfully");
  };

  const exportAsPDF = () => {
    window.print();
  };

  const formatCurrency = (val: string | number, curr = "USD") => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="page-wrapper min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ─── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Megaphone className="size-6 text-primary" />
            <span>Marketing Campaigns</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-channel promotional campaigns, conversion budgets, audience targeting, and ROI performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 flex items-center gap-2 shadow-xs">
                <Download className="size-4" />
                <span>Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={exportAsPDF} className="flex items-center gap-2 cursor-pointer">
                <FileText className="size-4 text-slate-500" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportAsExcel} className="flex items-center gap-2 cursor-pointer">
                <FileSpreadsheet className="size-4 text-slate-500" />
                <span>Export as Excel</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDrawerOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Add Campaign</span>
          </Button>
        </div>
      </div>

      {/* ─── Metric KPI Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Campaigns</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="size-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Programs</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</h3>
            </div>
            <div className="size-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Budget</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(stats.totalBudget)}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Spent</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {formatCurrency(stats.totalSpent)}
              </h3>
            </div>
            <div className="size-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Lifecycle Tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
            activeTab === "active"
              ? "text-slate-900 border-primary font-semibold"
              : "text-slate-500 border-transparent hover:text-slate-900"
          )}
        >
          <span>Active</span>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
            {stats.active}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
            activeTab === "completed"
              ? "text-slate-900 border-primary font-semibold"
              : "text-slate-500 border-transparent hover:text-slate-900"
          )}
        >
          <span>Completed</span>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-200">
            {stats.completed}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2",
            activeTab === "archived"
              ? "text-slate-900 border-primary font-semibold"
              : "text-slate-500 border-transparent hover:text-slate-900"
          )}
        >
          <span>Archived</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
            {stats.archived}
          </span>
        </button>
      </div>

      {/* ─── Main Campaigns Table Card ──────────────────────────────────────── */}
      <Card className="border border-slate-200/80 shadow-xs bg-white overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by campaign name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Budget</th>
                <th className="py-3 px-4 text-right">Spent</th>
                <th className="py-3 px-4">Start</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Megaphone className="size-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No {activeTab} campaigns found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? "Try adjusting your search criteria" : `Click "+ Add Campaign" to launch your first promotional campaign.`}
                    </p>
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{camp.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">{camp.campaignCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {camp.campaignType}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-xs bg-slate-50 font-normal">
                        {camp.channel}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(camp.budget, camp.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(camp.spent, camp.currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {camp.startDate ? format(new Date(camp.startDate), "dd MMM yyyy") : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {camp.status === "active" && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Active
                        </span>
                      )}
                      {camp.status === "completed" && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Completed
                        </span>
                      )}
                      {camp.status === "archived" && (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 text-slate-500 hover:text-slate-900">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(camp)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="size-4 text-slate-500" />
                            <span>Edit</span>
                          </DropdownMenuItem>

                          {camp.status === "archived" ? (
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: camp.id, status: "active" })}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <RotateCcw className="size-4 text-slate-500" />
                              <span>Unarchive</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: camp.id, status: "archived" })}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Archive className="size-4 text-slate-500" />
                              <span>Archive</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setDeleteConfirmId(camp.id)}
                            className="flex items-center gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Add / Edit Campaign Offcanvas Drawer Modal ────────────────────── */}
      <Dialog open={drawerOpen} onOpenChange={(open) => !open && setDrawerOpen(false)}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editItem ? "Edit Campaign" : "Create Campaign"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-2">
            <div className="col-span-12">
              <Label className="text-xs font-semibold text-slate-700">Campaign Name *</Label>
              <Input
                placeholder="e.g. Summer Sale 2026, Q3 Product Launch"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Campaign Type *</Label>
              <select
                value={form.campaignType}
                onChange={(e) => setForm({ ...form, campaignType: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Channel *</Label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Budget / Deal Value *</Label>
              <Input
                type="number"
                placeholder="15000"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Currency *</Label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Period *</Label>
              <select
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Period Value</Label>
              <Input
                type="number"
                placeholder="e.g. 2"
                value={form.periodValue}
                onChange={(e) => setForm({ ...form, periodValue: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-12">
              <Label className="text-xs font-semibold text-slate-700">Target Audience *</Label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-12 sm:col-span-6">
              <Label className="text-xs font-semibold text-slate-700">End Date (Optional)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="col-span-12">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Enter campaign strategy, offer details, or notes..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>

            {editItem && (
              <div className="col-span-12 sm:col-span-6">
                <Label className="text-xs font-semibold text-slate-700">Spent to Date</Label>
                <Input
                  type="number"
                  value={form.spent}
                  onChange={(e) => setForm({ ...form, spent: e.target.value })}
                  className="mt-1"
                />
              </div>
            )}

            {editItem && (
              <div className="col-span-12 sm:col-span-6">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error("Please enter a campaign name");
                  return;
                }
                if (!form.budget) {
                  toast.error("Please enter campaign budget");
                  return;
                }
                if (editItem) {
                  updateMutation.mutate({ id: editItem.id, data: form });
                } else {
                  createMutation.mutate(form);
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-slate-900 text-white"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editItem
                ? "Save Changes"
                : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Campaign Modal ─────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Campaign?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-slate-600">
            Are you sure you want to delete this marketing campaign? This action cannot be undone.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

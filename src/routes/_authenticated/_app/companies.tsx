import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Building2,
  Globe,
  MapPin,
  Users,
  LayoutGrid,
  List,
  DollarSign,
  TrendingUp,
  ExternalLink,
  Briefcase,
  FileSpreadsheet,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/companies")({
  component: CompaniesPage,
});

interface CrmCompany {
  id: string;
  name: string;
  industry: string;
  employeesCount: string;
  annualRevenue: number;
  website: string;
  location: string;
  dealsCount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const INDUSTRIES = [
  "Technology & Software",
  "Financial Services & Banking",
  "Healthcare & Life Sciences",
  "Manufacturing & Industrial",
  "Retail & E-Commerce",
  "Consulting & Professional Services",
  "Logistics & Supply Chain",
  "Education & EdTech",
  "Real Estate & Construction",
  "Energy & Utilities",
];

const EMPLOYEE_RANGES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

export function CompaniesPage() {
  const qc = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const tenantId = profile?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CrmCompany | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    employeesCount: "11-50",
    annualRevenue: "",
    website: "",
    location: "",
    notes: "",
  });

  // Query CRM companies
  const { data: rawCompanies = [], isLoading } = useQuery<CrmCompany[]>({
    queryKey: ["crm-companies", tenantId],
    queryFn: async () => api.get("/api/crm/companies"),
    enabled: !!tenantId,
  });

  const companies: CrmCompany[] = useMemo(() => {
    return Array.isArray(rawCompanies) ? rawCompanies : [];
  }, [rawCompanies]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/api/crm/companies", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-companies"] });
      toast.success("Company added to CRM");
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add company");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/api/crm/companies/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-companies"] });
      toast.success("Company updated successfully");
      setEditingCompany(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update company");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/crm/companies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-companies"] });
      toast.success("Company deleted from CRM");
      setDeleteTargetId(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete company");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      industry: "",
      employeesCount: "11-50",
      annualRevenue: "",
      website: "",
      location: "",
      notes: "",
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    createMutation.mutate({
      ...formData,
      annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : 0,
    });
  };

  const openEdit = (comp: CrmCompany) => {
    setEditingCompany(comp);
    setFormData({
      name: comp.name || "",
      industry: comp.industry || "",
      employeesCount: comp.employeesCount || "11-50",
      annualRevenue: comp.annualRevenue ? String(comp.annualRevenue) : "",
      website: comp.website || "",
      location: comp.location || "",
      notes: comp.notes || "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    updateMutation.mutate({
      id: editingCompany.id,
      body: {
        ...formData,
        annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : 0,
      },
    });
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const term = searchTerm.toLowerCase();
      const name = (c.name || "").toLowerCase();
      const ind = (c.industry || "").toLowerCase();
      const loc = (c.location || "").toLowerCase();
      const web = (c.website || "").toLowerCase();

      const matchesSearch =
        name.includes(term) || ind.includes(term) || loc.includes(term) || web.includes(term);

      const matchesInd = industryFilter === "all" || c.industry === industryFilter;
      return matchesSearch && matchesInd;
    });
  }, [companies, searchTerm, industryFilter]);

  // Aggregate Metrics
  const totalCompanies = companies.length;
  const totalRevenue = companies.reduce((sum, c) => sum + (c.annualRevenue || 0), 0);
  const totalDeals = companies.reduce((sum, c) => sum + (c.dealsCount || 0), 0);
  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set);
  }, [companies]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["ID", "Company Name", "Industry", "Size", "Annual Revenue", "Location", "Website", "Deals"];
    const rows = filteredCompanies.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.industry}"`,
      c.employeesCount,
      c.annualRevenue,
      `"${c.location}"`,
      c.website,
      c.dealsCount,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_companies_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/crm-dashboard" className="hover:text-primary transition-colors">Sales CRM</Link>
            <span>/</span>
            <Link to="/crm" className="hover:text-primary transition-colors">Pipeline</Link>
            <span>/</span>
            <span className="text-foreground font-medium">Companies</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            CRM Companies & Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Maintain organizational corporate accounts, firmographic profiles, target market sectors, and commercial deals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {/* ── Metric KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Accounts</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{totalCompanies}</h3>
            <span className="text-xs text-muted-foreground">Corporate entities</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aggregate Revenue</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatSystemAmount(totalRevenue)}
            </h3>
            <span className="text-xs text-muted-foreground">Combined annual turnover</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Linked CRM Deals</p>
            <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{totalDeals}</h3>
            <span className="text-xs text-muted-foreground">Across all stages</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sectors Covered</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">{uniqueIndustries.length}</h3>
            <span className="text-xs text-muted-foreground">Industry verticals</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── Table Toolbar ── */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search company, industry, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredCompanies.length}</span> of {totalCompanies} companies
          </div>
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === "table" ? (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Industry Vertical</TableHead>
                <TableHead>Company Size</TableHead>
                <TableHead className="text-right">Annual Revenue</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Deals</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading CRM companies...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                    <p className="text-sm font-medium">No companies found</p>
                    <p className="text-xs mt-1">Add your first commercial account to start logging deals and pipelines</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          {c.website ? (
                            <a
                              href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Globe className="h-3 w-3" />
                              {c.website.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">
                              #{c.id.slice(0, 8).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.industry || "General Commercial"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{c.employeesCount || "1-50"} employees</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm text-foreground">
                      {formatSystemAmount(c.annualRevenue)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{c.location || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.dealsCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Company
                          </DropdownMenuItem>
                          {c.website && (
                            <DropdownMenuItem asChild>
                              <a
                                href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit Website
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(c.id)}
                            className="text-rose-600 focus:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Loading companies...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card border rounded-xl">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
              <p className="text-sm font-medium">No companies found</p>
            </div>
          ) : (
            filteredCompanies.map((c) => (
              <div
                key={c.id}
                className="bg-card border rounded-xl p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-foreground leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.industry || "General Commercial"}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTargetId(c.id)}
                          className="text-rose-600 focus:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground border-t pt-3">
                    {c.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{c.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span>{c.employeesCount || "1-50"} Employees</span>
                    </div>
                    {c.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {c.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted/30 border rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Annual Turnover</span>
                    <span className="font-semibold text-foreground text-sm">
                      {formatSystemAmount(c.annualRevenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Deals Pipeline</span>
                    <span className="font-semibold text-foreground text-sm">
                      {c.dealsCount} Deals
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={isAddOpen || !!editingCompany}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingCompany(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Edit Company Account" : "Add CRM Company"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingCompany ? handleUpdate : handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input
                placeholder="e.g. Acme Tech Solutions"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry Sector</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(val) => setFormData({ ...formData, industry: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vertical" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Employee Count</Label>
                <Select
                  value={formData.employeesCount}
                  onValueChange={(val) => setFormData({ ...formData, employeesCount: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_RANGES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r} Employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Annual Revenue</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1500000"
                  value={formData.annualRevenue}
                  onChange={(e) => setFormData({ ...formData, annualRevenue: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Website URL</Label>
                <Input
                  placeholder="https://acme.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>HQ / Location</Label>
              <Input
                placeholder="City, Country"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Account Remarks & Notes</Label>
              <Textarea
                placeholder="Key relationship details, strategic notes..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingCompany(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingCompany
                  ? "Save Changes"
                  : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Delete Company Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this company from your CRM? Deals and contact profiles linked to this company will remain intact.
          </p>
          <DialogFooter className="mt-4 sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTargetId && deleteMutation.mutate(deleteTargetId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

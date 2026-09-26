import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlanGuard } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Target,
  Plus,
  PhoneCall,
  Mail,
  DollarSign,
  TrendingUp,
  Building2,
  UserCheck,
  Search,
  Edit2,
  Trash2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Loader2,
  BarChart3,
  Eye,
  Kanban,
  Briefcase,
  Users,
  Building,
  Globe,
  Star,
  Download,
  LayoutGrid,
  List,
  Phone,
  Layers,
  MapPin,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/crm")({
  component: CrmPage,
  head: () => ({ meta: [{ title: "CRM & Sales Pipeline — Master ERP" }] }),
});

export type CrmLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  stage: "lead" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  source: string;
  notes: string;
  nextFollowUp?: string;
  createdAt: string;
};

export type CrmContact = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  location: string;
  rating: number;
  status: "active" | "inactive";
};

export type CrmCompany = {
  id: string;
  name: string;
  industry: string;
  employeesCount: string;
  annualRevenue: number;
  website: string;
  location: string;
  dealsCount: number;
};

const STAGES: { id: CrmLead["stage"]; label: string; color: string; bg: string }[] = [
  { id: "lead", label: "🔵 New Lead", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20" },
  { id: "contacted", label: "🟡 Contacted", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" },
  { id: "qualified", label: "🟢 Qualified", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "proposal", label: "🟠 Proposal", color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/20" },
  { id: "negotiation", label: "🟣 Negotiation", color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/20" },
  { id: "won", label: "🟢 Won", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { id: "lost", label: "🔴 Lost", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20" },
];

const SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Call",
  "Email Campaign",
  "Trade Show",
  "Partner",
];

const DEFAULT_CONTACTS: CrmContact[] = [
  { id: "cnt-1", name: "Darlee Robertson", role: "Facility Manager", company: "Apex Global", email: "darlee@apex.example", phone: "+1 (555) 234-8901", location: "San Francisco, USA", rating: 4.8, status: "active" },
  { id: "cnt-2", name: "Sharon Roy", role: "VP of Technology", company: "Nexus Dynamics", email: "sharon@nexus.example", phone: "+1 (555) 987-1234", location: "London, UK", rating: 4.5, status: "active" },
  { id: "cnt-3", name: "Vaughan Lewis", role: "Chief Procurement Officer", company: "Vanguard Retail", email: "vaughan@vanguard.example", phone: "+91 98765 43210", location: "Bangalore, IN", rating: 4.9, status: "active" },
  { id: "cnt-4", name: "Jessica Wheeler", role: "Operations Director", company: "Horizon Bio", email: "jessica@horizon.example", phone: "+65 6789 0123", location: "Singapore", rating: 4.2, status: "active" },
];

const DEFAULT_COMPANIES: CrmCompany[] = [
  { id: "cmp-1", name: "Apex Global Enterprises", industry: "Enterprise SaaS & Cloud", employeesCount: "250-500", annualRevenue: 2400000, website: "https://apex.example", location: "California, USA", dealsCount: 3 },
  { id: "cmp-2", name: "Nexus Dynamics Ltd", industry: "FinTech & Payments", employeesCount: "50-200", annualRevenue: 1500000, website: "https://nexus.example", location: "London, UK", dealsCount: 2 },
  { id: "cmp-3", name: "Vanguard Retail Logistics", industry: "Retail & Supply Chain", employeesCount: "1000+", annualRevenue: 8500000, website: "https://vanguard.example", location: "Mumbai, India", dealsCount: 4 },
  { id: "cmp-4", name: "Horizon Bio Labs", industry: "Healthcare & Life Sciences", employeesCount: "100-250", annualRevenue: 3200000, website: "https://horizon.example", location: "Singapore", dealsCount: 1 },
];

const EMPTY_LEAD: Omit<CrmLead, "id" | "createdAt"> = {
  name: "",
  company: "",
  email: "",
  phone: "",
  value: 0,
  stage: "lead",
  source: "Website",
  notes: "",
  nextFollowUp: "",
};

function CrmPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  const [activeTab, setActiveTab] = useState<"pipeline" | "deals" | "contacts" | "companies">("pipeline");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<CrmLead | null>(null);
  const [viewingLead, setViewingLead] = useState<CrmLead | null>(null);
  const [form, setForm] = useState<Omit<CrmLead, "id" | "createdAt">>(EMPTY_LEAD);

  // Contacts & Companies state
  const [contacts, setContacts] = useState<CrmContact[]>(() => {
    const saved = localStorage.getItem(`hrms_crm_contacts_${tenantId}`);
    return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
  });
  const [companies, setCompanies] = useState<CrmCompany[]>(() => {
    const saved = localStorage.getItem(`hrms_crm_companies_${tenantId}`);
    return saved ? JSON.parse(saved) : DEFAULT_COMPANIES;
  });

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    company: "",
    email: "",
    phone: "",
    location: "",
  });

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    employeesCount: "50-200",
    annualRevenue: "500000",
    website: "",
    location: "",
  });

  function saveContacts(newContacts: CrmContact[]) {
    setContacts(newContacts);
    localStorage.setItem(`hrms_crm_contacts_${tenantId}`, JSON.stringify(newContacts));
  }

  function saveCompanies(newCompanies: CrmCompany[]) {
    setCompanies(newCompanies);
    localStorage.setItem(`hrms_crm_companies_${tenantId}`, JSON.stringify(newCompanies));
  }

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-pipeline", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/crm/leads");
        return Array.isArray(res) ? (res as CrmLead[]) : [];
      } catch {
        return [] as CrmLead[];
      }
    },
  });

  const persist = useMutation({
    mutationFn: async (leadData: Partial<CrmLead> & { id?: string }) => {
      if (editingLead) {
        await api.put(`/crm/leads/${editingLead.id}`, leadData);
      } else {
        await api.post("/crm/leads", leadData);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-pipeline", tenantId] });
      setIsModalOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchStage = filterStage === "all" || l.stage === filterStage;
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.company.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase()) ||
        l.source.toLowerCase().includes(search.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [leads, search, filterStage]);

  const metrics = useMemo(() => {
    const total = leads.reduce((s, l) => s + (l.value || 0), 0);
    const won = leads.filter((l) => l.stage === "won").reduce((s, l) => s + (l.value || 0), 0);
    const active = leads.filter((l) => !["won", "lost"].includes(l.stage)).length;
    const winRate =
      leads.length > 0
        ? Math.round((leads.filter((l) => l.stage === "won").length / leads.length) * 100)
        : 0;
    return { total, won, active, winRate };
  }, [leads]);

  function openCreate() {
    setEditingLead(null);
    setForm(EMPTY_LEAD);
    setIsModalOpen(true);
  }

  function openEdit(lead: CrmLead) {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      value: lead.value,
      stage: lead.stage,
      source: lead.source,
      notes: lead.notes,
      nextFollowUp: lead.nextFollowUp,
    });
    setIsModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim() || !form.company.trim())
      return toast.error("Name and Company are required");
    persist.mutate(form);
    toast.success(editingLead ? "Lead updated!" : `Lead "${form.name}" added to pipeline!`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      await api.delete(`/crm/leads/${id}`);
      qc.invalidateQueries({ queryKey: ["crm-pipeline", tenantId] });
      toast.success("Lead removed from pipeline.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    }
  }

  async function advanceStage(lead: CrmLead) {
    const stageIds = STAGES.map((s) => s.id);
    const idx = stageIds.indexOf(lead.stage);
    if (idx >= stageIds.length - 1) return;
    const nextStage = stageIds[idx + 1];
    try {
      await api.put(`/crm/leads/${lead.id}`, { stage: nextStage });
      qc.invalidateQueries({ queryKey: ["crm-pipeline", tenantId] });
      toast.success(`${lead.name} moved to ${STAGES[idx + 1].label}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to move stage");
    }
  }

  function handleSaveContact() {
    if (!contactForm.name.trim() || !contactForm.email.trim()) {
      toast.error("Contact name and email are required");
      return;
    }
    const newCnt: CrmContact = {
      id: `cnt-${Date.now()}`,
      ...contactForm,
      rating: 5.0,
      status: "active",
    };
    saveContacts([newCnt, ...contacts]);
    setIsContactModalOpen(false);
    setContactForm({ name: "", role: "", company: "", email: "", phone: "", location: "" });
    toast.success("Contact added successfully.");
  }

  function handleSaveCompany() {
    if (!companyForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    const newCmp: CrmCompany = {
      id: `cmp-${Date.now()}`,
      name: companyForm.name.trim(),
      industry: companyForm.industry.trim() || "Technology",
      employeesCount: companyForm.employeesCount,
      annualRevenue: Number(companyForm.annualRevenue) || 0,
      website: companyForm.website.trim(),
      location: companyForm.location.trim(),
      dealsCount: 0,
    };
    saveCompanies([newCmp, ...companies]);
    setIsCompanyModalOpen(false);
    setCompanyForm({ name: "", industry: "", employeesCount: "50-200", annualRevenue: "500000", website: "", location: "" });
    toast.success("Company organization added.");
  }

  return (
    <PlanGuard moduleName="CRM & Sales Pipeline" requiredPlan="starter">
      <div className="space-y-6 max-w-full pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Target className="size-6 text-primary" /> CRM & Sales Pipeline Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Track leads, manage deal funnels, and maintain customer & enterprise accounts.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === "pipeline" || activeTab === "deals" ? (
              <Button onClick={openCreate} className="gap-2 font-bold text-xs shrink-0 bg-primary text-primary-foreground">
                <Plus className="size-4" /> Add Deal / Lead
              </Button>
            ) : activeTab === "contacts" ? (
              <Button onClick={() => setIsContactModalOpen(true)} className="gap-2 font-bold text-xs shrink-0 bg-primary text-primary-foreground">
                <Plus className="size-4" /> Add Contact
              </Button>
            ) : (
              <Button onClick={() => setIsCompanyModalOpen(true)} className="gap-2 font-bold text-xs shrink-0 bg-primary text-primary-foreground">
                <Plus className="size-4" /> Add Company
              </Button>
            )}
          </div>
        </div>

        {/* CRM KPI Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Pipeline Value", value: formatSystemAmount(metrics.total, sysConfig?.currency), desc: "Total potential deal value", icon: DollarSign, color: "text-primary bg-primary/10" },
            { title: "Won Revenue", value: formatSystemAmount(metrics.won, sysConfig?.currency), desc: "Successfully closed sales", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
            { title: "Active Deals", value: `${metrics.active} In Progress`, desc: "Leads under active negotiation", icon: TrendingUp, color: "text-amber-600 bg-amber-500/10" },
            { title: "Win Rate", value: `${metrics.winRate}%`, desc: "Funnel conversion efficiency", icon: BarChart3, color: "text-blue-600 bg-blue-500/10" },
          ].map((m) => (
            <Card key={m.title} className="border border-border/70 shadow-xs">
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground">{m.title}</span>
                  <h4 className="text-xl font-bold tracking-tight text-foreground">{m.value}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{m.desc}</p>
                </div>
                <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", m.color)}>
                  <m.icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto h-10 bg-secondary/50 p-1 border">
            <TabsTrigger value="pipeline" className="text-xs font-bold gap-2">
              <Kanban className="size-3.5" /> Pipeline Board ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="deals" className="text-xs font-bold gap-2">
              <Briefcase className="size-3.5" /> Deals List
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs font-bold gap-2">
              <Users className="size-3.5" /> Contacts Directory ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="companies" className="text-xs font-bold gap-2">
              <Building2 className="size-3.5" /> Companies ({companies.length})
            </TabsTrigger>
          </TabsList>

          {/* ===================== TAB 1: KANBAN PIPELINE ===================== */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search pipeline leads, contacts, companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-full sm:w-44 text-xs">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="py-20 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
                {STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
                  const stageTotal = stageLeads.reduce((s, l) => s + (l.value || 0), 0);
                  return (
                    <div
                      key={stage.id}
                      className={cn("rounded-2xl border p-3 space-y-2 min-w-[170px]", stage.bg)}
                    >
                      <div className={cn("text-xs font-extrabold flex items-center justify-between", stage.color)}>
                        <span>{stage.label}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {stageLeads.length}
                        </Badge>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground font-semibold">
                        Total: {formatSystemAmount(stageTotal, sysConfig?.currency)}
                      </div>

                      <div className="space-y-2">
                        {stageLeads.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-6 italic">No leads in stage</p>
                        ) : (
                          stageLeads.map((lead) => (
                            <Card
                              key={lead.id}
                              className="p-3 bg-card border shadow-2xs hover:shadow-xs transition-shadow space-y-2 cursor-pointer"
                              onClick={() => setViewingLead(lead)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-xs leading-tight text-foreground">{lead.name}</h4>
                                  <p className="text-[10px] text-muted-foreground">{lead.company}</p>
                                </div>
                                <span className="font-black text-xs text-primary font-mono">
                                  {formatSystemAmount(lead.value, sysConfig?.currency)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
                                <span className="truncate max-w-[100px]">{lead.source}</span>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => advanceStage(lead)}
                                    className="hover:text-primary transition-colors p-1"
                                    title="Advance Stage"
                                  >
                                    <ArrowRight className="size-3" />
                                  </button>
                                  <button
                                    onClick={() => openEdit(lead)}
                                    className="hover:text-primary transition-colors p-1"
                                    title="Edit Lead"
                                  >
                                    <Edit2 className="size-3" />
                                  </button>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===================== TAB 2: DEALS LIST ===================== */}
          <TabsContent value="deals" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Deal / Contact Name</TableHead>
                      <TableHead className="text-xs font-bold">Company</TableHead>
                      <TableHead className="text-xs font-bold">Deal Value</TableHead>
                      <TableHead className="text-xs font-bold">Pipeline Stage</TableHead>
                      <TableHead className="text-xs font-bold">Source</TableHead>
                      <TableHead className="text-xs font-bold">Follow-Up Date</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((l) => {
                      const st = STAGES.find((s) => s.id === l.stage) || STAGES[0];
                      return (
                        <TableRow key={l.id} className="text-xs">
                          <TableCell className="font-bold text-foreground">
                            {l.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{l.company}</TableCell>
                          <TableCell className="font-mono font-bold text-primary">
                            {formatSystemAmount(l.value, sysConfig?.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px] font-bold border", st.bg, st.color)}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{l.source}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">
                            {l.nextFollowUp || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(l)}>
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7 text-rose-500" onClick={() => handleDelete(l.id)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== TAB 3: CONTACTS ===================== */}
          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Contact Person</TableHead>
                      <TableHead className="text-xs font-bold">Email Address</TableHead>
                      <TableHead className="text-xs font-bold">Phone Number</TableHead>
                      <TableHead className="text-xs font-bold">Location</TableHead>
                      <TableHead className="text-xs font-bold">Account Rating</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {c.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-bold text-foreground block">{c.name}</span>
                              <span className="text-[10px] text-muted-foreground">{c.role} · {c.company}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">{c.email}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{c.phone}</TableCell>
                        <TableCell className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3 text-rose-500" /> {c.location}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 font-bold text-amber-500 font-mono">
                            <Star className="size-3 fill-amber-500" /> {c.rating}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-500/10">
                            ● {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a href={`mailto:${c.email}`} className="p-1.5 rounded hover:bg-muted text-primary">
                              <Mail className="size-3.5" />
                            </a>
                            <a href={`tel:${c.phone}`} className="p-1.5 rounded hover:bg-muted text-emerald-600">
                              <Phone className="size-3.5" />
                            </a>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-500"
                              onClick={() => {
                                saveContacts(contacts.filter((x) => x.id !== c.id));
                                toast.success("Contact removed.");
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===================== TAB 4: COMPANIES ===================== */}
          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Company Name</TableHead>
                      <TableHead className="text-xs font-bold">Industry</TableHead>
                      <TableHead className="text-xs font-bold">Employees</TableHead>
                      <TableHead className="text-xs font-bold">Annual Revenue</TableHead>
                      <TableHead className="text-xs font-bold">Website</TableHead>
                      <TableHead className="text-xs font-bold">Location</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((cmp) => (
                      <TableRow key={cmp.id} className="text-xs">
                        <TableCell className="font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-primary" />
                            {cmp.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cmp.industry}</TableCell>
                        <TableCell className="font-mono text-muted-foreground">{cmp.employeesCount}</TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {formatSystemAmount(cmp.annualRevenue, sysConfig?.currency)}
                        </TableCell>
                        <TableCell>
                          <a href={cmp.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]">
                            <Globe className="size-3" /> Visit
                          </a>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cmp.location}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500"
                            onClick={() => {
                              saveCompanies(companies.filter((x) => x.id !== cmp.id));
                              toast.success("Company removed.");
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Add/Edit Lead */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" />
                {editingLead ? "Edit Deal / Lead" : "New CRM Pipeline Deal"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Contact Person *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Company *</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Deal Value ($/₹)</Label>
                  <Input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Pipeline Stage</Label>
                  <Select value={form.stage} onValueChange={(val: any) => setForm({ ...form, stage: val })}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Notes / Requirements</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="font-bold">
                Save Deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Add Contact */}
        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" /> Add Contact
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-bold">Full Name *</Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Job Role</Label>
                  <Input
                    value={contactForm.role}
                    onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Company Name</Label>
                  <Input
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Email *</Label>
                  <Input
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Phone</Label>
                  <Input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold">Location</Label>
                <Input
                  value={contactForm.location}
                  onChange={(e) => setContactForm({ ...contactForm, location: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsContactModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveContact} className="font-bold">
                Save Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Add Company */}
        <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> Add Organization Company
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs">
              <div>
                <Label className="text-xs font-bold">Company Name *</Label>
                <Input
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Industry</Label>
                  <Input
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Employee Headcount</Label>
                  <Select value={companyForm.employeesCount} onValueChange={(v) => setCompanyForm({ ...companyForm, employeesCount: v })}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 staff</SelectItem>
                      <SelectItem value="10-50">10-50 staff</SelectItem>
                      <SelectItem value="50-200">50-200 staff</SelectItem>
                      <SelectItem value="250-500">250-500 staff</SelectItem>
                      <SelectItem value="1000+">1000+ Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Est. Annual Revenue</Label>
                  <Input
                    type="number"
                    value={companyForm.annualRevenue}
                    onChange={(e) => setCompanyForm({ ...companyForm, annualRevenue: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold">Website URL</Label>
                  <Input
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-bold">Location / Headquarters</Label>
                <Input
                  value={companyForm.location}
                  onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsCompanyModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveCompany} className="font-bold">
                Save Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlanGuard>
  );
}

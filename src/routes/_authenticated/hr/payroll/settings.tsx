import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  ShieldCheck,
  Building,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Save,
  Search,
  Filter,
  Eye,
  Sliders,
  Play,
  Calculator,
  History,
  AlertTriangle,
  ExternalLink,
  Layers,
  FileText,
  MapPin,
  Scale,
  Plus,
  ArrowRight,
  Diff,
  Download,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/payroll/settings")({
  component: HrPayrollSettingsPage,
  head: () => ({ meta: [{ title: "Statutory & Payroll Settings — MasterHRMS" }] }),
});

interface Jurisdiction {
  id: string;
  stateCode: string;
  tinCode: string;
  name: string;
  capital: string;
  type: "STATE" | "UNION_TERRITORY";
  hasPt: boolean;
  hasLwf: boolean;
  isActive: boolean;
  officialPortalUrl?: string;
  governingAuthority?: string;
}

interface StatutoryRuleItem {
  id: string;
  ruleIdentifier: string;
  ruleType: string;
  category: string;
  jurisdictionLevel: string;
  stateCode?: string;
  configJson: any;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  sourceAuthority?: string | null;
  notificationRef?: string | null;
  sourceUrl?: string | null;
  publicationStatus: string;
  isVerified: boolean;
  isGlobal: boolean;
  tenantId?: string | null;
}

interface OfficialSource {
  id: string;
  code: string;
  name: string;
  category: string;
  jurisdictionLevel: string;
  officialPortalUrl: string;
  governingMinistry: string;
  status: string;
}

export default function HrPayrollSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("registry");

  // Filter States for Jurisdiction Registry
  const [jurisdictionSearch, setJurisdictionSearch] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"ALL" | "STATE" | "UNION_TERRITORY">("ALL");
  const [selectedStateCode, setSelectedStateCode] = useState<string>("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Modal Dialogs
  const [inspectedRule, setInspectedRule] = useState<StatutoryRuleItem | null>(null);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

  // Ingestion Form State
  const [ingestForm, setIngestForm] = useState({
    sourceCode: "EPFO_GOV",
    notificationRef: "",
    sourceAuthority: "EPFO, Ministry of Labour & Employment",
    sourceUrl: "https://www.epfindia.gov.in",
    title: "",
    gazetteDate: new Date().toISOString().split("T")[0],
    effectiveFrom: new Date().toISOString().split("T")[0],
    ruleType: "EPF",
    stateCode: "ALL",
    changeSummary: "",
    configJsonString: JSON.stringify({ statutoryCeiling: 15000, employeeRate: 0.12, employerEpfRate: 0.0367 }, null, 2),
  });

  // Simulator State
  const [simGross, setSimGross] = useState(65000);
  const [simBasic, setSimBasic] = useState(32500);
  const [simState, setSimState] = useState("TN");
  const [simRegime, setSimRegime] = useState<"new" | "old">("new");
  const [simResult, setSimResult] = useState<any>(null);

  // 1. Fetch Tenant Settings from DB
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["hr-payroll-settings"],
    queryFn: async () => {
      const res = await api.get<{ settings: any; activeRulesSummary: any }>("/api/hr/payroll/settings");
      return res;
    },
  });

  // Form State for Employer Settings
  const [employerSettings, setEmployerSettings] = useState<any>(null);

  // Synchronize when settings are loaded
  useMemo(() => {
    if (settingsData?.settings && !employerSettings) {
      setEmployerSettings(settingsData.settings);
    }
  }, [settingsData, employerSettings]);

  // 2. Fetch All 36 Jurisdictions
  const { data: jurisdictionsData } = useQuery({
    queryKey: ["hr-jurisdictions"],
    queryFn: async () => {
      const res = await api.get<{ jurisdictions: Jurisdiction[]; totalCount: number }>("/api/hr/payroll/jurisdictions");
      return res;
    },
  });

  // 3. Fetch Statutory Rules for Selected Jurisdiction
  const { data: rulesData, isLoading: isRulesLoading } = useQuery({
    queryKey: ["hr-statutory-rules", selectedStateCode],
    queryFn: async () => {
      const res = await api.get<{ rules: StatutoryRuleItem[] }>(`/api/hr/payroll/jurisdictions/${selectedStateCode}/rules`);
      return res;
    },
  });

  // 4. Fetch Official Government Sources
  const { data: sourcesData } = useQuery({
    queryKey: ["hr-amendment-sources"],
    queryFn: async () => {
      const res = await api.get<{ sources: OfficialSource[] }>("/api/hr/payroll/amendments/sources");
      return res;
    },
  });

  // Mutations
  // A. Save Employer Settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/hr/payroll/settings", payload);
      return res;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-settings"] });
      toast.success(data?.message || "Payroll settings successfully persisted to database");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to persist payroll settings");
    },
  });

  // B. Ingest Amendment as Draft
  const ingestMutation = useMutation({
    mutationFn: async (payload: any) => {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(payload.configJsonString);
      } catch (e) {
        throw new Error("Invalid JSON in proposed configuration");
      }

      const res = await api.post("/api/hr/payroll/amendments/ingest", {
        ...payload,
        proposedConfig: parsedConfig,
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-statutory-rules"] });
      setIsIngestModalOpen(false);
      toast.success("Gazette notification ingested as DRAFT. Release Gate is BLOCKED pending verification.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to ingest official amendment");
    },
  });

  // C. Execute Simulation
  const simulateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ simulation: any }>("/api/hr/payroll/simulate", {
        monthlyGross: Number(simGross),
        basicSalary: Number(simBasic),
        state: simState,
        taxRegime: simRegime,
      });
      return res;
    },
    onSuccess: (data) => {
      setSimResult(data?.simulation);
      toast.success("Payroll simulation completed successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Simulation failed");
    },
  });

  // Filtered Jurisdictions
  const filteredJurisdictions = useMemo(() => {
    if (!jurisdictionsData?.jurisdictions) return [];
    return jurisdictionsData.jurisdictions.filter((j) => {
      const matchesSearch =
        j.name.toLowerCase().includes(jurisdictionSearch.toLowerCase()) ||
        j.stateCode.toLowerCase().includes(jurisdictionSearch.toLowerCase()) ||
        j.capital.toLowerCase().includes(jurisdictionSearch.toLowerCase());
      const matchesType =
        selectedTypeFilter === "ALL" || j.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [jurisdictionsData, jurisdictionSearch, selectedTypeFilter]);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    if (!rulesData?.rules) return [];
    return rulesData.rules.filter((r) => {
      const matchesCat =
        selectedCategoryFilter === "ALL" || r.ruleType === selectedCategoryFilter;
      return matchesCat;
    });
  }, [rulesData, selectedCategoryFilter]);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <PageHeader
        title="India Statutory & Payroll Configuration Center"
        description="Comprehensive All-India 36 Jurisdictions (28 States & 8 UTs) statutory rule registry, official gazette ingestion, employer policies, and real-time calculation simulation."
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 font-medium px-2.5 py-1 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> RELEASE GATE: BLOCKED
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["hr-payroll-settings"] });
              queryClient.invalidateQueries({ queryKey: ["hr-statutory-rules"] });
              toast.info("Refreshed statutory configuration from database");
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => setIsIngestModalOpen(true)}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4" /> Ingest Official Gazette
          </Button>
        </div>
      </PageHeader>

      {/* Safety Notice Banner */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950">Statutory Compliance Safety Boundary (Phase 2 Authoritative Registry)</p>
          <p className="text-amber-800">
            All 36 Indian States and Union Territories have canonical representations. Central and state rules resolve with strict precedence:{" "}
            <span className="font-semibold">Tenant Overrides ≻ State Statutory Slabs ≻ Central / National Rules</span>.
            Ingested gazette notifications are strictly created as unverified drafts and require maker-checker sign-off. Live payroll deductions remain blocked.
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Canonical Jurisdictions"
          value="36 / 36"
          description="28 States + 8 Union Territories"
          icon={<MapPin className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Statutory Modules"
          value="6 Categories"
          description="EPF, ESI, PT, LWF, Gratuity, TDS"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Official Government Portals"
          value={`${sourcesData?.sources?.length || 7} Sources`}
          description="EPFO, ESIC, CBDT, State PT/LWF"
          icon={<Scale className="h-5 w-5 text-indigo-600" />}
        />
        <StatCard
          title="Database Persistence"
          value="Synchronized"
          description={employerSettings?.updatedAt ? `Saved ${new Date(employerSettings.updatedAt).toLocaleTimeString()}` : "Active in PostgreSQL"}
          icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-3xl">
          <TabsTrigger value="registry" className="gap-2">
            <Scale className="h-4 w-4" /> Statutory Registry
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Sliders className="h-4 w-4" /> Employer Policies
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="gap-2">
            <Layers className="h-4 w-4" /> Official Ingestion
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2">
            <Calculator className="h-4 w-4" /> Payroll Simulator
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: STATUTORY REGISTRY (ALL-INDIA 36 JURISDICTIONS)
        ========================================================================= */}
        <TabsContent value="registry" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Jurisdiction Sidebar Selector */}
            <Card className="lg:col-span-1 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Jurisdictions</span>
                  <Badge variant="secondary" className="text-xs">
                    {filteredJurisdictions.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Filter by State or Union Territory
                </CardDescription>
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Search 36 jurisdictions..."
                      value={jurisdictionSearch}
                      onChange={(e) => setJurisdictionSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={selectedTypeFilter === "ALL" ? "default" : "outline"}
                      className="h-7 text-xs flex-1"
                      onClick={() => setSelectedTypeFilter("ALL")}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTypeFilter === "STATE" ? "default" : "outline"}
                      className="h-7 text-xs flex-1"
                      onClick={() => setSelectedTypeFilter("STATE")}
                    >
                      States (28)
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTypeFilter === "UNION_TERRITORY" ? "default" : "outline"}
                      className="h-7 text-xs flex-1"
                      onClick={() => setSelectedTypeFilter("UNION_TERRITORY")}
                    >
                      UTs (8)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2 max-h-[500px] overflow-y-auto space-y-1">
                <button
                  onClick={() => setSelectedStateCode("ALL")}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
                    selectedStateCode === "ALL"
                      ? "bg-blue-600 text-white"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> Central / All India Rules
                  </span>
                  <Badge variant={selectedStateCode === "ALL" ? "outline" : "secondary"} className="text-[10px] uppercase">
                    Central
                  </Badge>
                </button>
                {filteredJurisdictions.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setSelectedStateCode(j.stateCode)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedStateCode === j.stateCode
                        ? "bg-blue-600 text-white"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium truncate">{j.name}</div>
                      <div className={`text-[10px] ${selectedStateCode === j.stateCode ? "text-blue-100" : "text-muted-foreground"}`}>
                        {j.capital} • Code: {j.stateCode}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <span className={`text-[9px] px-1 rounded font-semibold ${j.hasPt ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                        {j.hasPt ? "PT" : "No PT"}
                      </span>
                      {j.hasLwf && (
                        <span className="text-[9px] px-1 rounded font-semibold bg-indigo-100 text-indigo-800">
                          LWF
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Rules Table & Details */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Category:</span>
                  <div className="flex flex-wrap gap-1">
                    {["ALL", "EPF", "ESI", "PT", "LWF", "TDS_ITA2025", "GRATUITY"].map((cat) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategoryFilter === cat ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setSelectedCategoryFilter(cat)}
                      >
                        {cat === "TDS_ITA2025" ? "TDS (ITA 2025)" : cat}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Selected Jurisdiction: <span className="font-semibold text-foreground">{selectedStateCode}</span>
                </div>
              </div>

              {isRulesLoading ? (
                <div className="text-center py-12 text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading statutory rule pack...
                </div>
              ) : filteredRules.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm font-medium">No statutory rules found for {selectedStateCode}</p>
                    <p className="text-xs text-muted-foreground">
                      Central rules apply automatically when no state-level override is enacted.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRules.map((rule) => (
                    <Card key={rule.id} className="border shadow-sm hover:border-blue-400 transition-all">
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className="font-semibold">{rule.ruleType}</Badge>
                              <span className="text-xs font-mono font-medium text-muted-foreground">
                                v{rule.version}
                              </span>
                              {rule.isGlobal ? (
                                <Badge variant="outline" className="text-[10px] bg-slate-100">Global</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Tenant Override</Badge>
                              )}
                            </div>
                            <CardTitle className="text-sm font-semibold mt-1">
                              {rule.ruleIdentifier || `${rule.ruleType} (${rule.stateCode || "CENTRAL"})`}
                            </CardTitle>
                          </div>
                          <Badge
                            className={
                              rule.publicationStatus === "published"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : rule.publicationStatus === "draft"
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {rule.publicationStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs line-clamp-1 mt-1">
                          Authority: {rule.sourceAuthority || "Statutory Regulatory Body"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-3">
                        <div className="text-xs bg-muted/60 p-2.5 rounded-md space-y-1 font-mono text-[11px]">
                          {rule.ruleType === "EPF" && (
                            <>
                              <div>Ceiling: ₹{rule.configJson?.statutoryCeiling || 15000}/month</div>
                              <div>EE Rate: {((rule.configJson?.employeeRate || 0.12) * 100).toFixed(0)}% | ER Rate: {((rule.configJson?.employerEpfRate || 0.0367) * 100).toFixed(2)}%</div>
                              <div>EPS Rate: {((rule.configJson?.employerEpsRate || 0.0833) * 100).toFixed(2)}% (Max ₹{rule.configJson?.epsMaxMonthly || 1250})</div>
                            </>
                          )}
                          {rule.ruleType === "ESI" && (
                            <>
                              <div>Wage Ceiling: ₹{rule.configJson?.wageCeiling || 21000}/month (PWD: ₹{rule.configJson?.wageCeilingPwd || 25000})</div>
                              <div>Employee Rate: {((rule.configJson?.employeeRate || 0.0075) * 100).toFixed(2)}% | Employer Rate: {((rule.configJson?.employerRate || 0.0325) * 100).toFixed(2)}%</div>
                            </>
                          )}
                          {rule.ruleType === "PT" && (
                            <>
                              <div>Slabs Configured: {rule.configJson?.slabs?.length || "Standard Matrix"} bands</div>
                              <div>Frequency: {rule.configJson?.frequency || "MONTHLY"} | Max Annual: ₹2,500</div>
                            </>
                          )}
                          {rule.ruleType === "LWF" && (
                            <>
                              <div>Employee Contribution: ₹{rule.configJson?.employeeAmount || 10}</div>
                              <div>Employer Contribution: ₹{rule.configJson?.employerAmount || 20}</div>
                              <div>Deduction Month: {rule.configJson?.deductionMonth || "December (Annual)"}</div>
                            </>
                          )}
                          {rule.ruleType === "TDS_ITA2025" && (
                            <>
                              <div>Act: Income-tax Act, 2025 (Section 392 Slabs)</div>
                              <div>Standard Deduction: ₹{rule.configJson?.standardDeduction || 75000}</div>
                              <div>Sec 156(2) Rebate: Full up to ₹{rule.configJson?.section156RebateThreshold || 1200000}</div>
                            </>
                          )}
                          {rule.ruleType === "GRATUITY" && (
                            <>
                              <div>Formula: (15 * Last Drawn Basic * Years) / 26</div>
                              <div>Statutory Ceiling: ₹{rule.configJson?.statutoryCeiling || 2000000}</div>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                          <span>Effective: {new Date(rule.effectiveFrom).toLocaleDateString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1 hover:text-blue-600"
                            onClick={() => setInspectedRule(rule)}
                          >
                            <Eye className="h-3 w-3" /> Inspect Rule JSON
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 2: EMPLOYER PAYROLL POLICIES (REAL DATABASE PERSISTENCE)
        ========================================================================= */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-blue-600" /> Tenant Employer Payroll & Statutory Policies
                  </CardTitle>
                  <CardDescription>
                    Configure tenant-level execution parameters. Values are persisted to PostgreSQL database and survive server restarts.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => employerSettings && saveSettingsMutation.mutate(employerSettings)}
                  disabled={saveSettingsMutation.isPending || !employerSettings}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="h-4 w-4" /> Save Configuration
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isSettingsLoading || !employerSettings ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading configuration parameters...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Pay Cycle */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <Building className="h-4 w-4 text-blue-600" /> Pay Cycle & Cutoff Schedule
                    </h3>
                    <div className="space-y-2">
                      <Label htmlFor="payCycle" className="text-xs">Pay Cycle Frequency</Label>
                      <Select
                        value={employerSettings.payCycle || "monthly"}
                        onValueChange={(val) => setEmployerSettings({ ...employerSettings, payCycle: val })}
                      >
                        <SelectTrigger id="payCycle">
                          <SelectValue placeholder="Select Frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly (Calendar Month)</SelectItem>
                          <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">Standard Indian payroll operates on a monthly cadence.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="cutoffDay" className="text-xs">Cutoff Start Day</Label>
                        <Input
                          id="cutoffDay"
                          type="number"
                          min="1"
                          max="31"
                          value={employerSettings.cutoffDay || 1}
                          onChange={(e) => setEmployerSettings({ ...employerSettings, cutoffDay: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cutoffEndDay" className="text-xs">Cutoff End Day</Label>
                        <Input
                          id="cutoffEndDay"
                          type="number"
                          min="1"
                          max="31"
                          value={employerSettings.cutoffEndDay || 30}
                          onChange={(e) => setEmployerSettings({ ...employerSettings, cutoffEndDay: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="defaultState" className="text-xs">Primary Establishment State</Label>
                      <Select
                        value={employerSettings.defaultWorkState || "TN"}
                        onValueChange={(val) => setEmployerSettings({ ...employerSettings, defaultWorkState: val })}
                      >
                        <SelectTrigger id="defaultState">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {jurisdictionsData?.jurisdictions?.map((j) => (
                            <SelectItem key={j.stateCode} value={j.stateCode}>
                              {j.name} ({j.stateCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">Default jurisdiction for employees without explicit work location.</p>
                    </div>
                  </div>

                  {/* Disbursement & Banking */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <CreditCard className="h-4 w-4 text-emerald-600" /> Salary Payout & Disbursement Banking
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="bankFormat" className="text-xs">Corporate Salary Disbursement Format</Label>
                      <Select
                        value={employerSettings.bankFormat || "HDFC_CMS"}
                        onValueChange={(val) => setEmployerSettings({ ...employerSettings, bankFormat: val })}
                      >
                        <SelectTrigger id="bankFormat">
                          <SelectValue placeholder="Select Bank Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDFC_CMS">HDFC Bank Corporate CMS</SelectItem>
                          <SelectItem value="ICICI_CIB">ICICI Corporate Internet Banking (CIB)</SelectItem>
                          <SelectItem value="SBI_CMP">State Bank of India CMP Batch</SelectItem>
                          <SelectItem value="AXIS_NACH">Axis Bank Corporate NACH</SelectItem>
                          <SelectItem value="GENERIC_NEFT">Generic RBI NEFT / RTGS CSV</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">Standard export structure for batch salary transfer files.</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between p-2.5 rounded border bg-card">
                        <div>
                          <div className="text-xs font-medium">Voluntary Provident Fund (VPF)</div>
                          <div className="text-[10px] text-muted-foreground">Allow employees to contribute beyond statutory 12% EPF</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={employerSettings.voluntaryPfAllowed !== false}
                          onChange={(e) => setEmployerSettings({ ...employerSettings, voluntaryPfAllowed: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded border bg-card">
                        <div>
                          <div className="text-xs font-medium">Professional Tax Auto-Deduction</div>
                          <div className="text-[10px] text-muted-foreground">Automatically withhold state PT based on employee location</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={employerSettings.ptEnabled !== false}
                          onChange={(e) => setEmployerSettings({ ...employerSettings, ptEnabled: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded border bg-card">
                        <div>
                          <div className="text-xs font-medium">Labour Welfare Fund (LWF)</div>
                          <div className="text-[10px] text-muted-foreground">Auto-calculate employee and employer statutory LWF contributions</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={employerSettings.lwfEnabled !== false}
                          onChange={(e) => setEmployerSettings({ ...employerSettings, lwfEnabled: e.target.checked })}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: OFFICIAL SOURCE INGESTION CENTER
        ========================================================================= */}
        <TabsContent value="ingestion" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-indigo-600" /> Monitored Official Government Gazette Portals
                  </CardTitle>
                  <CardDescription>
                    Official portals monitored for statutory amendments. Ingested notices create non-auto-publishing drafts.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsIngestModalOpen(true)}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> Ingest Gazette Circular
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sourcesData?.sources?.map((src) => (
                  <div key={src.id} className="p-4 rounded-lg border bg-card space-y-2.5 shadow-xs">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="font-semibold text-xs">
                        {src.category}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        {src.status}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{src.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {src.governingMinistry}
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between text-xs">
                      <a
                        href={src.officialPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        Visit Portal <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-muted-foreground text-[11px]">Level: {src.jurisdictionLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: INTERACTIVE PAYROLL SIMULATOR
        ========================================================================= */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Parameters */}
            <Card className="lg:col-span-1 shadow-sm border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" /> Simulation Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Run test payroll calculations against authoritative statutory rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="simGross" className="text-xs">Monthly Earned Gross (₹)</Label>
                  <Input
                    id="simGross"
                    type="number"
                    value={simGross}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSimGross(val);
                      setSimBasic(Math.round(val * 0.5));
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="simBasic" className="text-xs">Basic Salary (₹)</Label>
                  <Input
                    id="simBasic"
                    type="number"
                    value={simBasic}
                    onChange={(e) => setSimBasic(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">Standard 50% basic allocation.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="simState" className="text-xs">Work Location Jurisdiction</Label>
                  <Select value={simState} onValueChange={setSimState}>
                    <SelectTrigger id="simState">
                      <SelectValue placeholder="Select Jurisdiction" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {jurisdictionsData?.jurisdictions?.map((j) => (
                        <SelectItem key={j.stateCode} value={j.stateCode}>
                          {j.name} ({j.stateCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="simRegime" className="text-xs">Tax Regime</Label>
                  <Select value={simRegime} onValueChange={(val: any) => setSimRegime(val)}>
                    <SelectTrigger id="simRegime">
                      <SelectValue placeholder="Select Tax Regime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Income-tax Act, 2025 (New Regime Section 392)</SelectItem>
                      <SelectItem value="old">Old Tax Regime (Section 115BAC Opt-Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => simulateMutation.mutate()}
                  disabled={simulateMutation.isPending}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white mt-2"
                >
                  <Play className="h-4 w-4" /> Run Calculation Simulation
                </Button>
              </CardContent>
            </Card>

            {/* Results Display */}
            <Card className="lg:col-span-2 shadow-sm border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" /> Itemized Payroll Breakdown & Provenance
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-slate-50">
                    Safe Simulation Sandbox
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Outputs reflect exact mathematical formulas from active published statutory rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!simResult ? (
                  <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
                    <Calculator className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p>Enter parameters and click "Run Calculation Simulation" to see itemized deductions.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Key Totals */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-center">
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase font-medium">Earned Gross</div>
                        <div className="text-lg font-bold text-foreground">₹{simResult.breakdown.grossEarned?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase font-medium">Total Deductions</div>
                        <div className="text-lg font-bold text-red-600">₹{simResult.breakdown.totalDeductions?.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase font-medium">Net Take-Home</div>
                        <div className="text-lg font-bold text-emerald-700">₹{simResult.breakdown.netPay?.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Statutory Deductions Table */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Statutory Deductions (Employee Share)</div>
                      <div className="border rounded-md divide-y text-xs">
                        <div className="flex items-center justify-between p-2">
                          <span className="font-medium">EPF (12% of Basic up to ceiling)</span>
                          <span className="font-mono font-semibold">₹{simResult.breakdown.employeePf?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="font-medium">ESI (0.75% of Gross if eligible)</span>
                          <span className="font-mono font-semibold">₹{simResult.breakdown.employeeEsi?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="font-medium">Professional Tax ({simState})</span>
                          <span className="font-mono font-semibold">₹{simResult.breakdown.professionalTax?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="font-medium">Labour Welfare Fund (LWF)</span>
                          <span className="font-mono font-semibold">₹{simResult.breakdown.employeeLwf?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span className="font-medium">Monthly TDS (Tax Deducted at Source)</span>
                          <span className="font-mono font-semibold">₹{simResult.breakdown.tdsMonthly?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Employer Contributions & Accruals */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Employer Contributions (CTC Overhead)</div>
                      <div className="border rounded-md divide-y text-xs bg-slate-50/50">
                        <div className="flex items-center justify-between p-2">
                          <span>EPF Employer Share (3.67%)</span>
                          <span className="font-mono">₹{simResult.breakdown.epfEmployer?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span>EPS Pension Share (8.33%, Max ₹1,250)</span>
                          <span className="font-mono">₹{simResult.breakdown.epsEmployer?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span>ESI Employer Share (3.25%)</span>
                          <span className="font-mono">₹{simResult.breakdown.employerEsi?.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2">
                          <span>Gratuity Accrual (15/26 Formula)</span>
                          <span className="font-mono">₹{simResult.breakdown.gratuityAccrual?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Provenance Manifest */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-blue-600" /> Statutory Provenance Manifest (Audit Immutable)
                      </div>
                      <pre className="text-[10px] bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto font-mono max-h-40">
                        {JSON.stringify(simResult.statutoryManifest, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* =========================================================================
          MODAL 1: INGEST OFFICIAL GAZETTE NOTIFICATION
      ========================================================================= */}
      <Dialog open={isIngestModalOpen} onOpenChange={setIsIngestModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" /> Ingest Official Gazette / Statutory Circular
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ingest an official government amendment. Creates a versioned <span className="font-semibold text-foreground">DRAFT</span> rule with full change provenance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Statutory Module</Label>
                <Select
                  value={ingestForm.ruleType}
                  onValueChange={(val) => setIngestForm({ ...ingestForm, ruleType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EPF">Employees' Provident Fund (EPF)</SelectItem>
                    <SelectItem value="ESI">Employees' State Insurance (ESI)</SelectItem>
                    <SelectItem value="PT">Professional Tax (PT)</SelectItem>
                    <SelectItem value="LWF">Labour Welfare Fund (LWF)</SelectItem>
                    <SelectItem value="TDS_ITA2025">TDS (Income-tax Act, 2025)</SelectItem>
                    <SelectItem value="GRATUITY">Gratuity (Payment of Gratuity Act)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Applicable Jurisdiction</Label>
                <Select
                  value={ingestForm.stateCode}
                  onValueChange={(val) => setIngestForm({ ...ingestForm, stateCode: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="ALL">Central / All-India</SelectItem>
                    {jurisdictionsData?.jurisdictions?.map((j) => (
                      <SelectItem key={j.stateCode} value={j.stateCode}>
                        {j.name} ({j.stateCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Official Notification / Circular Ref</Label>
                <Input
                  placeholder="e.g. S.O. 1234(E) or Circular 45/2026"
                  value={ingestForm.notificationRef}
                  onChange={(e) => setIngestForm({ ...ingestForm, notificationRef: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Effective From Date</Label>
                <Input
                  type="date"
                  value={ingestForm.effectiveFrom}
                  onChange={(e) => setIngestForm({ ...ingestForm, effectiveFrom: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Official Source URL</Label>
              <Input
                placeholder="https://www.egazette.gov.in or https://www.epfindia.gov.in"
                value={ingestForm.sourceUrl}
                onChange={(e) => setIngestForm({ ...ingestForm, sourceUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Change Summary</Label>
              <Input
                placeholder="Brief summary of statutory parameter changes"
                value={ingestForm.changeSummary}
                onChange={(e) => setIngestForm({ ...ingestForm, changeSummary: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Proposed Parameters Configuration (JSON)</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={ingestForm.configJsonString}
                onChange={(e) => setIngestForm({ ...ingestForm, configJsonString: e.target.value })}
              />
            </div>

            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-700 shrink-0" />
              <span>
                Safety Assurance: Ingestion saves as an inactive draft. Under Maker-Checker controls, it will never auto-publish into live calculations.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIngestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => ingestMutation.mutate(ingestForm)}
              disabled={ingestMutation.isPending || !ingestForm.notificationRef}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Save className="h-4 w-4" /> Save Draft Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: INSPECT RULE JSON & AUDIT LOGS
      ========================================================================= */}
      <Dialog open={Boolean(inspectedRule)} onOpenChange={(open) => !open && setInspectedRule(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-5 w-5 text-blue-600" />
              {inspectedRule?.ruleIdentifier} (v{inspectedRule?.version})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Status: <span className="font-semibold">{inspectedRule?.publicationStatus.toUpperCase()}</span> | Jurisdiction: {inspectedRule?.stateCode || "CENTRAL"}
            </DialogDescription>
          </DialogHeader>

          {inspectedRule && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded border">
                <div>
                  <span className="text-muted-foreground">Source Authority:</span>{" "}
                  <span className="font-medium text-foreground">{inspectedRule.sourceAuthority || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Notification Ref:</span>{" "}
                  <span className="font-medium text-foreground">{inspectedRule.notificationRef || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Effective From:</span>{" "}
                  <span className="font-medium text-foreground">{new Date(inspectedRule.effectiveFrom).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified:</span>{" "}
                  <span className="font-medium text-foreground">{inspectedRule.isVerified ? "Yes (Certified)" : "No"}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rule Parameters JSON</Label>
                <pre className="text-[11px] bg-slate-900 text-slate-100 p-3.5 rounded-md overflow-x-auto font-mono max-h-64">
                  {JSON.stringify(inspectedRule.configJson, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectedRule(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

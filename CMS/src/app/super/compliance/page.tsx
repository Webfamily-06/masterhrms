'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentFinancialYear, getSelectableFinancialYears } from "@/lib/financial-year";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  Scale,
  FileText,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  Send,
  Eye,
  Play,
  Users,
  Calendar,
  Building2,
  ExternalLink,
  Layers,
  Lock,
  ArrowRight,
  Sliders,
  DollarSign,
  Activity,
} from "lucide-react";



function SuperAdminComplianceControlCenter() {
  const queryClient = useQueryClient();

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedRuleType, setSelectedRuleType] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<string>("registry");

  // Selection & Modal States
  const [viewingRule, setViewingRule] = useState<any | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [ruleToRollback, setRuleToRollback] = useState<any | null>(null);
  const [targetRollbackId, setTargetRollbackId] = useState<string>("");

  // Draft Form State
  const [draftForm, setDraftForm] = useState({
    ruleIdentifier: "",
    ruleType: "EPF",
    category: "RETIREMENT_PF",
    jurisdictionLevel: "CENTRAL",
    stateCode: "ALL",
    applicableCategory: "ALL",
    financialYear: getCurrentFinancialYear(),
    effectiveFrom: "2026-04-01",
    effectiveTo: "",
    sourceAuthority: "Ministry of Labour & Employment / EPFO",
    notificationRef: "GSR 123(E)",
    sourceUrl: "https://www.epfindia.gov.in",
    changeLog: "Statutory amendment update",
    configJsonStr: JSON.stringify(
      {
        statutoryCeiling: 15000,
        employeeRate: 0.12,
        employerEpfRate: 0.0367,
        employerEpsRate: 0.0833333333,
        epsMaxMonthly: 1250,
        edliRate: 0.005,
        pfAdminRate: 0.005,
      },
      null,
      2
    ),
  });

  // Simulation State
  const [simForm, setSimForm] = useState({
    ruleType: "EPF",
    state: "TN",
    regime: "new",
    configJsonStr: JSON.stringify(
      {
        statutoryCeiling: 21000,
        employeeRate: 0.12,
        employerEpfRate: 0.0367,
        employerEpsRate: 0.0833333333,
        epsMaxMonthly: 1750,
        edliRate: 0.005,
        pfAdminRate: 0.005,
      },
      null,
      2
    ),
  });
  const [simResults, setSimResults] = useState<any | null>(null);

  // Queries
  const { data: rulesData, isLoading: isLoadingRules, refetch: refetchRules } = useQuery({
    queryKey: ["super-compliance-rules", selectedRuleType, selectedState, selectedStatus, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRuleType !== "ALL") params.append("ruleType", selectedRuleType);
      if (selectedState !== "ALL") params.append("stateCode", selectedState);
      if (selectedStatus !== "ALL") params.append("publicationStatus", selectedStatus.toLowerCase());
      if (search) params.append("search", search);
      const res = await api.get(`/api/super/compliance/rules?${params.toString()}`);
      return res.data;
    },
  });

  const { data: auditTrailData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ["super-compliance-audit-trail"],
    queryFn: async () => {
      const res = await api.get("/api/super/compliance/audit-trail?limit=100");
      return res.data;
    },
    enabled: activeTab === "audit",
  });

  const { data: affectedTenantsData } = useQuery({
    queryKey: ["super-compliance-affected-tenants", selectedState],
    queryFn: async () => {
      const res = await api.get(`/api/super/compliance/affected-tenants?jurisdiction=${selectedState === "ALL" ? "CENTRAL" : "STATE"}&stateCode=${selectedState}`);
      return res.data;
    },
    enabled: activeTab === "registry" || activeTab === "simulation",
  });

  // Mutations
  const createDraftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/super/compliance/rules/draft", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Statutory rule draft created successfully");
      setIsDraftModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create draft");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await api.post(`/api/super/compliance/rules/${ruleId}/submit`, {});
      return res.data;
    },
    onSuccess: () => {
      toast.success("Rule submitted for compliance review");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRule) setViewingRule(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit for review");
    },
  });

  const approveRuleMutation = useMutation({
    mutationFn: async ({ ruleId, enforceMakerChecker }: { ruleId: string; enforceMakerChecker: boolean }) => {
      const res = await api.post(`/api/super/compliance/rules/${ruleId}/approve`, { enforceMakerChecker });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Rule approved by Compliance Officer");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRule) setViewingRule(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Approval failed (check Maker-Checker restrictions)");
    },
  });

  const publishRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await api.post(`/api/super/compliance/rules/${ruleId}/publish`, {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Rule successfully published and activated!");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRule) setViewingRule(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Publication failed");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ ruleId, targetVersionId }: { ruleId: string; targetVersionId: string }) => {
      const res = await api.post(`/api/super/compliance/rules/${ruleId}/rollback`, { targetVersionId });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Rule successfully rolled back to prior version");
      setIsRollbackModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Rollback failed");
    },
  });

  const runSimulationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/super/compliance/simulate", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setSimResults(data);
      toast.success(`Simulation completed across ${data.scenariosEvaluated} employee tiers`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Simulation failed");
    },
  });

  const handleCreateDraft = () => {
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(draftForm.configJsonStr);
    } catch {
      toast.error("Invalid JSON configuration syntax");
      return;
    }

    createDraftMutation.mutate({
      ruleIdentifier: draftForm.ruleIdentifier.trim(),
      ruleType: draftForm.ruleType,
      category: draftForm.category,
      jurisdictionLevel: draftForm.jurisdictionLevel,
      stateCode: draftForm.stateCode,
      applicableCategory: draftForm.applicableCategory,
      financialYear: draftForm.financialYear,
      effectiveFrom: draftForm.effectiveFrom,
      effectiveTo: draftForm.effectiveTo || null,
      sourceAuthority: draftForm.sourceAuthority,
      notificationRef: draftForm.notificationRef,
      sourceUrl: draftForm.sourceUrl,
      changeLog: draftForm.changeLog,
      configJson: parsedConfig,
      isGlobal: draftForm.stateCode === "ALL" && draftForm.jurisdictionLevel === "CENTRAL",
    });
  };

  const handleRunSimulation = () => {
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(simForm.configJsonStr);
    } catch {
      toast.error("Invalid JSON in simulation config");
      return;
    }

    runSimulationMutation.mutate({
      candidateRule: {
        ruleType: simForm.ruleType,
        stateCode: simForm.state,
        configJson: parsedConfig,
      },
      state: simForm.state,
      regime: simForm.regime,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "published":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">Published & Active</Badge>;
      case "approved":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Approved</Badge>;
      case "under_review":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-medium">Under Review</Badge>;
      case "draft":
        return <Badge variant="secondary" className="font-medium">Draft</Badge>;
      case "superseded":
        return <Badge variant="outline" className="text-zinc-500 border-zinc-400">Superseded</Badge>;
      case "archived":
      case "reverted":
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const rulesList = rulesData?.rules || [];

  return (
    <div className="flex-1 space-y-6 p-8 max-w-7xl mx-auto">
      {/* Top Banner / Release Gate Warning */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Statutory Compliance Control Center</h1>
              <p className="text-sm text-muted-foreground">
                Dynamic, versioned statutory rule registry, maker-checker governance & scenario impact simulation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 bg-amber-50 text-amber-800 border-amber-300 gap-1.5 flex items-center">
            <Lock className="h-3.5 w-3.5" />
            <span>Release Gate: BLOCKED (Audit Mode)</span>
          </Badge>
          <Button
            onClick={() => setIsDraftModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Statutory Draft
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsSimulateModalOpen(true)}
            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Play className="h-4 w-4" />
            Simulate Amendment
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Authoritative Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rulesList.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across Central & State Jurisdictions</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Published Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {rulesList.filter((r: any) => r.publicationStatus === "published" && r.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Enforcing live statutory payroll calculations</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Governance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {rulesList.filter((r: any) => ["draft", "under_review", "approved"].includes(r.publicationStatus)).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting compliance review or activation</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Affected Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {affectedTenantsData?.affectedTenantsCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Workspaces protected by statutory snapshots</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="registry" className="gap-2">
            <Sliders className="h-4 w-4" />
            Rule Registry & Precedence
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-2">
            <Activity className="h-4 w-4" />
            Amendment Simulation
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="h-4 w-4" />
            Immutable Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REGISTRY VIEW */}
        <TabsContent value="registry" className="space-y-4">
          {/* Filters Bar */}
          <Card className="p-4 border-border/60 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules by identifier, category, authority..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Rule Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="EPF">EPF</SelectItem>
                    <SelectItem value="ESI">ESI</SelectItem>
                    <SelectItem value="PT">Professional Tax</SelectItem>
                    <SelectItem value="LWF">Labour Welfare</SelectItem>
                    <SelectItem value="GRATUITY">Gratuity</SelectItem>
                    <SelectItem value="TDS_ITA2025">TDS (ITA 2025)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Central (ALL)</SelectItem>
                    <SelectItem value="TN">Tamil Nadu</SelectItem>
                    <SelectItem value="MH">Maharashtra</SelectItem>
                    <SelectItem value="KA">Karnataka</SelectItem>
                    <SelectItem value="TS">Telangana</SelectItem>
                    <SelectItem value="DL">Delhi</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="superseded">Superseded</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" onClick={() => refetchRules()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Rules Table */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b">
                  <tr>
                    <th className="px-4 py-3">Rule Identifier</th>
                    <th className="px-4 py-3">Category / Type</th>
                    <th className="px-4 py-3">Jurisdiction</th>
                    <th className="px-4 py-3">Effective Range</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoadingRules ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading statutory rule registry...
                      </td>
                    </tr>
                  ) : rulesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No statutory rules found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    rulesList.map((rule: any) => (
                      <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <div>{rule.ruleIdentifier}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {rule.sourceAuthority || "Statutory Authority"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {rule.ruleType}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{rule.stateCode === "ALL" ? "Central / National" : rule.stateCode}</span>
                          <span className="text-xs text-muted-foreground block">{rule.jurisdictionLevel}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div>From: {new Date(rule.effectiveFrom).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            To: {rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString() : "Indefinite"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium">v{rule.version}</span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(rule.publicationStatus)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingRule(rule)}
                              className="h-8 px-2"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Inspect
                            </Button>

                            {rule.publicationStatus === "draft" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => submitReviewMutation.mutate(rule.id)}
                                disabled={submitReviewMutation.isPending}
                                className="h-8 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                Submit
                              </Button>
                            )}

                            {rule.publicationStatus === "under_review" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveRuleMutation.mutate({ ruleId: rule.id, enforceMakerChecker: true })}
                                disabled={approveRuleMutation.isPending}
                                className="h-8 px-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                            )}

                            {rule.publicationStatus === "approved" && (
                              <Button
                                size="sm"
                                onClick={() => publishRuleMutation.mutate(rule.id)}
                                disabled={publishRuleMutation.isPending}
                                className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Publish
                              </Button>
                            )}

                            {rule.publicationStatus === "published" && rule.previousVersionId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRuleToRollback(rule);
                                  setTargetRollbackId(rule.previousVersionId);
                                  setIsRollbackModalOpen(true);
                                }}
                                className="h-8 px-2 text-rose-700 border-rose-300 hover:bg-rose-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Rollback
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: SIMULATION VIEW */}
        <TabsContent value="simulation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulation Parameter Config */}
            <Card className="border-border/60 shadow-sm lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  Candidate Amendment Scenario
                </CardTitle>
                <CardDescription>
                  Configure proposed statutory parameters to simulate their impact on gross-to-net payroll before approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Statutory Component</Label>
                  <Select
                    value={simForm.ruleType}
                    onValueChange={(val) => setSimForm({ ...simForm, ruleType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPF">EPF (Provident Fund)</SelectItem>
                      <SelectItem value="ESI">ESI (State Insurance)</SelectItem>
                      <SelectItem value="PT">Professional Tax (PT)</SelectItem>
                      <SelectItem value="LWF">Labour Welfare Fund (LWF)</SelectItem>
                      <SelectItem value="GRATUITY">Gratuity Accrual</SelectItem>
                      <SelectItem value="TDS_ITA2025">TDS (Tax Act 2025)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Target Jurisdiction</Label>
                  <Select
                    value={simForm.state}
                    onValueChange={(val) => setSimForm({ ...simForm, state: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
                      <SelectItem value="MH">Maharashtra (MH)</SelectItem>
                      <SelectItem value="KA">Karnataka (KA)</SelectItem>
                      <SelectItem value="TS">Telangana (TS)</SelectItem>
                      <SelectItem value="DL">Delhi (DL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tax Regime</Label>
                  <Select
                    value={simForm.regime}
                    onValueChange={(val) => setSimForm({ ...simForm, regime: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Tax Regime</SelectItem>
                      <SelectItem value="old">Old Tax Regime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Candidate Parameter JSON (configJson)</Label>
                  <Textarea
                    rows={8}
                    className="font-mono text-xs"
                    value={simForm.configJsonStr}
                    onChange={(e) => setSimForm({ ...simForm, configJsonStr: e.target.value })}
                  />
                </div>

                <Button
                  onClick={handleRunSimulation}
                  disabled={runSimulationMutation.isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  <Play className="h-4 w-4" />
                  {runSimulationMutation.isPending ? "Simulating..." : "Run Multi-Tier Impact Simulation"}
                </Button>
              </CardContent>
            </Card>

            {/* Simulation Results Table */}
            <Card className="border-border/60 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Gross-to-Net Variance Across Salary Brackets
                  </span>
                  {simResults && (
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300">
                      Evaluated {simResults.scenariosEvaluated} Scenarios
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Side-by-side empirical comparison of active baseline statutory deductions versus candidate parameters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!simResults ? (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <Scale className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium">No simulation active</p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Configure parameters and click "Run Multi-Tier Impact Simulation" to view side-by-side variance.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold border-b">
                        <tr>
                          <th className="px-3 py-2.5">Salary Tier</th>
                          <th className="px-3 py-2.5">Gross</th>
                          <th className="px-3 py-2.5">EPF (Base / Prop)</th>
                          <th className="px-3 py-2.5">ESI (Base / Prop)</th>
                          <th className="px-3 py-2.5">PT / LWF</th>
                          <th className="px-3 py-2.5">Net Pay Delta</th>
                          <th className="px-3 py-2.5">Employer Cost Delta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-mono">
                        {simResults.results.map((r: any, idx: number) => {
                          const netDelta = r.variance.netPay;
                          const empDelta = r.variance.employerTotalCostVariance;
                          return (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="px-3 py-2.5 font-sans font-medium">{r.scenario}</td>
                              <td className="px-3 py-2.5">₹{r.monthlyGross.toLocaleString()}</td>
                              <td className="px-3 py-2.5">
                                <div>₹{r.baseline.epfEmployee} → ₹{r.proposed.epfEmployee}</div>
                                {r.variance.epfEmployee !== 0 && (
                                  <span className={`text-[10px] ${r.variance.epfEmployee > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                    {r.variance.epfEmployee > 0 ? `+₹${r.variance.epfEmployee}` : `-₹${Math.abs(r.variance.epfEmployee)}`}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div>₹{r.baseline.esiEmployee} → ₹{r.proposed.esiEmployee}</div>
                                {r.variance.esiEmployee !== 0 && (
                                  <span className={`text-[10px] ${r.variance.esiEmployee > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                    {r.variance.esiEmployee > 0 ? `+₹${r.variance.esiEmployee}` : `-₹${Math.abs(r.variance.esiEmployee)}`}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div>PT: ₹{r.baseline.pt}</div>
                                <div>LWF: ₹{r.baseline.lwfEmployee}</div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`font-semibold ${netDelta < 0 ? "text-rose-600" : netDelta > 0 ? "text-emerald-600" : "text-zinc-600"}`}>
                                  {netDelta > 0 ? `+₹${netDelta}` : netDelta < 0 ? `-₹${Math.abs(netDelta)}` : "₹0.00"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`font-semibold ${empDelta > 0 ? "text-amber-600" : empDelta < 0 ? "text-emerald-600" : "text-zinc-600"}`}>
                                  {empDelta > 0 ? `+₹${empDelta}` : empDelta < 0 ? `-₹${Math.abs(empDelta)}` : "₹0.00"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: IMMUTABLE AUDIT TRAIL */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                Immutable Statutory Audit Trail
              </CardTitle>
              <CardDescription>
                Cryptographically verifiable, non-repudiable audit logs of every statutory rule proposal, review, sign-off, activation, and rollback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAudit ? (
                <div className="py-8 text-center text-muted-foreground">Loading audit records...</div>
              ) : !auditTrailData?.logs?.length ? (
                <div className="py-8 text-center text-muted-foreground">No statutory audit logs recorded.</div>
              ) : (
                <div className="relative pl-6 border-l space-y-6">
                  {auditTrailData.logs.map((log: any) => (
                    <div key={log.id} className="relative group">
                      <div className="absolute -left-[31px] top-1 p-1 bg-background border rounded-full text-indigo-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-sm">
                            {log.rule?.ruleIdentifier || "Rule"} v{log.rule?.version || ""}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{log.notes || "No notes provided."}</p>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Actor: <span className="font-mono">{log.actorEmail}</span> ({log.actorRole})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* INSPECT RULE DIALOG */}
      <Dialog open={Boolean(viewingRule)} onOpenChange={(open) => !open && setViewingRule(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              Statutory Rule Details: {viewingRule?.ruleIdentifier}
            </DialogTitle>
            <DialogDescription>
              Version {viewingRule?.version} • {viewingRule?.stateCode === "ALL" ? "Central National" : viewingRule?.stateCode} • {viewingRule?.jurisdictionLevel}
            </DialogDescription>
          </DialogHeader>

          {viewingRule && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(viewingRule.publicationStatus)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Financial Year:</span>
                  <div className="font-medium mt-0.5">{viewingRule.financialYear || "N/A"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Effective From:</span>
                  <div className="font-medium mt-0.5">{new Date(viewingRule.effectiveFrom).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Effective To:</span>
                  <div className="font-medium mt-0.5">{viewingRule.effectiveTo ? new Date(viewingRule.effectiveTo).toLocaleDateString() : "Open-ended (Active)"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Source Authority:</span>
                  <div className="font-medium mt-0.5">{viewingRule.sourceAuthority || "EPFO / CBDT / State Dept"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Notification Ref:</span>
                  <div className="font-medium mt-0.5">{viewingRule.notificationRef || "N/A"}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Active JSON Configuration (configJson)</Label>
                <pre className="mt-1.5 p-3 bg-zinc-950 text-zinc-100 rounded-md font-mono text-[11px] overflow-x-auto max-h-56">
                  {JSON.stringify(viewingRule.configJson, null, 2)}
                </pre>
              </div>

              {viewingRule.changeLog && (
                <div>
                  <Label className="text-xs font-semibold">Change Log & Rationale</Label>
                  <p className="mt-1 p-2.5 bg-muted/30 border rounded text-xs text-muted-foreground">
                    {viewingRule.changeLog}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between w-full">
            <Button variant="outline" onClick={() => setViewingRule(null)}>
              Close
            </Button>
            {viewingRule?.publicationStatus === "approved" && (
              <Button
                onClick={() => publishRuleMutation.mutate(viewingRule.id)}
                disabled={publishRuleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Publish & Activate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE DRAFT MODAL */}
      <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              Create Versioned Statutory Rule Draft
            </DialogTitle>
            <DialogDescription>
              New statutory configurations are created in DRAFT state and must pass formal compliance review before activation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rule Identifier (Unique)</Label>
                <Input
                  placeholder="e.g. EPF_CENTRAL_AMENDMENT_2026"
                  value={draftForm.ruleIdentifier}
                  onChange={(e) => setDraftForm({ ...draftForm, ruleIdentifier: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Rule Type</Label>
                <Select
                  value={draftForm.ruleType}
                  onValueChange={(val) => setDraftForm({ ...draftForm, ruleType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EPF">EPF</SelectItem>
                    <SelectItem value="ESI">ESI</SelectItem>
                    <SelectItem value="PT">Professional Tax (PT)</SelectItem>
                    <SelectItem value="LWF">Labour Welfare Fund (LWF)</SelectItem>
                    <SelectItem value="GRATUITY">Gratuity</SelectItem>
                    <SelectItem value="TDS_ITA2025">TDS (ITA 2025)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Jurisdiction Level</Label>
                <Select
                  value={draftForm.jurisdictionLevel}
                  onValueChange={(val) => setDraftForm({ ...draftForm, jurisdictionLevel: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTRAL">Central / National</SelectItem>
                    <SelectItem value="STATE">State Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>State Code</Label>
                <Select
                  value={draftForm.stateCode}
                  onValueChange={(val) => setDraftForm({ ...draftForm, stateCode: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Central (ALL)</SelectItem>
                    <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
                    <SelectItem value="MH">Maharashtra (MH)</SelectItem>
                    <SelectItem value="KA">Karnataka (KA)</SelectItem>
                    <SelectItem value="TS">Telangana (TS)</SelectItem>
                    <SelectItem value="DL">Delhi (DL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Financial Year</Label>
                <Input
                  value={draftForm.financialYear}
                  onChange={(e) => setDraftForm({ ...draftForm, financialYear: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Effective From (Mandatory)</Label>
                <Input
                  type="date"
                  value={draftForm.effectiveFrom}
                  onChange={(e) => setDraftForm({ ...draftForm, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={draftForm.effectiveTo}
                  onChange={(e) => setDraftForm({ ...draftForm, effectiveTo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Source Authority & Gazetted Notification</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="e.g. Ministry of Labour & Employment"
                  value={draftForm.sourceAuthority}
                  onChange={(e) => setDraftForm({ ...draftForm, sourceAuthority: e.target.value })}
                />
                <Input
                  placeholder="e.g. Notification No. GSR 123(E)"
                  value={draftForm.notificationRef}
                  onChange={(e) => setDraftForm({ ...draftForm, notificationRef: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Rule Configuration JSON</Label>
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={draftForm.configJsonStr}
                onChange={(e) => setDraftForm({ ...draftForm, configJsonStr: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Change Summary / Rationale</Label>
              <Textarea
                rows={2}
                placeholder="Explain the statutory amendment or gazette notification reason..."
                value={draftForm.changeLog}
                onChange={(e) => setDraftForm({ ...draftForm, changeLog: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDraftModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDraft}
              disabled={createDraftMutation.isPending || !draftForm.ruleIdentifier.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {createDraftMutation.isPending ? "Creating Draft..." : "Save Statutory Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROLLBACK CONFIRMATION MODAL */}
      <Dialog open={isRollbackModalOpen} onOpenChange={setIsRollbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="h-5 w-5" />
              Confirm Statutory Rule Rollback
            </DialogTitle>
            <DialogDescription>
              This action will deactivate the active rule version ({ruleToRollback?.ruleIdentifier} v{ruleToRollback?.version}) and restore the prior approved version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Audit & Compliance Warning
              </p>
              <p>
                Historical finalized payslips will NOT be altered. Only future payroll calculations will resolve the restored rule version.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRollbackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rollbackMutation.mutate({ ruleId: ruleToRollback.id, targetVersionId: targetRollbackId })}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending ? "Rolling Back..." : "Confirm Rollback & Reactivate Prior"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default SuperAdminComplianceControlCenter;

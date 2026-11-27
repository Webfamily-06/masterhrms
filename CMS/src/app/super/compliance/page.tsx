'use client';

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getCurrentFinancialYear } from "@/lib/financial-year";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
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
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  Send,
  Eye,
  Play,
  Sliders,
  Activity,
  Pencil,
  Save,
  Loader2,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";

function toDateInputValue(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function SuperAdminComplianceControlCenter() {
  const queryClient = useQueryClient();

  // Filters & State
  const [search, setSearch] = useState("");
  const [selectedRuleType, setSelectedRuleType] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<string>("registry");

  // Selection & Modal States
  const [viewingRuleId, setViewingRuleId] = useState<string | null>(null);
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [editForm, setEditForm] = useState({
    effectiveFrom: "",
    effectiveTo: "",
    sourceAuthority: "",
    notificationRef: "",
    sourceUrl: "",
    changeLog: "",
    configJsonStr: "{}",
  });
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [ruleToRollback, setRuleToRollback] = useState<any | null>(null);

  // Draft Form State
  const [draftForm, setDraftForm] = useState({
    ruleIdentifier: "",
    ruleType: "EPF",
    category: "RETIREMENT_PF",
    jurisdictionLevel: "CENTRAL",
    stateCode: "ALL",
    applicableCategory: "ALL",
    financialYear: getCurrentFinancialYear(),
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    sourceAuthority: "Ministry of Labour & Employment / EPFO",
    notificationRef: "",
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
      2,
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
      2,
    ),
  });
  const [simResults, setSimResults] = useState<any | null>(null);

  // Queries
  const {
    data: rulesData,
    isLoading: isLoadingRules,
    isFetching: isFetchingRules,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ["super-compliance-rules", selectedRuleType, selectedState, selectedStatus, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedRuleType !== "ALL") params.append("ruleType", selectedRuleType);
      if (selectedState !== "ALL") params.append("stateCode", selectedState);
      if (selectedStatus !== "ALL") params.append("publicationStatus", selectedStatus.toLowerCase());
      if (search.trim()) params.append("search", search.trim());
      const res = await api.get(`/super/compliance/rules?${params.toString()}`);
      return res?.data || res || {};
    },
  });

  const { data: ruleDetailData, isLoading: isLoadingRuleDetail } = useQuery({
    queryKey: ["super-compliance-rule-detail", viewingRuleId],
    queryFn: async () => {
      if (!viewingRuleId) return null;
      const res = await api.get(`/super/compliance/rules/${viewingRuleId}`);
      return res?.data || res || null;
    },
    enabled: Boolean(viewingRuleId),
  });

  const { data: auditTrailData, isLoading: isLoadingAudit } = useQuery({
    queryKey: ["super-compliance-audit-trail"],
    queryFn: async () => {
      const res = await api.get("/super/compliance/audit-trail?limit=100");
      return res?.data || res || {};
    },
    enabled: activeTab === "audit",
  });

  const { data: affectedTenantsData } = useQuery({
    queryKey: ["super-compliance-affected-tenants", selectedState],
    queryFn: async () => {
      const res = await api.get(
        `/super/compliance/affected-tenants?jurisdiction=${selectedState === "ALL" ? "CENTRAL" : "STATE"}&stateCode=${selectedState}`,
      );
      return res?.data || res || {};
    },
    enabled: activeTab === "registry" || activeTab === "simulation",
  });

  const viewingRule = ruleDetailData?.rule || null;
  const previousVersion = ruleDetailData?.previousVersion || null;
  const viewingRuleAuditLogs = ruleDetailData?.auditLogs || viewingRule?.auditLogs || [];
  const isDraftEditable = viewingRule?.publicationStatus?.toUpperCase() === "DRAFT";

  useEffect(() => {
    if (viewingRule) {
      setEditForm({
        effectiveFrom: toDateInputValue(viewingRule.effectiveFrom),
        effectiveTo: toDateInputValue(viewingRule.effectiveTo),
        sourceAuthority: viewingRule.sourceAuthority || "",
        notificationRef: viewingRule.notificationRef || "",
        sourceUrl: viewingRule.sourceUrl || "",
        changeLog: viewingRule.changeLog || "",
        configJsonStr: JSON.stringify(viewingRule.configJson ?? {}, null, 2),
      });
    }
  }, [viewingRule]);

  // Mutations
  const createDraftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/super/compliance/rules/draft", payload);
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Statutory rule draft created successfully.");
      setIsDraftModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create draft.");
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.put(`/super/compliance/rules/${id}`, payload);
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Statutory rule draft updated successfully.");
      setIsEditingRule(false);
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rule-detail", viewingRuleId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update draft rule.");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await api.post(`/super/compliance/rules/${ruleId}/submit`, {});
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Rule submitted for compliance review.");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRuleId) {
        queryClient.invalidateQueries({ queryKey: ["super-compliance-rule-detail", viewingRuleId] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit for review.");
    },
  });

  const approveRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await api.post(`/super/compliance/rules/${ruleId}/approve`, {});
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Rule approved by Compliance Officer.");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRuleId) {
        queryClient.invalidateQueries({ queryKey: ["super-compliance-rule-detail", viewingRuleId] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Approval failed (maker-checker enforced server-side).");
    },
  });

  const publishRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await api.post(`/super/compliance/rules/${ruleId}/publish`, {});
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Rule published and activated.");
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
      if (viewingRuleId) {
        queryClient.invalidateQueries({ queryKey: ["super-compliance-rule-detail", viewingRuleId] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Publication failed.");
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ ruleId, targetVersionId }: { ruleId: string; targetVersionId: string }) => {
      const res = await api.post(`/super/compliance/rules/${ruleId}/rollback`, { targetVersionId });
      return res?.data || res;
    },
    onSuccess: () => {
      toast.success("Rule rolled back to prior approved version.");
      setRuleToRollback(null);
      queryClient.invalidateQueries({ queryKey: ["super-compliance-rules"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Rollback failed.");
    },
  });

  const runSimulationMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/super/compliance/simulate", payload);
      return res?.data || res;
    },
    onSuccess: (data: any) => {
      setSimResults(data);
      toast.success(`Simulation completed across ${data?.scenariosEvaluated ?? 0} salary tiers.`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Simulation failed.");
    },
  });

  const handleCreateDraft = () => {
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(draftForm.configJsonStr);
    } catch {
      toast.error("Invalid JSON configuration syntax.");
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

  const handleSaveRuleEdit = () => {
    if (!viewingRule) return;
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(editForm.configJsonStr);
    } catch {
      toast.error("Invalid JSON configuration syntax.");
      return;
    }

    updateDraftMutation.mutate({
      id: viewingRule.id,
      payload: {
        configJson: parsedConfig,
        effectiveFrom: editForm.effectiveFrom || undefined,
        effectiveTo: editForm.effectiveTo || null,
        sourceAuthority: editForm.sourceAuthority,
        notificationRef: editForm.notificationRef,
        sourceUrl: editForm.sourceUrl,
        changeLog: editForm.changeLog,
      },
    });
  };

  const handleRunSimulation = () => {
    let parsedConfig: any;
    try {
      parsedConfig = JSON.parse(simForm.configJsonStr);
    } catch {
      toast.error("Invalid JSON in simulation configuration.");
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

  const handleOpenSimulationWithRule = (rule: any) => {
    setSimForm({
      ruleType: rule.ruleType || "EPF",
      state: rule.stateCode && rule.stateCode !== "ALL" ? rule.stateCode : "TN",
      regime: "new",
      configJsonStr: JSON.stringify(rule.configJson ?? {}, null, 2),
    });
    setSimResults(null);
    setViewingRuleId(null);
    setIsEditingRule(false);
    setActiveTab("simulation");
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "published":
        return <Badge variant="success">Published &amp; Active</Badge>;
      case "approved":
        return <Badge variant="info">Approved</Badge>;
      case "under_review":
        return <Badge variant="warning">Under Review</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "superseded":
        return <Badge variant="outline" className="text-muted-foreground">Superseded</Badge>;
      case "archived":
      case "reverted":
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const rulesList: any[] = Array.isArray(rulesData?.rules) ? rulesData.rules : [];

  const { activePublishedCount, pendingReviewCount, pendingGovernanceCount, releaseGate } = useMemo(() => {
    const activeCount = rulesList.filter(
      (r) => r.publicationStatus?.toLowerCase() === "published" && r.isActive,
    ).length;
    const reviewCount = rulesList.filter((r) =>
      ["under_review", "approved"].includes(String(r.publicationStatus || "").toLowerCase()),
    ).length;
    const govCount = rulesList.filter((r) =>
      ["draft", "under_review", "approved"].includes(String(r.publicationStatus || "").toLowerCase()),
    ).length;

    let gate: { label: string; variant: "warning" | "success" | "secondary" } = {
      label: "Release Gate: ACTIVE",
      variant: "success",
    };
    if (reviewCount > 0) {
      gate = {
        label: `Release Gate: PENDING REVIEW (${reviewCount})`,
        variant: "warning",
      };
    } else if (activeCount === 0 && !isLoadingRules) {
      gate = {
        label: "Release Gate: NO ACTIVE RULES",
        variant: "secondary",
      };
    }

    return {
      activePublishedCount: activeCount,
      pendingReviewCount: reviewCount,
      pendingGovernanceCount: govCount,
      releaseGate: gate,
    };
  }, [rulesList, isLoadingRules]);

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Statutory Compliance Control Center"
        description="Dynamic, versioned statutory rule registry, maker-checker governance, and payroll impact simulation."
        icon={Scale}
        badge={
          <Badge variant={releaseGate.variant} className="gap-1.5">
            {releaseGate.variant === "warning" ? (
              <AlertTriangle className="size-3" />
            ) : (
              <ShieldCheck className="size-3" />
            )}
            {releaseGate.label}
          </Badge>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("simulation")}
            >
              <Play className="size-3.5" />
              Simulate Amendment
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDraftModalOpen(true)}
            >
              <Plus className="size-3.5" />
              New Statutory Draft
            </Button>
          </>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Authoritative Rules"
          value={rulesList.length}
          description="Across Central & State jurisdictions"
          icon={FileText}
          variant="primary"
          isLoading={isLoadingRules}
        />
        <StatCard
          label="Active Published Rules"
          value={activePublishedCount}
          description="Enforcing live statutory calculations"
          icon={ShieldCheck}
          variant="success"
          isLoading={isLoadingRules}
        />
        <StatCard
          label="Pending Governance"
          value={pendingGovernanceCount}
          description={
            pendingReviewCount > 0
              ? `${pendingReviewCount} awaiting approval/publish`
              : "Drafts awaiting review or activation"
          }
          icon={AlertTriangle}
          variant={pendingGovernanceCount > 0 ? "warning" : "default"}
          isLoading={isLoadingRules}
        />
        <StatCard
          label="Affected Tenants"
          value={affectedTenantsData?.affectedTenantsCount ?? 0}
          description="Workspaces scoped to selected jurisdiction"
          icon={Building2}
          variant="info"
        />
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="registry" className="gap-2 text-xs">
            <Sliders className="size-3.5" />
            Rule Registry &amp; Precedence
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-2 text-xs">
            <Activity className="size-3.5" />
            Amendment Simulation
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 text-xs">
            <History className="size-3.5" />
            Immutable Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: REGISTRY VIEW */}
        <TabsContent value="registry" className="space-y-4">
          <Card className="p-4 border border-border/80 rounded-xl bg-card shadow-xs">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules by identifier, category, authority..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
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
                  <SelectTrigger className="w-[140px] h-9 text-xs">
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
                  <SelectTrigger className="w-[140px] h-9 text-xs">
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

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => refetchRules()}
                  disabled={isFetchingRules}
                  title="Refresh registry"
                >
                  <RefreshCw className={`size-3.5 ${isFetchingRules ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Rules Table */}
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pl-4">
                      Rule Identifier
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Type
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Jurisdiction
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Effective Range
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Version
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Status
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingRules ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
                        Loading statutory rule registry...
                      </td>
                    </tr>
                  ) : rulesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No statutory rules found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    rulesList.map((rule: any) => {
                      const statusLower = String(rule.publicationStatus || "").toLowerCase();
                      return (
                        <tr key={rule.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 pl-4 font-medium">
                            <div className="text-foreground">{rule.ruleIdentifier}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {rule.sourceAuthority || "Statutory Authority"}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline"className="tabular-nums text-[10px]">
                              {rule.ruleType}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-foreground">
                              {rule.stateCode === "ALL" ? "Central / National" : rule.stateCode}
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              {rule.jurisdictionLevel}
                            </span>
                          </td>
                          <td className="p-3">
                            <div>From: {new Date(rule.effectiveFrom).toLocaleDateString()}</div>
                            <div className="text-muted-foreground">
                              To: {rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleDateString() : "Indefinite"}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="tabular-nums font-medium">v{rule.version}</span>
                          </td>
                          <td className="p-3">{getStatusBadge(rule.publicationStatus)}</td>
                          <td className="p-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  setIsEditingRule(false);
                                  setViewingRuleId(rule.id);
                                }}
                              >
                                <Eye className="size-3" />
                                Inspect
                              </Button>

                              {statusLower === "draft" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => {
                                      setIsEditingRule(true);
                                      setViewingRuleId(rule.id);
                                    }}
                                  >
                                    <Pencil className="size-3" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => submitReviewMutation.mutate(rule.id)}
                                    disabled={submitReviewMutation.isPending}
                                    className="text-amber-700 border-amber-500/30 hover:bg-amber-500/10"
                                  >
                                    <Send className="size-3" />
                                    Submit
                                  </Button>
                                </>
                              )}

                              {statusLower === "under_review" && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => approveRuleMutation.mutate(rule.id)}
                                  disabled={approveRuleMutation.isPending}
                                  className="text-sky-700 border-sky-500/30 hover:bg-sky-500/10"
                                >
                                  <CheckCircle2 className="size-3" />
                                  Approve
                                </Button>
                              )}

                              {statusLower === "approved" && (
                                <Button
                                  variant="success"
                                  size="xs"
                                  onClick={() => publishRuleMutation.mutate(rule.id)}
                                  disabled={publishRuleMutation.isPending}
                                >
                                  <ShieldCheck className="size-3" />
                                  Publish
                                </Button>
                              )}

                              {statusLower === "published" && rule.previousVersionId && (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setRuleToRollback(rule)}
                                  className="text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                  <RotateCcw className="size-3" />
                                  Rollback
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: SIMULATION VIEW */}
        <TabsContent value="simulation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  Candidate Amendment Scenario
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure proposed statutory parameters to simulate gross-to-net payroll variance before approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label>Statutory Component</Label>
                  <Select
                    value={simForm.ruleType}
                    onValueChange={(val) => setSimForm({ ...simForm, ruleType: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
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
                    <SelectTrigger className="h-9 text-xs">
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
                    <SelectTrigger className="h-9 text-xs">
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
                  variant="primary"
                  onClick={handleRunSimulation}
                  disabled={runSimulationMutation.isPending}
                  className="w-full"
                >
                  {runSimulationMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {runSimulationMutation.isPending ? "Simulating..." : "Run Multi-Tier Impact Simulation"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/80 rounded-xl bg-card shadow-xs lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600" />
                    Gross-to-Net Variance Across Salary Brackets
                  </span>
                  {simResults && (
                    <Badge variant="success">
                      Evaluated {simResults.scenariosEvaluated} Scenarios
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Side-by-side comparison of active baseline statutory deductions versus proposed candidate parameters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!simResults ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <Scale className="size-10 text-muted-foreground/40 mb-3" />
                    <p className="font-medium text-foreground">No simulation run yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1">
                      Configure candidate statutory parameters and click &ldquo;Run Multi-Tier Impact Simulation&rdquo; to inspect variance across salary brackets.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-border/80 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border/80">
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            Salary Tier
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            Gross
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            EPF (Base -&gt; Prop)
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            ESI (Base -&gt; Prop)
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            PT / LWF
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            Net Pay Delta
                          </th>
                          <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                            Employer Cost Delta
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(simResults.results || []).map((r: any, idx: number) => {
                          const netDelta = r.variance?.netPay ?? 0;
                          const empDelta = r.variance?.employerTotalCostVariance ?? 0;
                          return (
                            <tr key={idx} className="hover:bg-muted/40 transition-colors">
                              <td className="p-3 font-sans font-medium text-foreground">{r.scenario}</td>
                              <td className="p-3">INR {Number(r.monthlyGross || 0).toLocaleString()}</td>
                              <td className="p-3">
                                <div>
                                  {r.baseline?.epfEmployee} -&gt; {r.proposed?.epfEmployee}
                                </div>
                                {r.variance?.epfEmployee !== 0 && (
                                  <span
                                    className={`text-[10px] ${
                                      r.variance.epfEmployee > 0 ? "text-rose-600" : "text-emerald-600"
                                    }`}
                                  >
                                    {r.variance.epfEmployee > 0
                                      ? `+${r.variance.epfEmployee}`
                                      : `-${Math.abs(r.variance.epfEmployee)}`}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div>
                                  {r.baseline?.esiEmployee} -&gt; {r.proposed?.esiEmployee}
                                </div>
                                {r.variance?.esiEmployee !== 0 && (
                                  <span
                                    className={`text-[10px] ${
                                      r.variance.esiEmployee > 0 ? "text-rose-600" : "text-emerald-600"
                                    }`}
                                  >
                                    {r.variance.esiEmployee > 0
                                      ? `+${r.variance.esiEmployee}`
                                      : `-${Math.abs(r.variance.esiEmployee)}`}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div>PT: {r.baseline?.pt}</div>
                                <div>LWF: {r.baseline?.lwfEmployee}</div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`font-semibold ${
                                    netDelta < 0
                                      ? "text-rose-600"
                                      : netDelta > 0
                                      ? "text-emerald-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {netDelta > 0
                                    ? `+${netDelta}`
                                    : netDelta < 0
                                    ? `-${Math.abs(netDelta)}`
                                    : "0.00"}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`font-semibold ${
                                    empDelta > 0
                                      ? "text-amber-600"
                                      : empDelta < 0
                                      ? "text-emerald-600"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {empDelta > 0
                                    ? `+${empDelta}`
                                    : empDelta < 0
                                    ? `-${Math.abs(empDelta)}`
                                    : "0.00"}
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
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="size-4 text-primary" />
                Immutable Statutory Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Non-repudiable governance history of every statutory rule draft, update, review, approval, publication, and rollback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAudit ? (
                <div className="py-10 text-center text-muted-foreground text-xs">
                  <Loader2 className="size-5 animate-spin text-primary mx-auto mb-2" />
                  Loading audit records...
                </div>
              ) : !auditTrailData?.logs?.length ? (
                <div className="py-10 text-center text-muted-foreground text-xs">
                  No statutory audit logs recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 border-l border-border space-y-5">
                  {auditTrailData.logs.map((log: any) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[31px] top-1 p-1 bg-background border border-border rounded-full text-primary">
                        <ShieldCheck className="size-3.5" />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline"className="tabular-nums text-[10px]">
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">
                            {log.rule?.ruleIdentifier || "Rule"} v{log.rule?.version || ""}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{log.notes || "No notes provided."}</p>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Actor: <span className="text-foreground">{log.actorEmail}</span> ({log.actorRole})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RULE DETAIL & EDIT DIALOG (GET/PUT /super/compliance/rules/:id) */}
      <Dialog
        open={Boolean(viewingRuleId)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingRuleId(null);
            setIsEditingRule(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6 text-base">
              <span className="flex items-center gap-2">
                <Scale className="size-5 text-primary" />
                {isEditingRule ? "Edit Statutory Draft" : "Statutory Rule Details"}:{" "}
                {viewingRule?.ruleIdentifier || "Loading..."}
              </span>
              {viewingRule && getStatusBadge(viewingRule.publicationStatus)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingRule
                ? `Version ${viewingRule.version} | ${viewingRule.stateCode === "ALL" ? "Central National" : viewingRule.stateCode} | ${viewingRule.jurisdictionLevel}`
                : "Retrieving authoritative rule record and version lineage..."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingRuleDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary mx-auto mb-2" />
              Fetching statutory rule details...
            </div>
          ) : viewingRule ? (
            <div className="space-y-4 text-xs">
              {isEditingRule && isDraftEditable ? (
                <div className="space-y-3.5">
                  <Alert variant="ghost-info" icon={<Pencil className="size-4" />}>
                    <span className="text-xs">
                      Editing DRAFT rule <strong>{viewingRule.ruleIdentifier}</strong> (v{viewingRule.version}). Changes are recorded in the immutable audit log.
                    </span>
                  </Alert>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Effective From</Label>
                      <Input
                        type="date"
                        value={editForm.effectiveFrom}
                        onChange={(e) => setEditForm({ ...editForm, effectiveFrom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Effective To (Optional)</Label>
                      <Input
                        type="date"
                        value={editForm.effectiveTo}
                        onChange={(e) => setEditForm({ ...editForm, effectiveTo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Source Authority</Label>
                      <Input
                        value={editForm.sourceAuthority}
                        onChange={(e) => setEditForm({ ...editForm, sourceAuthority: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Notification Reference</Label>
                      <Input
                        value={editForm.notificationRef}
                        onChange={(e) => setEditForm({ ...editForm, notificationRef: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Source URL</Label>
                    <Input
                      value={editForm.sourceUrl}
                      onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Rule Configuration JSON (configJson)</Label>
                    <Textarea
                      rows={8}
                      className="font-mono text-xs"
                      value={editForm.configJsonStr}
                      onChange={(e) => setEditForm({ ...editForm, configJsonStr: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Change Log &amp; Rationale</Label>
                    <Textarea
                      rows={2}
                      value={editForm.changeLog}
                      onChange={(e) => setEditForm({ ...editForm, changeLog: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 border border-border/60 rounded-lg">
                    <div>
                      <span className="text-muted-foreground">Rule Type</span>
                      <div className="font-semibold mt-0.5">{viewingRule.ruleType}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Financial Year</span>
                      <div className="font-medium mt-0.5">{viewingRule.financialYear || "N/A"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effective From</span>
                      <div className="font-medium mt-0.5">
                        {new Date(viewingRule.effectiveFrom).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effective To</span>
                      <div className="font-medium mt-0.5">
                        {viewingRule.effectiveTo
                          ? new Date(viewingRule.effectiveTo).toLocaleDateString()
                          : "Open-ended (Active)"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source Authority</span>
                      <div className="font-medium mt-0.5">
                        {viewingRule.sourceAuthority || "Not specified"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Notification Ref</span>
                      <div className="font-medium mt-0.5">
                        {viewingRule.notificationRef || "N/A"}
                      </div>
                    </div>
                    {viewingRule.sourceUrl && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Reference URL</span>
                        <div className="mt-0.5">
                          <a
                            href={viewingRule.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {viewingRule.sourceUrl}
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {previousVersion && (
                    <div className="p-3 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Supersedes Prior Version</span>
                        <span className="font-semibold text-foreground">
                          {previousVersion.ruleIdentifier} v{previousVersion.version}
                        </span>
                      </div>
                      {getStatusBadge(previousVersion.publicationStatus)}
                    </div>
                  )}

                  <div>
                    <Label className="text-xs font-semibold">JSON Configuration (configJson)</Label>
                    <pre className="mt-1.5 p-3 bg-slate-950 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-56">
                      {JSON.stringify(viewingRule.configJson, null, 2)}
                    </pre>
                  </div>

                  {viewingRule.changeLog && (
                    <div>
                      <Label className="text-xs font-semibold">Change Log &amp; Rationale</Label>
                      <p className="mt-1 p-2.5 bg-muted/30 border border-border/60 rounded-lg text-xs text-muted-foreground">
                        {viewingRule.changeLog}
                      </p>
                    </div>
                  )}

                  {viewingRuleAuditLogs.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">
                        Rule Audit History ({viewingRuleAuditLogs.length})
                      </Label>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {viewingRuleAuditLogs.map((log: any) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-muted/20 text-[11px]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline"className="tabular-nums text-[10px] shrink-0">
                                {log.action}
                              </Badge>
                              <span className="truncate text-muted-foreground">
                                {log.actorEmail} ({log.actorRole})
                              </span>
                            </div>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Rule details could not be loaded.
            </div>
          )}

          <DialogFooter className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              {viewingRule && !isEditingRule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSimulationWithRule(viewingRule)}
                >
                  <Play className="size-3.5" />
                  Simulate This Rule
                </Button>
              )}
              {isDraftEditable && !isEditingRule && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setIsEditingRule(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit Draft
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditingRule ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingRule(false)}
                    disabled={updateDraftMutation.isPending}
                  >
                    Cancel Edit
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveRuleEdit}
                    disabled={updateDraftMutation.isPending}
                  >
                    {updateDraftMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Draft Changes
                  </Button>
                </>
              ) : (
                <>
                  {viewingRule?.publicationStatus?.toLowerCase() === "draft" && (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => submitReviewMutation.mutate(viewingRule.id)}
                      disabled={submitReviewMutation.isPending}
                    >
                      <Send className="size-3.5" />
                      Submit for Review
                    </Button>
                  )}
                  {viewingRule?.publicationStatus?.toLowerCase() === "under_review" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => approveRuleMutation.mutate(viewingRule.id)}
                      disabled={approveRuleMutation.isPending}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve Rule
                    </Button>
                  )}
                  {viewingRule?.publicationStatus?.toLowerCase() === "approved" && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => publishRuleMutation.mutate(viewingRule.id)}
                      disabled={publishRuleMutation.isPending}
                    >
                      <ShieldCheck className="size-3.5" />
                      Publish &amp; Activate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewingRuleId(null);
                      setIsEditingRule(false);
                    }}
                  >
                    Close
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE DRAFT MODAL */}
      <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="size-5 text-primary" />
              Create Versioned Statutory Rule Draft
            </DialogTitle>
            <DialogDescription className="text-xs">
              New statutory configurations start in DRAFT status and pass maker-checker compliance review before publication.
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
                  <SelectTrigger className="h-9 text-xs">
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
                  <SelectTrigger className="h-9 text-xs">
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
                  <SelectTrigger className="h-9 text-xs">
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
              <Label>Source Authority &amp; Gazetted Notification</Label>
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
            <Button variant="outline" size="sm" onClick={() => setIsDraftModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateDraft}
              disabled={createDraftMutation.isPending || !draftForm.ruleIdentifier.trim()}
            >
              {createDraftMutation.isPending ? "Creating Draft..." : "Save Statutory Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ROLLBACK CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={Boolean(ruleToRollback)}
        onOpenChange={(open) => {
          if (!open && !rollbackMutation.isPending) setRuleToRollback(null);
        }}
        title="Confirm Statutory Rule Rollback"
        description={
          ruleToRollback ? (
            <>
              This will deactivate <strong className="text-foreground">{ruleToRollback.ruleIdentifier} v{ruleToRollback.version}</strong> and restore the prior approved version.
            </>
          ) : undefined
        }
        confirmLabel={rollbackMutation.isPending ? "Rolling Back..." : "Confirm Rollback"}
        variant="destructive"
        icon={<RotateCcw className="size-5" />}
        isLoading={rollbackMutation.isPending}
        onConfirm={() => {
          if (ruleToRollback?.id && ruleToRollback?.previousVersionId) {
            rollbackMutation.mutate({
              ruleId: ruleToRollback.id,
              targetVersionId: ruleToRollback.previousVersionId,
            });
          }
        }}
      >
        <p className="text-muted-foreground">
          Historical finalized payslips will not be altered. Only future payroll calculations will resolve the restored rule version.
        </p>
      </ConfirmationDialog>
    </div>
  );
}

export default SuperAdminComplianceControlCenter;

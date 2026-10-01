import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

interface FbpWorkspaceProps {
  isHR: boolean;
  financialYear?: string;
}

export function FbpWorkspace({ isHR, financialYear = "2026-2027" }: FbpWorkspaceProps) {
  const queryClient = useQueryClient();

  // 1. Fetch Window Status (PO-DEC-04)
  const { data: windowStatus, isLoading: isWindowLoading } = useQuery({
    queryKey: ["fbp-window-status"],
    queryFn: async () => {
      const res: any = await api.get("/fbp/window-status");
      return res;
    },
  });

  // 2. Fetch Components & Caps
  const { data: componentsData } = useQuery({
    queryKey: ["fbp-components"],
    queryFn: async () => {
      const res: any = await api.get("/fbp/components");
      return res.components || [];
    },
  });

  // 3. Fetch My Declaration
  const { data: myDeclData, isLoading: isDeclLoading } = useQuery({
    queryKey: ["fbp-my-declaration", financialYear],
    queryFn: async () => {
      const res: any = await api.get(`/fbp/my-declaration?financialYear=${financialYear}`);
      return res;
    },
  });

  // 4. Fetch Admin Declarations (if HR)
  const { data: adminDeclsData } = useQuery({
    queryKey: ["fbp-admin-declarations", financialYear],
    queryFn: async () => {
      const res: any = await api.get(`/fbp/admin/declarations?financialYear=${financialYear}`);
      return res.declarations || [];
    },
    enabled: isHR,
  });

  const components = componentsData || [];
  const allocatedPool = myDeclData?.allocatedFbpAnnualPool || 60000;
  const existingDeclaration = myDeclData?.declaration;

  // Local state for basket allocations
  const [declaredAmounts, setDeclaredAmounts] = useState<Record<string, number>>({});

  // Initialize local state when declaration loads
  React.useEffect(() => {
    if (existingDeclaration?.items) {
      const map: Record<string, number> = {};
      existingDeclaration.items.forEach((item: any) => {
        map[item.componentCode] = Number(item.monthlyDeclared || 0);
      });
      setDeclaredAmounts(map);
    } else if (components.length > 0) {
      // Default initial allocations
      setDeclaredAmounts({
        FUEL: 2000,
        TEL: 1500,
        MEAL: 1500,
      });
    }
  }, [existingDeclaration, components]);

  const handleAmountChange = (code: string, val: number) => {
    setDeclaredAmounts((prev) => ({
      ...prev,
      [code]: Math.max(0, val),
    }));
  };

  // Calculations
  const totalMonthlyDeclared = Object.values(declaredAmounts).reduce((sum, v) => sum + (v || 0), 0);
  const totalAnnualDeclared = totalMonthlyDeclared * 12;
  const poolBalance = allocatedPool - totalAnnualDeclared;
  const isOverPool = totalAnnualDeclared > allocatedPool;

  // Save / Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async (submitImmediately: boolean) => {
      const items = Object.entries(declaredAmounts)
        .filter(([_, monthly]) => monthly > 0)
        .map(([componentCode, monthlyDeclared]) => ({
          componentCode,
          monthlyDeclared,
        }));

      return api.post("/fbp/declarations", {
        financialYear,
        items,
        submitImmediately,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "FBP declaration saved!");
      queryClient.invalidateQueries({ queryKey: ["fbp-my-declaration"] });
      queryClient.invalidateQueries({ queryKey: ["fbp-admin-declarations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save declaration");
    },
  });

  // HR Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (declarationId: string) => {
      return api.patch(`/fbp/admin/declarations/${declarationId}/approve`, {});
    },
    onSuccess: () => {
      toast.success("FBP declaration approved!");
      queryClient.invalidateQueries({ queryKey: ["fbp-admin-declarations"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve declaration");
    },
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Window Status (PO-DEC-04) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-xs shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Flexible Benefit Plan (FBP) Workspace</h2>
            <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary">
              FY {financialYear}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Allocate tax-exempt monthly benefits within your corporate salary pool pursuant to PO-DEC-04.
          </p>
        </div>

        {/* Window Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              windowStatus?.isOpen
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
            }`}
          >
            {windowStatus?.isOpen ? <Clock className="size-3.5" /> : <Lock className="size-3.5" />}
            <div>
              <span>{windowStatus?.windowLabel || "Checking Window..."}</span>
              {windowStatus?.isOpen && (
                <span className="ml-1.5 text-[10px] opacity-80">
                  ({windowStatus.daysRemaining} days remaining)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Employee Declaration Basket & Pool Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pool Summary Card */}
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Annual FBP Pool</span>
              <Sparkles className="size-3.5 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black font-mono text-foreground">
              ₹{allocatedPool.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Total Declared:</span>
              <span className={`font-mono font-bold ${isOverPool ? "text-rose-500" : "text-foreground"}`}>
                ₹{totalAnnualDeclared.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Remaining Balance:</span>
              <span
                className={`font-mono font-bold ${
                  poolBalance < 0 ? "text-rose-500" : poolBalance === 0 ? "text-emerald-600" : "text-primary"
                }`}
              >
                ₹{poolBalance.toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Declaration Status</span>
              <ShieldCheck className="size-3.5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-bold uppercase ${
                  existingDeclaration?.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : existingDeclaration?.status === "submitted"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                }`}
              >
                {existingDeclaration?.status || "Draft / Unsubmitted"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {existingDeclaration?.status === "approved"
                ? `Approved by HR Admin (${existingDeclaration.approvedBy || "HR"})`
                : existingDeclaration?.status === "submitted"
                ? "Submitted to HR for compliance audit and salary injection."
                : "Configure your monthly flexible allowances below and submit."}
            </p>
          </CardContent>
        </Card>

        {/* Window Notice Card */}
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Window Governance</span>
              <Calendar className="size-3.5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong>Annual Projections:</strong> April 1 – April 30.
              <br />
              <strong>Final Proof Window:</strong> December 15 – January 31.
              <br />
              <strong>New Joiners:</strong> 30-day grace from DOJ.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Component Basket Allocation Grid */}
      <Card className="border shadow-2xs bg-card">
        <CardHeader className="p-4 pb-3 border-b">
          <CardTitle className="text-sm font-bold text-foreground">Benefit Component Basket Allocation</CardTitle>
          <CardDescription className="text-xs">
            Declare your monthly entitlement for each flexible allowance. Each item is audited against policy ceilings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {components.map((comp: any) => {
              const currentMonthly = declaredAmounts[comp.code] || 0;
              const currentAnnual = currentMonthly * 12;
              const isOverCap = currentMonthly > comp.monthlyMaxCap;

              return (
                <div
                  key={comp.code}
                  className="p-3.5 rounded-lg border bg-muted/20 space-y-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-foreground">{comp.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Code: {comp.code} &bull; Max Cap: ₹{comp.monthlyMaxCap.toLocaleString("en-IN")}/mo
                      </div>
                    </div>
                    {comp.requiresProof ? (
                      <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                        Proof Req.
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] uppercase font-bold text-emerald-600">
                        Voucher / Non-Tax
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1">{comp.description}</p>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Monthly Amount (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={comp.monthlyMaxCap}
                        step={100}
                        value={currentMonthly}
                        onChange={(e) => handleAmountChange(comp.code, Number(e.target.value))}
                        disabled={existingDeclaration?.status === "locked"}
                        className={`h-8 text-xs font-mono font-bold ${
                          isOverCap ? "border-rose-500 text-rose-500" : ""
                        }`}
                      />
                    </div>
                    <div className="text-right">
                      <Label className="text-[10px] font-semibold text-muted-foreground">Annual Declared</Label>
                      <div className="font-mono text-xs font-bold text-foreground">
                        ₹{currentAnnual.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Total Annual Declared:{" "}
              <strong className={`font-mono text-sm ${isOverPool ? "text-rose-500" : "text-foreground"}`}>
                ₹{totalAnnualDeclared.toLocaleString("en-IN")}
              </strong>{" "}
              / ₹{allocatedPool.toLocaleString("en-IN")}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending || existingDeclaration?.status === "locked"}
                className="h-8 text-xs font-bold"
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate(true)}
                disabled={
                  saveMutation.isPending ||
                  isOverPool ||
                  existingDeclaration?.status === "locked" ||
                  totalAnnualDeclared === 0
                }
                className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <CheckCircle2 className="size-3.5" /> Submit FBP Declaration
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. HR Admin Verification Table (Visible only to HR/Admin) */}
      {isHR && (
        <Card className="border shadow-2xs bg-card">
          <CardHeader className="p-4 pb-3 border-b">
            <CardTitle className="text-sm font-bold text-foreground">
              HR Administration: Employee FBP Declarations
            </CardTitle>
            <CardDescription className="text-xs">
              Review and approve employee flexible benefit packages for payroll injection.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="font-bold py-2.5">Employee</TableHead>
                  <TableHead className="font-bold">Total Annual FBP</TableHead>
                  <TableHead className="font-bold">Allocated Components</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!adminDeclsData || adminDeclsData.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs italic">
                      No employee FBP declarations submitted for FY {financialYear}.
                    </TableCell>
                  </TableRow>
                ) : (
                  adminDeclsData.map((decl: any) => (
                    <TableRow key={decl.id} className="text-xs hover:bg-muted/20">
                      <TableCell>
                        <div className="font-bold text-foreground">
                          {decl.employee?.firstName} {decl.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {decl.employee?.employeeCode} &bull; {decl.employee?.designation || "Staff"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-foreground">
                        ₹{Number(decl.totalFbpAnnual || 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {decl.items?.map((it: any) => (
                            <Badge key={it.id} variant="secondary" className="text-[10px] font-mono">
                              {it.componentCode}: ₹{Number(it.monthlyDeclared || 0)}/mo
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            decl.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : decl.status === "submitted"
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {decl.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {decl.status === "submitted" && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(decl.id)}
                            disabled={approveMutation.isPending}
                            className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve FBP
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

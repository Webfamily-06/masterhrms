"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0);

const formatDateISO = (raw?: string | null) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const capitalize = (val?: string | null) =>
  val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : "—";

export default function HrAssetDetailsPage() {
  const params = useParams();
  const assetId = String(params?.id || "");
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "assignments" | "maintenance" | "depreciation" | "documents"
  >("assignments");

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: "",
    checkoutDate: todayISO(),
    expectedReturnDate: "",
    checkoutCondition: "good",
    notes: "",
  });

  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnForm, setReturnForm] = useState({
    checkInDate: todayISO(),
    checkInCondition: "good",
    notes: "",
  });

  const [isMaintOpen, setIsMaintOpen] = useState(false);
  const [maintForm, setMaintForm] = useState({
    maintenanceType: "preventive",
    startDate: todayISO(),
    endDate: "",
    cost: "",
    details: "",
    supplier: "",
  });

  const { data: asset, isLoading } = useQuery<any>({
    queryKey: ["hr-asset-detail", assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      const res = await api.get(`/hr/assets/${assetId}`);
      return res?.data ?? res;
    },
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["hr-employees-dropdown"],
    queryFn: async () => {
      const res = await api.get("/employees", { params: { limit: 200 } });
      const raw = res?.employees ?? res?.data?.employees ?? res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hr-asset-detail", assetId] });
    queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
    queryClient.invalidateQueries({ queryKey: ["hr-asset-depreciation-report"] });
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${assetId}/assign`, {
        employeeId: assignForm.employeeId,
        checkoutDate: assignForm.checkoutDate,
        expectedReturnDate: assignForm.expectedReturnDate || null,
        checkoutCondition: assignForm.checkoutCondition,
        notes: assignForm.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Asset assigned successfully");
      setIsAssignOpen(false);
      refresh();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to assign asset"),
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${assetId}/return`, {
        checkInDate: returnForm.checkInDate,
        checkInCondition: returnForm.checkInCondition,
        notes: returnForm.notes.trim(),
      }),
    onSuccess: () => {
      toast.success("Asset returned successfully");
      setIsReturnOpen(false);
      refresh();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to return asset"),
  });

  const maintMutation = useMutation({
    mutationFn: () =>
      api.post(`/hr/assets/${assetId}/maintenance`, {
        maintenanceType: maintForm.maintenanceType,
        startDate: maintForm.startDate,
        endDate: maintForm.endDate || null,
        cost: Number(maintForm.cost) || 0,
        details: maintForm.details.trim(),
        supplier: maintForm.supplier.trim(),
      }),
    onSuccess: () => {
      toast.success("Maintenance scheduled");
      setIsMaintOpen(false);
      refresh();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to schedule maintenance"),
  });

  const completeMaintMutation = useMutation({
    mutationFn: (logId: string) =>
      api.patch(`/hr/assets/maintenance/${logId}/complete`, {
        resolutionDetails: "Maintenance completed",
      }),
    onSuccess: () => {
      toast.success("Maintenance marked as completed");
      refresh();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to complete maintenance"),
  });

  if (isLoading) {
    return (
      <div className="w-full px-4 py-16 text-center text-muted-foreground">
        <i className="ph ph-spinner-gap animate-spin text-2xl mr-2 align-middle" />
        Loading asset details...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="w-full px-4 py-16 text-center space-y-3">
        <p className="text-muted-foreground">Asset not found.</p>
        <Link href="/hr/assets">
          <Button variant="outline">Back to Assets</Button>
        </Link>
      </div>
    );
  }

  const dep = asset.depreciation ?? {
    methodLabel: "Straight Line",
    purchaseCost: Number(asset.purchasePrice || 0),
    salvageValue: Number(asset.salvageValue || 0),
    depreciableAmount: Math.max(0, Number(asset.purchasePrice || 0) - Number(asset.salvageValue || 0)),
    usefulLifeMonths: Number(asset.usefulLifeMonths || 60),
    usefulLifeYears: Math.round((Number(asset.usefulLifeMonths || 60) / 12) * 10) / 10,
    annualDepreciation: 0,
    monthlyDepreciation: 0,
    accumulatedDepreciation: 0,
    currentValue: Number(asset.purchasePrice || 0),
    depreciationPercent: 0,
    lifeConsumedPercent: 0,
  };

  const assignments = Array.isArray(asset.assignments) ? asset.assignments : [];
  const maintenanceLogs = Array.isArray(asset.maintenanceLogs) ? asset.maintenanceLogs : [];
  const documents = Array.isArray(asset.documents) ? asset.documents : [];

  const statusTone =
    asset.status === "available"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : asset.status === "assigned"
      ? "bg-sky-500/10 text-sky-700 border-sky-500/20"
      : asset.status === "maintenance"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : "bg-rose-500/10 text-rose-700 border-rose-500/20";

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 lg:py-5 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Asset Details</h1>
          <p className="text-sm text-muted-foreground">
            Full specs, current assignment, maintenance logs, and financial depreciation.
          </p>
        </div>
        <Link href="/hr/assets">
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <i className="ph ph-arrow-left text-base" />
            <span>Back</span>
          </Button>
        </Link>
      </div>

      {/* Hero Asset Specs Card */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Image + Status/Condition Badges */}
          <div className="lg:col-span-3 flex flex-col items-center gap-3">
            <div className="w-full max-w-[240px] aspect-square rounded-xl border border-border/80 bg-muted/20 overflow-hidden flex items-center justify-center p-3">
              {asset.imageUrl ? (
                <img
                  src={asset.imageUrl}
                  alt={asset.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <i className="ph ph-cube text-5xl text-muted-foreground/50" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusTone}`}
              >
                {capitalize(asset.status)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-sky-500/10 text-sky-700 border-sky-500/20">
                {capitalize(asset.condition)}
              </span>
            </div>
          </div>

          {/* Right Details */}
          <div className="lg:col-span-9 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{asset.name}</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/80 bg-muted/40 text-xs font-semibold text-foreground">
                    {asset.assetTag}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <i className="ph ph-shapes text-sm" />
                    <span>{asset.categoryRel?.name || asset.category || "General"}</span>
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <i className="ph ph-map-pin text-sm" />
                    <span>{asset.location || "Main Office"}</span>
                  </span>
                </div>
              </div>

              <div className="sm:text-right">
                <div className="text-xs text-muted-foreground">Original Cost</div>
                <div className="text-xl font-bold text-foreground">
                  {formatINR(dep.purchaseCost)}
                </div>
              </div>
            </div>

            {/* 6 Spec Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-hash text-xs" />
                  <span>Serial Number</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1 truncate">
                  {asset.serialNumber || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-calendar-blank text-xs" />
                  <span>Purchase Date</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {formatDateISO(asset.purchaseDate)}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-shield-check text-xs" />
                  <span>Warranty</span>
                </div>
                <div className="text-sm font-semibold text-emerald-600 mt-1">
                  {formatDateISO(asset.warrantyExpiry)}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-clock text-xs" />
                  <span>Useful Life</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {dep.usefulLifeMonths} Months
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-currency-inr text-xs" />
                  <span>Salvage Value</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {formatINR(dep.salvageValue)}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-background/60 p-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="ph ph-trend-down text-xs" />
                  <span>Depreciation Method</span>
                </div>
                <div className="text-sm font-semibold text-foreground mt-1 truncate">
                  {dep.methodLabel}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-border/70 pt-3">
              <div className="text-xs font-semibold text-foreground">Notes:</div>
              <p className="text-xs text-muted-foreground mt-1">
                {asset.notes || "No additional notes recorded for this asset."}
              </p>
              {asset.warrantyInfo && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">Warranty Info:</span>{" "}
                  {asset.warrantyInfo}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 8 Cols: Tabs + Tab Content */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tab Pills Bar */}
          <div className="rounded-xl border border-border/80 bg-card p-1.5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: "assignments", label: "Assignments", icon: "ph-user" },
              { id: "maintenance", label: "Maintenance", icon: "ph-wrench" },
              { id: "depreciation", label: "Depreciation", icon: "ph-trend-down" },
              { id: "documents", label: "Documents", icon: "ph-file-text" },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <i className={`ph ${t.icon} text-base`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Assignments */}
          {activeTab === "assignments" && (
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border/70">
                <h3 className="text-base font-bold text-foreground">Assignment History</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete history of users who have been assigned this asset.
                </p>
              </div>
              <div className="p-5">
                {assignments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <i className="ph ph-user text-3xl block mx-auto mb-2 opacity-50" />
                    No assignment history recorded
                  </div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {assignments.map((a: any) => (
                      <div
                        key={a.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-foreground text-sm">
                            {a.employee
                              ? `${a.employee.firstName} ${a.employee.lastName}`
                              : "Employee"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Checked out: {formatDateISO(a.assignedAt)}
                            {a.expectedReturnDate
                              ? ` • Expected return: ${formatDateISO(a.expectedReturnDate)}`
                              : ""}
                            {a.returnedAt ? ` • Returned: ${formatDateISO(a.returnedAt)}` : ""}
                          </div>
                          {a.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border self-start sm:self-center ${
                            a.status === "active"
                              ? "bg-sky-500/10 text-sky-700 border-sky-500/20"
                              : "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                          }`}
                        >
                          {capitalize(a.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Maintenance */}
          {activeTab === "maintenance" && (
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Maintenance History</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Service logs, repairs, and scheduled maintenance records.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsMaintOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <i className="ph ph-plus text-base" />
                  <span>Schedule Maintenance</span>
                </Button>
              </div>
              <div className="p-5">
                {maintenanceLogs.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <i className="ph ph-wrench text-3xl block mx-auto mb-2 opacity-50" />
                    No maintenance logs recorded
                  </div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {maintenanceLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {capitalize(log.serviceType)} Maintenance
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              • {formatINR(Number(log.cost || 0))}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.issueDescription}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            Start: {formatDateISO(log.serviceDate)}
                            {log.nextServiceDate
                              ? ` • End: ${formatDateISO(log.nextServiceDate)}`
                              : ""}
                            {log.vendor ? ` • Supplier: ${log.vendor}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              log.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20"
                            }`}
                          >
                            {log.status === "completed" ? "Completed" : "In Progress"}
                          </span>
                          {log.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={completeMaintMutation.isPending}
                              onClick={() => completeMaintMutation.mutate(log.id)}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Depreciation Analytics */}
          {activeTab === "depreciation" && (
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border/70">
                <h3 className="text-base font-bold text-foreground">Depreciation Analytics</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estimated asset valuation over time.
                </p>
              </div>
              <div className="p-5 space-y-5">
                {/* Summary Strip */}
                <div className="rounded-xl border border-border/80 bg-background/60 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Depreciation Method</div>
                    <div className="text-sm font-bold text-foreground mt-1">{dep.methodLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Current Value</div>
                    <div className="text-sm font-bold text-emerald-600 mt-1">
                      {formatINR(dep.currentValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Salvage Value</div>
                    <div className="text-sm font-bold text-foreground mt-1">
                      {formatINR(dep.salvageValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Depreciated</div>
                    <div className="text-sm font-bold text-rose-600 mt-1">
                      {dep.depreciationPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Asset Life Consumed</span>
                    <span className="font-semibold text-foreground">
                      {dep.lifeConsumedPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, dep.lifeConsumedPercent))}%` }}
                    />
                  </div>
                </div>

                {/* 6 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Original Purchase Cost</span>
                      <i className="ph ph-currency-inr text-sm" />
                    </div>
                    <div className="text-base font-bold text-foreground mt-2">
                      {formatINR(dep.purchaseCost)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Total Depreciable Amount</span>
                      <i className="ph ph-trend-down text-sm" />
                    </div>
                    <div className="text-base font-bold text-foreground mt-2">
                      {formatINR(dep.depreciableAmount)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Useful Life Expectancy</span>
                      <i className="ph ph-clock text-sm" />
                    </div>
                    <div className="text-base font-bold text-foreground mt-2">
                      {dep.usefulLifeMonths} Months{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({dep.usefulLifeYears} Years)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Annual Depreciation</span>
                      <i className="ph ph-calendar text-sm" />
                    </div>
                    <div className="text-base font-bold text-foreground mt-2">
                      {formatINR(dep.annualDepreciation)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Monthly Depreciation</span>
                      <i className="ph ph-trend-down text-sm" />
                    </div>
                    <div className="text-base font-bold text-foreground mt-2">
                      {formatINR(dep.monthlyDepreciation)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Accumulated Depreciation</span>
                      <i className="ph ph-shield-warning text-sm" />
                    </div>
                    <div className="text-base font-bold text-rose-600 mt-2">
                      {formatINR(dep.accumulatedDepreciation)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Documents */}
          {activeTab === "documents" && (
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-5 border-b border-border/70">
                <h3 className="text-base font-bold text-foreground">Asset Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invoices, warranty certificates, and user manuals attached to this asset.
                </p>
              </div>
              <div className="p-5">
                {documents.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">
                    <i className="ph ph-file-text text-3xl block mx-auto mb-2 opacity-50" />
                    No documents uploaded for this asset
                  </div>
                ) : (
                  <div className="divide-y divide-border/70">
                    {documents.map((doc: any, idx: number) => (
                      <div
                        key={`${doc.name}-${idx}`}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <i className="ph ph-file-pdf text-xl text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </span>
                        </div>
                        <a
                          href={doc.url}
                          download={doc.name}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                        >
                          <i className="ph ph-download-simple text-sm" />
                          <span>Download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Cols: Quick Assign / Return Card */}
        <div className="lg:col-span-4">
          <div className="rounded-xl border border-emerald-500/30 bg-card shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <i className="ph ph-user-plus text-base" />
              <span>
                {asset.status === "assigned" ? "Current Assignment" : "Quick Assign Asset"}
              </span>
            </div>
            <div className="p-5 space-y-4 text-center">
              {asset.status === "assigned" && asset.assignedEmployee ? (
                <>
                  <div className="text-sm font-semibold text-foreground">
                    {asset.assignedEmployee.firstName} {asset.assignedEmployee.lastName}
                  </div>
                  {asset.assignedEmployee.email && (
                    <div className="text-xs text-muted-foreground">
                      {asset.assignedEmployee.email}
                    </div>
                  )}
                  <Button
                    onClick={() => setIsReturnOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <i className="ph ph-arrow-u-down-left text-base" />
                    <span>Return Asset</span>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This asset is currently available for checkout. Click below to quickly assign it
                    to an employee.
                  </p>
                  <Button
                    onClick={() => setIsAssignOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    <i className="ph ph-user-plus text-base" />
                    <span>Assign Asset</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Asset Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>Assign {asset.name} to an employee.</DialogDescription>
          </DialogHeader>
          <form
            id="detail-assign-form"
            onSubmit={(e) => {
              e.preventDefault();
              assignMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assignForm.employeeId}
                onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Checkout Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assignForm.checkoutDate}
                onChange={(e) => setAssignForm({ ...assignForm, checkoutDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Expected Return Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={assignForm.expectedReturnDate}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Checkout Condition <span className="text-rose-500">*</span>
              </Label>
              <select
                value={assignForm.checkoutCondition}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, checkoutCondition: e.target.value })
                }
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                placeholder="e.g. Assigned for project use until end of quarter..."
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="detail-assign-form"
              disabled={assignMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {assignMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Asset Modal */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Asset</DialogTitle>
            <DialogDescription>Check in {asset.name}.</DialogDescription>
          </DialogHeader>
          <form
            id="detail-return-form"
            onSubmit={(e) => {
              e.preventDefault();
              returnMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Check-in Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={returnForm.checkInDate}
                onChange={(e) => setReturnForm({ ...returnForm, checkInDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Check-in Condition <span className="text-rose-500">*</span>
              </Label>
              <select
                value={returnForm.checkInCondition}
                onChange={(e) =>
                  setReturnForm({ ...returnForm, checkInCondition: e.target.value })
                }
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReturnOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="detail-return-form"
              disabled={returnMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {returnMutation.isPending ? "Returning..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Maintenance Modal */}
      <Dialog open={isMaintOpen} onOpenChange={setIsMaintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>Schedule maintenance for {asset.name}.</DialogDescription>
          </DialogHeader>
          <form
            id="detail-maint-form"
            onSubmit={(e) => {
              e.preventDefault();
              maintMutation.mutate();
            }}
            className="space-y-4 py-1"
          >
            <div className="space-y-1.5">
              <Label>
                Maintenance Type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={maintForm.maintenanceType}
                onChange={(e) => setMaintForm({ ...maintForm, maintenanceType: e.target.value })}
                required
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective / Repair</option>
                <option value="upgrade">Upgrade</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={maintForm.startDate}
                  onChange={(e) => setMaintForm({ ...maintForm, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={maintForm.endDate}
                  onChange={(e) => setMaintForm({ ...maintForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cost (INR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={maintForm.cost}
                onChange={(e) => setMaintForm({ ...maintForm, cost: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input
                value={maintForm.supplier}
                onChange={(e) => setMaintForm({ ...maintForm, supplier: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Details *</Label>
              <Textarea
                rows={3}
                value={maintForm.details}
                onChange={(e) => setMaintForm({ ...maintForm, details: e.target.value })}
                required
              />
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMaintOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="detail-maint-form"
              disabled={maintMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {maintMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

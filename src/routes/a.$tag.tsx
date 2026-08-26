import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HardDrive,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Printer,
  ShieldCheck,
  Calendar,
  User,
  Building2,
  Tag,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/a/$tag")({
  component: PublicQrAssetPage,
  head: () => ({ meta: [{ title: "Asset Handover & Specs Sheet" }] }),
});

export function PublicQrAssetPage() {
  const { tag } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-asset-qr", tag],
    queryFn: async () => {
      const res = await api.get(`/addons/assets/public/tag/${tag}`);
      return res?.asset || null;
    },
  });

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Asset URL copied to clipboard!");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Scanning asset database for tag: {tag}...</p>
        </div>
      </div>
    );
  }

  if (!data || error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4 border-dashed">
          <AlertTriangle className="size-10 text-amber-500 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">Asset Not Found</h1>
            <p className="text-xs text-muted-foreground">
              No registered equipment matches tag <span className="font-mono font-bold text-foreground">"{tag}"</span>.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const asset = data;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Actions bar */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary grid place-items-center font-bold">
              {asset.categoryRel?.icon || "💻"}
            </div>
            <span className="text-xs font-mono font-bold text-foreground">
              Master Workspace HRMS · Asset Passport
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleShare} className="h-8 text-xs gap-1.5 shadow-2xs">
              <Share2 className="size-3.5" />
              <span>Share</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs gap-1.5 font-bold shadow-2xs">
              <Printer className="size-3.5" />
              <span>Print Handover Sheet</span>
            </Button>
          </div>
        </div>

        {/* Passport Card */}
        <Card className="p-6 border shadow-sm bg-card space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-bold text-primary border-primary/30">
                  {asset.assetTag}
                </Badge>
                <Badge
                  className={`text-[10px] uppercase font-bold ${
                    asset.status === "available"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : asset.status === "assigned"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {asset.status}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground">{asset.name}</h1>
              <p className="text-xs text-muted-foreground">
                {asset.brand} · {asset.model || "Standard Model"} · Category: <span className="capitalize">{asset.category}</span>
              </p>
            </div>

            {/* QR Mock code box */}
            <div className="p-2.5 rounded-xl border bg-muted/30 text-center shrink-0 w-28 space-y-1">
              <div className="size-16 mx-auto bg-foreground text-background grid place-items-center rounded-lg font-mono text-[10px] font-bold">
                [ QR CODE ]
              </div>
              <span className="text-[9px] font-mono text-muted-foreground block truncate">
                {asset.assetTag}
              </span>
            </div>
          </div>

          {/* Specs & Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Serial Number</span>
              <span className="font-mono font-bold text-foreground block truncate">
                {asset.serialNumber || "Batch Item"}
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Quantity / Unit</span>
              <span className="font-mono font-bold text-foreground block">
                {asset.availableQuantity} / {asset.totalQuantity} {asset.unit}
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Physical Condition</span>
              <span className="capitalize font-bold text-emerald-600 block">
                {asset.condition}
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Storage Location</span>
              <span className="font-medium text-foreground block truncate">
                {asset.location || "Main Storage"}
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Warranty Expiry</span>
              <span className="font-mono text-foreground block">
                {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-xl border bg-muted/10 space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase">Vendor / Supplier</span>
              <span className="font-medium text-foreground block truncate">
                {asset.vendor || "Enterprise Direct"}
              </span>
            </div>
          </div>

          {/* Current Custodian / Assignment Details */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Custodian & Handover Info
            </h3>

            {asset.assignedEmployee ? (
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 font-bold grid place-items-center shrink-0">
                    {asset.assignedEmployee.firstName[0]}
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">
                      {asset.assignedEmployee.firstName} {asset.assignedEmployee.lastName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {asset.assignedEmployee.position || "Staff"} · {asset.assignedEmployee.department?.name || "General"}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-muted-foreground">
                  <span>Assigned: {asset.assignedAt ? new Date(asset.assignedAt).toLocaleDateString() : "Active"}</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border bg-muted/20 text-center text-xs text-muted-foreground">
                This asset is currently in company inventory stock.
              </div>
            )}
          </div>

          {/* Printable Handover Sign-off Box */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Handover Authorization & Sign-off
            </h3>

            <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
              <div className="border-t border-dashed pt-2 space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                  Issued By (IT Asset Custodian)
                </span>
                <span className="text-xs font-semibold text-foreground">Signature & Date: _________________</span>
              </div>

              <div className="border-t border-dashed pt-2 space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                  Received By (Employee / Dept Rep)
                </span>
                <span className="text-xs font-semibold text-foreground">Signature & Date: _________________</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

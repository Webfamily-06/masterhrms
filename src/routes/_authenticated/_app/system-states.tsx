import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  EmptyState,
  NoSearchResults,
  LoadingState,
  ErrorState,
  SuccessState,
} from "@/components/system-states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Layers,
  FileQuestion,
  ShieldAlert,
  ServerCrash,
  Wrench,
  WifiOff,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/system-states")({
  component: SystemStatesShowcase,
  head: () => ({
    meta: [{ title: "System States & Error Pages Directory — Master ERP" }],
  }),
});

function SystemStatesShowcase() {
  const [activeTab, setActiveTab] = useState("components");
  const [loadingVariant, setLoadingVariant] = useState<"table" | "cards" | "stats" | "spinner">("table");
  const [showFullscreenLoader, setShowFullscreenLoader] = useState(false);

  function triggerSimulatedSessionExpired() {
    window.dispatchEvent(
      new CustomEvent("auth:session-expired", {
        detail: { path: window.location.pathname, message: "Token expired after 30 minutes of inactivity." },
      })
    );
  }

  function triggerSimulatedOffline() {
    window.dispatchEvent(new Event("offline"));
  }

  function triggerSimulatedOnline() {
    window.dispatchEvent(new Event("online"));
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {showFullscreenLoader && (
        <LoadingState
          variant="fullscreen"
          message="Simulating enterprise ERP full-page loader..."
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Enterprise System States & Error Workflow
            </h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-bold">
              UX Guidelines & Compliance
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete directory of all structural HTTP status pages, boundary views, and lifecycle indication components.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={triggerSimulatedSessionExpired}
            className="text-xs font-semibold gap-1.5"
          >
            <Clock className="size-3.5 text-amber-500" /> Test Session Timeout
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowFullscreenLoader(true);
              setTimeout(() => setShowFullscreenLoader(false), 2000);
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="size-3.5 text-primary" /> Fullscreen Loader
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:w-[400px]">
          <TabsTrigger value="components">UI State Components (5)</TabsTrigger>
          <TabsTrigger value="pages">System Status Pages (6)</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: UI STATE COMPONENTS ── */}
        <TabsContent value="components" className="space-y-6">
          {/* 1. Empty State */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="size-4 text-primary" /> Empty State (Zero Data)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rendered when a module table or directory contains no database records.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  &lt;EmptyState /&gt;
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Package}
                title="No Products in Inventory"
                description="Your product catalog is currently empty. Add your first item to begin tracking stock and generating SKUs."
                actionLabel="Create Product"
                onAction={() => toast.info("Action triggered: Create Product")}
                secondaryActionLabel="Import CSV Catalog"
                onSecondaryAction={() => toast.info("Action triggered: Import CSV")}
              />
            </CardContent>
          </Card>

          {/* 2. No Search Results */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileQuestion className="size-4 text-amber-500" /> No Search Results
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rendered when user filters or searches return zero matching records.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  &lt;NoSearchResults /&gt;
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <NoSearchResults
                searchTerm="MacBook M3 Max 64GB"
                onClear={() => toast.success("Filters cleared! Displaying all catalog records.")}
              />
            </CardContent>
          </Card>

          {/* 3. Loading Skeletons */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="size-4 text-blue-500" /> Loading State & Skeletons
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Shimmering skeleton placeholders to prevent layout shifts while fetching.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border text-xs">
                  {(["table", "cards", "stats", "spinner"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setLoadingVariant(v)}
                      className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-all ${
                        loadingVariant === v
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <LoadingState variant={loadingVariant} rows={3} message="Fetching ERP data..." />
            </CardContent>
          </Card>

          {/* 4. Error State */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="size-4 text-destructive" /> Error State (Boundary Card)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    In-place error boundary shown when an individual component or query fails.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  &lt;ErrorState /&gt;
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorState
                title="Failed to Load Sales Analytics"
                description="The MySQL server pool timed out while computing quarterly variance metrics."
                error="PrismaClientInitializationError: Connection pool timed out after 10000ms"
                onRetry={() => toast.success("Retrying query connection...")}
              />
            </CardContent>
          </Card>

          {/* 5. Success State */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-500" /> Success State (Confirmation)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rendered upon completing checkout, posting vouchers, or creating entities.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  &lt;SuccessState /&gt;
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SuccessState
                title="Tax Invoice Generated Successfully"
                description="Journal entry was auto-posted to General Ledger and GST return ledger was updated."
                referenceId="INV-2026-08492"
                actionLabel="Print Thermal Receipt"
                onAction={() => toast.success("Thermal receipt dispatched to printer")}
                secondaryActionLabel="Create Another Invoice"
                onSecondaryAction={() => toast.info("Opening new invoice form")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: SYSTEM STATUS PAGES ── */}
        <TabsContent value="pages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 404 Not Found */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 grid place-items-center mb-2">
                  <FileQuestion className="size-5" />
                </div>
                <CardTitle className="text-base">404 Not Found</CardTitle>
                <CardDescription className="text-xs">
                  Displayed whenever an unmapped URL or deleted record is requested.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex gap-2">
                <a
                  href="/404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /404</span>
                  <ExternalLink className="size-3" />
                </a>
                <span className="text-muted-foreground text-xs">·</span>
                <a
                  href="/non-existent-sample-page"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Test Unhandled URL
                </a>
              </CardContent>
            </Card>

            {/* 403 Forbidden */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-rose-500/10 text-rose-500 grid place-items-center mb-2">
                  <ShieldAlert className="size-5" />
                </div>
                <CardTitle className="text-base">403 Forbidden</CardTitle>
                <CardDescription className="text-xs">
                  Rendered when a user lacks required RBAC roles, license modules, or tenant rights.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <a
                  href="/403"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /403</span>
                  <ExternalLink className="size-3" />
                </a>
              </CardContent>
            </Card>

            {/* 500 Server Error */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-2">
                  <ServerCrash className="size-5" />
                </div>
                <CardTitle className="text-base">500 Server Error</CardTitle>
                <CardDescription className="text-xs">
                  Global error boundary caught when unhandled server or rendering exceptions occur.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <a
                  href="/500"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /500</span>
                  <ExternalLink className="size-3" />
                </a>
              </CardContent>
            </Card>

            {/* Maintenance */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-red-600/10 text-red-600 grid place-items-center mb-2">
                  <Wrench className="size-5" />
                </div>
                <CardTitle className="text-base">Maintenance Mode</CardTitle>
                <CardDescription className="text-xs">
                  Scheduled upgrade screen with countdown, announcement, and support contacts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <a
                  href="/maintenance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /maintenance</span>
                  <ExternalLink className="size-3" />
                </a>
              </CardContent>
            </Card>

            {/* Offline Mode */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 grid place-items-center mb-2">
                  <WifiOff className="size-5" />
                </div>
                <CardTitle className="text-base">Offline Resiliency</CardTitle>
                <CardDescription className="text-xs">
                  Dedicated offline page and global banner triggered upon internet disconnection.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href="/offline"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /offline</span>
                  <ExternalLink className="size-3" />
                </a>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  type="button"
                  onClick={triggerSimulatedOffline}
                  className="text-xs text-amber-600 hover:underline font-medium"
                >
                  Simulate Offline
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  type="button"
                  onClick={triggerSimulatedOnline}
                  className="text-xs text-emerald-600 hover:underline font-medium"
                >
                  Restore Online
                </button>
              </CardContent>
            </Card>

            {/* Session Expired */}
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-2">
                  <Clock className="size-5" />
                </div>
                <CardTitle className="text-base">Session Expired</CardTitle>
                <CardDescription className="text-xs">
                  Graceful session timeout recovery screen with in-place fast credential verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 flex items-center gap-2">
                <a
                  href="/session-expired"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Preview /session-expired</span>
                  <ExternalLink className="size-3" />
                </a>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  type="button"
                  onClick={triggerSimulatedSessionExpired}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Trigger Modal
                </button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

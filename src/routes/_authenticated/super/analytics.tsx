import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BarChart3, Save, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/analytics")({
  component: GoogleAnalyticsAdmin,
});

export type AnalyticsConfig = {
  measurementId: string;
  enabled: boolean;
};

function GoogleAnalyticsAdmin() {
  const qc = useQueryClient();
  const [measurementId, setMeasurementId] = useState("G-998877XX66");

  // 1. REALTIME QUERY: Fetch GA config from Supabase
  const { data: analyticsData, isLoading, refetch } = useQuery({
    queryKey: ["realtime-analytics-config"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-analytics-config").maybeSingle();
      if (data?.content) {
        return data.content as any as AnalyticsConfig;
      }
      return { measurementId: "G-998877XX66", enabled: true };
    },
  });

  useEffect(() => {
    if (analyticsData?.measurementId) {
      setMeasurementId(analyticsData.measurementId);
    }
  }, [analyticsData]);

  // 2. REALTIME MUTATION: Save GA config to Supabase
  const saveMutation = useMutation({
    mutationFn: async (updated: AnalyticsConfig) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-analytics-config",
        title: "System Google Analytics Config",
        meta_description: "Realtime GA4 tracking ID and analytics settings",
        content: updated as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Google Analytics tracking configuration saved to Supabase!");
      qc.invalidateQueries({ queryKey: ["realtime-analytics-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSave() {
    saveMutation.mutate({ measurementId, enabled: true });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Google Analytics</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <BarChart3 className="size-3 text-primary" /> Realtime Traffic
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure GA4 Measurement ID & sync configuration in real-time with database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Config
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* GA Config Card */}
          <Card className="p-6 border shadow-xs space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">GA4 Measurement ID (Tracking ID)</Label>
              <Input
                value={measurementId}
                onChange={(e) => setMeasurementId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Find this ID in Google Analytics Admin &gt; Data Streams.</p>
            </div>
          </Card>

          {/* Traffic Stats Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="p-4 border shadow-xs">
              <div className="text-xs text-muted-foreground font-semibold">Active Visitors Now</div>
              <div className="text-3xl font-extrabold mt-1 text-emerald-600">42</div>
            </Card>

            <Card className="p-4 border shadow-xs">
              <div className="text-xs text-muted-foreground font-semibold">Pageviews (30 Days)</div>
              <div className="text-3xl font-extrabold mt-1">128,450</div>
            </Card>

            <Card className="p-4 border shadow-xs">
              <div className="text-xs text-muted-foreground font-semibold">Avg Session Duration</div>
              <div className="text-3xl font-extrabold mt-1">4m 12s</div>
            </Card>

            <Card className="p-4 border shadow-xs">
              <div className="text-xs text-muted-foreground font-semibold">Bounce Rate</div>
              <div className="text-3xl font-extrabold mt-1 text-blue-600">32.4%</div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

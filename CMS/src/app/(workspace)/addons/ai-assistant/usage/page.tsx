'use client';
import { useState, useEffect } from "react";
import {  createFileRoute  } from "@/src/lib/router-compat";
import { 
  BarChart2, 
  RotateCw, 
  Zap, 
  Layers, 
  TrendingUp, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiAssistantNavHeader } from "@/components/ai/ai-assistant-nav-header";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute("/_authenticated/_app/addons/ai-assistant/usage")({
  component: AiAssistantUsagePage,
});

interface UsageData {
  totalGenerations: number;
  totalTokens: number;
  totalTokensIn: number;
  totalTokensOut: number;
  monthlyLimit: number;
  monthlyUsage: number;
  byModule: Record<string, number>;
  dailyTrend: { date: string; generations: number; tokens: number }[];
}

function AiAssistantUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-assistant/usage", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setData(d.data || d);
      }
    } catch (err: any) {
      toast.error("Failed to load usage analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <RotateCw className="w-5 h-5 animate-spin" />
          <span>Loading usage statistics...</span>
        </div>
      </div>
    );
  }

  const usagePercent = Math.min(Math.round((data.monthlyUsage / data.monthlyLimit) * 100), 100);

  return (
    <PlanGuard moduleName="AI Assistant" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <AiAssistantNavHeader activeTab="usage" />

        {/* Quota Progress Header Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-primary" />
                  Monthly Token Consumption
                </CardTitle>
                <CardDescription className="text-xs">
                  Resets on the 1st of every calendar month.
                </CardDescription>
              </div>
              <Badge variant={usagePercent > 90 ? "destructive" : "outline"} className="text-sm font-mono">
                {data.monthlyUsage.toLocaleString()} / {data.monthlyLimit.toLocaleString()} Tokens ({usagePercent}%)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={usagePercent} className="h-2.5" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>0 Tokens</span>
              <span>Warning Threshold (80%)</span>
              <span>Quota Limit ({data.monthlyLimit.toLocaleString()})</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Total Generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{data.totalGenerations}</div>
              <p className="text-xs text-muted-foreground mt-1">Total prompts executed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Prompt Tokens (In)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-blue-600">
                {data.totalTokensIn.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Context & instructions input</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Completion Tokens (Out)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-600">
                {data.totalTokensOut.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Generated output tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Module Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Layers className="w-4 h-4 mr-2 text-primary" />
              Generations by Installed Module
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of AI calls across business modules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(data.byModule).length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">No module generation records found.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data.byModule).map(([mod, count]) => {
                  const modPercent = Math.round((count / data.totalGenerations) * 100);
                  return (
                    <div key={mod} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold capitalize">{mod}</span>
                        <span className="text-muted-foreground">{count} calls ({modPercent}%)</span>
                      </div>
                      <Progress value={modPercent} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
              Daily Activity Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailyTrend.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4">No daily activity recorded yet.</p>
            ) : (
              <div className="border rounded-md divide-y text-xs">
                <div className="bg-muted/40 px-4 py-2 font-semibold grid grid-cols-3 text-muted-foreground">
                  <span>Date</span>
                  <span className="text-center">Generations</span>
                  <span className="text-right">Tokens</span>
                </div>
                {data.dailyTrend.map((row) => (
                  <div key={row.date} className="px-4 py-2.5 grid grid-cols-3 items-center">
                    <span className="font-mono">{row.date}</span>
                    <span className="text-center font-semibold">{row.generations}</span>
                    <span className="text-right font-mono text-muted-foreground">
                      {row.tokens.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PlanGuard>
  );
}

export default AiAssistantUsagePage;

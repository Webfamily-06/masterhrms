'use client';
import React, { useEffect, useState } from "react";
import {  createFileRoute  } from "@/src/lib/router-compat";
import { AiDocumentNavHeader } from "@/components/ai/ai-document-nav-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, FileText, Sparkles, Hash } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute(
  "/_authenticated/_app/addons/ai-document/analytics"
)({
  component: AiDocumentAnalyticsPage,
});

export default function AiDocumentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-document/analytics", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.data || data);
      }
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <AiDocumentNavHeader active="analytics" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Document Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Usage insights, word production metrics, and template breakdown.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-10 w-1/2" />
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <Skeleton className="h-48 w-full" />
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Words Generated</CardTitle>
                <Hash className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalWords?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all templates & documents</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalDocuments || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Saved document history</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Generation Runs</CardTitle>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalGenerations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Prompts synthesized</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recent Daily Activity
                </CardTitle>
                <CardDescription>Daily word counts and generation volume</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.daily || analytics.daily.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No daily logs yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.daily.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2 text-sm">
                        <span className="font-mono text-xs">{d.day}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">{d.generations} runs</span>
                          <span className="font-semibold">{d.words?.toLocaleString()} words</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Top Templates by Usage
                </CardTitle>
                <CardDescription>Most frequently leveraged content blueprints</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.byTemplate || analytics.byTemplate.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No template usage logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.byTemplate.map((t: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2 text-sm">
                        <span className="font-medium text-xs truncate max-w-[200px]">{t.templateTitle}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted-foreground">{t.count} docs</span>
                          <span className="font-semibold">{t.words?.toLocaleString()} words</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

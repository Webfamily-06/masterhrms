'use client';
import { useState, useEffect } from "react";
import {  createFileRoute, Link, useParams  } from "@/src/lib/router-compat";
import { 
  ArrowLeft, 
  RotateCw, 
  Copy, 
  Check, 
  Sparkles, 
  Cpu, 
  Clock, 
  Layers, 
  CheckCircle2,
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute("/_authenticated/_app/addons/ai-assistant/history/$id")({
  component: AiHistoryDetailPage,
});

interface GenerationDetail {
  id: string;
  moduleSlug: string;
  fieldKey: string;
  provider: string;
  model: string;
  language: string;
  creativity: string;
  resultsCount: number;
  maxLength: number;
  tokensIn: number;
  tokensOut: number;
  status: string;
  errorCode?: string;
  promptHash: string;
  promptExcerpt: string;
  results: { text: string; chars: number }[];
  createdAt: string;
}

function AiHistoryDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [detail, setDetail] = useState<GenerationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/addons/ai-assistant/history/${id}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load prompt generation details");
        const d = await res.json();
        setDetail(d.data || d);
      } catch (err: any) {
        toast.error(err.message || "Failed to load history item");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  const copyResult = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast.success("Option copied to clipboard");
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <RotateCw className="w-5 h-5 animate-spin" />
          <span>Loading prompt generation audit record...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 space-y-4">
        <h2 className="text-xl font-bold">Record Not Found</h2>
        <Button asChild variant="outline">
          <Link to="/addons/ai-assistant/history">Back to History</Link>
        </Button>
      </div>
    );
  }

  return (
    <PlanGuard moduleName="AI Assistant" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center space-x-3">
            <Button asChild variant="ghost" size="icon">
              <Link to="/addons/ai-assistant/history">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight">Prompt Execution #{detail.id.slice(0, 8)}</h1>
                <Badge variant={detail.status === "success" ? "default" : "destructive"}>
                  {detail.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executed on {new Date(detail.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Module / Field</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-sm capitalize">{detail.moduleSlug}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{detail.fieldKey}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Model Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-sm capitalize">{detail.provider}</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{detail.model}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Language & Tone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-sm">{detail.language}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{detail.creativity} creativity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase font-semibold">Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold font-mono text-primary">
                {detail.tokensIn + detail.tokensOut}
              </p>
              <p className="text-[11px] text-muted-foreground">
                In: {detail.tokensIn} | Out: {detail.tokensOut}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Prompt Excerpt */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center">
              <Cpu className="w-4 h-4 mr-2 text-primary" />
              Prompt Context Excerpt
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Hash: {detail.promptHash}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="p-3 bg-muted/50 rounded-md text-xs leading-relaxed font-mono whitespace-pre-wrap">
              {detail.promptExcerpt}
            </p>
          </CardContent>
        </Card>

        {/* Generated Result Cards */}
        <div className="space-y-3">
          <h2 className="text-base font-bold flex items-center">
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            Generated Options ({detail.results?.length || 0})
          </h2>
          <div className="space-y-3">
            {detail.results?.map((res, idx) => (
              <Card key={idx} className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <Badge variant="outline" className="font-mono text-xs">Option {idx + 1}</Badge>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-muted-foreground">{res.chars} chars</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyResult(res.text, idx)}
                      className="h-7 text-xs"
                    >
                      {copiedIdx === idx ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      Copy
                    </Button>
                  </div>
                </div>
                <p className="text-xs leading-relaxed bg-muted/20 p-3 rounded border font-sans select-all">
                  {res.text}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PlanGuard>
  );
}

export default AiHistoryDetailPage;

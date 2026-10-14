import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  History, 
  RotateCw, 
  Search, 
  Filter, 
  Eye, 
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiAssistantNavHeader } from "@/components/ai/ai-assistant-nav-header";
import { getAuthHeaders } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/_app/addons/ai-assistant/history/")({
  component: AiAssistantHistoryPage,
});

interface HistoryItem {
  id: string;
  moduleSlug: string;
  fieldKey: string;
  provider: string;
  model: string;
  language: string;
  creativity: string;
  resultsCount: number;
  tokensIn: number;
  tokensOut: number;
  status: string;
  promptExcerpt: string;
  createdAt: string;
}

function AiAssistantHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-assistant/history", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setHistory(Array.isArray(d) ? d : d.history || []);
      }
    } catch (err: any) {
      toast.error("Failed to load prompt history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const modules = Array.from(new Set(history.map((h) => h.moduleSlug)));

  const filteredHistory = history.filter((h) => {
    const matchesSearch =
      h.promptExcerpt.toLowerCase().includes(search.toLowerCase()) ||
      h.moduleSlug.toLowerCase().includes(search.toLowerCase()) ||
      h.fieldKey.toLowerCase().includes(search.toLowerCase());
    const matchesModule = moduleFilter === "all" || h.moduleSlug === moduleFilter;
    return matchesSearch && matchesModule;
  });

  return (
    <PlanGuard moduleName="AI Assistant" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <AiAssistantNavHeader activeTab="history" />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <History className="w-5 h-5 text-primary" />
                  <span>AI Prompt Generation History</span>
                </CardTitle>
                <CardDescription>
                  Audit log of all contextual AI content generation requests executed across your workspace.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
                <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prompts, fields, or modules..."
                  className="pl-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  className="h-9 px-3 rounded-md border text-xs bg-background"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  <option value="all">All Modules ({history.length})</option>
                  {modules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* History Table */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex justify-center items-center space-x-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Loading prompt generation audit trail...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs border rounded-md">
                No generation history records found.
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden text-xs">
                <div className="bg-muted/40 px-4 py-2 font-semibold grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-2">Module</span>
                  <span className="col-span-2">Field</span>
                  <span className="col-span-4">Prompt Context Excerpt</span>
                  <span className="col-span-2 text-center">Tokens</span>
                  <span className="col-span-2 text-right">Actions</span>
                </div>
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {item.moduleSlug}
                      </Badge>
                    </div>
                    <div className="col-span-2 font-mono text-[11px] font-medium text-foreground">
                      {item.fieldKey}
                    </div>
                    <div className="col-span-4 text-muted-foreground truncate" title={item.promptExcerpt}>
                      {item.promptExcerpt}
                    </div>
                    <div className="col-span-2 text-center font-mono text-muted-foreground">
                      {item.tokensIn + item.tokensOut}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link to="/addons/ai-assistant/history/$id" params={{ id: item.id }}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Link>
                      </Button>
                    </div>
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

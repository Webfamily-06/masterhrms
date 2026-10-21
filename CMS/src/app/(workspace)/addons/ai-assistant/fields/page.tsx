'use client';
import { useState, useEffect } from "react";
import {  createFileRoute  } from "@/src/lib/router-compat";
import { 
  CheckSquare, 
  RotateCw, 
  Search, 
  Layers, 
  Filter,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanGuard } from "@/components/plan-guard";
import { AiAssistantNavHeader } from "@/components/ai/ai-assistant-nav-header";
import { getAuthHeaders } from "@/lib/api";

const Route = createFileRoute("/_authenticated/_app/addons/ai-assistant/fields")({
  component: AiFieldRulesPage,
});

interface FieldRuleItem {
  id: string;
  moduleSlug: string;
  fieldKey: string;
  label: string;
  isEnabled: boolean;
}

function AiFieldRulesPage() {
  const [rules, setRules] = useState<FieldRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/addons/ai-assistant/fields", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const d = await res.json();
        setRules(Array.isArray(d) ? d : d.fields || []);
      }
    } catch (err: any) {
      toast.error("Failed to load AI field rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (ruleId: string, current: boolean) => {
    const nextVal = !current;
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isEnabled: nextVal } : r))
    );

    try {
      const res = await fetch(`/api/v1/addons/ai-assistant/fields/${encodeURIComponent(ruleId)}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isEnabled: nextVal }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      toast.success(`Rule updated: ${nextVal ? "Enabled" : "Disabled"}`);
    } catch (err: any) {
      toast.error(err.message);
      fetchRules();
    }
  };

  const modules = Array.from(new Set(rules.map((r) => r.moduleSlug)));

  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.fieldKey.toLowerCase().includes(search.toLowerCase()) ||
      r.moduleSlug.toLowerCase().includes(search.toLowerCase());
    const matchesModule = selectedModule === "all" || r.moduleSlug === selectedModule;
    return matchesSearch && matchesModule;
  });

  return (
    <PlanGuard moduleName="AI Assistant" requiredPlan="growth">
      <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
        <AiAssistantNavHeader activeTab="fields" />

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <span>Module Field Rules</span>
                </CardTitle>
                <CardDescription>
                  Configure which form fields display the "Generate with AI" button across installed HRMS modules.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchRules} disabled={loading}>
                <RotateCw className="w-4 h-4 mr-1.5" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by field, module, or key..."
                  className="pl-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  className="h-9 px-3 rounded-md border text-xs bg-background"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  <option value="all">All Modules ({rules.length})</option>
                  {modules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rules Table */}
            {loading ? (
              <div className="py-12 text-center text-muted-foreground text-xs flex justify-center items-center space-x-2">
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Loading active field rules...</span>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs border rounded-md">
                No matching field rules found.
              </div>
            ) : (
              <div className="border rounded-md divide-y overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 text-xs font-semibold grid grid-cols-12 gap-2 text-muted-foreground">
                  <span className="col-span-3">Module</span>
                  <span className="col-span-4">Field Name</span>
                  <span className="col-span-3">Technical Key</span>
                  <span className="col-span-2 text-right">Generate Button</span>
                </div>
                {filteredRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-3 font-medium flex items-center space-x-1.5">
                      <Badge variant="outline" className="text-[11px] font-mono">
                        {rule.moduleSlug}
                      </Badge>
                    </div>
                    <div className="col-span-4 font-semibold text-foreground">
                      {rule.label}
                    </div>
                    <div className="col-span-3 font-mono text-muted-foreground">
                      {rule.fieldKey}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Switch
                        checked={rule.isEnabled}
                        onCheckedChange={() => handleToggle(rule.id, rule.isEnabled)}
                      />
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

export default AiFieldRulesPage;

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Code, Eye, Save, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/email-templates")({
  component: EmailTemplatesAdmin,
});

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_body: string;
  variables: string[];
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "et-1",
    name: "Welcome & Workspace Setup Email",
    subject: "Welcome to Master HRMS — Set Up Your Workspace",
    category: "Onboarding",
    variables: ["{{user_name}}", "{{company_name}}", "{{login_url}}"],
    html_body: `<html lang="en">
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="https://masterhrms.com/logo.png" alt="Master HRMS Logo" style="height: 40px;" />
    </div>
    <h2 style="color: #0f172a; margin-top: 0;">Welcome aboard, {{user_name}}! 🎉</h2>
    <p style="color: #475569; line-height: 1.6;">Your company workspace <strong>{{company_name}}</strong> has been successfully provisioned on Master HRMS.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_url}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Access Workspace →</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2026 Master HRMS Inc. All rights reserved.<br />Chennai, India • support@masterhrms.com</p>
  </div>
</body>
</html>`,
  },
  {
    id: "et-2",
    name: "Payslip Generated Notification",
    subject: "Your Monthly Payslip for {{month}} is Ready",
    category: "Payroll",
    variables: ["{{employee_name}}", "{{month}}", "{{net_pay}}", "{{payslip_url}}"],
    html_body: `<html lang="en">
<body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a;">Payslip Issued 📄</h2>
    <p style="color: #475569;">Hello {{employee_name}}, your payslip for <strong>{{month}}</strong> has been processed.</p>
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 14px; color: #64748b;">Net Salary:</div>
      <div style="font-size: 24px; font-weight: bold; color: #16a34a;">{{net_pay}}</div>
    </div>
    <a href="{{payslip_url}}" style="background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; display: inline-block;">Download PDF Payslip</a>
  </div>
</body>
</html>`,
  },
];

function EmailTemplatesAdmin() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"code" | "preview">("code");

  // 1. REALTIME QUERY: Fetch HTML email templates from Supabase
  const { data: templates, isLoading, refetch } = useQuery({
    queryKey: ["realtime-email-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-email-templates").maybeSingle();
      if (data?.content && Array.isArray((data.content as any).templates)) {
        return (data.content as any).templates as EmailTemplate[];
      }
      return DEFAULT_TEMPLATES;
    },
  });

  const list = templates ?? DEFAULT_TEMPLATES;
  const current = list.find((t) => t.id === selectedId) ?? list[0];

  // 2. REALTIME MUTATION: Save updated templates to Supabase
  const saveMutation = useMutation({
    mutationFn: async (updatedList: EmailTemplate[]) => {
      const { error } = await supabase.from("cms_pages").upsert({
        slug: "system-email-templates",
        title: "System Email Templates",
        meta_description: "Realtime transactional HTML email templates",
        content: { templates: updatedList } as any,
        published: true,
      }, { onConflict: "slug" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Saved HTML email template "${current.name}"`);
      qc.invalidateQueries({ queryKey: ["realtime-email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateCurrent(field: keyof EmailTemplate, val: any) {
    const updated = list.map((t) => (t.id === current.id ? { ...t, [field]: val } : t));
    saveMutation.mutate(updated);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">HTML Email Templates</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Mail className="size-3 text-primary" /> Realtime Templates ({list.length})
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Design HTML transactional email templates with live HTML preview and real-time Supabase sync.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={() => saveMutation.mutate(list)} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Templates
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
          {/* Template Selector Sidebar */}
          <Card className="p-2 border shadow-xs">
            <div className="p-3 text-xs font-bold text-muted-foreground uppercase border-b mb-2">System Templates</div>
            <div className="space-y-1">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 rounded-lg text-xs transition-all ${
                    current.id === t.id ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"
                  }`}
                >
                  <div className="truncate">{t.name}</div>
                  <div className={`text-[10px] ${current.id === t.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {t.category}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Editor & Previewer Studio */}
          <Card className="border shadow-xs p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Template Name</Label>
                <Input value={current.name} onChange={(e) => updateCurrent("name", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Subject Line</Label>
                <Input value={current.subject} onChange={(e) => updateCurrent("subject", e.target.value)} />
              </div>
            </div>

            {/* Dynamic Variables list */}
            <div className="p-3 rounded-lg border bg-secondary/20 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-muted-foreground">Available Variables:</span>
              {(current.variables ?? []).map((v) => (
                <Badge key={v} variant="outline" className="font-mono text-[10px] bg-background">
                  {v}
                </Badge>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center justify-between border-b pb-3">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
                <TabsList className="grid grid-cols-2 w-[220px]">
                  <TabsTrigger value="code" className="gap-1.5 text-xs">
                    <Code className="size-3.5" /> HTML Code
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5 text-xs">
                    <Eye className="size-3.5" /> Live Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Code vs Live Preview */}
            {activeView === "code" ? (
              <Textarea
                value={current.html_body}
                onChange={(e) => updateCurrent("html_body", e.target.value)}
                rows={18}
                className="font-mono text-xs leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-xl"
              />
            ) : (
              <div className="border rounded-xl p-4 bg-slate-100 min-h-[400px]">
                <iframe
                  title="Email Preview"
                  srcDoc={current.html_body}
                  className="w-full h-[450px] border-0 rounded-lg bg-white shadow-sm"
                />
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

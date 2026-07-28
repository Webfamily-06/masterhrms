import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Settings — Master HRMS" }] }),
});

function Settings() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const isHR = hasRole(profile, "hr_admin");

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await supabase.from("departments").select("*").order("name")).data ?? [],
  });
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => (await supabase.from("leave_types").select("*").order("name")).data ?? [],
  });

  const addDept = useMutation({
    mutationFn: async (name: string) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("departments").insert({ tenant_id: profile.tenant_id, name });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delDept = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("departments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Removed"); },
  });

  const addLT = useMutation({
    mutationFn: async ({ name, days }: { name: string; days: number }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const { error } = await supabase.from("leave_types").insert({ tenant_id: profile.tenant_id, name, days_per_year: days });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave-types"] }); toast.success("Leave type added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delLT = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("leave_types").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leave-types"] }); toast.success("Removed"); },
  });

  if (!isHR) {
    return <div className="text-muted-foreground">Only HR admins can manage settings.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your workspace.</p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Departments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addDept.mutate(String(fd.get("name")));
                  e.currentTarget.reset();
                }}
                className="flex gap-2"
              >
                <Input name="name" placeholder="Department name" required />
                <Button type="submit" className="gap-2"><Plus className="size-4" /> Add</Button>
              </form>
              <div className="space-y-2">
                {departments.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">{d.name}</span>
                    <Button size="icon" variant="ghost" onClick={() => delDept.mutate(d.id)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave-types" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Leave Types</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addLT.mutate({ name: String(fd.get("name")), days: Number(fd.get("days") || 0) });
                  e.currentTarget.reset();
                }}
                className="flex gap-2"
              >
                <Input name="name" placeholder="e.g. Maternity Leave" required className="flex-1" />
                <Input name="days" type="number" placeholder="Days/yr" required className="w-28" />
                <Button type="submit" className="gap-2"><Plus className="size-4" /> Add</Button>
              </form>
              <div className="space-y-2">
                {leaveTypes.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="font-medium">{l.name}</span>
                      <span className="text-sm text-muted-foreground">· {l.days_per_year} days/year</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => delLT.mutate(l.id)}><Trash2 className="size-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Workspace</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={profile?.tenant?.name ?? ""} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Workspace slug</Label>
                <Input value={profile?.tenant?.slug ?? ""} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

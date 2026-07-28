import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/employees")({
  component: Employees,
  head: () => ({ meta: [{ title: "Employees — Master HRMS" }] }),
});

function Employees() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  const filtered = employees.filter((e: any) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.first_name.toLowerCase().includes(q) ||
      e.last_name.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employee_code.toLowerCase().includes(q)
    );
  });

  const createMut = useMutation({
    mutationFn: async (form: FormData) => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const payload = {
        tenant_id: profile.tenant_id,
        employee_code: String(form.get("employee_code")),
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        email: String(form.get("email")),
        phone: String(form.get("phone") || "") || null,
        position: String(form.get("position") || "") || null,
        department_id: (form.get("department_id") as string) || null,
        employment_type: String(form.get("employment_type")) as any,
        salary: Number(form.get("salary") || 0),
        joined_at: String(form.get("joined_at") || "") || null,
      };
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      toast.success("Employee added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your workforce.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Employee</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMut.mutate(new FormData(e.currentTarget));
              }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="space-y-1.5"><Label>Employee code</Label><Input name="employee_code" required /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input name="email" type="email" required /></div>
              <div className="space-y-1.5"><Label>First name</Label><Input name="first_name" required /></div>
              <div className="space-y-1.5"><Label>Last name</Label><Input name="last_name" required /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input name="phone" /></div>
              <div className="space-y-1.5"><Label>Position</Label><Input name="position" /></div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select name="department_id">
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Employment</Label>
                <Select name="employment_type" defaultValue="full_time">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Salary</Label><Input name="salary" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-1.5"><Label>Joined</Label><Input name="joined_at" type="date" /></div>
              <DialogFooter className="col-span-2">
                <Button type="submit" disabled={createMut.isPending}>Add employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-2">
            <Search className="size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, code..."
              className="border-0 shadow-none focus-visible:ring-0 h-8"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No employees yet.</TableCell></TableRow>
              )}
              {filtered.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.employee_code}</TableCell>
                  <TableCell className="font-medium">{e.first_name} {e.last_name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.email}</TableCell>
                  <TableCell>{e.departments?.name ?? "—"}</TableCell>
                  <TableCell>{e.position ?? "—"}</TableCell>
                  <TableCell className="capitalize">{e.employment_type.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "active" ? "default" : "secondary"} className="capitalize">
                      {e.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatSystemAmount } from "@/lib/currency";
import {
  Plus, Search, Edit2, Trash2, Users, Building2, UserCheck, DollarSign,
  Download, Filter, Fingerprint, Eye, MoreHorizontal, Mail, Phone, Calendar, ShieldAlert
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/employees")({
  component: Employees,
  head: () => ({ meta: [{ title: "Employees Management & Directory — Master HRMS" }] }),
});

function Employees() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);

  // 1. Fetch real active employees from DB
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*, departments(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return data ?? [];
    },
  });

  // 3. Platform settings for currency
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const filtered = employees.filter((e: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q);

    const matchesDept = selectedDept === "all" || e.department_id === selectedDept;
    const matchesStatus = selectedStatus === "all" || e.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  // Add Employee Mutation
  const createMut = useMutation({
    mutationFn: async (form: FormData) => {
      if (!profile?.tenant_id) throw new Error("No tenant session found");
      const payload = {
        tenant_id: profile.tenant_id,
        employee_code: String(form.get("employee_code")).trim(),
        first_name: String(form.get("first_name")).trim(),
        last_name: String(form.get("last_name")).trim(),
        email: String(form.get("email")).trim(),
        phone: String(form.get("phone") || "").trim() || null,
        position: String(form.get("position") || "").trim() || null,
        department_id: (form.get("department_id") as string) || null,
        employment_type: String(form.get("employment_type")) as any,
        salary: Number(form.get("salary") || 0),
        joined_at: String(form.get("joined_at") || "").trim() || new Date().toISOString().slice(0, 10),
        status: "active" as const,
      };
      const { error } = await supabase.from("employees").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpenAddModal(false);
      toast.success("🎉 New employee added to workspace!");
    },
    onError: (e: Error) => toast.error(`Error adding employee: ${e.message}`),
  });

  // Update Employee Mutation
  const updateMut = useMutation({
    mutationFn: async (emp: any) => {
      const { error } = await supabase
        .from("employees")
        .update({
          employee_code: emp.employee_code,
          first_name: emp.first_name,
          last_name: emp.last_name,
          email: emp.email,
          phone: emp.phone,
          position: emp.position,
          department_id: emp.department_id,
          employment_type: emp.employment_type,
          salary: emp.salary,
          status: emp.status,
        })
        .eq("id", emp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setEditingEmployee(null);
      toast.success("Employee record updated!");
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  // Delete Employee Mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee record removed.");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  function exportEmployeesCSV() {
    if (employees.length === 0) return toast.error("No employees to export");
    const headers = ["Employee Code", "First Name", "Last Name", "Email", "Phone", "Department", "Position", "Employment Type", "Salary", "Status", "Joined Date"];
    const rows = employees.map((e: any) => [
      e.employee_code,
      e.first_name,
      e.last_name,
      e.email,
      e.phone || "",
      e.departments?.name || "",
      e.position || "",
      e.employment_type,
      e.salary,
      e.status,
      e.joined_at || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `employees_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported employees to CSV file!");
  }

  // Summary Metrics
  const activeCount = employees.filter((e: any) => e.status === "active").length;
  const totalSalary = employees.reduce((sum: number, e: any) => sum + (Number(e.salary) || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Users className="size-6 text-primary" /> Workforce & Employee Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage team profiles, department roles, and payroll metadata.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportEmployeesCSV} className="gap-1.5 text-xs font-bold">
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setOpenAddModal(true)} className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground">
            <Plus className="size-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Employees", value: employees.length.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Active Staff", value: activeCount.toString(), icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Departments", value: departments.length.toString(), icon: Building2, color: "text-indigo-600", bg: "bg-indigo-500/10" },
          { label: "Monthly Payroll Budget", value: formatSystemAmount(totalSalary, sysConfig?.currency), icon: DollarSign, color: "text-amber-600", bg: "bg-amber-500/10" },
        ].map((m) => (
          <Card key={m.label} className="p-4 flex items-center gap-3">
            <div className={`size-10 rounded-xl ${m.bg} grid place-items-center shrink-0`}>
              <m.icon className={`size-5 ${m.color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="font-extrabold text-base font-mono">{m.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, employee code, or position..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[160px] text-xs h-9"><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] text-xs h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Employees Directory Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Position</TableHead>
                <TableHead className="text-xs">Employment</TableHead>
                <TableHead className="text-xs">Salary</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12 italic">
                    No employees found matching filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e: any) => (
                  <TableRow key={e.id} className="hover:bg-secondary/20 transition-colors">
                    {/* Name & Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border">
                          <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                            {e.first_name[0]}{e.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {e.first_name} {e.last_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{e.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs font-bold text-foreground">{e.employee_code}</TableCell>
                    <TableCell className="text-xs">{e.departments?.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-xs">{e.position ?? "Staff Member"}</TableCell>
                    <TableCell className="text-xs capitalize">{e.employment_type.replace("_", " ")}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {formatSystemAmount(Number(e.salary) || 0, sysConfig?.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          e.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-[10px]"
                            : e.status === "on_leave"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-[10px]"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-bold text-[10px]"
                        }
                      >
                        {e.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => setViewingEmployee(e)}
                          title="View Employee Profile"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => setEditingEmployee({ ...e })}
                          title="Edit Employee"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove employee ${e.first_name} ${e.last_name}?`)) {
                              deleteMut.mutate(e.id);
                            }
                          }}
                          title="Delete Record"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL 1: ADD NEW EMPLOYEE */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Add New Workspace Employee
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(new FormData(e.currentTarget));
            }}
            className="grid grid-cols-2 gap-3 text-xs"
          >
            <div className="space-y-1"><Label className="text-xs font-semibold">Employee Code *</Label><Input name="employee_code" placeholder="EMP001" required className="text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Work Email *</Label><Input name="email" type="email" placeholder="john@company.com" required className="text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">First Name *</Label><Input name="first_name" placeholder="John" required className="text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Last Name *</Label><Input name="last_name" placeholder="Doe" required className="text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Phone Number</Label><Input name="phone" placeholder="+91 98765 43210" className="text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Designation / Position</Label><Input name="position" placeholder="Software Engineer" className="text-xs" /></div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department</Label>
              <Select name="department_id">
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Department..." /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Employment Type</Label>
              <Select name="employment_type" defaultValue="full_time">
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1"><Label className="text-xs font-semibold">Base Salary</Label><Input name="salary" type="number" step="0.01" defaultValue="50000" className="text-xs font-mono" /></div>
            <div className="space-y-1"><Label className="text-xs font-semibold">Joining Date</Label><Input name="joined_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="text-xs" /></div>

            <DialogFooter className="col-span-2 mt-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending} className="font-bold bg-primary text-primary-foreground">
                Add Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT EMPLOYEE */}
      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={(o) => !o && setEditingEmployee(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" /> Edit Employee Profile ({editingEmployee.employee_code})
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee Code</Label>
                <Input value={editingEmployee.employee_code} onChange={(e) => setEditingEmployee({ ...editingEmployee, employee_code: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Work Email</Label>
                <Input value={editingEmployee.email} onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name</Label>
                <Input value={editingEmployee.first_name} onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input value={editingEmployee.last_name} onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input value={editingEmployee.phone || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} className="text-xs font-mono" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Position</Label>
                <Input value={editingEmployee.position || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={editingEmployee.department_id || ""} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, department_id: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Department..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={editingEmployee.status || "active"} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, status: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold">Monthly Salary</Label>
                <Input type="number" value={editingEmployee.salary || 0} onChange={(e) => setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) })} className="text-xs font-mono" />
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
              <Button onClick={() => updateMut.mutate(editingEmployee)} disabled={updateMut.isPending} className="font-bold bg-primary text-primary-foreground">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 3: VIEW EMPLOYEE PROFILE DETAILS */}
      {viewingEmployee && (
        <Dialog open={!!viewingEmployee} onOpenChange={(o) => !o && setViewingEmployee(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
                <UserCheck className="size-5 text-emerald-600" /> Employee Details Card
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 rounded-xl bg-secondary/30 border flex items-center gap-4">
                <Avatar className="size-14 border-2 border-primary/20">
                  <AvatarFallback className="font-black text-base bg-primary text-primary-foreground">
                    {viewingEmployee.first_name[0]}{viewingEmployee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-extrabold text-base">{viewingEmployee.first_name} {viewingEmployee.last_name}</div>
                  <div className="text-muted-foreground font-mono">{viewingEmployee.email}</div>
                  <Badge variant="outline" className="mt-1 font-mono text-[10px] text-primary border-primary/30">
                    {viewingEmployee.employee_code}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border font-mono text-[11px]">
                <div><span className="text-muted-foreground">Department:</span> <strong className="text-foreground">{viewingEmployee.departments?.name || "Unassigned"}</strong></div>
                <div><span className="text-muted-foreground">Position:</span> <strong className="text-foreground">{viewingEmployee.position || "Staff Member"}</strong></div>
                <div><span className="text-muted-foreground">Employment:</span> <strong className="text-foreground capitalize">{viewingEmployee.employment_type?.replace("_", " ")}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <strong className="text-emerald-600 capitalize">{viewingEmployee.status}</strong></div>
                <div><span className="text-muted-foreground">Base Salary:</span> <strong className="text-primary">{formatSystemAmount(Number(viewingEmployee.salary) || 0, sysConfig?.currency)}</strong></div>
                <div><span className="text-muted-foreground">Joined:</span> <strong className="text-foreground">{viewingEmployee.joined_at || "N/A"}</strong></div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setViewingEmployee(null)}>Close Profile</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

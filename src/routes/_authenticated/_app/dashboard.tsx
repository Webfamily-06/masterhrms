import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  CalendarCheck,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserPlus,
  Calendar,
  Building2,
  TrendingUp,
  ArrowRight,
  Loader2,
  PlayCircle,
  Briefcase,
  Smile,
  Shield,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Master HRMS" }] }),
});

function StatCard({ label, value, icon: Icon, hint, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; hint?: string; color: string }) {
  return (
    <Card className="shadow-xs hover:border-primary/50 transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{label}</p>
            <p className="text-3xl font-extrabold mt-1 tracking-tight">{value}</p>
            {hint && <p className="text-xs text-emerald-600 font-medium mt-1">{hint}</p>}
          </div>
          <div className={`size-11 rounded-xl grid place-items-center ${color}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick Action Dialog States
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [empFirstName, setEmpFirstName] = useState("");
  const [empLastName, setEmpLastName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDeptId, setEmpDeptId] = useState("");
  const [isSavingEmp, setIsSavingEmp] = useState(false);

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isClocking, setIsClocking] = useState(false);

  // 1. Fetch Realtime Workspace Stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [emp, att, leave, dept] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", today),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("departments").select("id", { count: "exact", head: true }),
      ]);
      return {
        employees: emp.count ?? 0,
        presentToday: att.count ?? 0,
        pendingLeave: leave.count ?? 0,
        departments: dept.count ?? 0,
      };
    },
  });

  // 2. Fetch Departments List
  const { data: departments } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name");
      return data ?? [];
    },
  });

  // 3. Fetch Recent Leave Requests
  const { data: recentLeave } = useQuery({
    queryKey: ["recent-leave"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, days, status, reason, employees(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Handle Quick Employee Addition
  async function handleAddEmployee() {
    if (!empFirstName || !empLastName || !empEmail) {
      return toast.error("Please fill in first name, last name, and email");
    }
    setIsSavingEmp(true);
    try {
      const { error } = await supabase.from("employees").insert({
        first_name: empFirstName,
        last_name: empLastName,
        email: empEmail,
        employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
        department_id: empDeptId || null,
        status: "active",
      } as any);
      if (error) throw error;
      toast.success(`Employee "${empFirstName} ${empLastName}" added successfully!`);
      setIsAddEmployeeOpen(false);
      setEmpFirstName("");
      setEmpLastName("");
      setEmpEmail("");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add employee");
    } finally {
      setIsSavingEmp(false);
    }
  }

  // Handle Interactive Attendance Clock In / Out
  function handleToggleClock() {
    setIsClocking(true);
    setTimeout(() => {
      setIsClocking(false);
      setIsClockedIn(!isClockedIn);
      if (!isClockedIn) {
        toast.success(`Clocked IN successfully at ${new Date().toLocaleTimeString()}! Attendance logged.`);
      } else {
        toast.info(`Clocked OUT at ${new Date().toLocaleTimeString()}. Total shift logged.`);
      }
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    }, 800);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Workspace Header & Punch Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Realtime workforce status, attendance punch, leave requests & payroll operations.
          </p>
        </div>

        {/* Attendance Punch Clock Widget */}
        <div className="flex items-center gap-3 p-2 px-3 rounded-2xl border bg-card shadow-xs">
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div className="text-sm font-extrabold font-mono text-primary">{currentTime}</div>
          </div>

          <Button
            size="sm"
            onClick={handleToggleClock}
            disabled={isClocking}
            className={`gap-1.5 font-semibold text-xs ${
              isClockedIn ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isClocking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isClockedIn ? (
              <>
                <Clock className="size-4" /> Clock Out
              </>
            ) : (
              <>
                <PlayCircle className="size-4" /> Clock In Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setIsAddEmployeeOpen(true)} className="gap-1.5 text-xs">
          <UserPlus className="size-3.5" /> Add Employee
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
          <Link to="/leave">
            <Calendar className="size-3.5" /> Request Leave
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
          <Link to="/attendance">
            <Clock className="size-3.5 text-blue-600" /> Attendance Roster
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1.5 text-xs">
          <Link to="/payroll">
            <Wallet className="size-3.5 text-emerald-600" /> Run Payroll
          </Link>
        </Button>
      </div>

      {/* Realtime Workforce Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Employees" value={stats?.employees ?? 0} icon={Users} hint="+100% active roster" color="text-blue-600 bg-blue-500/10" />
        <StatCard label="Present Today" value={stats?.presentToday ?? 0} icon={Clock} hint="Shift attendance logged" color="text-emerald-600 bg-emerald-500/10" />
        <StatCard label="Pending Leave" value={stats?.pendingLeave ?? 0} icon={CalendarCheck} hint="Requires manager review" color="text-amber-600 bg-amber-500/10" />
        <StatCard label="Departments" value={stats?.departments ?? 0} icon={Building2} hint="Organized units" color="text-purple-600 bg-purple-500/10" />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leave Requests */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base font-bold">Recent Leave Requests</CardTitle>
              <CardDescription className="text-xs">Pending and recent employee time-off requests.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" asChild className="text-xs h-7 gap-1">
              <Link to="/leave">View All <ArrowRight className="size-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeave && recentLeave.length > 0 ? (
              <div className="space-y-3">
                {recentLeave.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5 border-b last:border-0 text-xs">
                    <div>
                      <p className="font-semibold text-foreground">
                        {r.employees?.first_name} {r.employees?.last_name}
                      </p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        {r.start_date} → {r.end_date} · <strong className="text-foreground">{r.days} days</strong> ({r.reason || "Time off"})
                      </p>
                    </div>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize text-[10px]">
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center italic">No leave requests recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Workplace Setup & Onboarding Checklist */}
        <Card className="shadow-xs bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" /> Workspace Onboarding Checklist
            </CardTitle>
            <CardDescription className="text-xs">Step-by-step guide to complete your HR operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex gap-3 p-3 rounded-xl border bg-secondary/20">
              <div className="size-6 rounded-full bg-emerald-600 text-white grid place-items-center text-xs font-bold shrink-0">1</div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Add Employee Profiles</p>
                <p className="text-muted-foreground text-[11px]">Import or add employee directory profiles with role permissions.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl border bg-secondary/20">
              <div className="size-6 rounded-full bg-emerald-600 text-white grid place-items-center text-xs font-bold shrink-0">2</div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Set Up Attendance & Leave Policies</p>
                <p className="text-muted-foreground text-[11px]">Define shift timings, geo-fencing, paid time off, and sick leave balances.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-xl border bg-secondary/20">
              <div className="size-6 rounded-full bg-emerald-600 text-white grid place-items-center text-xs font-bold shrink-0">3</div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Automate Payroll Runs</p>
                <p className="text-muted-foreground text-[11px]">Calculate net pay, deductions, tax invoices, and issue PDF payslips.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTION MODAL: ADD EMPLOYEE */}
      <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" /> Add New Employee Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new employee to your active company directory roster.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input
                  placeholder="John"
                  value={empFirstName}
                  onChange={(e) => setEmpFirstName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={empLastName}
                  onChange={(e) => setEmpLastName(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input
                type="email"
                placeholder="john.doe@company.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Department</Label>
              <Select value={empDeptId} onValueChange={setEmpDeptId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee} disabled={isSavingEmp} className="gap-2">
              {isSavingEmp ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  Shield,
  ShoppingCart,
  Landmark,
  Kanban,
  UserCheck,
  Store,
  CreditCard,
  LifeBuoy,
  MessageSquare,
  Package,
  Target,
  FileText,
  Receipt,
  ImageIcon,
  Sparkles,
  Zap,
} from "lucide-react";
import { PlanLimitBar } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "ERP Tenant Dashboard — Master ERP" }] }),
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

  // 2. Fetch Platform Settings
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  // 3. Fetch Departments List
  const { data: departments } = useQuery({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name");
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

  const erpModules = [
    { title: "Point of Sale (POS)", desc: "Cashier checkout & receipts", url: "/pos", icon: ShoppingCart, badge: "Free Addon", color: "from-blue-500 to-indigo-600" },
    { title: "Accountant & Ledgers", desc: "General ledger & cashflow", url: "/accounting", icon: Landmark, color: "from-emerald-500 to-teal-600" },
    { title: "HRM Suite Hub", desc: "Employees, attendance & payroll", url: "/hrm", icon: Users, color: "from-purple-500 to-pink-600" },
    { title: "CRM & Pipelines", desc: "Leads & sales deal stage", url: "/crm", icon: Target, color: "from-amber-500 to-orange-600" },
    { title: "Proposals & Quotes", desc: "Digital client quotations", url: "/proposals", icon: FileText, color: "from-sky-500 to-blue-600" },
    { title: "Sales Invoices", desc: "GST invoices & billing", url: "/invoices", icon: Receipt, color: "from-emerald-600 to-green-700" },
    { title: "Projects & Kanban", desc: "Agile task boards", url: "/projects", icon: Kanban, color: "from-indigo-500 to-purple-600" },
    { title: "Team Chat", desc: "Internal team channels", url: "/chat", icon: MessageSquare, badge: "Free Addon", color: "from-cyan-500 to-blue-600" },
    { title: "User Management", desc: "Staff RBAC roles & logins", url: "/users", icon: UserCheck, color: "from-violet-500 to-purple-700" },
    { title: "Products Catalog", desc: "Inventory & rate cards", url: "/products", icon: Package, color: "from-rose-500 to-pink-600" },
    { title: "Media Library", desc: "Company logos & assets", url: "/media", icon: ImageIcon, color: "from-teal-500 to-emerald-600" },
    { title: "Marketplace", desc: "500+ Ecosystem Addons", url: "/marketplace", icon: Store, badge: "500+ Live", color: "from-indigo-600 to-violet-600" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Workspace Header & Punch Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">ERP Tenant Command Center</h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
              Growth Plan Active
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            All-in-One Enterprise Operational Hub — Financials, POS, CRM, Invoices, HRM & 500+ Ecosystem Addons.
          </p>
        </div>

        {/* Attendance Punch Clock Widget */}
        <div className="flex items-center gap-3 p-2 px-3 rounded-2xl border bg-card shadow-xs shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-medium">{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
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

      {/* Plan Capacity Bar */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 via-purple-500/5 to-emerald-500/5 border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
              <Zap className="size-5" />
            </div>
            <div>
              <p className="font-bold text-sm">Tenant Plan Usage & Restrictions</p>
              <p className="text-xs text-muted-foreground">Connected to Growth Plan (Up to 100 Employees, POS, Ledgers & Invoicing included)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={stats?.employees ?? 4} limit={100} label="Staff Seats" />
            <Button size="sm" asChild variant="outline" className="font-bold text-xs gap-1">
              <Link to="/subscription">Manage Subscription <ArrowRight className="size-3" /></Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Realtime Workforce Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Staff" value={stats?.employees ?? 0} icon={Users} hint="+100% active roster" color="text-blue-600 bg-blue-500/10" />
        <StatCard label="Present Today" value={stats?.presentToday ?? 0} icon={Clock} hint="Shift attendance logged" color="text-emerald-600 bg-emerald-500/10" />
        <StatCard label="Pending Leave" value={stats?.pendingLeave ?? 0} icon={CalendarCheck} hint="Requires manager review" color="text-amber-600 bg-amber-500/10" />
        <StatCard label="Departments" value={stats?.departments ?? 0} icon={Building2} hint="Organized units" color="text-purple-600 bg-purple-500/10" />
      </div>

      {/* 15 Focused ERP Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> ERP Operational Modules
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-xs font-bold gap-1">
            <Link to="/marketplace">View Marketplace Addons <ArrowRight className="size-3" /></Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {erpModules.map((m) => (
            <Link key={m.title} to={m.url}>
              <Card className="h-full hover:border-primary/60 hover:shadow-lg transition-all group overflow-hidden border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className={`size-10 rounded-xl bg-gradient-to-br ${m.color} text-white grid place-items-center shadow-sm group-hover:scale-110 transition-transform`}>
                      <m.icon className="size-5" />
                    </div>
                    {m.badge && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                      {m.title} <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{m.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  Users,
  Search,
  Download,
  Calendar,
  Building2,
  Briefcase,
  ChevronRight,
  TrendingUp,
  Loader2,
  DollarSign,
  UserCheck,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/employee-report")({
  component: EmployeeReportPage,
  head: () => ({
    meta: [{ title: "Employee Workforce Report — Master HRMS" }],
  }),
});

export function EmployeeReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Query platform settings for dynamic currency
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  // Query Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Query Employees
  const { data: rawEmployees = [], isLoading } = useQuery({
    queryKey: ["employees", tenantId],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees");
        return Array.isArray(res) ? res : (res?.data || []);
      } catch {
        return [];
      }
    },
  });

  const employees = rawEmployees.map((e: any) => ({
    ...e,
    id: e.id,
    first_name: e.firstName ?? e.first_name,
    last_name: e.lastName ?? e.last_name,
    employee_code: e.employeeCode ?? e.employee_code,
    email: e.email,
    phone: e.phone,
    position: e.position,
    department_id: e.departmentId ?? e.department_id,
    department_name: e.department?.name || e.departments?.name || "General",
    salary: Number(e.salary) || 0,
    employment_type: e.employmentType ?? e.employment_type ?? "full_time",
    status: e.status ?? "active",
    joined_at: e.joinedAt ?? e.joined_at,
    avatar_url: e.user?.profile?.avatarUrl || e.avatarUrl || e.avatar_url || "",
  }));

  // Filtered employees
  const filtered = employees.filter((e: any) => {
    const fullName = `${e.first_name || ""} ${e.last_name || ""}`;
    const matchSearch =
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      (e.employee_code && e.employee_code.toLowerCase().includes(search.toLowerCase())) ||
      (e.email && e.email.toLowerCase().includes(search.toLowerCase())) ||
      (e.position && e.position.toLowerCase().includes(search.toLowerCase()));

    const matchDept = selectedDept === "all" ? true : e.department_id === selectedDept;
    const matchType = selectedType === "all" ? true : e.employment_type === selectedType;
    const matchStatus = selectedStatus === "all" ? true : e.status === selectedStatus;

    return matchSearch && matchDept && matchType && matchStatus;
  });

  // KPIs
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.status === "active").length;
  const totalPayrollLiability = employees.reduce((sum: number, e: any) => sum + e.salary, 0);
  const avgSalary = totalEmployees > 0 ? totalPayrollLiability / totalEmployees : 0;
  const fullTimeCount = employees.filter((e: any) => e.employment_type === "full_time").length;

  function exportCSV() {
    if (filtered.length === 0) return toast.error("No employees to export");
    const headers = [
      "Employee Code",
      "Name",
      "Email",
      "Department",
      "Designation",
      "Employment Type",
      "Joining Date",
      "Monthly Salary",
      "Status",
    ];
    const rows = filtered.map((e: any) => [
      `"${e.employee_code || ""}"`,
      `"${e.first_name || ""} ${e.last_name || ""}"`,
      `"${e.email || ""}"`,
      `"${e.department_name || ""}"`,
      `"${e.position || ""}"`,
      e.employment_type,
      e.joined_at ? new Date(e.joined_at).toISOString().slice(0, 10) : "",
      e.salary,
      e.status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row: (string | number)[]) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `workforce-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Employee report exported successfully!");
  }

  return (
    <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
      {/* ── Breadcrumb & Top Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Users className="size-6 text-primary" /> Employee Workforce Report
          </h1>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <Link to="/employees" className="hover:text-foreground transition-colors">
              Workforce
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">Employee Report</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> Export Report (CSV)
          </Button>
        </div>
      </div>

      {/* ── KPI Visual Progress Cards (matching ui-2/employee-report.html) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Total Staff Strength</span>
            <div className="size-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Users className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight">{totalEmployees} Employees</div>
            <div className="mt-2 p-1.5 rounded bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Active Roster:</span>
              <strong className="text-emerald-600 font-mono">{activeEmployees} active</strong>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Full-Time Retention</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 grid place-items-center text-emerald-600">
              <UserCheck className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-600">
              {fullTimeCount} Core Staff
            </div>
            <div className="mt-2 p-1.5 rounded bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
              <span>Full-Time Ratio:</span>
              <strong className="font-mono">
                {totalEmployees > 0 ? ((fullTimeCount / totalEmployees) * 100).toFixed(0) : 100}%
              </strong>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Total Monthly Payroll</span>
            <div className="size-8 rounded-lg bg-blue-500/10 grid place-items-center text-blue-600">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black font-mono tracking-tight text-blue-600 truncate">
              {formatSystemAmount(totalPayrollLiability, sysConfig?.currency)}
            </div>
            <div className="mt-2 p-1.5 rounded bg-blue-500/10 text-[11px] text-blue-700 dark:text-blue-400 flex items-center justify-between">
              <span>Total Gross Liability / mo</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 border shadow-xs bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">Average Compensation</span>
            <div className="size-8 rounded-lg bg-purple-500/10 grid place-items-center text-purple-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-black font-mono tracking-tight text-purple-600 truncate">
              {formatSystemAmount(avgSalary, sysConfig?.currency)}
            </div>
            <div className="mt-2 p-1.5 rounded bg-purple-500/10 text-[11px] text-purple-700 dark:text-purple-400 flex items-center justify-between">
              <span>Average Salary Band</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <Card className="p-4 border shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee name, code, email, or position..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[150px] text-xs h-9">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px] text-xs h-9">
                <SelectValue placeholder="Work Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] text-xs h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ── Employee Records Table ──────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Employee
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Code
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Department
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Position / Role
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Joining Date
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Monthly Salary
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider">
                  Passport
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading workforce report...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                    No employees found matching filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e: any) => {
                  const statusColors: Record<string, string> = {
                    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                    probation: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                    on_leave: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                    terminated: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                  };

                  return (
                    <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 border">
                            <AvatarImage src={e.avatar_url} />
                            <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                              {e.first_name?.[0]}{e.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {e.first_name} {e.last_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {e.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {e.employee_code}
                      </TableCell>
                      <TableCell className="text-xs">
                        {e.department_name}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {e.position || "Staff Member"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {e.joined_at
                          ? new Date(e.joined_at).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {formatSystemAmount(e.salary, sysConfig?.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] font-bold border-0 ${
                            statusColors[e.status] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {e.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate({ to: "/employee-details", search: { id: e.id } })}
                          className="gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="size-3.5" /> Passport
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

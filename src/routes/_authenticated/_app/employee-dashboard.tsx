import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  Clock,
  CalendarCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  DollarSign,
  FileText,
  Download,
  Plus,
  Play,
  Square,
  Users,
  Award,
  Bell,
  Sparkles,
  ArrowUpRight,
  Laptop,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  Cake,
  PartyPopper,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/_app/employee-dashboard")({
  component: EmployeeDashboardPage,
});

export default function EmployeeDashboardPage() {
  const queryClient = useQueryClient();
  const { data: profile } = useCurrentProfile();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [punchTime, setPunchTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    days: 1,
    reason: "",
  });

  // Fetch Attendance Log
  const { data: attendanceData = [], isLoading: attLoading } = useQuery<any[]>({
    queryKey: ["my-attendance"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/attendance");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Leave Requests & Types
  const { data: leaves = [], isLoading: leavesLoading } = useQuery<any[]>({
    queryKey: ["my-leaves"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/leaves");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Payslips
  const { data: payslips = [], isLoading: payslipsLoading } = useQuery<any[]>({
    queryKey: ["my-payslips"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/payroll/history");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Assigned Tasks & Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["my-projects"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/projects");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Fetch Announcements
  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["my-announcements"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/announcements");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data: sysConfig } = useQuery<any>({
    queryKey: ["system-config"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/system/config");
        return res?.data || res || {};
      } catch {
        return {};
      }
    },
  });

  // Clock in timer tick
  useEffect(() => {
    let interval: any = null;
    if (isClockedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isClockedIn]);

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePunchToggle = () => {
    if (!isClockedIn) {
      setIsClockedIn(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setPunchTime(timeStr);
      toast.success(`Clocked In successfully at ${timeStr}`);
    } else {
      setIsClockedIn(false);
      toast.info(`Clocked Out. Total session: ${formatTimer(elapsedSeconds)}`);
    }
  };

  const applyLeaveMutation = useMutation({
    mutationFn: async (payload: typeof leaveForm) => {
      return await api.post("/api/leaves", payload);
    },
    onSuccess: () => {
      toast.success("Leave application submitted for manager approval");
      setLeaveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit leave application");
    },
  });

  const employeeName = profile?.full_name || "Employee";

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Welcome & Punch Hero Banner */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border border-primary/20 rounded-xl p-5 lg:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {employeeName}! 👋
            </span>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              Employee Portal
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {profile?.tenant?.name || "Corporate Workspace"} • Shift: Regular (09:00 AM - 06:00 PM) •{" "}
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Biometric Punch Button & Live Timer */}
        <div className="flex items-center gap-3 bg-card border border-border p-2.5 rounded-lg shadow-sm">
          <div className="text-right pl-2 pr-1">
            <p className="text-[11px] text-muted-foreground font-medium">
              {isClockedIn ? `Checked In: ${punchTime}` : "Not Checked In Today"}
            </p>
            <p className="text-sm font-mono font-bold text-foreground">{formatTimer(elapsedSeconds)}</p>
          </div>

          <Button
            onClick={handlePunchToggle}
            size="sm"
            variant={isClockedIn ? "destructive" : "default"}
            className="h-9 gap-1.5 font-semibold text-xs px-4 shadow-sm"
          >
            {isClockedIn ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Clock Out
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Clock In
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 4 Essential Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Attendance Rate</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">96.4%</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                21 Present
              </span>
              <span>• 1 Absent • 0 Late</span>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Leave Balances</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">14 Days</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLeaveModalOpen(true)}
                className="h-7 text-xs text-primary font-semibold px-2"
              >
                + Apply
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span>Casual: 6</span>
              <span>•</span>
              <span>Sick: 4</span>
              <span>•</span>
              <span>Annual: 4</span>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Tasks */}
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Assigned Tasks</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">7 Active</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-purple-600 font-semibold">2 Due This Week</span>
              <span>• 5 In Progress</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Salary */}
        <Card className="border border-border/60 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Latest Disbursed Pay</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">
              {formatSystemAmount(payslips[0]?.netSalary || payslips[0]?.netPay || 4850, sysConfig)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">Processed</span>
              <span>• August 2026 Payslip</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left Tasks & History, Right Feed & Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="tasks" className="space-y-4">
            <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="tasks" className="text-xs gap-1.5 py-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                My Tasks & Sprints
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs gap-1.5 py-1.5">
                <Clock className="w-3.5 h-3.5" />
                Attendance Log
              </TabsTrigger>
              <TabsTrigger value="leaves" className="text-xs gap-1.5 py-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Leave Requests
              </TabsTrigger>
              <TabsTrigger value="payslips" className="text-xs gap-1.5 py-1.5">
                <FileText className="w-3.5 h-3.5" />
                My Payslips
              </TabsTrigger>
            </TabsList>

            {/* TAB: MY TASKS */}
            <TabsContent value="tasks" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Assigned Project Work & Tasks</CardTitle>
                    <CardDescription className="text-xs">
                      Tasks assigned directly to you across active sprint boards.
                    </CardDescription>
                  </div>
                  <Link to="/projects">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      View Board <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Task</TableHead>
                        <TableHead className="text-xs font-semibold">Project</TableHead>
                        <TableHead className="text-xs font-semibold">Priority</TableHead>
                        <TableHead className="text-xs font-semibold">Due Date</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold">Refactor UI Migration Audit</TableCell>
                        <TableCell className="text-xs text-muted-foreground">ERP NextGen</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">
                            High
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">Today</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                            In Progress
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold">Subdomain Resolution Middleware</TableCell>
                        <TableCell className="text-xs text-muted-foreground">Core Architecture</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            Medium
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">28 Sep 2026</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Todo
                          </Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold">Employee Self-Service Portal Integration</TableCell>
                        <TableCell className="text-xs text-muted-foreground">HRMS SaaS</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Low
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">30 Sep 2026</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: ATTENDANCE LOG */}
            <TabsContent value="attendance" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base font-semibold">Recent Attendance Punches</CardTitle>
                  <CardDescription className="text-xs">
                    Your daily check-in, check-out timestamps and working durations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Punch In</TableHead>
                        <TableHead className="text-xs font-semibold">Punch Out</TableHead>
                        <TableHead className="text-xs font-semibold">Duration</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.slice(0, 5).map((att: any, idx: number) => (
                        <TableRow key={att.id || idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-medium">
                            {att.date ? new Date(att.date).toLocaleDateString() : new Date().toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-emerald-600">
                            {att.checkIn || att.punchIn || "09:05 AM"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {att.checkOut || att.punchOut || "06:02 PM"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{att.workHours || "8.5 hrs"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              {att.status || "PRESENT"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: LEAVES */}
            <TabsContent value="leaves" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">My Leave Applications</CardTitle>
                    <CardDescription className="text-xs">
                      Status of your leave requests and approval progress.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setLeaveModalOpen(true)} className="h-8 text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Apply Leave
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Category</TableHead>
                        <TableHead className="text-xs font-semibold">Period</TableHead>
                        <TableHead className="text-xs font-semibold">Days</TableHead>
                        <TableHead className="text-xs font-semibold">Reason</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.slice(0, 5).map((l: any, idx: number) => (
                        <TableRow key={l.id || idx} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-semibold">{l.leaveType?.name || l.type || "Casual Leave"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {l.startDate ? new Date(l.startDate).toLocaleDateString() : "—"} to{" "}
                            {l.endDate ? new Date(l.endDate).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{l.daysCount || l.days || 1} day(s)</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{l.reason || "Personal work"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                l.status === "APPROVED"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                              }
                            >
                              {l.status || "APPROVED"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: PAYSLIPS */}
            <TabsContent value="payslips" className="space-y-3">
              <Card className="border border-border/60 shadow-sm">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="text-base font-semibold">My Payslip Statements</CardTitle>
                  <CardDescription className="text-xs">
                    Monthly compensation statements with breakdown and downloadable PDF copies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs font-semibold">Period</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Basic Pay</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Allowances</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Deductions</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Net Disbursed</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold">August 2026</TableCell>
                        <TableCell className="text-xs text-right font-mono">$4,200.00</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-600">+$850.00</TableCell>
                        <TableCell className="text-xs text-right font-mono text-rose-600">-$200.00</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-foreground">$4,850.00</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="text-xs font-semibold">July 2026</TableCell>
                        <TableCell className="text-xs text-right font-mono">$4,200.00</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-600">+$850.00</TableCell>
                        <TableCell className="text-xs text-right font-mono text-rose-600">-$200.00</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-foreground">$4,850.00</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <Download className="w-3 h-3" /> PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col: Notice Board, Holidays & Birthday Widget */}
        <div className="space-y-4">
          {/* Upcoming Holiday */}
          <Card className="border border-border/60 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <PartyPopper className="w-4 h-4" /> Next Public Holiday
              </span>
              <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                In 6 Days
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <h4 className="text-base font-bold text-foreground">Gandhi Jayanti</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Thursday, 02 October 2026 • Office Closed</p>
            </CardContent>
          </Card>

          {/* Team Birthday */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Cake className="w-4 h-4 text-pink-500" /> Team Celebrations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center font-bold text-xs">
                    AJ
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-none">Alexander Jermai</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">UI/UX Designer • Birthday Today!</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-[11px] text-pink-600 border-pink-500/30">
                  Wish 🎉
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Announcements */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-primary" /> Notice Board
              </CardTitle>
              <Link to="/announcements" className="text-[11px] text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {announcements.slice(0, 3).map((ann: any, idx: number) => (
                <div key={ann.id || idx} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                  <p className="text-xs font-semibold text-foreground">{ann.title || "Quarterly All-Hands Meeting"}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {ann.content || "Join the leadership team this Friday at 4 PM for the Q3 strategy presentation."}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Application Modal */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Apply for Leave</DialogTitle>
            <DialogDescription className="text-xs">
              Submit your time-off request for manager approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Leave Type</Label>
              <Select
                value={leaveForm.leaveTypeId}
                onValueChange={(val) => setLeaveForm({ ...leaveForm, leaveTypeId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave (6 remaining)</SelectItem>
                  <SelectItem value="sick">Sick Leave (4 remaining)</SelectItem>
                  <SelectItem value="annual">Annual Leave (4 remaining)</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Reason / Handover Notes</Label>
              <Textarea
                placeholder="Describe reason or handover plan..."
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => applyLeaveMutation.mutate(leaveForm)}
              disabled={applyLeaveMutation.isPending}
            >
              {applyLeaveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

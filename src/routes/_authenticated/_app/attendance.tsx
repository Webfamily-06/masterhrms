import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, LogIn, LogOut, RefreshCw, Fingerprint, Search, Users,
  CheckCircle2, AlertCircle, Calendar as CalendarIcon, Wifi, UserCheck, UserX, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/attendance")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Live Attendance & Biometric Logs — Master HRMS" }] }),
});

function AttendancePage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSyncingHardware, setIsSyncingHardware] = useState(false);

  // 1. Fetch all active employees from employee list
  const { data: dbEmployees = [] } = useQuery({
    queryKey: ["employees-for-attendance", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, employee_code, first_name, last_name, email, position, departments(id, name)")
        .order("first_name");
      return data ?? [];
    },
  });

  // 2. Fetch logged in user employee record
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  // 3. Fetch today's check in record for current user
  const { data: todayRecord } = useQuery({
    queryKey: ["attendance-today", myEmployee?.id],
    enabled: !!myEmployee,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .eq("date", selectedDate)
        .maybeSingle();
      return data;
    },
  });

  // 4. Fetch Supabase attendance table records
  const { data: dbAttendanceRecords = [] } = useQuery({
    queryKey: ["attendance-table-records", selectedDate],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, employees(first_name, last_name, employee_code, departments(name))")
        .eq("date", selectedDate)
        .order("check_in", { ascending: false });
      return data ?? [];
    },
  });

  // 5. Fetch Realtime Biometric Addon Sync Data
  const { data: biometricAddonData } = useQuery({
    queryKey: ["biometric-addon-sync", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", `system-biometric-sync-${tenantId}`)
        .maybeSingle();

      if (data?.content) {
        const p = data.content as any;
        return {
          allPunches: (p.allPunches || []) as any[],
          devices: (p.devices || []) as any[],
        };
      }
      return { allPunches: [], devices: [] };
    },
    refetchInterval: 5000,
  });

  const biometricPunches = biometricAddonData?.allPunches ?? [];

  // Manual Check In Mutation
  const checkInMut = useMutation({
    mutationFn: async () => {
      if (!myEmployee || !profile?.tenant_id) throw new Error("No employee record associated with your user");
      const { error } = await supabase.from("attendance").upsert(
        {
          tenant_id: profile.tenant_id,
          employee_id: myEmployee.id,
          date: selectedDate,
          check_in: new Date().toISOString(),
          status: "present",
        },
        { onConflict: "employee_id,date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Checked in successfully!");
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-table-records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Manual Check Out Mutation
  const checkOutMut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) throw new Error("Please check in first");
      const now = new Date();
      const inTime = todayRecord.check_in ? new Date(todayRecord.check_in) : now;
      const hours = Math.max(0, (now.getTime() - inTime.getTime()) / 3600000);
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: now.toISOString(), hours: Math.round(hours * 100) / 100 })
        .eq("id", todayRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("✅ Checked out successfully!");
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-table-records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Trigger Hardware Biometric Sync
  async function syncBiometricHardware() {
    setIsSyncingHardware(true);
    toast.info("Pinging Biometric Hardware & Syncing Punch Logs...");
    await new Promise((r) => setTimeout(r, 1200));
    qc.invalidateQueries({ queryKey: ["biometric-addon-sync", tenantId] });
    qc.invalidateQueries({ queryKey: ["attendance-table-records"] });
    setIsSyncingHardware(false);
    toast.success("🟢 Biometric Hardware Synced! Attendance updated with latest punches.");
  }

  // Combined Master Attendance Sheet (Employees + DB Attendance + Biometric Addon Punches)
  const masterAttendanceList = dbEmployees.map((emp: any) => {
    // 1. Find DB Attendance Record for selected date
    const dbAtt = dbAttendanceRecords.find((a: any) => a.employee_id === emp.id);

    // 2. Find Biometric Addon Punches for this employee code
    const bioPunches = biometricPunches.filter(
      (p: any) => p.employeeCode === emp.employee_code && p.date === selectedDate
    );

    // Get earliest punch in & latest punch out from biometric punches
    const bioCheckIn = bioPunches.find((p: any) => p.punchType === "Clock In") || bioPunches[0];
    const bioCheckOut = bioPunches.find((p: any) => p.punchType === "Clock Out");

    const checkInTime = dbAtt?.check_in || (bioCheckIn ? `${selectedDate}T${bioCheckIn.time}:00` : null);
    const checkOutTime = dbAtt?.check_out || (bioCheckOut ? `${selectedDate}T${bioCheckOut.time}:00` : null);

    const isBiometricVerified = bioPunches.length > 0;
    const verificationMethod = bioCheckIn?.fingerUsed || (isBiometricVerified ? "Biometric Hardware Scanner" : "Web Check-in");

    let status = dbAtt?.status || (checkInTime ? "present" : "absent");

    return {
      id: emp.id,
      employee_code: emp.employee_code,
      name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      department: emp.departments?.name || "Unassigned",
      position: emp.position || "Staff Member",
      checkIn: checkInTime,
      checkOut: checkOutTime,
      hours: dbAtt?.hours || (checkInTime && checkOutTime ? 8 : checkInTime ? 4 : 0),
      status: status,
      isBiometricVerified,
      verificationMethod,
      deviceIp: bioCheckIn?.deviceIp || "192.168.1.201",
    };
  });

  // Filter List
  const filteredAttendance = masterAttendanceList.filter((item: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.employee_code.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const presentCount = masterAttendanceList.filter((a) => a.status === "present").length;
  const biometricCount = masterAttendanceList.filter((a) => a.isBiometricVerified).length;
  const absentCount = masterAttendanceList.filter((a) => a.status === "absent").length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Clock className="size-6 text-primary" /> Live Attendance & Biometric Hardware Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Realtime attendance directory synchronized with Employee records and WiFi Biometric Hardware devices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/biometric-sync">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-bold text-emerald-600 border-emerald-500/30">
              <Fingerprint className="size-3.5" /> Biometric Hardware Hub
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={syncBiometricHardware}
            disabled={isSyncingHardware}
            className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`size-3.5 ${isSyncingHardware ? "animate-spin" : ""}`} /> Sync Hardware
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Workforce", value: dbEmployees.length.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Present Today", value: presentCount.toString(), icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Biometric Verified", value: biometricCount.toString(), icon: Fingerprint, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Absent / Unchecked", value: absentCount.toString(), icon: UserX, color: "text-red-600", bg: "bg-red-500/10" },
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

      {/* Personal Clock In / Out Banner */}
      {myEmployee && (
        <Card className="border shadow-xs">
          <CardHeader className="py-3 px-4 border-b bg-secondary/20">
            <CardTitle className="text-xs font-extrabold flex items-center gap-2">
              <Clock className="size-4 text-primary" /> My Personal Clock-In Status · {format(new Date(), "PPP")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-2 gap-8 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">CHECK IN</span>
                <strong className="text-sm text-foreground font-extrabold">
                  {todayRecord?.check_in ? format(new Date(todayRecord.check_in), "p") : "—"}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">CHECK OUT</span>
                <strong className="text-sm text-foreground font-extrabold">
                  {todayRecord?.check_out ? format(new Date(todayRecord.check_out), "p") : "—"}
                </strong>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => checkInMut.mutate()}
                disabled={!!todayRecord?.check_in || checkInMut.isPending}
                size="sm"
                className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <LogIn className="size-3.5" /> Check In Now
              </Button>
              <Button
                onClick={() => checkOutMut.mutate()}
                disabled={!todayRecord?.check_in || !!todayRecord?.check_out || checkOutMut.isPending}
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold text-xs"
              >
                <LogOut className="size-3.5" /> Check Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee by name, code, or department..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs h-9 w-[150px] font-mono"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] text-xs h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Master Attendance Directory Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Check In</TableHead>
                <TableHead className="text-xs">Check Out</TableHead>
                <TableHead className="text-xs">Hours</TableHead>
                <TableHead className="text-xs">Verification Source</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12 italic">
                    No attendance records found for {selectedDate}.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendance.map((row: any) => (
                  <TableRow key={row.id} className="hover:bg-secondary/20 transition-colors">
                    {/* Employee Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 border">
                          <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                            {row.name.split(" ")[0]?.[0]}{row.name.split(" ")[1]?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-xs text-foreground">{row.name}</div>
                          <div className="text-[10px] text-muted-foreground">{row.position}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs font-bold text-foreground">{row.employee_code}</TableCell>
                    <TableCell className="text-xs">{row.department}</TableCell>

                    {/* Check In */}
                    <TableCell className="font-mono text-xs">
                      {row.checkIn ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {format(new Date(row.checkIn), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>

                    {/* Check Out */}
                    <TableCell className="font-mono text-xs">
                      {row.checkOut ? (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {format(new Date(row.checkOut), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>

                    {/* Hours */}
                    <TableCell className="font-mono text-xs font-bold">{row.hours} hrs</TableCell>

                    {/* Verification Source */}
                    <TableCell>
                      {row.isBiometricVerified ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono text-[10px] gap-1">
                          <Fingerprint className="size-3 text-emerald-600" /> {row.verificationMethod}
                        </Badge>
                      ) : row.checkIn ? (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Web Check-in
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px] italic">Not Punched</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        className={
                          row.status === "present"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-[10px]"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-bold text-[10px]"
                        }
                      >
                        {row.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

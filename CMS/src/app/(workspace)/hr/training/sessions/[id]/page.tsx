"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Check, Plus } from "lucide-react";

interface PersonItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  status: "present" | "absent";
  notes: string;
  employee?: PersonItem | null;
}

interface SessionDetail {
  id: string;
  courseId: string;
  course?: {
    id: string;
    title: string;
    name?: string;
    durationHours: number;
    cost: number;
    capacity: number;
  } | null;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  locationType: "virtual" | "physical";
  meetingLink: string;
  notes: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  createdByName: string;
  trainers: PersonItem[];
  attendances: AttendanceRecord[];
}

function getInitials(first?: string, last?: string) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

function formatCurrency(val: number) {
  return `$${Number(val || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
        Completed
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
        In progress
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 border border-sky-500/20">
      Scheduled
    </span>
  );
}

export default function TrainingSessionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = params?.id;

  const [manageOpen, setManageOpen] = useState(false);
  const [draftRows, setDraftRows] = useState<
    Array<{ employeeId: string; status: "present" | "absent"; notes: string }>
  >([]);
  const [addEmpId, setAddEmpId] = useState("");

  const { data: session, isLoading } = useQuery<SessionDetail>({
    queryKey: ["hr-training-session-detail", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const res = await api.get(`/hr/training/sessions/${sessionId}`);
      return unwrapData<SessionDetail>(res);
    },
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-session-att"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: typeof draftRows) =>
      api.put(`/hr/training/sessions/${sessionId}/attendance`, { records }),
    onSuccess: () => {
      toast.success("Attendance updated & synced to Employee Calendar");
      queryClient.invalidateQueries({ queryKey: ["hr-training-session-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      setManageOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save attendance"),
  });

  const openManageAttendance = () => {
    setDraftRows(
      (session?.attendances || []).map((a) => ({
        employeeId: a.employeeId,
        status: a.status === "present" ? "present" : "absent",
        notes: a.notes || "",
      }))
    );
    setAddEmpId("");
    setManageOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading training session details...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => router.push("/hr/training/sessions")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Training session not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={session.title}
        description="View the details, attendees, and materials for this training session."
        actions={
          <Button variant="outline" onClick={() => router.push("/hr/training/sessions")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Session Info + Attendance */}
        <div className="lg:col-span-8 space-y-5">
          {/* Session Info Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">
                {session.course?.title || session.title}
              </h2>
              <StatusBadge status={session.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Start Date</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {session.startDate}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">End Date</div>
                <div className="text-sm font-semibold text-foreground mt-1">{session.endDate}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Location Type</div>
                <div className="mt-1">
                  {session.locationType === "virtual" ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-700 border border-sky-500/20">
                      Virtual
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      Physical
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created By</div>
                <div className="text-sm font-semibold text-foreground mt-1">
                  {session.createdByName || "Company"}
                </div>
              </div>
            </div>

            {session.meetingLink && (
              <div>
                <div className="text-xs text-muted-foreground">Meeting Link</div>
                <a
                  href={session.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-sky-600 hover:underline break-all mt-1 inline-block"
                >
                  {session.meetingLink}
                </a>
              </div>
            )}

            <div>
              <div className="text-xs text-muted-foreground">Notes</div>
              <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">
                {session.notes || `Training session for ${session.course?.title || session.title}`}
              </p>
            </div>
          </div>

          {/* Attendance Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Attendance</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="py-2.5 text-xs font-semibold text-muted-foreground">Employee</th>
                    <th className="py-2.5 text-xs font-semibold text-muted-foreground w-28">
                      Status
                    </th>
                    <th className="py-2.5 text-xs font-semibold text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {session.attendances.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                        No attendance recorded yet. Click &ldquo;Manage Attendance&rdquo; below.
                      </td>
                    </tr>
                  ) : (
                    session.attendances.map((att) => {
                      const empName = att.employee
                        ? `${att.employee.firstName} ${att.employee.lastName}`.trim()
                        : "—";
                      return (
                        <tr key={att.id}>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              {att.employee?.avatarUrl ? (
                                <img
                                  src={att.employee.avatarUrl}
                                  alt={empName}
                                  className="h-8 w-8 rounded-full object-cover border border-border/80"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                                  {getInitials(att.employee?.firstName, att.employee?.lastName)}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {empName}
                                </div>
                                {att.employee?.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {att.employee.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            {att.status === "present" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
                                Absent
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-sm text-foreground">{att.notes || "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <Button
                onClick={openManageAttendance}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Manage Attendance
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Program Details + Trainers */}
        <div className="lg:col-span-4 space-y-5">
          {/* Program Details Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Program Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground">Program Name</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {session.course?.title || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {session.course?.durationHours ?? 0} hours
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {formatCurrency(session.course?.cost ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Capacity</div>
                <div className="text-sm font-semibold text-foreground mt-0.5">
                  {session.course?.capacity ?? 0}
                </div>
              </div>
            </div>
            {session.courseId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/hr/training/programs/${session.courseId}`)}
              >
                View Program Details
              </Button>
            )}
          </div>

          {/* Trainers Card */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground">Trainers</h2>
            {session.trainers.length === 0 ? (
              <div className="text-xs text-muted-foreground">No trainers assigned.</div>
            ) : (
              <div className="space-y-3.5">
                {session.trainers.map((t) => {
                  const name = `${t.firstName} ${t.lastName}`.trim();
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={name}
                          className="h-9 w-9 rounded-full object-cover border border-border/80 shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                          {getInitials(t.firstName, t.lastName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{name}</div>
                        {t.email && (
                          <div className="text-xs text-muted-foreground truncate">{t.email}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Attendance Modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Session Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Add Employee row */}
            <div className="flex items-center gap-2">
              <Select value={addEmpId} onValueChange={setAddEmpId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add employee to session..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e: any) => !draftRows.some((r) => r.employeeId === e.id))
                    .map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!addEmpId}
                onClick={() => {
                  if (!addEmpId) return;
                  setDraftRows((prev) => [
                    ...prev,
                    { employeeId: addEmpId, status: "present", notes: "Attended session" },
                  ]);
                  setAddEmpId("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>

            <div className="space-y-2.5">
              {draftRows.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  Select an employee above to record attendance.
                </div>
              ) : (
                draftRows.map((row, idx) => {
                  const emp = employees.find((e: any) => e.id === row.employeeId);
                  const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : row.employeeId;
                  return (
                    <div
                      key={row.employeeId}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border/70 bg-muted/20"
                    >
                      <div className="col-span-4 text-sm font-semibold truncate">{name}</div>
                      <div className="col-span-3">
                        <Select
                          value={row.status}
                          onValueChange={(val) =>
                            setDraftRows((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, status: val as "present" | "absent" } : r
                              )
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.notes}
                          onChange={(e) =>
                            setDraftRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, notes: e.target.value } : r))
                            )
                          }
                          placeholder="Notes..."
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saveAttendanceMutation.isPending}
              onClick={() => saveAttendanceMutation.mutate(draftRows)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {saveAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

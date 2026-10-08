import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserCheck, CheckCircle2, Clock, Laptop, ShieldCheck, DollarSign, Building } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/exits")({
  component: HrExitsPage,
});

export default function HrExitsPage() {
  const queryClient = useQueryClient();
  const [activeExit, setActiveExit] = useState<any>(null);

  const { data: exits = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-exits"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/exits");
      return res.data;
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ exitId, itemId, isCompleted }: { exitId: string; itemId: string; isCompleted: boolean }) => {
      return await api.put(`/hr/lifecycle/exits/${exitId}/checklist/${itemId}`, { isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-exits"] });
      toast.success("Clearance item updated.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update clearance item.");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.put(`/hr/lifecycle/exits/${id}/finalize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-exits"] });
      toast.success("Employee exit finalized. User access deactivated.");
      setActiveExit(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to finalize exit.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exit Clearances & Multi-Department Offboarding"
        description="Verify department sign-offs (IT, Finance, Admin, HR), collect company assets, and complete final termination."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Exit Cases" value={String(exits.length)} icon={UserCheck} description="Total offboarding cases" />
        <StatCard
          title="Clearances In Progress"
          value={String(exits.filter((e: any) => e.status !== "completed").length)}
          icon={Clock}
          description="Pending department approvals"
        />
        <StatCard
          title="Finalized & Deactivated"
          value={String(exits.filter((e: any) => e.status === "completed").length)}
          icon={CheckCircle2}
          description="Closed employee files"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exit Case Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Code</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Exit Type</TableHead>
                <TableHead>Last Working Day</TableHead>
                <TableHead>Clearance Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading exit cases...
                  </TableCell>
                </TableRow>
              ) : exits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active exit cases on record.
                  </TableCell>
                </TableRow>
              ) : (
                exits.map((e: any) => {
                  const totalTasks = e.checklists?.length || 0;
                  const completedTasks = e.checklists?.filter((c: any) => c.isCompleted).length || 0;
                  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs font-semibold">{e.exitCode}</TableCell>
                      <TableCell className="font-medium">
                        {e.employee?.firstName} {e.employee?.lastName}
                        <span className="block text-xs text-muted-foreground">{e.employee?.employeeCode}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {e.exitType}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(e.lastWorkingDay).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-xs font-mono">
                            {completedTasks}/{totalTasks}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === "completed" ? "default" : "secondary"} className="capitalize">
                          {e.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setActiveExit(e)}>
                          Checklist
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Clearance Checklist Modal */}
      <Dialog open={!!activeExit} onOpenChange={(open) => !open && setActiveExit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Department Clearance Sign-offs</DialogTitle>
            <DialogDescription>
              {activeExit?.employee?.firstName} {activeExit?.employee?.lastName} — LWD:{" "}
              {activeExit?.lastWorkingDay ? new Date(activeExit.lastWorkingDay).toLocaleDateString() : ""}
            </DialogDescription>
          </DialogHeader>
          {activeExit && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
              {activeExit.checklists?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No clearance items configured for this case.</p>
              ) : (
                <div className="space-y-3">
                  {activeExit.checklists?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={item.isCompleted}
                        onCheckedChange={(checked) =>
                          toggleChecklistMutation.mutate({
                            exitId: activeExit.id,
                            itemId: item.id,
                            isCompleted: !!checked,
                          })
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{item.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {item.department}
                          </Badge>
                        </div>
                        {item.completedAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Completed by {item.completedBy || "Admin"} on {new Date(item.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            {activeExit?.status !== "completed" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => finalizeMutation.mutate(activeExit.id)}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? "Finalizing..." : "Finalize & Deactivate"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setActiveExit(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

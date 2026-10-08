import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckSquare, Plus, Calendar, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/meetings/action-items")({
  component: HrMeetingActionItemsPage,
});

export default function HrMeetingActionItemsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    assigneeId: "",
    priority: "medium",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    description: "",
  });

  const { data: actionItems = [], isLoading } = useQuery({
    queryKey: ["hr-meeting-action-items"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/action-items");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker-action-items"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/meetings/action-items", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Action item created");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-action-items"] });
      setIsModalOpen(false);
      setFormData({
        title: "",
        assigneeId: "",
        priority: "medium",
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        description: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create action item");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/hr/meetings/action-items/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Action item status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-action-items"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update action item");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meeting Action Items"
        description="Track deliverables, assigned owners, and resolution deadlines decided in executive meetings."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Action Item
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-indigo-500" />
            Deliverables & Action Items ({actionItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deliverable Title</TableHead>
                <TableHead>Meeting Reference</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading action items...
                  </TableCell>
                </TableRow>
              ) : actionItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No open action items logged. Click "New Action Item" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                actionItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.meeting?.title || "Ad-hoc Decision"}
                    </TableCell>
                    <TableCell>
                      {item.assignee ? (
                        <span className="text-sm font-medium">
                          {item.assignee.firstName} {item.assignee.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: item.id, status: "completed" })}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Done
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Action Item</DialogTitle>
            <DialogDescription>Assign a post-meeting deliverable to an employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Deliverable Title</Label>
              <Input
                placeholder="e.g. Prepare revised architecture diagram"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assigned Owner</Label>
              <Select
                value={formData.assigneeId}
                onValueChange={(val) => setFormData({ ...formData, assigneeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.title || !formData.assigneeId || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Create Deliverable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
import { Calendar, Plus, Users, MapPin, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/training/sessions")({
  component: HrTrainingSessionsPage,
});

export default function HrTrainingSessionsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    courseId: "",
    title: "",
    trainerName: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    location: "Conference Room A",
    capacity: 25,
    sessionUrl: "",
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["hr-training-programs-list"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return res.data;
    },
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["hr-training-sessions"],
    queryFn: async () => {
      const res = await api.get("/hr/training/sessions");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/training/sessions", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training session scheduled successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-training-sessions"] });
      setIsModalOpen(false);
      setFormData({
        courseId: "",
        title: "",
        trainerName: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        location: "Conference Room A",
        capacity: 25,
        sessionUrl: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to schedule session");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Sessions"
        description="Schedule live webinars, in-person workshops, and manage cohort capacities."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Schedule Session
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Scheduled Batches & Cohorts ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session / Course</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading training sessions...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No active sessions scheduled. Click "Schedule Session" to plan a batch.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div>{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.course?.title}</div>
                    </TableCell>
                    <TableCell>{s.trainerName || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        {s.sessionUrl ? (
                          <>
                            <Video className="h-3.5 w-3.5 text-blue-500" />
                            <a href={s.sessionUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              Virtual Meeting
                            </a>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            {s.location || "On-Premises"}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{s._count?.attendances || 0}</span> / {s.capacity}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "scheduled" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
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
            <DialogTitle>Schedule Training Session</DialogTitle>
            <DialogDescription>Define session dates, venue/URL, and maximum seat capacity.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Associated Course</Label>
              <Select
                value={formData.courseId}
                onValueChange={(val) => setFormData({ ...formData, courseId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input
                placeholder="e.g. Batch 2026-Q4 Live Workshop"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trainer Name</Label>
                <Input
                  placeholder="e.g. Jane Doe"
                  value={formData.trainerName}
                  onChange={(e) => setFormData({ ...formData, trainerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Seat Capacity</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Meeting Room</Label>
              <Input
                placeholder="Room name or physical address"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Virtual Link (Optional)</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={formData.sessionUrl}
                onChange={(e) => setFormData({ ...formData, sessionUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.courseId || !formData.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Scheduling..." : "Schedule Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

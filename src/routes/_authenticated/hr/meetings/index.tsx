import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Calendar, Plus, Clock, DoorOpen, Users, Video, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/meetings/")({
  component: HrMeetingsCalendarPage,
});

export default function HrMeetingsCalendarPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    roomId: "",
    typeId: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    location: "Main Office",
    meetingUrl: "",
    agenda: "",
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["hr-meetings-list"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings");
      return res.data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["hr-meeting-rooms-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/rooms");
      return res.data;
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["hr-meeting-types-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/types");
      return res.data;
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/meetings", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting scheduled successfully (Server Conflict Check Passed)");
      queryClient.invalidateQueries({ queryKey: ["hr-meetings-list"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Meeting conflict detected or booking failed");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/hr/meetings/${id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting cancelled");
      queryClient.invalidateQueries({ queryKey: ["hr-meetings-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to cancel meeting");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meetings & Scheduling"
        description="Server-authoritative conflict engine preventing double-booked rooms or organizer overlaps."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Schedule Meeting
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Scheduled Meetings ({meetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Room / Venue</TableHead>
                <TableHead>Time Window</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Attendees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading meetings...
                  </TableCell>
                </TableRow>
              ) : meetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No meetings scheduled. Click "Schedule Meeting" to book a room.
                  </TableCell>
                </TableRow>
              ) : (
                meetings.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div>{m.title}</div>
                      {m.agenda && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{m.agenda}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.type ? (
                        <Badge
                          variant="outline"
                          style={{ borderColor: m.type.color, color: m.type.color }}
                        >
                          {m.type.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Standard</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        {m.room ? (
                          <>
                            <DoorOpen className="h-3.5 w-3.5 text-indigo-500" />
                            {m.room.name}
                          </>
                        ) : m.meetingUrl ? (
                          <>
                            <Video className="h-3.5 w-3.5 text-blue-500" />
                            <a
                              href={m.meetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Virtual
                            </a>
                          </>
                        ) : (
                          m.location || "Office"
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(m.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(m.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(m.startTime).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {m.organizer?.firstName} {m.organizer?.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {m.attendees?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "scheduled" ? "default" : "destructive"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.status === "scheduled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelMutation.mutate(m.id)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" /> Cancel
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
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              The server will validate room availability and reject double-bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input
                placeholder="e.g. Executive Board Strategy Review"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meeting Room</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(val) => setFormData({ ...formData, roomId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.capacity} seats)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select
                  value={formData.typeId}
                  onValueChange={(val) => setFormData({ ...formData, typeId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Agenda & Key Objectives</Label>
              <Textarea
                placeholder="Topics to discuss, deliverables..."
                value={formData.agenda}
                onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => scheduleMutation.mutate(formData)}
              disabled={!formData.title || !formData.startTime || !formData.endTime || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending ? "Validating & Booking..." : "Book Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

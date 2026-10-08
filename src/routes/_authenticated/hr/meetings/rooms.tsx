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
import { toast } from "sonner";
import { DoorOpen, Plus, Users, MapPin, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/meetings/rooms")({
  component: HrMeetingRoomsPage,
});

export default function HrMeetingRoomsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "Floor 2, West Wing",
    capacity: 10,
    amenities: ["Projector", "Video Conferencing", "Whiteboard"],
  });

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["hr-meeting-rooms"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/rooms");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/meetings/rooms", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting room created");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-rooms"] });
      setIsModalOpen(false);
      setFormData({
        name: "",
        location: "Floor 2, West Wing",
        capacity: 10,
        amenities: ["Projector", "Video Conferencing", "Whiteboard"],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create room");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/meetings/rooms/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting room deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-rooms"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete room");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meeting Rooms & Spaces"
        description="Configure physical conference rooms, seating capacities, and equipment amenities."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Meeting Room
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-indigo-500" />
            Conference & Board Rooms ({rooms.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading meeting rooms...
                  </TableCell>
                </TableRow>
              ) : rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No meeting rooms configured yet. Click "Add Meeting Room" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-primary" />
                      {r.name}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.location || "On-Premises"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.capacity} seats
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(r.amenities) &&
                          r.amenities.map((a: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {a}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? "default" : "secondary"}>
                        {r.isActive ? "Available" : "Maintenance"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(r.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>Add Meeting Room</DialogTitle>
            <DialogDescription>Define room name, location, and seat count for conflict detection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Room Name</Label>
              <Input
                placeholder="e.g. Boardroom Jupiter, Innovation Lab"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Floor</Label>
                <Input
                  placeholder="Floor 2, West Wing"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Capacity (Seats)</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Add Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

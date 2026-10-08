import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Clock, DoorOpen, Video, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/meetings/")({
  component: MeMeetingsPage,
});

export default function MeMeetingsPage() {
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["me-meetings-invitations"],
    queryFn: async () => {
      const res = await api.get("/me/meetings");
      return res.data;
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ meetingId, rsvpStatus }: { meetingId: string; rsvpStatus: string }) => {
      const res = await api.post(`/me/meetings/${meetingId}/rsvp`, { rsvpStatus });
      return res.data;
    },
    onSuccess: () => {
      toast.success("RSVP status updated");
      queryClient.invalidateQueries({ queryKey: ["me-meetings-invitations"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update RSVP");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Meetings & Invitations"
        description="View meetings where you are invited or participating, respond with RSVP, and join virtual calls."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Scheduled Meetings & Invitations ({meetings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting Title</TableHead>
                <TableHead>Room / Link</TableHead>
                <TableHead>Time Window</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>My RSVP</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading your meetings...
                  </TableCell>
                </TableRow>
              ) : meetings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    You have no scheduled meetings on your calendar.
                  </TableCell>
                </TableRow>
              ) : (
                meetings.map((m: any) => {
                  const myAttendance = m.attendees?.[0];
                  const currentRsvp = myAttendance?.rsvpStatus || "pending";

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        <div>{m.title}</div>
                        {m.agenda && (
                          <div className="text-xs text-muted-foreground line-clamp-1">{m.agenda}</div>
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
                                Join Online
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
                        <Badge
                          variant={
                            currentRsvp === "accepted"
                              ? "default"
                              : currentRsvp === "declined"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {currentRsvp}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rsvpMutation.mutate({ meetingId: m.id, rsvpStatus: "accepted" })}
                          className="text-emerald-600 hover:text-emerald-700 h-8 px-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rsvpMutation.mutate({ meetingId: m.id, rsvpStatus: "declined" })}
                          className="text-rose-600 hover:text-rose-700 h-8 px-2"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rsvpMutation.mutate({ meetingId: m.id, rsvpStatus: "tentative" })}
                          className="text-amber-600 hover:text-amber-700 h-8 px-2"
                        >
                          <HelpCircle className="h-4 w-4" />
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
    </div>
  );
}

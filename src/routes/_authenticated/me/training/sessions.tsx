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
import { Calendar, UserPlus, MapPin, Video, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/training/sessions")({
  component: MeTrainingSessionsPage,
});

export default function MeTrainingSessionsPage() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["me-training-sessions"],
    queryFn: async () => {
      const res = await api.get("/me/training/sessions");
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.post(`/me/training/sessions/${sessionId}/register`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Successfully registered for session");
      queryClient.invalidateQueries({ queryKey: ["me-training-sessions"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Registration failed or session is full");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Sessions & Workshops"
        description="Browse scheduled cohort workshops and self-register for upcoming learning events."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Available Live Sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Title</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Action</TableHead>
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
                    No sessions open for registration at this time.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div>{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.course?.title}</div>
                    </TableCell>
                    <TableCell>{s.trainerName || "Corporate Academy"}</TableCell>
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
                            {s.location || "Office"}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.capacity - (s._count?.attendances || 0)} seats left
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => registerMutation.mutate(s.id)}
                        disabled={registerMutation.isPending}
                        className="gap-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Register
                      </Button>
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

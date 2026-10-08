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
import { CheckSquare, Calendar, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/meetings/action-items")({
  component: MeMeetingActionItemsPage,
});

export default function MeMeetingActionItemsPage() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["me-meeting-action-items"],
    queryFn: async () => {
      const res = await api.get("/me/meetings/action-items");
      return res.data;
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/me/meetings/action-items/${id}`, { status: "completed" });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Action item marked as completed");
      queryClient.invalidateQueries({ queryKey: ["me-meeting-action-items"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update item");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Action Items & Deliverables"
        description="Action items assigned to you during team and executive meetings with due dates."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-indigo-500" />
            My Action Items ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deliverable Title</TableHead>
                <TableHead>Meeting Reference</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading your deliverables...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    You have no pending action items assigned to you.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <div>{i.title}</div>
                      {i.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {i.meeting?.title || "Direct Decision"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {i.dueDate ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(i.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.status === "completed" ? "default" : "secondary"}>
                        {i.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {i.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markCompleteMutation.mutate(i.id)}
                          className="gap-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Completed
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
    </div>
  );
}

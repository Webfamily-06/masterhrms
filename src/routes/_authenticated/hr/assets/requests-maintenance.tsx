import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Wrench, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/assets/requests-maintenance")({
  component: HrAssetRequestsMaintenancePage,
});

export default function HrAssetRequestsMaintenancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("requests");

  const { data, isLoading } = useQuery({
    queryKey: ["hr-assets-requests-maintenance"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/requests-maintenance");
      return res.data;
    },
  });

  const requests = data?.requests || [];
  const maintenance = data?.maintenance || [];

  const reviewRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const res = await api.patch(`/hr/assets/requests/${id}`, {
        status,
        adminNotes: `Reviewed by HR Administrator (${status})`,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset request status updated");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-requests-maintenance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update request");
    },
  });

  const completeMaintenanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/hr/assets/maintenance/${id}/complete`, {
        resolutionDetails: "Serviced and tested successfully",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Maintenance marked as completed");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-requests-maintenance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to complete maintenance");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asset Requests & Maintenance"
        description="Review hardware requisitions from staff, and oversee device repair / servicing logs."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests">Staff Requisitions ({requests.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance & Repairs ({maintenance.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Employee Hardware Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Requested Item</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Loading requests...
                      </TableCell>
                    </TableRow>
                  ) : requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No pending hardware requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </TableCell>
                        <TableCell>{r.itemName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {r.purpose}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === "approved" ? "default" : r.status === "pending" ? "secondary" : "destructive"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => reviewRequestMutation.mutate({ id: r.id, status: "approved" })}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => reviewRequestMutation.mutate({ id: r.id, status: "rejected" })}
                                className="text-rose-600 hover:text-rose-700"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                Equipment Maintenance Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Issue Description</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Loading maintenance records...
                      </TableCell>
                    </TableRow>
                  ) : maintenance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No equipment currently under maintenance.
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenance.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          <div>{m.asset?.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.asset?.assetTag}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{m.serviceType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate">{m.issueDescription}</TableCell>
                        <TableCell className="text-sm">{new Date(m.serviceDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={m.status === "completed" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {m.status !== "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => completeMaintenanceMutation.mutate(m.id)}
                            >
                              Mark Repaired
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

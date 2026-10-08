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
import { Send, Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/assets/requests")({
  component: MeAssetRequestsPage,
});

export default function MeAssetRequestsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    categoryName: "Hardware",
    quantity: 1,
    purpose: "",
    priority: "medium",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["me-asset-requests"],
    queryFn: async () => {
      const res = await api.get("/me/assets/requests");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/me/assets/requests", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Equipment request submitted to IT Admin");
      queryClient.invalidateQueries({ queryKey: ["me-asset-requests"] });
      queryClient.invalidateQueries({ queryKey: ["me-assets-dashboard"] });
      setIsModalOpen(false);
      setFormData({
        itemName: "",
        categoryName: "Hardware",
        quantity: 1,
        purpose: "",
        priority: "medium",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit request");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Equipment Requests"
        description="Submit requisitions for replacement laptops, external monitors, mice, or developer peripherals."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Equipment Request
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-500" />
            Submitted Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Business Purpose</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading your requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    You have not submitted any equipment requests. Click "New Equipment Request" to requisition hardware.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.itemName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.categoryName || "Hardware"}</Badge>
                    </TableCell>
                    <TableCell>{r.quantity || 1}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {r.purpose}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(r.requestedAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {r.status}
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
            <DialogTitle>Request Hardware / Peripherals</DialogTitle>
            <DialogDescription>Submit requisition details for IT admin review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name & Model</Label>
              <Input
                placeholder="e.g. 27-inch 4K Monitor, Ergonomic Keyboard"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
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
            </div>
            <div className="space-y-2">
              <Label>Justification / Purpose</Label>
              <Textarea
                placeholder="Reason for requisition (e.g. Broken display, Project requirement)..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.itemName || !formData.purpose || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Requisition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import { Award, Plus, Trash2, Calendar, Gift, DollarSign, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/awards")({
  component: HrAwardsPage,
});

export default function HrAwardsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    awardDate: new Date().toISOString().split("T")[0],
    giftItem: "",
    giftAmount: "0",
    description: "",
    presentedBy: "",
    certificateNo: "",
  });

  const { data: awards = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-awards"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/awards");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=200");
      return res.data?.data || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/lifecycle/awards", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-awards"] });
      toast.success("Award successfully granted.");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        awardDate: new Date().toISOString().split("T")[0],
        giftItem: "",
        giftAmount: "0",
        description: "",
        presentedBy: "",
        certificateNo: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to grant award.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/lifecycle/awards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-awards"] });
      toast.success("Award record removed.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Recognition & Awards"
        description="Celebrate outstanding contributions, long service milestones, and exceptional performance achievements."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Grant New Award
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Honors Granted" value={String(awards.length)} icon={Award} description="Company-wide honors" />
        <StatCard
          title="Cash Awards Value"
          value={`₹${awards.reduce((sum: number, a: any) => sum + Number(a.giftAmount || 0), 0).toLocaleString()}`}
          icon={DollarSign}
          description="Total monetary recognition"
        />
        <StatCard
          title="Recipients Recognized"
          value={String(new Set(awards.map((a: any) => a.employeeId)).size)}
          icon={UserCheck}
          description="Unique team members"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recognition Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Award Date</TableHead>
                <TableHead>Gift / Honor</TableHead>
                <TableHead>Monetary Value</TableHead>
                <TableHead>Presented By</TableHead>
                <TableHead>Certificate #</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading recognition records...
                  </TableCell>
                </TableRow>
              ) : awards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No awards granted yet. Click "Grant New Award" to recognize team members.
                  </TableCell>
                </TableRow>
              ) : (
                awards.map((award: any) => (
                  <TableRow key={award.id}>
                    <TableCell className="font-medium">
                      {award.employee?.firstName} {award.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{award.employee?.employeeCode}</span>
                    </TableCell>
                    <TableCell>{new Date(award.awardDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Gift className="h-3 w-3" /> {award.giftItem || "Honorary Plaque"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(award.giftAmount) > 0 ? `₹${Number(award.giftAmount).toLocaleString()}` : "Honorary"}
                    </TableCell>
                    <TableCell>{award.presentedBy || "Leadership Team"}</TableCell>
                    <TableCell className="font-mono text-xs">{award.certificateNo || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(award.id)}
                        className="text-muted-foreground hover:text-destructive"
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

      {/* Grant Award Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Employee Award</DialogTitle>
            <DialogDescription>Record a formal honor, monetary reward, or achievement recognition.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => setFormData({ ...formData, employeeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Award Date *</Label>
              <Input
                type="date"
                value={formData.awardDate}
                onChange={(e) => setFormData({ ...formData, awardDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Award Item / Honor *</Label>
              <Input
                placeholder="e.g. Star Performer of the Quarter"
                value={formData.giftItem}
                onChange={(e) => setFormData({ ...formData, giftItem: e.target.value })}
              />
            </div>
            <div>
              <Label>Cash Reward Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.giftAmount}
                onChange={(e) => setFormData({ ...formData, giftAmount: e.target.value })}
              />
            </div>
            <div>
              <Label>Presented By</Label>
              <Input
                placeholder="e.g. Managing Director"
                value={formData.presentedBy}
                onChange={(e) => setFormData({ ...formData, presentedBy: e.target.value })}
              />
            </div>
            <div>
              <Label>Citation & Remarks</Label>
              <Textarea
                placeholder="Citation text describing achievements..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.giftItem || createMutation.isPending}
            >
              {createMutation.isPending ? "Granting..." : "Confirm & Grant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

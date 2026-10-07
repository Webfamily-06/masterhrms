import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { MapPin, Plus, Trash2, CheckCircle2, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/job-locations")({
  component: JobLocationsPage,
});

export default function JobLocationsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    isRemote: false,
  });

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["hr-job-locations"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/job-locations");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/job-locations", payload);
    },
    onSuccess: () => {
      toast.success("Job location created");
      queryClient.invalidateQueries({ queryKey: ["hr-job-locations"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        code: "",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        isRemote: false,
      });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create location"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/job-locations/${id}`);
    },
    onSuccess: () => {
      toast.success("Job location deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-job-locations"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Job Locations"
          description="Geographic branches, office hubs, and remote workplace classifications."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Locations"
          value={locations.length.toString()}
          description="Configured hiring locations"
          icon={<MapPin className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Remote Options"
          value={locations.filter((l: any) => l.isRemote).length.toString()}
          description="Fully remote / distributed"
          icon={<Globe className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations Directory</CardTitle>
          <CardDescription>Available office hubs and hiring jurisdictions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>City / Region</TableHead>
                <TableHead>Work Mode</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No job locations created yet.
                  </TableCell>
                </TableRow>
              ) : (
                locations.map((loc: any) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-semibold">{loc.name}</TableCell>
                    <TableCell className="font-mono text-xs">{loc.code}</TableCell>
                    <TableCell className="text-sm">
                      {loc.city ? `${loc.city}, ${loc.state || ""}` : loc.country || "Global"}
                    </TableCell>
                    <TableCell>
                      {loc.isRemote ? (
                        <Badge className="bg-purple-500/10 text-purple-600">Remote</Badge>
                      ) : (
                        <Badge variant="outline">On-site / Hybrid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(loc.id)}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Job Location</DialogTitle>
            <DialogDescription>Define an office branch or remote hiring zone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Location Name *</Label>
              <Input
                placeholder="e.g. Bangalore Headquarters"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                placeholder="e.g. BLR-HQ"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Remote / Work-from-Anywhere</Label>
              <Switch
                checked={formData.isRemote}
                onCheckedChange={(checked) => setFormData({ ...formData, isRemote: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type ReviewStatus = "scheduled" | "in_progress" | "completed";

interface CycleRecord {
  id: string;
  name: string;
  title?: string;
  status?: string;
}

export default function ScheduleEmployeeReviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employeeId: "",
    reviewerId: "",
    cycleId: "",
    reviewDate: "",
    status: "scheduled" as ReviewStatus,
  });

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-employees-list-reviews"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=300");
      return unwrapArray(res);
    },
  });

  const { data: cycles = [] } = useQuery<CycleRecord[]>({
    queryKey: ["hr-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/cycles");
      return unwrapArray<CycleRecord>(res);
    },
  });

  // Only show Active review cycles created on the Review Cycles page
  const activeCycles = useMemo(
    () =>
      cycles.filter(
        (c) => String(c.status || "active").toLowerCase() !== "inactive"
      ),
    [cycles]
  );

  const scheduleMutation = useMutation({
    mutationFn: async (payload: typeof formData) =>
      api.post("/hr/performance/reviews", payload),
    onSuccess: () => {
      toast.success("Performance review scheduled");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      router.push("/hr/performance/reviews");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to schedule review");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!formData.reviewerId) {
      toast.error("Please select a reviewer");
      return;
    }
    if (!formData.cycleId) {
      toast.error("Please select a review cycle");
      return;
    }
    if (!formData.reviewDate) {
      toast.error("Please select a review date");
      return;
    }
    scheduleMutation.mutate(formData);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Schedule Employee Review"
        description="Schedule a new performance review for an employee."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/hr/performance/reviews")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
        }
      />

      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground">Schedule New Review</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a new performance review for an employee
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {/* Employee */}
            <div className="space-y-1.5">
              <Label>
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, employeeId: val }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reviewer */}
            <div className="space-y-1.5">
              <Label>
                Reviewer <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.reviewerId}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, reviewerId: val }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {`${emp.firstName || ""} ${emp.lastName || ""}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Review Cycle (Live Active Cycles Only) */}
            <div className="space-y-1.5">
              <Label>
                Review Cycle <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.cycleId}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, cycleId: val }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select review cycle" />
                </SelectTrigger>
                <SelectContent>
                  {activeCycles.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No active review cycles found. Create one in Review Cycles.
                    </div>
                  ) : (
                    activeCycles.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Review Date */}
            <div className="space-y-1.5">
              <Label>
                Review Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.reviewDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, reviewDate: e.target.value }))
                }
                className="bg-background"
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, status: val as ReviewStatus }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/hr/performance/reviews")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Review"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

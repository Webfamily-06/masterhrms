import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Award, Plus, Edit2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/designations")({
  component: DesignationsPage,
  head: () => ({
    meta: [{ title: "Designations & Job Titles — Master HRMS" }],
  }),
});

interface DesignationRecord {
  id?: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  status: "active" | "inactive";
  allowedActions?: string[];
  department?: { id: string; name: string };
}

const initialDesig: DesignationRecord = {
  name: "",
  description: "",
  departmentId: null,
  status: "active",
};

export function DesignationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch departments for dropdown
  const { data: departments = [] } = useQuery({
    queryKey: ["departments-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const {
    data: designations,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
    refetch,
  } = useMasterList<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    queryKey: "designations-list",
    defaultLimit: 15,
    defaultSortBy: "name",
    defaultSortOrder: "asc",
  });

  const {
    values,
    setValues,
    handleChange,
    submit,
    isSubmitting,
    isEditMode,
    reset,
  } = useMasterForm<DesignationRecord>({
    endpoint: "/hr/organization/designations",
    queryKeyToInvalidate: "designations-list",
    initialValues: initialDesig,
    onSuccess: () => {
      setIsDialogOpen(false);
      reset();
      refetch();
    },
  });

  const handleOpenAdd = () => {
    reset();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (desig: DesignationRecord) => {
    setValues(desig);
    setIsDialogOpen(true);
  };

  const activeCount = designations.filter((d) => d.status === "active").length;
  const inactiveCount = designations.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Designations & Job Titles"
        description="Formal organizational roles, job titles, and departmental hierarchy levels."
        icon={Award}
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Designation
          </Button>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Designations"
          value={total}
          icon={Award}
          description="Defined organizational roles"
        />
        <StatCard
          title="Active Roles"
          value={activeCount}
          icon={CheckCircle}
          description="In-use job titles"
        />
        <StatCard
          title="Inactive Roles"
          value={inactiveCount}
          icon={XCircle}
          description="Archived designations"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search designations by job title or description..."
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designation / Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading designations...
                </TableCell>
              </TableRow>
            ) : designations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No designations found.
                </TableCell>
              </TableRow>
            ) : (
              designations.map((desig) => (
                <TableRow key={desig.id || desig.name}>
                  <TableCell className="font-semibold text-foreground">
                    {desig.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {desig.department?.name || "General / Cross-functional"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {desig.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={desig.status === "active" ? "default" : "secondary"}>
                      {desig.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(desig)}
                      className="h-8 gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
            <span>
              Showing page {page} of {totalPages} ({total} total records)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Designation" : "Add New Designation"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="desig-name">Designation Title *</Label>
              <Input
                id="desig-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Senior Software Architect"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desig-dept">Department (Optional)</Label>
              <Select
                value={values.departmentId || "none"}
                onValueChange={(val) =>
                  handleChange("departmentId", val === "none" ? null : val)
                }
              >
                <SelectTrigger id="desig-dept">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / Cross-functional</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desig-desc">Job Description</Label>
              <Input
                id="desig-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Summary of scope and role expectations"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Designation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

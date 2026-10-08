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
import { Boxes, Plus, Edit2, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/departments")({
  component: DepartmentsPage,
  head: () => ({
    meta: [{ title: "Departments — Master HRMS" }],
  }),
});

interface DepartmentRecord {
  id?: string;
  name: string;
  description?: string;
  branchId?: string | null;
  status: "active" | "inactive";
  allowedActions?: string[];
  branch?: { id: string; name: string };
}

const initialDept: DepartmentRecord = {
  name: "",
  description: "",
  branchId: null,
  status: "active",
};

export function DepartmentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch branches for branch dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ["branches-dropdown"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const {
    data: departments,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
    refetch,
  } = useMasterList<DepartmentRecord>({
    endpoint: "/hr/organization/departments",
    queryKey: "departments-list",
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
  } = useMasterForm<DepartmentRecord>({
    endpoint: "/hr/organization/departments",
    queryKeyToInvalidate: "departments-list",
    initialValues: initialDept,
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

  const handleOpenEdit = (dept: DepartmentRecord) => {
    setValues(dept);
    setIsDialogOpen(true);
  };

  const activeCount = departments.filter((d: any) => d.status === "active").length;
  const inactiveCount = departments.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Functional business units and departmental hierarchy across workspace facilities."
        icon={Boxes}
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Departments"
          value={total}
          icon={Boxes}
          description="Functional operational groups"
        />
        <StatCard
          title="Active Departments"
          value={activeCount}
          icon={CheckCircle}
          description="Operating team units"
        />
        <StatCard
          title="Inactive Departments"
          value={inactiveCount}
          icon={XCircle}
          description="Archived or merged business units"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search departments by name or description..."
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Facility / Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading departments...
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No departments found.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept: any) => (
                <TableRow key={dept.id || dept.name}>
                  <TableCell className="font-semibold text-foreground">
                    {dept.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dept.description || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {dept.branch?.name || "Global / All Branches"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dept.status === "active" ? "default" : "secondary"}>
                      {dept.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(dept)}
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
              {isEditMode ? "Edit Department" : "Add New Department"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Engineering & Technology"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-branch">Assigned Branch (Optional)</Label>
              <Select
                value={values.branchId || "none"}
                onValueChange={(val) =>
                  handleChange("branchId", val === "none" ? null : val)
                }
              >
                <SelectTrigger id="dept-branch">
                  <SelectValue placeholder="Select facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Global / All Facilities</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dept-desc">Description</Label>
              <Input
                id="dept-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Brief summary of department responsibilities"
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
                    : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMasterList } from "@/hooks/use-master-list";
import { useMasterForm } from "@/hooks/use-master-form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Trophy, Plus, Edit2, Star, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/award-types")({
  component: AwardTypesPage,
  head: () => ({
    meta: [{ title: "Award Types — Master HRMS" }],
  }),
});

interface AwardTypeRecord {
  id?: string;
  name: string;
  icon?: string;
  description?: string;
}

const initialAwardType: AwardTypeRecord = {
  name: "",
  icon: "Trophy",
  description: "",
};

export function AwardTypesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: awardTypes,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
    refetch,
  } = useMasterList<AwardTypeRecord>({
    endpoint: "/hr/organization/award-types",
    queryKey: "award-types-list",
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
  } = useMasterForm<AwardTypeRecord>({
    endpoint: "/hr/organization/award-types",
    queryKeyToInvalidate: "award-types-list",
    initialValues: initialAwardType,
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

  const handleOpenEdit = (at: AwardTypeRecord) => {
    setValues(at);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Award Types"
        description="Recognition categories, merit badges, and excellence award designations."
        icon={Trophy}
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Award Type
          </Button>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Award Categories"
          value={total}
          icon={Trophy}
          description="Registered employee achievement awards"
        />
        <StatCard
          title="Merit Badges"
          value={awardTypes.length}
          icon={Star}
          description="Active recognition types"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search award types by title or description..."
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award Title</TableHead>
              <TableHead>Icon Identifier</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Loading award categories...
                </TableCell>
              </TableRow>
            ) : awardTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No award types configured.
                </TableCell>
              </TableRow>
            ) : (
              awardTypes.map((at: any) => (
                <TableRow key={at.id || at.name}>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span>{at.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {at.icon || "Trophy"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {at.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(at)}
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Award Type" : "Add New Award Type"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="at-name">Award Name *</Label>
              <Input
                id="at-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Employee of the Month"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="at-icon">Icon Identifier</Label>
              <Input
                id="at-icon"
                value={values.icon || ""}
                onChange={(e) => handleChange("icon", e.target.value)}
                placeholder="e.g. Trophy, Star, Medal"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="at-desc">Description</Label>
              <Input
                id="at-desc"
                value={values.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Recognition criteria and eligibility"
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
                    : "Create Award Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

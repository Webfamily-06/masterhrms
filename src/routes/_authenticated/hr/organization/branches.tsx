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
import { Badge } from "@/components/ui/badge";
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
import { Building2, Plus, Edit2, MapPin, Phone, Mail, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/branches")({
  component: BranchesPage,
  head: () => ({
    meta: [{ title: "Branches & Locations — Master HRMS" }],
  }),
});

interface BranchRecord {
  id?: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
  allowedActions?: string[];
}

const initialBranch: BranchRecord = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
  status: "active",
};

export function BranchesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: branches,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
    refetch,
  } = useMasterList<BranchRecord>({
    endpoint: "/hr/organization/branches",
    queryKey: "branches-list",
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
  } = useMasterForm<BranchRecord>({
    endpoint: "/hr/organization/branches",
    queryKeyToInvalidate: "branches-list",
    initialValues: initialBranch,
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

  const handleOpenEdit = (branch: BranchRecord) => {
    setValues(branch);
    setIsDialogOpen(true);
  };

  const activeCount = branches.filter((b: any) => b.status === "active").length;
  const inactiveCount = branches.length - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches & Locations"
        description="Authoritative master directory of organization corporate offices, regional centers, and operating facilities."
        icon={Building2}
        actions={
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Branches"
          value={total}
          icon={Building2}
          description="Registered organizational facilities"
        />
        <StatCard
          title="Active Facilities"
          value={activeCount}
          icon={CheckCircle}
          description="Operational workspace nodes"
        />
        <StatCard
          title="Inactive Locations"
          value={inactiveCount}
          icon={XCircle}
          description="Decommissioned or pending branches"
        />
      </StatsOverviewGrid>

      <FilterToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search branch by name, code, phone, or email..."
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch Name & Code</TableHead>
              <TableHead>Location / Address</TableHead>
              <TableHead>Contact Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading branch directory...
                </TableCell>
              </TableRow>
            ) : branches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No branches found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              branches.map((b: any) => (
                <TableRow key={b.id || b.code}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{b.name}</div>
                    <div className="text-xs text-muted-foreground">Code: {b.code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{b.address || "No address specified"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {b.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{b.email}</span>
                        </div>
                      )}
                      {b.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{b.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.status === "active" ? "default" : "secondary"}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(b)}
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
            <DialogTitle>{isEditMode ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                value={values.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. Bangalore Headquarters"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-code">Branch Code *</Label>
              <Input
                id="branch-code"
                value={values.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="e.g. BLR-HQ"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-address">Address</Label>
              <Input
                id="branch-address"
                value={values.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="e.g. Outer Ring Road, Bellandur"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-phone">Phone</Label>
                <Input
                  id="branch-phone"
                  value={values.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 80 1234 5678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-email">Email</Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={values.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
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
                {isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

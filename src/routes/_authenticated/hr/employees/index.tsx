import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  UploadCloud,
  Eye,
  CheckCircle,
  Clock,
  UserX,
  Building,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/employees/")({
  component: EmployeesDirectoryPage,
  head: () => ({
    meta: [{ title: "Employee Directory — Master HRMS" }],
  }),
});

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  employmentType: string;
  status: "active" | "on_leave" | "terminated";
  joinedAt?: string;
  department?: { id: string; name: string };
  branch?: { id: string; name: string; code: string };
  designation?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string };
  allowedActions?: string[];
}

export function EmployeesDirectoryPage() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Fetch branches and departments for filter toolbars
  const { data: branches = [] } = useQuery({
    queryKey: ["filter-branches"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["filter-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const {
    data: employees,
    total,
    page,
    totalPages,
    setPage,
    search,
    setSearch,
    isLoading,
  } = useMasterList<EmployeeItem>({
    endpoint: "/hr/employees",
    queryKey: "hr-employees-list",
    defaultLimit: 15,
    defaultSortBy: "joinedAt",
    defaultSortOrder: "desc",
    extraParams: {
      branchId: selectedBranch !== "all" ? selectedBranch : undefined,
      departmentId: selectedDept !== "all" ? selectedDept : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
    },
  });

  const activeCount = employees.filter((e) => e.status === "active").length;
  const leaveCount = employees.filter((e) => e.status === "on_leave").length;
  const termCount = employees.filter((e) => e.status === "terminated").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Directory"
        description="Comprehensive workforce repository with role hierarchy, organizational placements, and security data scoping."
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/hr/employees/import">
              <Button variant="outline" className="gap-2">
                <UploadCloud className="h-4 w-4" />
                Import CSV / Excel
              </Button>
            </Link>
            <Link to="/hr/employees/new">
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </Link>
          </div>
        }
      />

      <StatsOverviewGrid>
        <StatCard
          title="Total Headcount"
          value={total}
          icon={Users}
          description="Total workforce records"
        />
        <StatCard
          title="Active Workforce"
          value={activeCount}
          icon={CheckCircle}
          description="Operational active staff"
        />
        <StatCard
          title="On Leave"
          value={leaveCount}
          icon={Clock}
          description="Temporary absence / leave"
        />
        <StatCard
          title="Terminated / Exited"
          value={termCount}
          icon={UserX}
          description="Former employees"
        />
      </StatsOverviewGrid>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <FilterToolbar
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name, code, email, or position..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32 text-xs h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name & Code</TableHead>
              <TableHead>Job Title & Designation</TableHead>
              <TableHead>Department & Facility</TableHead>
              <TableHead>Reporting Manager</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading employee workforce...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No employees found matching the specified filters.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                        {emp.firstName.slice(0, 1)}
                        {emp.lastName.slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {emp.firstName} {emp.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">{emp.employeeCode}</span> • {emp.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">
                      {emp.position || emp.designation?.name || "Member"}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {emp.employmentType?.replace("_", " ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {emp.department?.name || "General"}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building className="h-3 w-3" />
                      <span>{emp.branch?.name || "HQ Facility"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {emp.manager ? (
                      <span className="font-medium text-foreground">
                        {emp.manager.firstName} {emp.manager.lastName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {emp.joinedAt ? format(new Date(emp.joinedAt), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        emp.status === "active"
                          ? "default"
                          : emp.status === "on_leave"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to="/hr/employees/$id" params={{ id: emp.id }}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        View 360
                      </Button>
                    </Link>
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
    </div>
  );
}

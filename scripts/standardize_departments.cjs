const fs = require('fs');

function updateDepartments(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports
  if (!content.includes('GlobalListActionToolbar')) {
    content = content.replace(
      'import { StandardPagination } from "@/components/ui/standard-pagination";',
      `import { StandardPagination } from "@/components/ui/standard-pagination";\nimport { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";\nimport { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";`
    );
  }

  const exportBlock = `
  const deptExportColumns: ExportColumn<DepartmentRecord>[] = [
    { header: "Department Name", key: "name" },
    { header: "Branch", key: "branch.name", format: (_v, r) => r.branch?.name || "All Branches" },
    { header: "Description", key: "description" },
    { header: "Status", key: "status", format: (v) => (v === "active" ? "Active" : "Inactive") },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? departments.filter((d: any) => selectedIds.includes(d.id!))
      : departments;
    await exportToExcel({
      filename: \`departments_\${new Date().toISOString().split("T")[0]}\`,
      title: "Departments Directory",
      columns: deptExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} department(s) to Excel\`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? departments.filter((d: any) => selectedIds.includes(d.id!))
      : departments;
    await exportToPdf({
      filename: \`departments_\${new Date().toISOString().split("T")[0]}\`,
      title: "Departments Directory",
      columns: deptExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} department(s) to PDF\`);
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "active" | "inactive" }) => {
      return await api.post("/hr/organization/departments/bulk-archive", { ids, status });
    },
    onSuccess: (res: any, vars) => {
      toast.success(\`\${vars.status === "active" ? "Activated" : "De-activated"} \${res.data?.count || selectedIds.length} department(s)\`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk status update failed");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/departments/bulk-delete", { ids });
    },
    onSuccess: (res: any) => {
      const { deletedCount, failedCount } = res.data || {};
      if (failedCount > 0) {
        toast.warning(\`Deleted \${deletedCount} department(s). \${failedCount} could not be deleted (referenced).\`);
      } else {
        toast.success(\`Deleted \${deletedCount || selectedIds.length} department(s)\`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["departments-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });
`;

  if (!content.includes('const deptExportColumns')) {
    content = content.replace(
      '  // Bulk de-activate mutation',
      `${exportBlock}\n  // Bulk de-activate mutation`
    );
  }

  // Replace Filter and Search Toolbar
  const oldToolbarRegex = /\{\/\* Filter and Search Toolbar \*\/\}[\s\S]*?\{\/\* Table Section \*\/\}/;
  const newToolbar = `{/* Standard Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search by name, branch, description..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterSlot={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || branchFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setBranchFilter("all");
                  setPage(1);
                }}
                className="h-9 gap-1 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        }
        selectedCount={selectedIds.length}
        totalFilteredCount={total}
        onClearSelection={() => setSelectedIds([])}
        onBulkActivate={() => bulkStatusMutation.mutate({ ids: selectedIds, status: "active" })}
        onBulkDeactivate={() => bulkStatusMutation.mutate({ ids: selectedIds, status: "inactive" })}
        onBulkDelete={() => bulkDeleteMutation.mutate(selectedIds)}
        isActionLoading={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        primaryActionLabel="Add Department"
        onPrimaryAction={handleOpenAdd}
      />

      {/* Table Section */}`;

  if (oldToolbarRegex.test(content)) {
    content = content.replace(oldToolbarRegex, newToolbar);
    console.log(`Updated toolbar in ${filePath}`);
  } else {
    console.warn(`Could not find oldToolbar in ${filePath}`);
  }

  // Remove PageHeader actions
  content = content.replace(
    /actions=\{\s*<Button onClick=\{handleOpenAdd\} className="gap-2">[\s\S]*?<\/Button>\s*\}/,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

updateDepartments('src/routes/_authenticated/hr/organization/departments.tsx');
updateDepartments('CMS/src/app/(workspace)/hr/organization/departments/page.tsx');


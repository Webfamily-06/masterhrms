const fs = require('fs');

function updateHolidays(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports
  if (!content.includes('GlobalListActionToolbar')) {
    content = content.replace(
      'import { StandardPagination } from "@/components/ui/standard-pagination";',
      `import { StandardPagination } from "@/components/ui/standard-pagination";\nimport { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";\nimport { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";`
    );
  }

  const exportBlock = `
  const holidayExportColumns: ExportColumn<HolidayRecord>[] = [
    { header: "Holiday Name", key: "name" },
    { header: "Date", key: "date", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "Classification", key: "type" },
    { header: "Description", key: "description" },
    { header: "Status", key: "status", format: (v) => (v === "active" ? "Active" : "Inactive") },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? holidays.filter((h: any) => selectedIds.includes(h.id))
      : holidays;
    await exportToExcel({
      filename: \`holidays_\${new Date().toISOString().split("T")[0]}\`,
      title: "Holidays Directory",
      columns: holidayExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} holiday(s) to Excel\`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? holidays.filter((h: any) => selectedIds.includes(h.id))
      : holidays;
    await exportToPdf({
      filename: \`holidays_\${new Date().toISOString().split("T")[0]}\`,
      title: "Holidays Directory",
      columns: holidayExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} holiday(s) to PDF\`);
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "active" | "inactive" }) => {
      return await api.post("/hr/organization/holidays/bulk-archive", { ids, status });
    },
    onSuccess: (res: any, vars) => {
      toast.success(\`\${vars.status === "active" ? "Activated" : "De-activated"} \${res.data?.count || selectedIds.length} holiday(s)\`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk status update failed");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/holidays/bulk-delete", { ids });
    },
    onSuccess: (res: any) => {
      const { deletedCount, failedCount } = res.data || {};
      if (failedCount > 0) {
        toast.warning(\`Deleted \${deletedCount} holiday(s). \${failedCount} could not be deleted.\`);
      } else {
        toast.success(\`Deleted \${deletedCount || selectedIds.length} holiday(s)\`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["holidays-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });
`;

  if (!content.includes('const holidayExportColumns')) {
    content = content.replace(
      '  // Bulk de-activate mutation',
      `${exportBlock}\n  // Bulk de-activate mutation`
    );
  }

  // Replace Filter and Search Toolbar
  const oldToolbarRegex = /\{\/\* Filter and Search Toolbar \*\/\}[\s\S]*?\{\/\* Main Table Container \*\/\}/;
  const newToolbar = `{/* Standard Global List Action Toolbar */}
      <GlobalListActionToolbar
        searchPlaceholder="Search holidays by name or description..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        filterSlot={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Status</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                {holidayTypes.map((t: any) => (
                  <SelectItem key={t.id} value={t.name} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
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
        primaryActionLabel="Add Holiday"
        onPrimaryAction={handleOpenAdd}
      />

      {/* Main Table Container */}`;

  if (oldToolbarRegex.test(content)) {
    content = content.replace(oldToolbarRegex, newToolbar);
    console.log(`Updated toolbar in ${filePath}`);
  } else {
    console.warn(`Could not find oldToolbar in ${filePath}`);
  }

  // Remove Add Holiday from PageHeader actions so only Manage Types is in header
  content = content.replace(
    /<Button onClick=\{handleOpenAdd\} className="h-9 gap-2 text-xs">[\s\S]*?<\/Button>/,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

updateHolidays('src/routes/_authenticated/hr/organization/holidays.tsx');
updateHolidays('CMS/src/app/(workspace)/hr/organization/holidays/page.tsx');


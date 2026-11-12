const fs = require('fs');

function updateAwardTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports
  if (!content.includes('GlobalListActionToolbar')) {
    content = content.replace(
      'import { StandardPagination } from "@/components/ui/standard-pagination";',
      `import { StandardPagination } from "@/components/ui/standard-pagination";\nimport { GlobalListActionToolbar } from "@/components/ui/global-list-action-toolbar";\nimport { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";\nimport { Checkbox } from "@/components/ui/checkbox";`
    );
  }

  // Add selectedIds state and bulk operations
  const stateAndBulkBlock = `
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const awardTypeExportColumns: ExportColumn<AwardTypeRecord>[] = [
    { header: "Award Title", key: "name" },
    { header: "Workflow Category", key: "category" },
    { header: "Cash Grant / Value", key: "monetaryValue", format: (v) => (v ? \`\${v}\` : "None") },
    { header: "Description", key: "description" },
    { header: "Status", key: "status", format: (v) => (v === "active" ? "Active" : "Inactive") },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? awardTypes.filter((a: any) => selectedIds.includes(a.id))
      : awardTypes;
    await exportToExcel({
      filename: \`award_types_\${new Date().toISOString().split("T")[0]}\`,
      title: "Award Types Directory",
      columns: awardTypeExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} award type(s) to Excel\`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? awardTypes.filter((a: any) => selectedIds.includes(a.id))
      : awardTypes;
    await exportToPdf({
      filename: \`award_types_\${new Date().toISOString().split("T")[0]}\`,
      title: "Award Types Directory",
      columns: awardTypeExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} award type(s) to PDF\`);
  };

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "active" | "inactive" }) => {
      return await api.post("/hr/organization/award-types/bulk-archive", { ids, status });
    },
    onSuccess: (res: any, vars) => {
      toast.success(\`\${vars.status === "active" ? "Activated" : "De-activated"} \${res.data?.count || selectedIds.length} award type(s)\`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk status update failed");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return await api.post("/hr/organization/award-types/bulk-delete", { ids });
    },
    onSuccess: (res: any) => {
      const { deletedCount, failedCount } = res.data || {};
      if (failedCount > 0) {
        toast.warning(\`Deleted \${deletedCount} award type(s). \${failedCount} could not be deleted.\`);
      } else {
        toast.success(\`Deleted \${deletedCount || selectedIds.length} award type(s)\`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["award-types-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });

  const currentPageIds = awardTypes.map((a: any) => a.id).filter(Boolean);
  const isAllCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));
  const isPartiallySelected =
    currentPageIds.some((id) => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };
`;

  if (!content.includes('const [selectedIds, setSelectedIds]')) {
    content = content.replace(
      '  const { values, errors',
      `${stateAndBulkBlock}\n  const { values, errors`
    );
  }

  // Replace FilterToolbar with GlobalListActionToolbar
  const oldToolbarRegex = /<FilterToolbar[\s\S]*?\/>/;
  const newToolbar = `<GlobalListActionToolbar
        searchPlaceholder="Search award types by title or description..."
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
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
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
        primaryActionLabel="Add Award Type"
        onPrimaryAction={handleOpenAdd}
      />`;

  if (oldToolbarRegex.test(content)) {
    content = content.replace(oldToolbarRegex, newToolbar);
    console.log(`Updated toolbar in ${filePath}`);
  }

  // Add checkbox in table header
  const oldHeaderRow = `<TableRow className="bg-muted/40">\n              <TableHead className="w-16">Badge</TableHead>`;
  const newHeaderRow = `<TableRow className="bg-muted/40">
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all award types on this page"
                />
              </TableHead>
              <TableHead className="w-16">Badge</TableHead>`;

  if (content.includes(oldHeaderRow)) {
    content = content.replace(oldHeaderRow, newHeaderRow);
    console.log(`Added header checkbox in ${filePath}`);
  }

  // Add checkbox in table row
  const oldTableRow = `<TableCell>\n                        <div className="flex h-9 w-9`;
  const newTableRow = `<TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(type.id)}
                          onCheckedChange={(checked) => handleSelectRow(type.id, Boolean(checked))}
                          aria-label={\`Select award type \${type.name}\`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex h-9 w-9`;

  if (content.includes(oldTableRow)) {
    content = content.replace(oldTableRow, newTableRow);
    console.log(`Added row checkbox in ${filePath}`);
  }

  // Remove Add Award Type from PageHeader
  content = content.replace(
    /<Button onClick=\{handleOpenAdd\} className="h-9 gap-2 text-xs font-medium">[\s\S]*?<\/Button>/,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

updateAwardTypes('src/routes/_authenticated/hr/organization/award-types.tsx');
updateAwardTypes('CMS/src/app/(workspace)/hr/organization/award-types/page.tsx');


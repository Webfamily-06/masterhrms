const fs = require('fs');

function updateAnnouncements(filePath) {
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

  const announcementExportColumns: ExportColumn<AnnouncementRecord>[] = [
    { header: "Title", key: "title" },
    { header: "Target Scope", key: "branchId", format: (_v, r) => (r.department?.name ? \`\${r.department.name}\` : r.branch?.name ? \`\${r.branch.name}\` : "All Organization") },
    { header: "Priority", key: "priority" },
    { header: "Start Date", key: "startDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "End Date", key: "endDate", format: (v) => (v ? new Date(v).toISOString().split("T")[0] : "") },
    { header: "Status", key: "status", format: (v) => (v === "active" ? "Active" : "Inactive") },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a: any) => selectedIds.includes(a.id))
      : announcements;
    await exportToExcel({
      filename: \`announcements_\${new Date().toISOString().split("T")[0]}\`,
      title: "Announcements Directory",
      columns: announcementExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} announcement(s) to Excel\`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? announcements.filter((a: any) => selectedIds.includes(a.id))
      : announcements;
    await exportToPdf({
      filename: \`announcements_\${new Date().toISOString().split("T")[0]}\`,
      title: "Announcements Directory",
      columns: announcementExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} announcement(s) to PDF\`);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete sequentially or via bulk
      for (const id of ids) {
        await api.delete(\`/hr/organization/announcements/\${id}\`);
      }
    },
    onSuccess: () => {
      toast.success(\`Deleted \${selectedIds.length} announcement(s)\`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["announcements-list"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Bulk delete failed");
    },
  });

  const currentPageIds = announcements.map((a: any) => a.id).filter(Boolean);
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
      '  const handleOpenAdd = () => {',
      `${stateAndBulkBlock}\n  const handleOpenAdd = () => {`
    );
  }

  // Replace FilterToolbar with GlobalListActionToolbar
  const oldToolbarRegex = /<FilterToolbar[\s\S]*?\/>/;
  const newToolbar = `<GlobalListActionToolbar
        searchPlaceholder="Search announcements by title or content..."
        searchTerm={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        selectedCount={selectedIds.length}
        totalFilteredCount={total}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={() => bulkDeleteMutation.mutate(selectedIds)}
        isActionLoading={bulkDeleteMutation.isPending}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        primaryActionLabel="Publish Notice"
        onPrimaryAction={handleOpenAdd}
      />`;

  if (oldToolbarRegex.test(content)) {
    content = content.replace(oldToolbarRegex, newToolbar);
    console.log(`Updated toolbar in ${filePath}`);
  }

  // Add checkbox in table header
  const oldHeaderRow = `<TableHeader>\n            <TableRow>\n              <TableHead>Title & Category</TableHead>`;
  const newHeaderRow = `<TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all announcements on this page"
                />
              </TableHead>
              <TableHead>Title & Category</TableHead>`;

  if (content.includes(oldHeaderRow)) {
    content = content.replace(oldHeaderRow, newHeaderRow);
    console.log(`Added header checkbox in ${filePath}`);
  }

  // Add checkbox in table row
  const oldTableRow = `<TableRow key={a.id}>\n              <TableCell>`;
  const newTableRow = `<TableRow key={a.id}>
              <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(a.id)}
                  onCheckedChange={(checked) => handleSelectRow(a.id, Boolean(checked))}
                  aria-label={\`Select announcement \${a.title}\`}
                />
              </TableCell>
              <TableCell>`;

  if (content.includes(oldTableRow)) {
    content = content.replace(oldTableRow, newTableRow);
    console.log(`Added row checkbox in ${filePath}`);
  }

  // Remove Publish Notice from PageHeader
  content = content.replace(
    /<Button onClick=\{handleOpenAdd\} className="gap-2">[\s\S]*?<\/Button>/,
    ''
  );

  fs.writeFileSync(filePath, content, 'utf8');
}

updateAnnouncements('src/routes/_authenticated/hr/organization/announcements.tsx');
updateAnnouncements('CMS/src/app/(workspace)/hr/organization/announcements/page.tsx');


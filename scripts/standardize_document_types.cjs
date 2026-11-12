const fs = require('fs');

function updateDocTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add imports
  if (!content.includes('StandardPagination')) {
    content = content.replace(
      'import { Button } from "@/components/ui/button";',
      `import { Button } from "@/components/ui/button";\nimport { StandardPagination } from "@/components/ui/standard-pagination";\nimport { GlobalExportDropdown } from "@/components/ui/global-export-dropdown";\nimport { exportToExcel, exportToPdf, ExportColumn } from "@/lib/export-utils";\nimport { Checkbox } from "@/components/ui/checkbox";`
    );
  }

  // Add pagination state & selection state
  const stateBlock = `
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const docTypeExportColumns: ExportColumn<DocumentTypeItem>[] = [
    { header: "Document Name", key: "name" },
    { header: "Code", key: "code" },
    { header: "Category", key: "category" },
    { header: "Required for Onboarding", key: "isMandatory", format: (v) => (v ? "Yes" : "No") },
    { header: "Status", key: "status", format: (v) => (v === "active" ? "Active" : "Inactive") },
    { header: "Description", key: "description" },
  ];

  const handleExportExcel = async () => {
    const dataToExport = selectedIds.length > 0
      ? filteredDocumentTypes.filter((d: any) => selectedIds.includes(d.id))
      : filteredDocumentTypes;
    await exportToExcel({
      filename: \`document_types_\${new Date().toISOString().split("T")[0]}\`,
      title: "Document Types Directory",
      columns: docTypeExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} document type(s) to Excel\`);
  };

  const handleExportPdf = async () => {
    const dataToExport = selectedIds.length > 0
      ? filteredDocumentTypes.filter((d: any) => selectedIds.includes(d.id))
      : filteredDocumentTypes;
    await exportToPdf({
      filename: \`document_types_\${new Date().toISOString().split("T")[0]}\`,
      title: "Document Types Directory",
      columns: docTypeExportColumns,
      data: dataToExport,
    });
    toast.success(\`Exported \${dataToExport.length} document type(s) to PDF\`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await api.delete(\`/hr/organization/document-types/\${id}\`);
      }
      toast.success(\`Deleted \${selectedIds.length} document type(s)\`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["document-types"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete selected document types");
    }
  };
`;

  if (!content.includes('const [selectedIds, setSelectedIds]')) {
    content = content.replace(
      '  // Modal & Form States',
      `${stateBlock}\n  // Modal & Form States`
    );
  }

  // Paginate filteredDocumentTypes
  if (!content.includes('const paginatedDocTypes =')) {
    content = content.replace(
      '  const filteredDocumentTypes = useMemo(() => {',
      `  const paginatedDocTypes = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDocumentTypes.slice(start, start + pageSize);
  }, [filteredDocumentTypes, page, pageSize]);

  const currentPageIds = paginatedDocTypes.map((d: any) => d.id).filter(Boolean);
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

  const filteredDocumentTypes = useMemo(() => {`
    );
  }

  // Replace filteredDocumentTypes.map with paginatedDocTypes.map
  content = content.replace(
    'filteredDocumentTypes.map((item) => {',
    'paginatedDocTypes.map((item) => {'
  );

  // Add Export Dropdown next to filter tabs
  const filterTabsTarget = '</div>\n              </div>\n\n              {/* Document Types Table */}';
  const filterTabsReplacement = `</div>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="h-9 gap-1 text-xs"
                    >
                      Delete ({selectedIds.length})
                    </Button>
                  )}
                  <GlobalExportDropdown
                    onExportExcel={handleExportExcel}
                    onExportPdf={handleExportPdf}
                    selectedCount={selectedIds.length}
                    totalFilteredCount={filteredDocumentTypes.length}
                  />
                </div>
              </div>

              {/* Document Types Table */}`;

  if (content.includes(filterTabsTarget)) {
    content = content.replace(filterTabsTarget, filterTabsReplacement);
  }

  // Add table header checkbox
  const oldTh = '<TableHead className="w-[60%] font-semibold">Name</TableHead>';
  const newTh = `<TableHead className="w-12 text-center">
                        <Checkbox
                          checked={isAllCurrentPageSelected ? true : isPartiallySelected ? "indeterminate" : false}
                          onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                          aria-label="Select all document types on this page"
                        />
                      </TableHead>
                      <TableHead className="w-[50%] font-semibold">Name</TableHead>`;
  if (content.includes(oldTh)) {
    content = content.replace(oldTh, newTh);
  }

  // Add table row checkbox
  const oldTr = '<TableRow key={item.id} className="hover:bg-muted/40 transition-colors">\n                            <TableCell className="align-top py-3">';
  const newTr = `<TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="w-12 text-center align-top py-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.includes(item.id)}
                                onCheckedChange={(checked) => handleSelectRow(item.id, Boolean(checked))}
                                aria-label={\`Select \${item.name}\`}
                              />
                            </TableCell>
                            <TableCell className="align-top py-3">`;
  if (content.includes(oldTr)) {
    content = content.replace(oldTr, newTr);
  }

  // Add StandardPagination below table
  const oldTableEnd = '</Table>\n              </div>\n            </CardContent>';
  const newTableEnd = `</Table>
              </div>

              {/* Standard Pagination */}
              <StandardPagination
                page={page}
                pageSize={pageSize}
                total={filteredDocumentTypes.length}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            </CardContent>`;

  if (content.includes(oldTableEnd)) {
    content = content.replace(oldTableEnd, newTableEnd);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

updateDocTypes('src/routes/_authenticated/hr/organization/document-types.tsx');
updateDocTypes('CMS/src/app/(workspace)/hr/organization/document-types/page.tsx');


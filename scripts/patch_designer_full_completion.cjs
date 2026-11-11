const fs = require('fs');

function patchDesigner(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // A. Add lucide icons if missing
  const neededIcons = ['Upload', 'RefreshCw', 'Check', 'AlignHorizontalJustifyCenter', 'AlignVerticalJustifyCenter', 'Copy', 'Trash2', 'FolderOpen', 'Maximize2'];
  neededIcons.forEach(icon => {
    if (!code.includes(icon) && code.includes('import {')) {
      code = code.replace('import {', `import {\n  ${icon},`);
    }
  });

  // B. Add primary logo query & branding assets query in editor
  const targetTemplateQuery = `  // Fetch Template
  const { data: templateData, isLoading } = useQuery({`;

  const newQueries = `  // Fetch Authorized Branding Assets & Primary Logo
  const { data: brandingData } = useQuery({
    queryKey: ["certificate-studio-branding-assets"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/branding", {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (!res.ok) return { assets: [] };
      return res.json();
    }
  });

  const { data: primaryLogoData } = useQuery({
    queryKey: ["certificate-studio-primary-logo"],
    queryFn: async () => {
      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");
      const res = await fetch("/api/certificate-studio/branding/primary-logo", {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (!res.ok) return { primaryLogo: null };
      return res.json();
    }
  });

  // Fetch Template
  const { data: templateData, isLoading } = useQuery({`;

  if (!code.includes('["certificate-studio-primary-logo"]')) {
    code = code.replace(targetTemplateQuery, newQueries);
  }

  // C. Update template loading effect to auto-bind primary logo
  const oldEffect = `      const version = tpl.activeVersion || tpl.versions?.[0];
      const initialElements = (version?.designJson?.elements || []).map((el: any, idx: number) => ({
        ...el,
        zIndex: el.zIndex !== undefined ? el.zIndex : idx + 1
      }));
      setElements(initialElements);
      setHistory([JSON.parse(JSON.stringify(initialElements))]);
      setHistoryIndex(0);
    }
  }, [templateData]);`;

  const newEffect = `      const version = tpl.activeVersion || tpl.versions?.[0];
      const resolvedLogoUrl = primaryLogoData?.primaryLogo?.url || primaryLogoData?.primaryLogo?.storagePath || "/logo.webp";
      const initialElements = (version?.designJson?.elements || []).map((el: any, idx: number) => {
        let updatedUrl = el.url;
        // Auto-resolve primary logo if unbound or placeholder
        if ((el.type === "logo" || el.isLogo) && (!el.url || el.url === "{{organization.logo}}" || el.url === "/logo.webp")) {
          if (primaryLogoData?.primaryLogo) {
            updatedUrl = getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) || primaryLogoData.primaryLogo.url;
          }
        }
        return {
          ...el,
          url: updatedUrl,
          zIndex: el.zIndex !== undefined ? el.zIndex : idx + 1
        };
      });
      setElements(initialElements);
      setHistory([JSON.parse(JSON.stringify(initialElements))]);
      setHistoryIndex(0);
    }
  }, [templateData, primaryLogoData]);`;

  if (code.includes(oldEffect)) {
    code = code.replace(oldEffect, newEffect);
  }

  // D. Left Panel Drag & Drop implementation:
  // Add onDragStart helper to left-panel buttons
  const oldAddElementDef = `  // Add Element
  const addElement = (type: string, defaults: any = {}) => {`;

  const dragAndDropHelpers = `  // Left Panel Drag-and-Drop Handler
  const handleDragStartFromPanel = (e: React.DragEvent, type: string, defaults: any = {}) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type, defaults }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const { type, defaults } = JSON.parse(raw);
      const docPt = getDocPoint(e.clientX, e.clientY);
      const dropDefaults = {
        ...defaults,
        x: Math.round(docPt.x - (defaults.width || 200) / 2),
        y: Math.round(docPt.y - (defaults.height || 40) / 2)
      };
      // Keep inside document boundaries
      dropDefaults.x = Math.max(10, Math.min(canvasWidth - (defaults.width || 200) - 10, dropDefaults.x));
      dropDefaults.y = Math.max(10, Math.min(canvasHeight - (defaults.height || 40) - 10, dropDefaults.y));
      addElement(type, dropDefaults);
      toast.success(\`Added \${defaults.name || type} to canvas\`);
    } catch (err) {
      console.error("Failed to parse dropped element:", err);
    }
  };

  // Alignment & Distribution Helpers
  const alignSelectedElements = (action: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedElementId) return;
    setElements(prev => {
      const next = prev.map(el => {
        if (el.id !== selectedElementId) return el;
        let x = el.x;
        let y = el.y;
        if (action === "left") x = 20;
        if (action === "center") x = Math.round((canvasWidth - el.width) / 2);
        if (action === "right") x = canvasWidth - el.width - 20;
        if (action === "top") y = 20;
        if (action === "middle") y = Math.round((canvasHeight - el.height) / 2);
        if (action === "bottom") y = canvasHeight - el.height - 20;
        return { ...el, x, y };
      });
      pushState(next);
      return next;
    });
  };

  // Add Element
  const addElement = (type: string, defaults: any = {}) => {`;

  if (!code.includes('handleDragStartFromPanel')) {
    code = code.replace(oldAddElementDef, dragAndDropHelpers);
  }

  // E. Update addElement for logo to use primary logo if available
  const oldLogoAdd = `                onClick={() =>
                  addElement("image", {
                    name: "Organization Logo",
                    url: "{{organization.logo}}",
                    width: 120,
                    height: 60,
                    isLogo: true
                  })
                }`;

  const newLogoAdd = `                draggable
                onDragStart={(e) =>
                  handleDragStartFromPanel(e, "image", {
                    name: "Organization Logo",
                    url: primaryLogoData?.primaryLogo?.url || primaryLogoData?.primaryLogo?.storagePath ? getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) : "{{organization.logo}}",
                    width: 120,
                    height: 60,
                    isLogo: true
                  })
                }
                onClick={() => {
                  const resolvedLogo = primaryLogoData?.primaryLogo
                    ? (getCertificateAssetPreviewUrl(primaryLogoData.primaryLogo.id, primaryLogoData.primaryLogo.fileId, primaryLogoData.primaryLogo.storagePath) || primaryLogoData.primaryLogo.url)
                    : "{{organization.logo}}";
                  addElement("image", {
                    name: "Organization Logo",
                    url: resolvedLogo,
                    width: 120,
                    height: 60,
                    isLogo: true
                  });
                }}`;

  if (code.includes(oldLogoAdd)) {
    code = code.replace(oldLogoAdd, newLogoAdd);
  }

  // F. Canvas onDragOver & onDrop attributes
  const oldCanvasDiv = `<div
            ref={canvasRef}
            className="bg-white shadow-2xl relative select-none border border-slate-200"`;

  const newCanvasDiv = `<div
            ref={canvasRef}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
            className="bg-white shadow-2xl relative select-none border border-slate-200"`;

  if (code.includes(oldCanvasDiv) && !code.includes('onDragOver={handleCanvasDragOver}')) {
    code = code.replace(oldCanvasDiv, newCanvasDiv);
  }

  // G. Direct Canvas Text Editing on Double Click
  const oldTextRender = `{el.type === "text" && (
                      <div
                        className="w-full h-full flex items-center overflow-hidden break-words pointer-events-none"`;

  const newTextRender = `{el.type === "text" && (
                      editingTextElementId === el.id ? (
                        <textarea
                          autoFocus
                          value={editingTextValue}
                          onChange={(e) => setEditingTextValue(e.target.value)}
                          onBlur={() => {
                            updateSelectedElement({ text: editingTextValue });
                            setEditingTextElementId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingTextElementId(null);
                            } else if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              updateSelectedElement({ text: editingTextValue });
                              setEditingTextElementId(null);
                            }
                          }}
                          className="w-full h-full p-1 bg-white text-foreground border-2 border-primary rounded resize-none outline-none text-center shadow-lg z-50 pointer-events-auto"
                          style={{
                            fontFamily: el.fontFamily || "Inter",
                            fontSize: \`\${el.fontSize || 14}px\`,
                            fontWeight: el.fontWeight || "normal",
                            fontStyle: el.fontStyle || "normal",
                            color: el.color || "#0F172A",
                            lineHeight: el.lineHeight || 1.3,
                            textAlign: el.textAlign || "center"
                          }}
                        />
                      ) : (
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingTextElementId(el.id);
                          setEditingTextValue(el.text || "");
                        }}
                        className="w-full h-full flex items-center overflow-hidden break-words pointer-events-auto cursor-text"`;

  if (code.includes(oldTextRender)) {
    code = code.replace(oldTextRender, newTextRender);
    // Also close the conditional render
    code = code.replace(
      `{resolveDisplayText(el.text)}\n                      </div>\n                    )}`,
      `{resolveDisplayText(el.text)}\n                      </div>\n                      )\n                    )}`
    );
  }

  // H. Replace Logo and Branding Selection in Properties Inspector
  const oldImageInspector = `{selectedElement.type === "image" && (
                    <div className="space-y-3 pt-2 border-t">`;

  const newImageInspector = `{(selectedElement.type === "image" || selectedElement.type === "logo") && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Image & Branding Asset</Label>
                        {selectedElement.isLogo && (
                          <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Organization Logo
                          </span>
                        )}
                      </div>

                      {/* Replace / Select Branding Asset Button */}
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs h-8 gap-1.5"
                          onClick={() => setIsReplaceLogoModalOpen(true)}
                        >
                          <FolderOpen className="h-3.5 w-3.5 text-primary" />
                          <span>Choose from Branding / File Manager</span>
                        </Button>

                        {selectedElement.isLogo && primaryLogoData?.primaryLogo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-[11px] h-7 text-muted-foreground gap-1.5"
                            onClick={() => {
                              const logo = primaryLogoData.primaryLogo;
                              const url = getCertificateAssetPreviewUrl(logo.id, logo.fileId, logo.storagePath) || logo.url;
                              updateSelectedElement({
                                url,
                                name: logo.assetName || "Primary Logo",
                                assetId: logo.id
                              });
                              toast.success("Restored active Primary Logo");
                            }}
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span>Restore Primary Logo</span>
                          </Button>
                        )}
                      </div>`;

  if (code.includes(oldImageInspector)) {
    code = code.replace(oldImageInspector, newImageInspector);
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Successfully patched ${filePath}`);
}

patchDesigner('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
patchDesigner('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');


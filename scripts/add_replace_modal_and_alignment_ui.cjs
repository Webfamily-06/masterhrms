const fs = require('fs');

function addModalAndAlignUI(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add modal at the end before closing tag
  const modalMarkup = `
      {/* ── Replace Branding Asset / Choose Logo Modal ── */}
      <Dialog open={isReplaceLogoModalOpen} onOpenChange={setIsReplaceLogoModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Select Branding Asset from File Manager
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-4">
            <p className="text-xs text-muted-foreground">
              Choose an authorized branding asset from your organization library or File Manager to bind to this certificate.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(brandingData?.assets || []).map((asset: any) => {
                const previewUrl = getCertificateAssetPreviewUrl(asset.id, asset.fileId, asset.storagePath);
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      if (selectedElementId) {
                        updateSelectedElement({
                          url: previewUrl,
                          name: asset.assetName,
                          assetId: asset.id
                        });
                        toast.success(\`Applied \${asset.assetName}\`);
                      }
                      setIsReplaceLogoModalOpen(false);
                    }}
                    className="group border rounded-lg p-2.5 flex flex-col items-center justify-between gap-2 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card"
                  >
                    <div className="w-full h-24 bg-muted/30 rounded flex items-center justify-center p-2 overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt={asset.assetName} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-medium truncate" title={asset.assetName}>
                        {asset.assetName}
                      </p>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">
                        {asset.assetType}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {(!brandingData?.assets || brandingData.assets.length === 0) && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No branding assets uploaded. Visit Certificate Branding to upload primary logos, official seals, and watermarks.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
`;

  if (!code.includes('Select Branding Asset from File Manager')) {
    // Insert before {previewPdfUrl && (
    code = code.replace(
      '{/* ── Preview PDF Vector Dialog ── */}',
      `${modalMarkup}\n      {/* ── Preview PDF Vector Dialog ── */}`
    );
  }

  // 2. Add Alignment Toolbar to Properties Panel
  const alignmentToolbar = `
                  {/* Canva-Style Alignment Controls */}
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Align on Canvas</Label>
                    <div className="grid grid-cols-6 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("left")}
                        title="Align Left (Safe Margin)"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Left
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("center")}
                        title="Align Center Horizontally"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Center
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("right")}
                        title="Align Right (Safe Margin)"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Right
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("top")}
                        title="Align Top"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Top
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("middle")}
                        title="Align Middle Vertically"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Middle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => alignSelectedElements("bottom")}
                        title="Align Bottom"
                        className="h-7 text-xs p-0 font-medium"
                      >
                        Bottom
                      </Button>
                    </div>
                  </div>
`;

  if (!code.includes('Align on Canvas')) {
    code = code.replace(
      '{/* Position and Dimensions */}\n                  <div className="space-y-2">',
      `${alignmentToolbar}\n                  {/* Position and Dimensions */}\n                  <div className="space-y-2">`
    );
  }

  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Updated modal and alignment in ${filePath}`);
}

addModalAndAlignUI('src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx');
addModalAndAlignUI('CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx');


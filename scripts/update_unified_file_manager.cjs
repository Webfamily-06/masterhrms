const fs = require("fs");
const path = require("path");

function updateFileManager(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("File not found:", filePath);
    return;
  }
  let s = fs.readFileSync(filePath, "utf8");
  const isCrlf = s.includes("\r\n");
  const nl = isCrlf ? "\r\n" : "\n";

  // 1. Add Shield to imports if not already imported
  if (!s.includes("Shield,") && !s.includes("Shield }")) {
    s = s.replace(/ShieldAlert,(\r?\n)/, `ShieldAlert,$1  Shield,$1`);
  }

  // 2. Add isProtectedFolder and augment FileItem
  if (!s.includes("export const isProtectedFolder")) {
    const helperCode = `export const isProtectedFolder = (item?: FileItem | null) => {${nl}` +
      `  if (!item) return false;${nl}` +
      `  return Boolean(${nl}` +
      `    item.isProtected ||${nl}` +
      `    item.systemModule === "certificates" ||${nl}` +
      `    item.nameKey === "certificates" ||${nl}` +
      `    (item.isFolder && (${nl}` +
      `      item.fileName === "Certificates" ||${nl}` +
      `      (["Branding", "Signatures", "Templates", "Generated"].includes(item.fileName) && (item.folder?.includes("Certificates") || item.category === "Certificates"))${nl}` +
      `    ))${nl}` +
      `  );${nl}` +
      `};${nl}${nl}` +
      `export interface FileItem {${nl}` +
      `  systemModule?: string;${nl}` +
      `  nameKey?: string;${nl}` +
      `  isProtected?: boolean;`;

    s = s.replace("export interface FileItem {", helperCode);
  }

  // 3. Toolbar rename disable
  s = s.replace(
    'disabled={selectedItems.length !== 1}',
    'disabled={selectedItems.length !== 1 || isProtectedFolder(selectedItems[0])}'
  );

  // 4. Toolbar delete disable
  s = s.replace(
    'disabled={selectedIds.size === 0}',
    'disabled={selectedIds.size === 0 || selectedItems.some(isProtectedFolder)}'
  );

  // 5. Grid folder badge
  if (!s.includes('Protected System Folder')) {
    const targetFolderGrid = `{folder.fileName}${nl}                            </div>`;
    const replaceFolderGrid = `<span>{folder.fileName}</span>${nl}` +
      `                              {isProtectedFolder(folder) && (${nl}` +
      `                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/20 shrink-0" title="Protected System Folder">${nl}` +
      `                                  <Shield className="size-2.5" /> System${nl}` +
      `                                </span>${nl}` +
      `                              )}${nl}` +
      `                            </div>`;
    s = s.replace(targetFolderGrid, replaceFolderGrid);

    // 6. Details row badge
    const targetRow = `{item.fileName}${nl}                                  </span>`;
    const replaceRow = `<span>{item.fileName}</span>${nl}` +
      `                                    {isProtectedFolder(item) && (${nl}` +
      `                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0" title="Protected System Folder">${nl}` +
      `                                        <Shield className="size-2.5" /> System${nl}` +
      `                                      </span>${nl}` +
      `                                    )}${nl}` +
      `                                  </span>`;
    s = s.replace(targetRow, replaceRow);
  }

  // 7. Context menu guard
  if (!s.includes('Protected system folder')) {
    const dropdownTarget = `<DropdownMenuItem onClick={() => { setRenameTarget(item); setRenameValue(item.fileName); setIsRenameOpen(true); }}>${nl}` +
      `                                          <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Rename${nl}` +
      `                                        </DropdownMenuItem>${nl}` +
      `                                        <DropdownMenuItem onClick={() => { setMoveTargets([item]); setSelectedDestinationFolder("root"); setIsMoveOpen(true); }}>${nl}` +
      `                                          <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Move${nl}` +
      `                                        </DropdownMenuItem>${nl}` +
      `                                        <DropdownMenuSeparator />${nl}` +
      `                                        <DropdownMenuItem${nl}` +
      `                                          className="text-destructive focus:text-destructive"${nl}` +
      `                                          onClick={() => { setDeleteTargets([item]); setIsDeleteOpen(true); }}${nl}` +
      `                                        >${nl}` +
      `                                          <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Delete${nl}` +
      `                                        </DropdownMenuItem>`;

    const dropdownReplace = `{!isProtectedFolder(item) ? (${nl}` +
      `                                          <>${nl}` +
      `                                            <DropdownMenuItem onClick={() => { setRenameTarget(item); setRenameValue(item.fileName); setIsRenameOpen(true); }}>${nl}` +
      `                                              <img src="/FILE-MANAGER/Notes.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Rename${nl}` +
      `                                            </DropdownMenuItem>${nl}` +
      `                                            <DropdownMenuItem onClick={() => { setMoveTargets([item]); setSelectedDestinationFolder("root"); setIsMoveOpen(true); }}>${nl}` +
      `                                              <img src="/FILE-MANAGER/Folder%20Open.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Move${nl}` +
      `                                            </DropdownMenuItem>${nl}` +
      `                                            <DropdownMenuSeparator />${nl}` +
      `                                            <DropdownMenuItem${nl}` +
      `                                              className="text-destructive focus:text-destructive"${nl}` +
      `                                              onClick={() => { setDeleteTargets([item]); setIsDeleteOpen(true); }}${nl}` +
      `                                            >${nl}` +
      `                                              <img src="/FILE-MANAGER/Trash%20Empty.ico" alt="" className="size-4 mr-2 object-contain" draggable={false} /> Delete${nl}` +
      `                                            </DropdownMenuItem>${nl}` +
      `                                          </>${nl}` +
      `                                        ) : (${nl}` +
      `                                          <div className="px-2 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5 italic">${nl}` +
      `                                            <Shield className="size-3 text-primary" /> Protected system folder${nl}` +
      `                                          </div>${nl}` +
      `                                        )}`;

    s = s.replace(dropdownTarget, dropdownReplace);
  }

  fs.writeFileSync(filePath, s, "utf8");
  console.log("Successfully updated:", filePath);
}

updateFileManager(path.join(__dirname, "../src/components/apps/file-manager/unified-file-manager.tsx"));
updateFileManager(path.join(__dirname, "../CMS/src/components/apps/file-manager/unified-file-manager.tsx"));

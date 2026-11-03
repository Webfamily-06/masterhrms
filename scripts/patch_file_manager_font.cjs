const fs = require('fs');

// 1. share-dialog.tsx
const shareDialogPath = 'src/components/apps/file-manager/share-dialog.tsx';
let shareDialog = fs.readFileSync(shareDialogPath, 'utf8');

shareDialog = shareDialog.replace(
  /const SYSTEM_FONT_STACK =[\s\S]*?"var\(--font-sans\)[^"]*";/,
  '// Clean root font inheritance (GAP-UI-004)\nconst SYSTEM_FONT_STACK = undefined;'
);
shareDialog = shareDialog.replace(/style=\{\{\s*fontFamily:\s*SYSTEM_FONT_STACK\s*\}\}/g, '');
shareDialog = shareDialog.replace(/style=\{\{\s*fontFamily:\s*SYSTEM_FONT_STACK\s*\}\}\s*/g, '');
fs.writeFileSync(shareDialogPath, shareDialog, 'utf8');
console.log('Patched share-dialog.tsx');

// 2. unified-file-manager.tsx
const ufmPath = 'src/components/apps/file-manager/unified-file-manager.tsx';
let ufm = fs.readFileSync(ufmPath, 'utf8');

ufm = ufm.replace(
  /const SYSTEM_FONT_STACK =[\s\S]*?"var\(--font-sans\)[^"]*";/,
  '// Clean root font inheritance (GAP-UI-004)\nconst SYSTEM_FONT_STACK = undefined;'
);
ufm = ufm.replace(/style=\{\{\s*fontFamily:\s*SYSTEM_FONT_STACK\s*\}\}/g, '');
ufm = ufm.replace(/fontFamily:\s*SYSTEM_FONT_STACK,?/g, '');
fs.writeFileSync(ufmPath, ufm, 'utf8');
console.log('Patched unified-file-manager.tsx');


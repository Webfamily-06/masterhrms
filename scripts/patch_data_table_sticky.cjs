const fs = require('fs');
const file = 'src/components/ui/data-table.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add sticky to Column interface
code = code.replace(
  '  align?: "left" | "center" | "right";\r\n  className?: string;',
  '  align?: "left" | "center" | "right";\r\n  className?: string;\r\n  sticky?: "left" | "right";'
);
code = code.replace(
  '  align?: "left" | "center" | "right";\n  className?: string;',
  '  align?: "left" | "center" | "right";\n  className?: string;\n  sticky?: "left" | "right";'
);

// 2. Add getStickyClass helper
const alignHelper = `  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };`;

const stickyHelper = `  const getAlignClass = (align?: "left" | "center" | "right") => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const getStickyClass = (sticky?: "left" | "right") => {
    if (sticky === "left") {
      return "sticky left-0 z-10 bg-card/95 backdrop-blur-xs border-r border-border/60 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]";
    }
    if (sticky === "right") {
      return "sticky right-0 z-10 bg-card/95 backdrop-blur-xs border-l border-border/60 shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)]";
    }
    return "";
  };`;

const alignHelperCRLF = alignHelper.replace(/\n/g, '\r\n');
const stickyHelperCRLF = stickyHelper.replace(/\n/g, '\r\n');

if (code.includes(alignHelperCRLF)) {
  code = code.replace(alignHelperCRLF, stickyHelperCRLF);
} else if (code.includes(alignHelper)) {
  code = code.replace(alignHelper, stickyHelper);
}

// 3. Inject getStickyClass into TableHead & TableCell
code = code.replace(
  'getAlignClass(col.align),\r\n                      col.className',
  'getAlignClass(col.align),\r\n                      getStickyClass(col.sticky),\r\n                      col.className'
);
code = code.replace(
  'getAlignClass(col.align),\n                      col.className',
  'getAlignClass(col.align),\n                      getStickyClass(col.sticky),\n                      col.className'
);

code = code.replace(
  'getAlignClass(col.align),\r\n                            col.className',
  'getAlignClass(col.align),\r\n                            getStickyClass(col.sticky),\r\n                            col.className'
);
code = code.replace(
  'getAlignClass(col.align),\n                            col.className',
  'getAlignClass(col.align),\n                            getStickyClass(col.sticky),\n                            col.className'
);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully updated DataTable with sticky column freezing support (GAP-UI-008)');


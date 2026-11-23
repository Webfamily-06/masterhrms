const fs = require('fs');
const path = require('path');

const dashboards = [
  'inventory-dashboard/page.tsx',
  'crm-dashboard/page.tsx',
  'pos-dashboard/page.tsx',
  'sales-dashboard/page.tsx',
  'procurement-dashboard/page.tsx',
  'project-dashboard/page.tsx'
];

dashboards.forEach(d => {
  const p = path.join('CMS/src/app/(workspace)', d);
  let c = fs.readFileSync(p, 'utf8');

  // Replace Export as PDF text
  if (!c.includes('/pdf.svg')) {
    c = c.replace(
      />\s*Export as PDF\s*<\/button>/g,
      '><img src="/pdf.svg" alt="PDF" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as PDF</button>'
    );
  }

  // Replace Export as Excel text
  if (!c.includes('/excel.svg')) {
    c = c.replace(
      />\s*Export as Excel[^\<]*<\/button>/g,
      '><img src="/excel.svg" alt="Excel" className="me-2" style={{ width: 18, height: 18, objectFit: "contain" }} />Export as Excel</button>'
    );
  }

  fs.writeFileSync(p, c);
  console.log('✅ Added SVG icons to ' + d);
});

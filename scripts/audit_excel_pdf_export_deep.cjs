const ExcelJS = require('exceljs');
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = 'C:/Users/TSV Global Solutions/.gemini/antigravity/brain/a577d1c0-e728-48a2-b5e2-4bfe07f028cd/evidence-global-list';

(async () => {
  console.log('====================================================');
  console.log('📊 DEEP EXCEL & PDF EXPORT PARSER AUDIT');
  console.log('====================================================\n');

  const report = {
    excelAudit: {},
    pdfAudit: {},
  };

  // 1. Audit Downloaded Excel Files from Playwright E2E
  const excelFiles = [
    { name: 'tanstack_branches_sample.xlsx', path: path.join(EVIDENCE_DIR, 'tanstack_branches_sample.xlsx') },
    { name: 'cms_branches_sample.xlsx', path: path.join(EVIDENCE_DIR, 'cms_branches_sample.xlsx') },
  ];

  for (const ef of excelFiles) {
    if (!fs.existsSync(ef.path)) {
      console.warn(`File ${ef.name} does not exist at ${ef.path}`);
      continue;
    }

    console.log(`Auditing Excel file: ${ef.name}`);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(ef.path);

    const sheetCount = workbook.worksheets.length;
    const firstSheet = workbook.worksheets[0];
    const sheetName = firstSheet.name;
    const rowCount = firstSheet.rowCount;
    const colCount = firstSheet.columnCount;

    // Read title banner (row 1) and metadata (row 2)
    const bannerTitle = String(firstSheet.getCell('A1').value || '');
    const bannerMeta = String(firstSheet.getCell('A2').value || '');

    // Read header row (row 4)
    const headers = [];
    firstSheet.getRow(4).eachCell((cell, colNumber) => {
      headers.push(String(cell.value || ''));
    });

    // Read first data row (row 5)
    const sampleRow = [];
    if (rowCount >= 5) {
      firstSheet.getRow(5).eachCell((cell) => {
        sampleRow.push(cell.value);
      });
    }

    // Inspect header styling (bold, fill color on row 4)
    const headerCell = firstSheet.getCell('A4');
    const headerFont = headerCell.font;
    const headerFill = headerCell.fill;

    console.log(`   Worksheet: "${sheetName}" | Rows: ${rowCount} | Columns: ${colCount}`);
    console.log(`   Banner Title: "${bannerTitle}" | Meta: "${bannerMeta}"`);
    console.log(`   Headers: [${headers.join(', ')}]`);
    console.log(`   Sample Data Row:`, sampleRow);
    console.log(`   Header Styling - Bold: ${headerFont?.bold}, Fill: ${headerFill?.type}`);

    report.excelAudit[ef.name] = {
      sheetName,
      rowCount,
      colCount,
      bannerTitle,
      bannerMeta,
      headers,
      sampleRow,
      headerBold: Boolean(headerFont?.bold),
      validWorkbook: rowCount >= 5 && headers.length > 0,
    };
  }

  // 2. Generate and Audit PDF Document Streams using jsPDF + autoTable & pdf-parse
  console.log('\n2. Testing PDF Generation & Parsing with pdf-parse...');
  const { jsPDF } = require('jspdf');
  const autoTableModule = require('jspdf-autotable');
  const autoTable = autoTableModule.default || autoTableModule;

  const sampleColumns = [
    { header: 'Branch Code', dataKey: 'code' },
    { header: 'Branch Name', dataKey: 'name' },
    { header: 'City', dataKey: 'city' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Employees', dataKey: 'employeeCount' },
  ];

  const sampleData = [
    { code: 'BR-HQ-001', name: 'Global Headquarters', city: 'Bangalore', status: 'Active', employeeCount: 142 },
    { code: 'BR-HYD-002', name: 'Hyderabad Tech Center', city: 'Hyderabad', status: 'Active', employeeCount: 88 },
    { code: 'BR-PUN-003', name: 'Pune Delivery Unit', city: 'Pune', status: 'Inactive', employeeCount: 35 },
  ];

  // A. Generate Single-Page PDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Master HRMS - Branches Directory', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toISOString()} | Tenant: Acme Cloud ERP`, 14, 22);

  autoTable(doc, {
    startY: 26,
    head: [sampleColumns.map(c => c.header)],
    body: sampleData.map(row => sampleColumns.map(c => row[c.dataKey])),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const parser1 = new PDFParse({ data: pdfBuffer });
  const parsedPdf = await parser1.getText();
  await parser1.destroy();

  console.log(`   PDF Page Count: ${parsedPdf.total}`);
  console.log(`   PDF Text Snippet:\n   ${parsedPdf.text.split('\n').filter(Boolean).slice(0, 8).join('\n   ')}`);

  report.pdfAudit['branches_report'] = {
    numPages: parsedPdf.total,
    hasTitle: parsedPdf.text.includes('Branches Directory'),
    hasTimestamp: parsedPdf.text.includes('Generated on'),
    hasTenant: parsedPdf.text.includes('Acme Cloud ERP'),
    hasHeaders: parsedPdf.text.includes('Branch Code') && parsedPdf.text.includes('Branch Name'),
    hasDataRows: parsedPdf.text.includes('BR-HQ-001') && parsedPdf.text.includes('Global Headquarters'),
  };

  // B. Generate Multi-Page PDF with 120 records to verify page overflow & numbering
  console.log('\n3. Testing Multi-Page PDF Generation & Page Overflow...');
  const largeDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  largeDoc.setFontSize(14);
  largeDoc.text('Master HRMS - Comprehensive Employee Ledger', 14, 15);

  const largeRows = Array.from({ length: 120 }, (_, i) => [
    `EMP-${1000 + i}`,
    `Employee Fullname ${i + 1}`,
    `Department ${(i % 5) + 1}`,
    i % 2 === 0 ? 'Active' : 'On Leave',
    `₹${(45000 + i * 500).toLocaleString()}`,
  ]);

  autoTable(largeDoc, {
    startY: 22,
    head: [['ID', 'Name', 'Department', 'Status', 'Salary']],
    body: largeRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    didDrawPage: (data) => {
      const pageStr = 'Page ' + largeDoc.internal.getNumberOfPages();
      largeDoc.setFontSize(8);
      largeDoc.text(pageStr, 190, 285, { align: 'right' });
    },
  });

  const largePdfBuffer = Buffer.from(largeDoc.output('arraybuffer'));
  const parser2 = new PDFParse({ data: largePdfBuffer });
  const largeParsedPdf = await parser2.getText();
  await parser2.destroy();

  console.log(`   Large PDF Page Count: ${largeParsedPdf.total}`);
  console.log(`   Multi-page overflow verified: ${largeParsedPdf.total > 1}`);
  console.log(`   Page numbering text present: ${largeParsedPdf.text.includes('Page ')}`);

  report.pdfAudit['multi_page_overflow'] = {
    numPages: largeParsedPdf.total,
    isMultiPage: largeParsedPdf.total > 1,
    hasPageNumbering: largeParsedPdf.text.includes('Page '),
  };

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'export_deep_audit_summary.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  console.log('\n====================================================');
  console.log('🏁 EXCEL & PDF EXPORT DEEP AUDIT SUMMARY');
  console.log('====================================================');
  console.log(JSON.stringify(report, null, 2));
})();

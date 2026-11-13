import ExcelJS from 'exceljs';

async function main() {
  const filePath = 'C:/Users/TSV Global Solutions/Downloads/Copy of GET Attendance Record - 2026 Aug.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const cons = wb.getWorksheet('Consolidated ');
  if (cons) {
    console.log('=== CONSOLIDATED FULL HEADER MAP ===');
    const r1 = cons.getRow(1);
    const r2 = cons.getRow(2);
    const r3 = cons.getRow(3);
    const r4 = cons.getRow(4);
    for (let c = 1; c <= Math.max(cons.columnCount, 45); c++) {
      const v1 = r1.getCell(c).value;
      const v2 = r2.getCell(c).value;
      const v3 = r3.getCell(c).value;
      const c4 = r4.getCell(c);
      const v4 = c4.formula ? `[Formula: ${c4.formula}]` : (c4.value !== null && c4.value !== undefined ? String(c4.value) : '');
      if (v1 || v2 || v3 || v4) {
        console.log(`Col ${c}: R1="${v1 || ''}" | R2="${v2 || ''}" | R3="${v3 || ''}" | R4="${v4}"`);
      }
    }
  }

  const aug = wb.getWorksheet('Aug 26');
  if (aug) {
    console.log('\n=== AUG 26 FULL HEADER & SUMMARY MAP ===');
    const r1 = aug.getRow(1);
    const r2 = aug.getRow(2);
    const r3 = aug.getRow(3);
    for (let c = 1; c <= Math.max(aug.columnCount, 38); c++) {
      const v1 = r1.getCell(c).value;
      const v2 = r2.getCell(c).value;
      const c3 = r3.getCell(c);
      const v3 = c3.formula ? `[Formula: ${c3.formula}]` : (c3.value !== null && c3.value !== undefined ? String(c3.value) : '');
      console.log(`Col ${c}: R1="${v1 || ''}" | R2="${v2 || ''}" | R3="${v3}"`);
    }
  }

  console.log('\n=== ALL MONTH SHEETS SUMMARY COLUMNS ===');
  for (const name of ['Jan 26', 'Feb 26', 'Mar 26', 'April 26', 'May 26', 'June 26', 'July 26', 'Aug 26']) {
    const ws = wb.getWorksheet(name);
    if (!ws) continue;
    console.log(`\nSheet "${name}": cols=${ws.columnCount}, rows=${ws.rowCount}`);
    const r1 = ws.getRow(1);
    const r2 = ws.getRow(2);
    const r3 = ws.getRow(3);
    for (let c = Math.max(1, ws.columnCount - 5); c <= ws.columnCount; c++) {
      const v1 = r1.getCell(c).value;
      const v2 = r2.getCell(c).value;
      const c3 = r3.getCell(c);
      const v3 = c3.formula ? `[Formula: ${c3.formula}]` : (c3.value !== null && c3.value !== undefined ? String(c3.value) : '');
      console.log(`  Col ${c}: R1="${v1 || ''}" | R2="${v2 || ''}" | R3="${v3}"`);
    }
  }
}

main().catch(console.error);

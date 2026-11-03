const ExcelJS = require('exceljs');
const fs = require('fs');

async function inventory() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/TSV Global Solutions/Downloads/Paysheet_ENABL_OCT_2026 -Final.xlsx');

  const sheetsData = {};

  // 1. OCT 2026 - Final
  const sOct = wb.getWorksheet('OCT 2026 - Final');
  const octCols = [];
  const r1 = sOct.getRow(1);
  const r2 = sOct.getRow(2);
  for (let c = 1; c <= 51; c++) {
    const group = (r1.getCell(c).value || '').toString().trim();
    const header = (r2.getCell(c).value || '').toString().trim();
    if (header) {
      octCols.push({ col: c, letter: sOct.getColumn(c).letter, group, header });
    }
  }
  sheetsData['OCT 2026 - Final'] = octCols;

  // 2. Summary
  const sSum = wb.getWorksheet('Summary');
  const sumItems = [];
  for (let r = 2; r <= 20; r++) {
    const p = (sSum.getRow(r).getCell(1).value || '').toString().trim();
    if (p && p !== 'ENABLE ENGINEERING PRIVATE LIMITED') {
      sumItems.push({ row: r, particular: p });
    }
  }
  sheetsData['Summary'] = sumItems;

  // 3. Form U
  const sFormU = wb.getWorksheet('Form U');
  const formUCols = [];
  const r9 = sFormU.getRow(9);
  for (let c = 3; c <= 26; c++) {
    const h = (r9.getCell(c).value || '').toString().trim();
    if (h) formUCols.push({ col: c, header: h });
  }
  sheetsData['Form U'] = formUCols;

  // 4. Form V
  const sFormV = wb.getWorksheet('Form V');
  const formVCols = [];
  const r11 = sFormV.getRow(11);
  const r12 = sFormV.getRow(12);
  for (let c = 3; c <= 45; c++) {
    const h1 = (r11.getCell(c).value || '').toString().trim();
    const h2 = (r12.getCell(c).value || '').toString().trim();
    const h = [h1, h2].filter(Boolean).join(' - ');
    if (h) formVCols.push({ col: c, header: h });
  }
  sheetsData['Form V'] = formVCols;

  // 5. FORM W
  const sFormW = wb.getWorksheet('FORM W ');
  const formWCols = [];
  const r11W = sFormW.getRow(11);
  const r12W = sFormW.getRow(12);
  for (let c = 1; c <= 33; c++) {
    const h1 = (r11W.getCell(c).value || '').toString().trim();
    const h2 = (r12W.getCell(c).value || '').toString().trim();
    const h = [h1, h2].filter(Boolean).join(' - ');
    if (h) formWCols.push({ col: c, header: h });
  }
  sheetsData['FORM W '] = formWCols;

  // 6. Form X
  const sFormX = wb.getWorksheet('Form X');
  const formXCols = [];
  const r9X = sFormX.getRow(9);
  const r10X = sFormX.getRow(10);
  for (let c = 1; c <= 21; c++) {
    const h1 = (r9X.getCell(c).value || '').toString().trim();
    const h2 = (r10X.getCell(c).value || '').toString().trim();
    const h = [h1, h2].filter(Boolean).join(' - ');
    if (h) formXCols.push({ col: c, header: h });
  }
  sheetsData['Form X'] = formXCols;

  // 7. FORM S
  const sFormS = wb.getWorksheet('FORM S');
  const formSCols = [];
  const r6S = sFormS.getRow(6);
  for (let c = 1; c <= 17; c++) {
    const h = (r6S.getCell(c).value || '').toString().trim();
    if (h) formSCols.push({ col: c, header: h });
  }
  sheetsData['FORM S'] = formSCols;

  fs.writeFileSync('scripts/field_inventory.json', JSON.stringify(sheetsData, null, 2));
  console.log('Field counts per sheet:');
  Object.keys(sheetsData).forEach(k => {
    console.log(`- ${k}: ${sheetsData[k].length} fields`);
  });
}

inventory().catch(console.error);


export interface PayslipPdfData {
  companyName: string;
  companyAddress?: string;
  companyEmail?: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  email: string;
  periodMonth: string;
  periodYear: string;
  paymentDate: string;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  currencySymbol?: string;
}

export async function generatePayslipPdf(data: PayslipPdfData) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [16, 185, 129]; // Emerald 600

  // 1. Company Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.companyName.toUpperCase(), 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(data.companyAddress || "Enterprise Headquarters", 14, 18);
  doc.text(data.companyEmail ? `Contact: ${data.companyEmail}` : "HR & Payroll Department", 14, 23);

  // Payslip Tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(52, 211, 153);
  doc.text("SALARY PAYSLIP", 196, 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Period: ${data.periodMonth} ${data.periodYear}`, 196, 18, { align: "right" });
  doc.text(`Generated: ${data.paymentDate}`, 196, 23, { align: "right" });

  // 2. Employee Details Card
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYEE SUMMARY", 14, 38);

  const empDetails = [
    [
      { content: "Employee Name:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.employeeName, styles: { fontStyle: "bold" as const } },
      { content: "Employee ID:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.employeeCode, styles: { fontStyle: "bold" as const } },
    ],
    [
      { content: "Designation:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.designation },
      { content: "Department:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.department },
    ],
    [
      { content: "Email Address:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: data.email },
      { content: "Payment Status:", styles: { fontStyle: "bold" as const, textColor: [100, 116, 139] } },
      { content: "PAID / TRANSFERRED", styles: { textColor: [16, 185, 129], fontStyle: "bold" as const } },
    ],
  ];

  autoTable(doc, {
    startY: 41,
    body: empDetails as any,
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 2 },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  });

  // 3. Earnings & Deductions Breakdown Table
  const currY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("SALARY BREAKDOWN (EARNINGS VS DEDUCTIONS)", 14, currY);

  const maxRows = Math.max(data.earnings.length, data.deductions.length);
  const tableRows: any[] = [];

  for (let i = 0; i < maxRows; i++) {
    const earn = data.earnings[i];
    const ded = data.deductions[i];
    tableRows.push([
      earn ? earn.label : "",
      earn ? `INR ${earn.amount.toLocaleString("en-IN")}` : "",
      ded ? ded.label : "",
      ded ? `INR ${ded.amount.toLocaleString("en-IN")}` : "",
    ]);
  }

  // Add totals row
  tableRows.push([
    { content: "TOTAL GROSS EARNINGS", styles: { fontStyle: "bold" as const, fillColor: [240, 253, 244] } },
    { content: `INR ${data.grossSalary.toLocaleString("en-IN")}`, styles: { fontStyle: "bold" as const, textColor: [16, 185, 129], fillColor: [240, 253, 244] } },
    { content: "TOTAL DEDUCTIONS", styles: { fontStyle: "bold" as const, fillColor: [254, 242, 242] } },
    { content: `INR ${data.totalDeductions.toLocaleString("en-IN")}`, styles: { fontStyle: "bold" as const, textColor: [239, 68, 68], fillColor: [254, 242, 242] } },
  ]);

  autoTable(doc, {
    startY: currY + 3,
    head: [["Earnings Description", "Amount", "Deductions Description", "Amount"]],
    body: tableRows as any,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      1: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // 4. Net Salary Highlight Box
  const netY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, netY, 182, 22, 3, 3, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, netY, 182, 22, 3, 3, "D");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("NET SALARY PAYABLE", 20, netY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(16, 185, 129);
  doc.text(`INR ${data.netSalary.toLocaleString("en-IN")}`, 20, netY + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Direct Bank Transfer to registered account", 190, netY + 12, { align: "right" });

  // 5. Signatures and Disclaimers
  const sigY = netY + 36;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 70, sigY);
  doc.line(136, sigY, 196, sigY);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Employee Signature", 42, sigY + 5, { align: "center" });
  doc.text("Authorized Signatory (HR & Accounts)", 166, sigY + 5, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "This is a system-generated document authorized by Master HRMS. No manual signature required if electronically authenticated.",
    105,
    285,
    { align: "center" },
  );

  // Save the PDF
  const filename = `Payslip_${data.employeeCode}_${data.periodMonth}_${data.periodYear}.pdf`;
  doc.save(filename);
}

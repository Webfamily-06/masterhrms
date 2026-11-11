const fs = require("fs");
const path = require("path");

const filesToPatch = [
  "src/routes/_authenticated/hr/organization/certificate-designer/$templateId.tsx",
  "CMS/src/app/(workspace)/hr/organization/certificate-designer/[templateId]/page.tsx"
];

for (const filePath of filesToPatch) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) continue;

  let code = fs.readFileSync(fullPath, "utf8");

  // Remove mislocated computedData from top state section if present
  const badComputedPattern = /  \/\/ Computed Real-Time Preview Dictionary[\s\S]*?\[previewContextData, primaryLogoAsset, selectedEmployeeId, selectedAwardId, customCertNumber, customVerificationCode, resolvedVerificationUrl\]\);\r?\n?/m;
  if (badComputedPattern.test(code)) {
    code = code.replace(badComputedPattern, "");
  }

  // Ensure computedData is placed after primaryLogoData query
  const computedDataDefinition = `  // Computed Real-Time Preview Dictionary resolving tenant branding, employee, award, and signatories
  const computedData: Record<string, string> = React.useMemo(() => {
    const ctx = previewContextData?.context;
    const orgName = ctx?.organization?.name || "MASTERHRMS Global Technologies";
    const primaryLogoUrl = primaryLogoAsset?.url || ctx?.branding?.primaryLogo?.url || "/logo.webp";
    const sealUrl = ctx?.branding?.officialSeal?.url || "";

    // Selected Employee
    let empName = "Alexander M. Vance";
    let empCode = "EMP-2026-0891";
    let empDesig = "Principal Platform Architect";
    let empDept = "Technology & Platform Operations";

    if (selectedEmployeeId !== "sample" && ctx?.employees) {
      const found = ctx.employees.find((e: any) => e.id === selectedEmployeeId);
      if (found) {
        empName = found.name;
        empCode = found.employeeCode || "";
        empDesig = found.designation || "Staff Professional";
        empDept = found.department || "Operations";
      }
    }

    // Selected Award
    let awTitle = "Governor Excellence Award 2026";
    let awDesc = "For exceptional leadership, sustained engineering innovation, and organizational impact.";
    let awCat = "Employee Excellence";
    let awDate = new Date().toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });

    if (selectedAwardId !== "sample" && ctx?.awards) {
      const found = ctx.awards.find((a: any) => a.id === selectedAwardId);
      if (found) {
        awTitle = found.title;
        awDesc = found.description || "";
        awCat = found.category || "Distinction";
      }
    }

    // Signatories
    const hrSig = ctx?.signatoryRoles?.hr;
    const dirSig = ctx?.signatoryRoles?.director;
    const ceoSig = ctx?.signatoryRoles?.ceo;

    return {
      "{{organization.name}}": orgName,
      "{{organization.logo}}": primaryLogoUrl,
      "{{organization.seal}}": sealUrl,
      "{{employee.name}}": empName,
      "{{employee.employeeCode}}": empCode,
      "{{employee.designation}}": empDesig,
      "{{employee.department}}": empDept,
      "{{award.title}}": awTitle,
      "{{award.description}}": awDesc,
      "{{award.category}}": awCat,
      "{{award.date}}": awDate,
      "{{certificate.number}}": customCertNumber,
      "{{certificate.verificationCode}}": customVerificationCode,
      "{{certificate.verificationUrl}}": resolvedVerificationUrl,
      "{{signatures.hr}}": hrSig?.name || "Sarah Jenkins",
      "{{signatures.director}}": dirSig?.name || "Managing Director",
      "{{signatures.ceo}}": ceoSig?.name || "Chief Executive Officer",
      hrSignatureUrl: hrSig?.signatureUrl || "",
      directorSignatureUrl: dirSig?.signatureUrl || "",
      ceoSignatureUrl: ceoSig?.signatureUrl || "",
      officialSealUrl: sealUrl,
      primaryLogoUrl,
    };
  }, [previewContextData, primaryLogoAsset, selectedEmployeeId, selectedAwardId, customCertNumber, customVerificationCode, resolvedVerificationUrl]);`;

  if (!code.includes("Computed Real-Time Preview Dictionary resolving tenant branding")) {
    const primaryLogoQueryAnchor = `const { data: primaryLogoData } = useQuery({\n    queryKey: ["certificate-studio-primary-logo"],\n    queryFn: async () => {\n      const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("token");\n      const res = await fetch("/api/certificate-studio/branding/primary-logo", {\n        headers: { Authorization: \`Bearer \${token}\` }\n      });\n      if (!res.ok) return { primaryLogo: null };\n      return res.json();\n    }\n  });`;

    if (code.includes(primaryLogoQueryAnchor)) {
      code = code.replace(primaryLogoQueryAnchor, `${primaryLogoQueryAnchor}\n\n${computedDataDefinition}`);
    } else {
      // Fallback search
      const simplerAnchor = `queryKey: ["certificate-studio-primary-logo"],`;
      const idx = code.indexOf(simplerAnchor);
      if (idx !== -1) {
        const closeIdx = code.indexOf("});", idx);
        if (closeIdx !== -1) {
          code = code.slice(0, closeIdx + 3) + "\n\n" + computedDataDefinition + code.slice(closeIdx + 3);
        }
      }
    }
  }

  fs.writeFileSync(fullPath, code, "utf8");
  console.log("Repaired ordering in:", filePath);
}

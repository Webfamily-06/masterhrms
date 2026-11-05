const fs = require("fs");
const path = require("path");

const TARGET_DIRS = ["HRMS-HTML", "CMS", "src", "public"];
const EXTENSIONS = [".html", ".tsx", ".ts", ".jsx", ".js", ".json", ".css", ".md"];

let totalFilesModified = 0;
let totalReplacements = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let original = content;

    // Exact replacements
    content = content.replace(/Dreams ERP - Tailwind CSS ERP Admin Dashboard Template/gi, "Master HRMS — Enterprise HR & ERP Platform");
    content = content.replace(/Dreams ERP is a professional Tailwind CSS ERP Admin Dashboard Template featuring CRM, HRM, Inventory, Finance, Sales, Procurement, Project Management dashboards, reusable UI components, and responsive layouts\./gi, "Master HRMS is a professional Enterprise HRMS & ERP Platform with integrated Chat, Calling, Payroll, and Workforce Management.");
    content = content.replace(/2026 &copy; Dreams ERP\. All Rights Reserved/gi, "2026 &copy; Master HRMS. All Rights Reserved");
    content = content.replace(/&copy; Dreams ERP/gi, "&copy; Master HRMS");
    content = content.replace(/https:\/\/dreamserp\.dreamstechnologies\.com\/tailwind\//gi, "https://masterhrms.com/");
    content = content.replace(/https:\/\/dreamserp\.dreamstechnologies\.com/gi, "https://masterhrms.com");
    content = content.replace(/Dreams Technologies/gi, "Master HRMS");
    content = content.replace(/Dreams ERP Standard/gi, "Master HRMS Standard");
    content = content.replace(/Dreams ERP Sidenav/gi, "Master HRMS Sidenav");
    content = content.replace(/Dreams ERP Styles/gi, "Master HRMS Styles");
    content = content.replace(/Dreams ERP/gi, "Master HRMS");
    content = content.replace(/Template Name: Dreams/gi, "Template Name: Master HRMS");

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf8");
      totalFilesModified++;
      // Count difference
      const matches = original.match(/Dreams/gi) || [];
      totalReplacements += matches.length;
      console.log(`[UPDATED] ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
  }
}

function traverseDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== ".next" && entry.name !== "dist") {
        traverseDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (EXTENSIONS.includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

console.log("================================================================================");
console.log("🧹 REMOVING 'DREAMS ERP' BRANDING ACROSS ALL APPLICATION AND HTML FILES");
console.log("================================================================================\n");

for (const dir of TARGET_DIRS) {
  traverseDirectory(dir);
}

console.log("\n================================================================================");
console.log(`SUMMARY: Modified ${totalFilesModified} files with ${totalReplacements} branding replacements.`);
console.log("================================================================================\n");


const fs = require("fs");
const path = require("path");

const files = [
  "index.html",
  "employee-dashboard.html",
  "deals-dashboard.html",
  "leads-dashboard.html",
  "hr-dashboard.html",
  "payroll-dashboard.html",
  "recruitment-dashboard.html",
  "attendance-dashboard.html",
  "finance-dashboard.html",
  "it-admin-dashboard.html",
  "asset-dashboard.html",
  "help-desk-dashboard.html"
];

for (const file of files) {
  const filePath = path.join("SMARTHR", file);
  if (!fs.existsSync(filePath)) {
    console.log(file, "DOES NOT EXIST");
    continue;
  }
  const content = fs.readFileSync(filePath, "utf8");
  const chartMatches = Array.from(content.matchAll(/id="([^"]*(?:chart|earning|expense|sales|storage|pipeline|lead)[^"]*)"/gi)).map(m => m[1]);
  console.log(file, "->", chartMatches);
}

const fs = require("fs");
const lines = fs.readFileSync("SMARTHR/employee-dashboard.html", "utf8").split("\n");
lines.forEach((l, i) => {
  if (l.includes("footer") || l.includes("Page Wrapper") || l.includes("modal fade")) {
    console.log(i + 1, l.trim());
  }
});

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APP_DIR = path.join(ROOT, "CMS", "src", "app");

function collectPageRoutes(dir, rel = "", set = new Set()) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      const nextRel = /^\(.+\)$/.test(ent.name) ? rel : `${rel}/${ent.name}`;
      collectPageRoutes(full, nextRel, set);
    } else if (ent.name === "page.tsx" || ent.name === "page.ts") {
      set.add(rel || "/");
    }
  }
  return set;
}

const pageRoutes = collectPageRoutes(APP_DIR);

function routeExists(rawPath) {
  const clean = String(rawPath || "").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (pageRoutes.has(clean)) return true;
  const segs = clean.split("/").filter(Boolean);
  for (const r of pageRoutes) {
    if (!r.includes("[")) continue;
    const rSegs = r.split("/").filter(Boolean);
    if (rSegs.length !== segs.length) continue;
    if (rSegs.every((rs, idx) => (rs.startsWith("[") && rs.endsWith("]")) || rs === segs[idx])) {
      return true;
    }
  }
  return false;
}

const targets = [
  { file: "CMS/src/nav/registry.ts", regex: /path:\s*"(\/[^"]+)"/g },
  { file: "CMS/src/nav/hr-sidebar.ts", regex: /(?:path|to|href):\s*"(\/[^"]+)"/g },
  { file: "CMS/src/nav/employee-sidebar.ts", regex: /(?:path|to|href):\s*"(\/[^"]+)"/g },
  { file: "CMS/src/nav/addon-navigation.ts", regex: /(?:path|to|href):\s*"(\/[^"]+)"/g },
  { file: "CMS/src/lib/navigation-registry.ts", regex: /"route":\s*"(\/[^"]+)"/g },
  { file: "CMS/src/components/layout/SuperShell.tsx", regex: /(?:path|to|href):\s*"(\/[^"]+)"/g },
  {
    file: "CMS/src/components/addons/tenant-addon-storefront.tsx",
    scopeRegex: /const\s+LAUNCH_URLS[\s\S]*?\n\};/,
    regex: /:\s*"(\/[^"]+)"/g,
  },
];

let deadCount = 0;
let totalChecked = 0;
for (const t of targets) {
  const full = path.join(ROOT, t.file);
  if (!fs.existsSync(full)) continue;
  let content = fs.readFileSync(full, "utf8");
  if (t.scopeRegex) {
    const m = content.match(t.scopeRegex);
    content = m ? m[0] : "";
  }
  const seen = new Set();
  const dead = [];
  for (const m of content.matchAll(t.regex)) {
    const p = m[1];
    if (!p || p.startsWith("/api/") || p.startsWith("/avatars/") || seen.has(p)) continue;
    seen.add(p);
    if (!routeExists(p)) dead.push(p);
  }
  totalChecked += seen.size;
  if (dead.length > 0) {
    deadCount += dead.length;
    console.error(`[FAIL] ${t.file}: ${dead.length} dead route(s): ${dead.join(", ")}`);
  } else {
    console.log(`[PASS] ${t.file}: ${seen.size} routes verified`);
  }
}

console.log(`Total Next.js App Router pages indexed: ${pageRoutes.size} | Nav targets checked: ${totalChecked}`);
if (deadCount > 0) {
  console.error(`Route integrity check failed with ${deadCount} dead route(s).`);
  process.exit(1);
}
console.log("Route integrity check passed with 0 dead routes.");

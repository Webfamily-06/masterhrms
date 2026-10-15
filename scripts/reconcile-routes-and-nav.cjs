const fs = require("fs");
const path = require("path");

// 1. Extract all routes from routeTree.gen.ts
const routeTreeContent = fs.readFileSync("src/routeTree.gen.ts", "utf8");

// Extract routes from FileRoutesById
const idStart = routeTreeContent.indexOf("interface FileRoutesById");
const idEnd = routeTreeContent.indexOf("}", idStart);
const idBlock = routeTreeContent.slice(idStart, idEnd);
const idMatches = [];
const idRegex = /'([^']+)':\s*typeof\s+([A-Za-z0-9_]+Route)/g;
let idMatch;
while ((idMatch = idRegex.exec(idBlock)) !== null) {
  idMatches.push({ id: idMatch[1], routeVar: idMatch[2] });
}

// Extract routes from FileRoutesByFullPath
const fpStart = routeTreeContent.indexOf("interface FileRoutesByFullPath");
const fpEnd = routeTreeContent.indexOf("}", fpStart);
const fpBlock = routeTreeContent.slice(fpStart, fpEnd);
const fpMatches = [];
const fpRegex = /'([^']+)':\s*typeof/g;
let fpMatch;
while ((fpMatch = fpRegex.exec(fpBlock)) !== null) {
  fpMatches.push(fpMatch[1]);
}

console.log("FileRoutesById total:", idMatches.length);
console.log("FileRoutesByFullPath total:", fpMatches.length);

// 2. Extract Navigation Registry routes
const navRegistryContent = fs.readFileSync("src/lib/navigation-registry.ts", "utf8");
const navRoutes = [];
const routeRegex = /"route":\s*"([^"]+)"/g;
let nr;
while ((nr = routeRegex.exec(navRegistryContent)) !== null) {
  navRoutes.push(nr[1]);
}
const uniqueNavRoutes = Array.from(new Set(navRoutes));
console.log("Unique sidebar routes in NAVIGATION_REGISTRY:", uniqueNavRoutes.length);

// 3. Classify all 506 fullPath routes
const classification = {
  sidebarLinked: [],
  subPageOrModalOrDetail: [],
  publicOrAuthOrMarketing: [],
  systemOrUtility: [],
  unmappedPotentialDefect: [],
};

fpMatches.forEach((r) => {
  if (uniqueNavRoutes.includes(r)) {
    classification.sidebarLinked.push(r);
  } else if (
    r.includes("/$id") ||
    r.includes("/edit") ||
    r.includes("/new") ||
    r.includes("/view") ||
    r.includes("/detail") ||
    r.includes("/review") ||
    r.includes("/verify") ||
    r.includes("/confirm") ||
    r.includes("/profile/") ||
    r.includes("/step") ||
    r.includes("/export") ||
    r.includes("/print")
  ) {
    classification.subPageOrModalOrDetail.push(r);
  } else if (
    r.startsWith("/auth") ||
    r.startsWith("/login") ||
    r.startsWith("/register") ||
    r.startsWith("/forgot-password") ||
    r.startsWith("/reset-password") ||
    r.startsWith("/verify-2fa") ||
    r.startsWith("/privacy") ||
    r.startsWith("/terms") ||
    r.startsWith("/contact") ||
    r.startsWith("/pricing") ||
    r.startsWith("/help-center") ||
    r.startsWith("/careers") ||
    r.startsWith("/blogs") ||
    r.startsWith("/case-studies") ||
    r.startsWith("/onboarding") ||
    r === "/"
  ) {
    classification.publicOrAuthOrMarketing.push(r);
  } else if (
    r.startsWith("/error") ||
    r.startsWith("/forbidden") ||
    r.startsWith("/maintenance") ||
    r.startsWith("/session-expired") ||
    r.startsWith("/lock-screen") ||
    r.startsWith("/offline") ||
    r.startsWith("/_")
  ) {
    classification.systemOrUtility.push(r);
  } else {
    // Check if parent prefix is in sidebar (e.g. /hr/payroll/runs vs /hr/payroll)
    const segments = r.split("/").filter(Boolean);
    const parentPath = "/" + segments.slice(0, -1).join("/");
    if (uniqueNavRoutes.includes(parentPath) || uniqueNavRoutes.some(nr => r.startsWith(nr))) {
      classification.subPageOrModalOrDetail.push(r);
    } else {
      classification.unmappedPotentialDefect.push(r);
    }
  }
});

console.log("\n--- Classification Results ---");
console.log("Direct Sidebar Linked:", classification.sidebarLinked.length);
console.log("Sub-Page / Nested / Detail:", classification.subPageOrModalOrDetail.length);
console.log("Public / Auth / Marketing:", classification.publicOrAuthOrMarketing.length);
console.log("System / Utility / Errors:", classification.systemOrUtility.length);
console.log("Unmapped / Potential Defects:", classification.unmappedPotentialDefect.length);

fs.writeFileSync(
  "route_classification_census.json",
  JSON.stringify(
    {
      totalRoutesById: idMatches.length,
      totalFullPaths: fpMatches.length,
      uniqueNavRoutesCount: uniqueNavRoutes.length,
      classification,
    },
    null,
    2
  )
);
console.log("Wrote route_classification_census.json");

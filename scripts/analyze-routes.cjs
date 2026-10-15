const fs = require("fs");
const path = require("path");

const routeTreeContent = fs.readFileSync("src/routeTree.gen.ts", "utf8");

// Look for route definitions in routeTree.gen.ts
// In TanStack Router, there is interface FileRoutesByFullPath or routeTree children
const fullPathMatches = [];
const lines = routeTreeContent.split("\n");
lines.forEach((line) => {
  const m = line.match(/fullPath:\s*['"]([^'"]+)['"]/);
  if (m) {
    fullPathMatches.push(m[1]);
  }
});

// Also look for FileRoutesByTo or FileRoutesByFullPath
const fullPathSet = Array.from(new Set(fullPathMatches));
console.log("Unique fullPaths found:", fullPathSet.length);

// Also let's inspect the interface FileRoutesByPath or routes manifest
const fileRoutesByPath = [];
const pathMatchRegex = /'([^']+)':\s*typeof\s+([A-Za-z0-9_]+Route)/g;
let pm;
while ((pm = pathMatchRegex.exec(routeTreeContent)) !== null) {
  fileRoutesByPath.push({ path: pm[1], routeVar: pm[2] });
}
console.log("fileRoutesByPath count:", fileRoutesByPath.length);

// Also look for route paths in routeTree.gen.ts interface FileRoutesByFullPath
const fullPathInterfaceRegex = /'([^']+)':\s*typeof\s+([A-Za-z0-9_]+RouteWithChildren|[A-Za-z0-9_]+Route)/g;
const fullPathsFromInterface = [];
let fpi;
const interfaceStart = routeTreeContent.indexOf("interface FileRoutesByFullPath");
const interfaceEnd = routeTreeContent.indexOf("}", interfaceStart);
if (interfaceStart !== -1 && interfaceEnd !== -1) {
  const block = routeTreeContent.slice(interfaceStart, interfaceEnd);
  const re = /'([^']+)':/g;
  let m2;
  while ((m2 = re.exec(block)) !== null) {
    fullPathsFromInterface.push(m2[1]);
  }
}
console.log("fullPathsFromInterface count:", fullPathsFromInterface.length);

fs.writeFileSync(
  "discovered_routes_inventory.json",
  JSON.stringify(
    {
      fullPathCount: fullPathsFromInterface.length || fullPathSet.length,
      routes: fullPathsFromInterface.length ? fullPathsFromInterface : fullPathSet,
      fileRoutesByPathCount: fileRoutesByPath.length,
      fileRoutesByPath,
    },
    null,
    2
  )
);
console.log("Wrote discovered_routes_inventory.json successfully.");

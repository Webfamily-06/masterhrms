import fs from "fs";
import path from "path";

interface DiscoveredEndpoint {
  id: string;
  method: string;
  subpath: string;
  fullPath: string;
  module: string;
  description: string;
  authRequired: boolean;
  requiredRoles: string[];
  requiredPermissions: string[];
  requiredAddon: string | null;
  tenantScoped: boolean;
  databaseModels: string[];
  status: "WORKING" | "PARTIAL" | "MISSING" | "BROKEN";
  requestParams: string[];
  queryParams: string[];
  requestBodyFields: string[];
  responseSample?: any;
  notes?: string;
}

export function runForensicAudit() {
  const indexContent = fs.readFileSync(path.resolve(__dirname, "index.ts"), "utf8");
  const routesDir = path.resolve(__dirname, "routes");
  const prismaSchema = fs.readFileSync(path.resolve(__dirname, "../prisma/schema.prisma"), "utf8");

  // 1. Map mounts from index.ts
  const mountMap: Record<string, string[]> = {};
  const mountRegex = /app\.use\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
  let mountMatch;
  while ((mountMatch = mountRegex.exec(indexContent)) !== null) {
    const mountPath = mountMatch[1];
    const routerName = mountMatch[2];
    if (!mountMap[routerName]) mountMap[routerName] = [];
    mountMap[routerName].push(mountPath);
  }

  // Also check imports in index.ts to map routerName to file
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/routes\/([^"']+)["']/g;
  const routerToFile: Record<string, string> = {};
  let importMatch;
  while ((importMatch = importRegex.exec(indexContent)) !== null) {
    const identifiers = importMatch[1].split(",").map((s) => s.trim());
    const file = importMatch[2];
    for (const id of identifiers) {
      routerToFile[id] = file;
    }
  }

  // Default fallback mappings
  const routeFiles = fs.readdirSync(routesDir).filter((f) => f.endsWith(".routes.ts"));
  const allEndpoints: DiscoveredEndpoint[] = [];

  for (const file of routeFiles) {
    const baseName = file.replace(".routes.ts", "");
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Discover router variable names in the file
    // e.g. const router = Router(); or export const employeesRouter = Router();
    const declaredRouters: string[] = [];
    const routerDeclRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:express\.)?Router\(/g;
    let rMatch;
    while ((rMatch = routerDeclRegex.exec(content)) !== null) {
      declaredRouters.push(rMatch[1]);
    }
    if (declaredRouters.length === 0) declaredRouters.push("router");

    // Find the mount paths for this file's routers
    let fileMounts: string[] = [];
    for (const rName of declaredRouters) {
      if (mountMap[rName]) {
        fileMounts.push(...mountMap[rName]);
      }
    }
    // Also check default export
    if (mountMap["accountingRouter"] && file.includes("accounting")) {
      fileMounts.push(...mountMap["accountingRouter"]);
    }
    if (fileMounts.length === 0) {
      // deduce from filename
      fileMounts = ["/api/" + baseName];
    }
    fileMounts = Array.from(new Set(fileMounts));

    // Extract endpoints: router.get(...), router.post(...), etc.
    // We split into route handler blocks
    const endpointRegex = /(?:router|[a-zA-Z0-9_]+Router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']([\s\S]*?)(?=\n\s*(?:router|[a-zA-Z0-9_]+Router)\.(?:get|post|put|delete|patch)|\n\s*export|\n\s*module\.exports|$)/g;

    let epMatch;
    while ((epMatch = endpointRegex.exec(content)) !== null) {
      const method = epMatch[1].toUpperCase();
      const subpath = epMatch[2];
      const handlerBody = epMatch[3];

      const authRequired = handlerBody.includes("requireAuth") || handlerBody.includes("authenticate");
      
      const roles: string[] = [];
      const roleMatch = handlerBody.match(/requireRole\(\s*\[?([^\]\)]+)\]?\s*\)/);
      if (roleMatch) {
        roles.push(...roleMatch[1].replace(/["']/g, "").split(",").map((s) => s.trim()));
      }

      const permissions: string[] = [];
      const permMatch = handlerBody.match(/requirePermission\(\s*["']([^"']+)["']\s*\)/);
      if (permMatch) {
        permissions.push(permMatch[1]);
      }

      let requiredAddon: string | null = null;
      const addonMatch = handlerBody.match(/requireAddon\(\s*["']([^"']+)["']\s*\)/);
      if (addonMatch) {
        requiredAddon = addonMatch[1];
      }

      const tenantScoped = handlerBody.includes("tenantId") || handlerBody.includes("req.user?.tenantId") || handlerBody.includes("req.tenantId");

      // Extract prisma models accessed
      const prismaModelMatches = handlerBody.match(/prisma\.([a-zA-Z0-9_]+)\./g) || [];
      const dbModels = Array.from(new Set(prismaModelMatches.map((m) => m.replace("prisma.", "").replace(".", ""))));

      // Extract path params e.g. :id, :employeeId
      const pathParams = (subpath.match(/:[a-zA-Z0-9_]+/g) || []).map((p) => p.replace(":", ""));

      // Extract query params e.g. req.query.month, req.query.search
      const queryMatches = handlerBody.match(/req\.query\.([a-zA-Z0-9_]+)/g) || [];
      const queryParams = Array.from(new Set(queryMatches.map((q) => q.replace("req.query.", ""))));

      // Extract body fields e.g. req.body.status, const { name, email } = req.body
      const bodyMatches = handlerBody.match(/(?:const|let)\s*\{([^}]+)\}\s*=\s*req\.body/);
      const reqBodyFields: string[] = [];
      if (bodyMatches) {
        reqBodyFields.push(...bodyMatches[1].split(",").map((s) => s.trim().split(":")[0].trim()));
      }
      const directBodyMatches = handlerBody.match(/req\.body\.([a-zA-Z0-9_]+)/g) || [];
      reqBodyFields.push(...directBodyMatches.map((b) => b.replace("req.body.", "")));

      const primaryMount = fileMounts[0] || ("/api/" + baseName);
      const cleanSub = subpath === "/" ? "" : subpath;
      const fullPath = (primaryMount + cleanSub).replace(/\/+/g, "/");

      // Determine status based on actual code inspection
      let status: "WORKING" | "PARTIAL" | "MISSING" | "BROKEN" = "WORKING";
      let description = `${method} endpoint for ${baseName}`;

      if (handlerBody.includes("TODO") || handlerBody.includes("not implemented") || handlerBody.includes("res.status(501)")) {
        status = "PARTIAL";
        description += " (Incomplete stub/TODO detected)";
      } else if (handlerBody.includes("cmsPage.find") && ["pos", "products", "invoices", "crm"].includes(baseName)) {
        // If still falling back to CMS page JSON
        status = "PARTIAL";
        description += " (CMS JSON blob compatibility bridge)";
      } else {
        status = "WORKING";
      }

      allEndpoints.push({
        id: `${method}_${fullPath.replace(/[^a-zA-Z0-9]/g, "_")}`,
        method,
        subpath,
        fullPath,
        module: baseName.charAt(0).toUpperCase() + baseName.slice(1),
        description,
        authRequired,
        requiredRoles: roles,
        requiredPermissions: permissions,
        requiredAddon,
        tenantScoped,
        databaseModels: dbModels as string[],
        status,
        requestParams: pathParams,
        queryParams: Array.from(new Set(queryParams)) as string[],
        requestBodyFields: Array.from(new Set(reqBodyFields)) as string[],
      });
    }
  }

  // 2. Discover Database Models from prisma schema
  const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
  const dbModelsList: Array<{
    name: string;
    fieldsCount: number;
    hasTenantId: boolean;
    relations: string[];
    indexes: string[];
  }> = [];

  let modelMatch;
  while ((modelMatch = modelRegex.exec(prismaSchema)) !== null) {
    const modelName = modelMatch[1];
    const body = modelMatch[2];
    const lines = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"));
    const hasTenantId = body.includes("tenantId") || body.includes("tenant_id");
    const relationLines = body.split("\n").filter((l) => l.includes("@relation"));
    const relations = relationLines.map((l) => l.trim().split(/\s+/)[0]);
    const indexLines = body.split("\n").filter((l) => l.includes("@@index"));
    const indexes = indexLines.map((l) => l.trim());

    dbModelsList.push({
      name: modelName,
      fieldsCount: lines.length,
      hasTenantId,
      relations,
      indexes,
    });
  }

  console.log(`Discovered ${allEndpoints.length} actual endpoints across ${routeFiles.length} files.`);
  console.log(`Discovered ${dbModelsList.length} Prisma models.`);

  return {
    endpoints: allEndpoints,
    models: dbModelsList,
  };
}

if (require.main === module) {
  const result = runForensicAudit();
  fs.writeFileSync(
    path.resolve(__dirname, "discovered_endpoints.json"),
    JSON.stringify(result, null, 2),
    "utf8"
  );
  console.log("Wrote discovered_endpoints.json successfully.");
}

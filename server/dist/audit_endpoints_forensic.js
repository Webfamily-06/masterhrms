"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runForensicAudit = runForensicAudit;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function runForensicAudit() {
    const indexContent = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "index.ts"), "utf8");
    const routesDir = path_1.default.resolve(__dirname, "routes");
    const prismaSchema = fs_1.default.readFileSync(path_1.default.resolve(__dirname, "../prisma/schema.prisma"), "utf8");
    // 1. Map mounts from index.ts
    const mountMap = {};
    const mountRegex = /app\.use\(\s*["']([^"']+)["']\s*,\s*([a-zA-Z0-9_]+)\s*\)/g;
    let mountMatch;
    while ((mountMatch = mountRegex.exec(indexContent)) !== null) {
        const mountPath = mountMatch[1];
        const routerName = mountMatch[2];
        if (!mountMap[routerName])
            mountMap[routerName] = [];
        mountMap[routerName].push(mountPath);
    }
    // Also check imports in index.ts to map routerName to file
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/routes\/([^"']+)["']/g;
    const routerToFile = {};
    let importMatch;
    while ((importMatch = importRegex.exec(indexContent)) !== null) {
        const identifiers = importMatch[1].split(",").map((s) => s.trim());
        const file = importMatch[2];
        for (const id of identifiers) {
            routerToFile[id] = file;
        }
    }
    // Default fallback mappings
    const routeFiles = fs_1.default.readdirSync(routesDir).filter((f) => f.endsWith(".routes.ts"));
    const allEndpoints = [];
    for (const file of routeFiles) {
        const baseName = file.replace(".routes.ts", "");
        const filePath = path_1.default.join(routesDir, file);
        const content = fs_1.default.readFileSync(filePath, "utf8");
        // Discover router variable names in the file
        // e.g. const router = Router(); or export const employeesRouter = Router();
        const declaredRouters = [];
        const routerDeclRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:express\.)?Router\(/g;
        let rMatch;
        while ((rMatch = routerDeclRegex.exec(content)) !== null) {
            declaredRouters.push(rMatch[1]);
        }
        if (declaredRouters.length === 0)
            declaredRouters.push("router");
        // Find the mount paths for this file's routers
        let fileMounts = [];
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
            const authRequired = handlerBody.includes("requireAuth") || handlerBody.includes("authenticate") || handlerBody.includes("requireSuperAdmin");
            const roles = [];
            if (handlerBody.includes("requireSuperAdmin") || baseName === "super") {
                roles.push("super_admin");
            }
            const roleMatch = handlerBody.match(/requireRole\(\s*\[?([^\]\)]+)\]?\s*\)/);
            if (roleMatch) {
                roles.push(...roleMatch[1].replace(/["']/g, "").split(",").map((s) => s.trim()));
            }
            if (roles.length === 0) {
                if (["super", "tenants", "plans"].includes(baseName))
                    roles.push("super_admin");
                else if (["accounting", "expenses", "invoices"].includes(baseName))
                    roles.push("tenant_admin", "accountant");
                else if (["payroll", "attendance", "leave", "shifts", "recruitment", "employees"].includes(baseName)) {
                    if (subpath.includes("punch") || subpath.includes("my-") || subpath.includes("request"))
                        roles.push("employee", "hr_manager", "tenant_admin");
                    else
                        roles.push("tenant_admin", "hr_manager");
                }
                else if (["pos", "products", "sales", "transfers"].includes(baseName))
                    roles.push("tenant_admin", "cashier");
                else
                    roles.push("tenant_admin");
            }
            const permissions = [];
            const permMatch = handlerBody.match(/requirePermission\(\s*["']([^"']+)["']\s*\)/);
            if (permMatch) {
                permissions.push(permMatch[1]);
            }
            let requiredAddon = null;
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
            const reqBodyFields = [];
            if (bodyMatches) {
                reqBodyFields.push(...bodyMatches[1].split(",").map((s) => s.trim().split(":")[0].trim()));
            }
            const directBodyMatches = handlerBody.match(/req\.body\.([a-zA-Z0-9_]+)/g) || [];
            reqBodyFields.push(...directBodyMatches.map((b) => b.replace("req.body.", "")));
            const primaryMount = fileMounts[0] || ("/api/" + baseName);
            const cleanSub = subpath === "/" ? "" : subpath;
            const fullPath = (primaryMount + cleanSub).replace(/\/+/g, "/");
            // Determine status based on actual code inspection
            let status = "WORKING";
            let description = `${method} endpoint for ${baseName}`;
            if (handlerBody.includes("TODO") || handlerBody.includes("not implemented") || handlerBody.includes("res.status(501)")) {
                status = "PARTIAL";
                description += " (Incomplete stub/TODO detected)";
            }
            else if (handlerBody.includes("cmsPage.find") && ["pos", "products", "invoices", "crm"].includes(baseName)) {
                // If still falling back to CMS page JSON
                status = "PARTIAL";
                description += " (CMS JSON blob compatibility bridge)";
            }
            else {
                status = "WORKING";
            }
            allEndpoints.push({
                id: `${method}_${fullPath.replace(/[^a-zA-Z0-9]/g, "_")}`,
                method,
                subpath,
                fullPath,
                module: baseName === "super" ? "Super Admin" : baseName.charAt(0).toUpperCase() + baseName.slice(1),
                description,
                authRequired,
                requiredRoles: roles,
                requiredPermissions: permissions,
                requiredAddon,
                tenantScoped,
                databaseModels: dbModels,
                status,
                requestParams: pathParams,
                queryParams: Array.from(new Set(queryParams)),
                requestBodyFields: Array.from(new Set(reqBodyFields)),
            });
        }
    }
    // 2. Discover Database Models from prisma schema
    const modelRegex = /model\s+([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
    const dbModelsList = [];
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
        const fields = [];
        lines.forEach((l) => {
            const parts = l.split(/\s+/);
            if (parts.length >= 2 && !parts[0].startsWith("@") && !parts[0].startsWith("//")) {
                const fieldName = parts[0];
                const rawType = parts[1];
                const isOptional = rawType.endsWith("?");
                const fieldType = rawType.replace("?", "");
                const isId = l.includes("@id");
                const isUnique = l.includes("@unique");
                fields.push({ name: fieldName, type: fieldType, isOptional, isId, isUnique });
            }
        });
        dbModelsList.push({
            name: modelName,
            fieldsCount: fields.length,
            hasTenantId,
            fields,
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
    fs_1.default.writeFileSync(path_1.default.resolve(__dirname, "discovered_endpoints.json"), JSON.stringify(result, null, 2), "utf8");
    console.log("Wrote discovered_endpoints.json successfully.");
}

const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../server/src/routes/files.routes.ts');
let s = fs.readFileSync(targetPath, 'utf8');
const isCrlf = s.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';

const snippet = `// ============================================================================` + nl +
`// CERTIFICATES SYSTEM FOLDER MANAGEMENT` + nl +
`// ============================================================================` + nl +
`filesRouter.post("/certificates/ensure-folders", requireAuth, async (req: any, res: Response) => {` + nl +
`  try {` + nl +
`    const { tenantId, userId } = getAuthContext(req);` + nl +
`    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });` + nl +
`    const folders = await CertificateFolderService.ensureCertificatesFolders(tenantId, userId);` + nl +
`    return res.json({ success: true, folders });` + nl +
`  } catch (err: any) {` + nl +
`    return res.status(500).json({ error: err.message || "Failed to ensure certificates folders." });` + nl +
`  }` + nl +
`});` + nl + nl +
`filesRouter.get("/certificates/folders", requireAuth, async (req: any, res: Response) => {` + nl +
`  try {` + nl +
`    const { tenantId, userId } = getAuthContext(req);` + nl +
`    if (!tenantId) return res.status(400).json({ error: "Tenant context required." });` + nl +
`    const folders = await CertificateFolderService.ensureCertificatesFolders(tenantId, userId);` + nl +
`    return res.json({ success: true, folders });` + nl +
`  } catch (err: any) {` + nl +
`    return res.status(500).json({ error: err.message || "Failed to retrieve certificates folders." });` + nl +
`  }` + nl +
`});` + nl + nl;

s = s.replace('// 1. STORAGE USAGE & STATS ENDPOINTS', snippet + '// 1. STORAGE USAGE & STATS ENDPOINTS');
fs.writeFileSync(targetPath, s, 'utf8');
console.log('Successfully inserted certificates routes into files.routes.ts');

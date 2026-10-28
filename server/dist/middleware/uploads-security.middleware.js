"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPublicUploadPath = isPublicUploadPath;
exports.uploadsSecurityMiddleware = uploadsSecurityMiddleware;
const path_1 = __importDefault(require("path"));
const jwt_1 = require("../lib/jwt");
const prisma_1 = require("../prisma");
const PUBLIC_UPLOAD_PREFIXES = [
    "system/branding/",
    "branding/",
    "platform/branding/",
    "workspace/branding/",
    "addons/",
    "media/icons/",
    "media/screens/",
];
/**
 * Checks whether a requested relative upload path falls into the allowed public asset categories
 * (system & tenant branding logos, favicons, marketplace icons, screenshots).
 */
function isPublicUploadPath(relativePath) {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    return PUBLIC_UPLOAD_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
/**
 * Security triage middleware guarding `/uploads` static file mounts.
 * Rejects unauthenticated access to non-public / sensitive directories (e.g., documents, private, contracts, payroll).
 * Enforces cross-tenant authorization checks via database metadata.
 */
async function uploadsSecurityMiddleware(req, res, next) {
    const rawPath = req.path;
    const normalizedPath = path_1.default.normalize(rawPath).replace(/^(\.\.[\/\\])+/, "");
    // Prevent directory traversal attacks
    if (rawPath.includes("..") || normalizedPath.includes("..")) {
        return res.status(400).json({ error: "Invalid path: Path traversal detected." });
    }
    const subPath = normalizedPath.replace(/\\/g, "/").replace(/^\/+/, "");
    // Public assets pass through directly to express.static
    if (isPublicUploadPath(subPath)) {
        return next();
    }
    // Extract authentication token from Authorization header, query parameter, or cookie
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }
    else if (req.query?.token && typeof req.query.token === "string") {
        token = req.query.token;
    }
    else if (req.cookies?.hrms_auth_token) {
        token = req.cookies.hrms_auth_token;
    }
    else if (req.cookies?.auth_token) {
        token = req.cookies.auth_token;
    }
    else if (req.cookies?.token) {
        token = req.cookies.token;
    }
    else if (req.headers.cookie) {
        const rawCookies = req.headers.cookie;
        const match = rawCookies.match(/(?:^|;\s*)(?:hrms_auth_token|auth_token|token)=([^;]+)/);
        if (match) {
            try {
                token = decodeURIComponent(match[1]);
            }
            catch {
                token = match[1];
            }
        }
    }
    if (!token) {
        return res.status(401).json({
            error: "Authentication required to access private document assets.",
            code: "UPLOAD_AUTH_REQUIRED",
        });
    }
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        const userId = decoded.userId || decoded.id;
        const db = prisma_1.rawPrisma || prisma_1.prisma;
        const user = await db.user.findUnique({
            where: { id: userId },
            include: { profile: true, roles: true },
        });
        if (!user) {
            return res.status(401).json({ error: "Invalid or expired user session." });
        }
        const isSuper = user.roles.some((r) => r.role === "super_admin");
        const userTenantId = user.profile?.tenantId || decoded.tenantId || null;
        // Query database for media file ownership
        const mediaFile = await db.mediaFile.findFirst({
            where: {
                OR: [
                    { filePath: subPath },
                    { url: `/uploads/${subPath}` },
                ],
                deletedAt: null,
            },
        });
        if (mediaFile) {
            if (!isSuper && mediaFile.tenantId && mediaFile.tenantId !== userTenantId) {
                return res.status(403).json({
                    error: "Forbidden: Access denied to private asset belonging to another workspace.",
                    code: "FORBIDDEN_WORKSPACE_ASSET",
                });
            }
        }
        else {
            // If file exists on disk but has no MediaFile record, only Super Admin can access
            if (!isSuper) {
                return res.status(404).json({ error: "Requested asset not found or access denied." });
            }
        }
        return next();
    }
    catch (_err) {
        return res.status(401).json({ error: "Invalid or expired authorization token." });
    }
}

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
const chat_service_1 = require("../services/chat.service");
const PUBLIC_UPLOAD_PREFIXES = [
    "system/branding/",
    "branding/",
    "platform/branding/",
    "workspace/branding/",
    "avatars/",
    "addons/",
    "media/icons/",
    "media/screens/",
    "award-types/",
];
// Folders / categories that contain confidential PII or employee documents
const SENSITIVE_DOCUMENT_FOLDERS = [
    "documents",
    "employee",
    "employees",
    "contracts",
    "medical",
    "disciplinary",
    "salary_slip",
    "payslips",
    "passport",
    "national_id",
    "statutory",
    "private",
    "identity",
    "leave-attachments",
];
/**
 * Checks whether a requested relative upload path falls into the strictly allowed public asset categories
 * (system & tenant branding logos, favicons, marketplace icons, screenshots).
 * PENTEST-004: Rejects any path containing sensitive document segments and anchors nested branding paths
 * strictly to `<tenantId>/branding/...` or `<tenantId>/Certificates/Branding/...` so private files cannot
 * bypass authentication by embedding `/branding/` or `/award-types/` inside a confidential path.
 */
function isPublicUploadPath(relativePath) {
    const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const lower = normalized.toLowerCase();
    // Never allow any path touching confidential/private/chat/employee folders to bypass authentication
    if (SENSITIVE_DOCUMENT_FOLDERS.some((f) => lower === f || lower.startsWith(`${f}/`) || lower.includes(`/${f}/`)) ||
        lower.includes("chat/") ||
        lower.includes("communication/")) {
        return false;
    }
    if (PUBLIC_UPLOAD_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
        return true;
    }
    // Allow strictly anchored 1-segment tenant public branding/award paths:
    // `<tenantId>/branding/<file>`, `<tenantId>/award-types/<file>`, `<tenantId>/Certificates/Branding/<file>`
    return (/^[a-zA-Z0-9_-]+\/(?:branding|award-types)\/[^/]+$/.test(normalized) ||
        /^[a-zA-Z0-9_-]+\/Certificates\/Branding\/[^/]+$/.test(normalized));
}
/**
 * Security triage middleware guarding `/uploads` static file mounts.
 * Rejects unauthenticated access to non-public / sensitive directories (e.g., documents, private, contracts, payroll).
 * Enforces cross-tenant authorization checks via database metadata.
 * TASK-P1-03: Enforces employee-level authorization (BOLA protection) on confidential documents.
 */
async function uploadsSecurityMiddleware(req, res, next) {
    const rawOriginal = req.originalUrl || req.url || req.path || "";
    const rawPath = req.path || "";
    // PENTEST-004: Multi-pass URL decoding to block encoded traversal (%2e%2e, %252e%252e, %5c, null bytes)
    let decoded = rawPath;
    for (let i = 0; i < 3; i++) {
        try {
            const nextDecoded = decodeURIComponent(decoded);
            if (nextDecoded === decoded)
                break;
            decoded = nextDecoded;
        }
        catch {
            return res.status(400).json({ error: "Invalid path: Malformed URL encoding.", code: "INVALID_PATH_ENCODING" });
        }
    }
    if (rawOriginal.toLowerCase().includes("%2e") ||
        rawOriginal.toLowerCase().includes("%5c") ||
        rawOriginal.includes("\0") ||
        decoded.includes("\0") ||
        decoded.includes("..") ||
        decoded.includes("\\")) {
        return res.status(400).json({ error: "Invalid path: Path traversal detected.", code: "PATH_TRAVERSAL_BLOCKED" });
    }
    const normalizedPath = path_1.default.posix.normalize(decoded);
    if (normalizedPath.includes("..")) {
        return res.status(400).json({ error: "Invalid path: Path traversal detected.", code: "PATH_TRAVERSAL_BLOCKED" });
    }
    const subPath = normalizedPath.replace(/^\/+/, "");
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
        const isHrOrAdmin = user.roles.some((r) => ["admin", "super_admin", "hr_admin", "hr_manager", "Workspace Admin"].includes(r.role));
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
            // 1. Cross-Tenant Isolation Guard
            if (!isSuper && mediaFile.tenantId && mediaFile.tenantId !== userTenantId) {
                return res.status(403).json({
                    error: "Forbidden: Access denied to private asset belonging to another workspace.",
                    code: "FORBIDDEN_WORKSPACE_ASSET",
                });
            }
            // 2. Chat Attachment Strict Participant & FileAcl Authorization (even HR/Admins cannot read private 1:1 DM files)
            const folderLower = (mediaFile.folder || "").toLowerCase();
            const pathLower = subPath.toLowerCase();
            const isChatMedia = mediaFile.systemModule === "chat" ||
                folderLower.includes("communication") ||
                folderLower.includes("organization chat") ||
                pathLower.includes("communication/") ||
                pathLower.includes("chat/");
            if (isChatMedia) {
                const roleNames = user.roles.map((r) => r.role);
                const chatAllowed = await chat_service_1.ChatService.authorizeChatMediaAccess({
                    mediaFile,
                    tenantId: mediaFile.tenantId || userTenantId || "",
                    userId: user.id,
                    roles: roleNames,
                });
                if (!chatAllowed) {
                    return res.status(403).json({
                        error: "Forbidden: You are not authorized to access this chat attachment.",
                        code: "UNAUTHORIZED_CHAT_MEDIA_ACCESS",
                    });
                }
            }
            // 3. TASK-P1-03: Object-Level Authorization (BOLA Guard) for Confidential Documents
            const isConfidential = SENSITIVE_DOCUMENT_FOLDERS.some((f) => folderLower.includes(f) || pathLower.includes(f));
            if (isConfidential && !isSuper && !isHrOrAdmin) {
                // Find employee ID for caller if exists
                const employee = await db.employee.findFirst({
                    where: { userId: user.id },
                    select: { id: true },
                }).catch(() => null);
                const isOwner = mediaFile.uploadedBy === user.id ||
                    (employee && mediaFile.uploadedBy === employee.id) ||
                    (employee && (pathLower.includes(employee.id.toLowerCase()) || folderLower.includes(employee.id.toLowerCase())));
                const userPermissions = decoded.permissions || [];
                const hasDocPermission = userPermissions.includes("hrm.documents.view_all") || userPermissions.includes("hrm.employees.view");
                let isSubordinateLeaveAttachment = false;
                if (!isOwner && !hasDocPermission && employee && userTenantId) {
                    const [linkedLeave, linkedEncashment] = await Promise.all([
                        db.leaveRequest
                            .findFirst({
                            where: {
                                tenantId: userTenantId,
                                attachmentUrl: { contains: subPath },
                                OR: [
                                    { employeeId: employee.id },
                                    { employee: { managerId: employee.id } },
                                ],
                            },
                            select: { id: true },
                        })
                            .catch(() => null),
                        db.leaveEncashmentRequest
                            .findFirst({
                            where: {
                                tenantId: userTenantId,
                                supportingDocUrl: { contains: subPath },
                                OR: [
                                    { employeeId: employee.id },
                                    { employee: { managerId: employee.id } },
                                ],
                            },
                            select: { id: true },
                        })
                            .catch(() => null),
                    ]);
                    isSubordinateLeaveAttachment = Boolean(linkedLeave || linkedEncashment);
                }
                if (!isOwner && !hasDocPermission && !isSubordinateLeaveAttachment) {
                    return res.status(403).json({
                        error: "Forbidden: You are not authorized to view this confidential document.",
                        code: "UNAUTHORIZED_DOCUMENT_ACCESS",
                    });
                }
            }
        }
        else {
            const pathLower = subPath.toLowerCase();
            if (pathLower.includes("communication/") || pathLower.includes("chat/")) {
                return res.status(404).json({ error: "Requested chat attachment not found or access denied." });
            }
            // If file exists on disk but has no MediaFile record, only Super Admin or HR can access
            if (!isSuper && !isHrOrAdmin) {
                return res.status(404).json({ error: "Requested asset not found or access denied." });
            }
        }
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox");
        res.setHeader("Cache-Control", "private, max-age=300");
        return next();
    }
    catch (_err) {
        return res.status(401).json({ error: "Invalid or expired authorization token." });
    }
}

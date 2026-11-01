"use strict";
/**
 * MASTERHRMS — Phase F6 WebDAV Gateway & Token Routes
 *
 * Implements RFC 4918 read-only gateway on /webdav/*:
 * - OPTIONS, PROPFIND, GET, HEAD
 * - Rejects all write methods with 405 Method Not Allowed
 * - HTTP Basic Auth / Bearer Token resolution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.webdavRouter = void 0;
const express_1 = require("express");
const webdav_service_1 = require("../services/webdav/webdav.service");
const document_preview_service_1 = require("../services/files/document-preview.service");
const prisma_1 = require("../prisma");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
exports.webdavRouter = (0, express_1.Router)();
/**
 * Authentication middleware for WebDAV endpoints
 */
async function requireWebdavAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.setHeader("WWW-Authenticate", 'Basic realm="MASTERHRMS WebDAV"');
        return res.status(401).send("Authentication required for WebDAV gateway.");
    }
    let tokenString = "";
    if (authHeader.startsWith("Bearer ")) {
        tokenString = authHeader.slice(7).trim();
    }
    else if (authHeader.startsWith("Basic ")) {
        const credentials = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
        // Format is username:password. The WebDAV token can be passed as password or username.
        const parts = credentials.split(":");
        tokenString = parts[1] || parts[0];
    }
    const tokenRecord = await webdav_service_1.WebdavService.verifyToken(tokenString);
    if (!tokenRecord) {
        res.setHeader("WWW-Authenticate", 'Basic realm="MASTERHRMS WebDAV"');
        return res.status(401).send("Invalid or expired WebDAV token.");
    }
    req.webdav = {
        tenantId: tokenRecord.tenantId,
        userId: tokenRecord.userId,
        tokenRecord,
    };
    next();
}
// 1. Strict Read-Only Invariant: Block any mutation method
exports.webdavRouter.all("*", (req, res, next) => {
    const writeMethods = ["PUT", "DELETE", "MKCOL", "MOVE", "COPY", "PROPPATCH", "LOCK", "UNLOCK", "POST", "PATCH"];
    if (writeMethods.includes(req.method.toUpperCase())) {
        res.setHeader("Allow", "OPTIONS, PROPFIND, GET, HEAD");
        return res.status(405).json({
            error: "Method Not Allowed",
            message: "MASTERHRMS WebDAV gateway is strictly read-only. Uploads, moves, and deletions must occur via the web application.",
        });
    }
    next();
});
// 2. OPTIONS handler
exports.webdavRouter.options("*", (req, res) => {
    res.setHeader("DAV", "1");
    res.setHeader("Allow", "OPTIONS, PROPFIND, GET, HEAD");
    res.setHeader("MS-Author-Via", "DAV");
    return res.status(200).end();
});
// 3. PROPFIND handler
exports.webdavRouter.all("*", async (req, res, next) => {
    if (req.method.toUpperCase() !== "PROPFIND") {
        return next();
    }
    await requireWebdavAuth(req, res, async () => {
        try {
            const { tenantId } = req.webdav;
            const rawPath = req.path.replace(/^\/+/, "");
            const pathSegments = rawPath.split("/").filter(Boolean);
            let currentNode = null;
            let parentId = null;
            // If accessing a specific folder/file by path or root
            if (pathSegments.length > 0) {
                // Resolve path hierarchically
                for (const segment of pathSegments) {
                    const decoded = decodeURIComponent(segment);
                    const found = await prisma.mediaFile.findFirst({
                        where: {
                            tenantId,
                            status: "ACTIVE",
                            parentId,
                            fileName: decoded,
                        },
                    });
                    if (found) {
                        currentNode = found;
                        parentId = found.id;
                    }
                }
            }
            // Fetch children
            const children = await prisma.mediaFile.findMany({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    parentId: currentNode ? currentNode.id : null,
                },
                orderBy: [{ isFolder: "desc" }, { fileName: "asc" }],
            });
            const xml = webdav_service_1.WebdavService.buildMultistatusXml(req.originalUrl.split("?")[0], currentNode, children);
            res.setHeader("Content-Type", "application/xml; charset=utf-8");
            return res.status(207).send(xml);
        }
        catch (err) {
            console.error("[WebDAV PROPFIND Error]:", err);
            return res.status(500).send("Error generating WebDAV directory catalog.");
        }
    });
});
// 4. GET & HEAD handler
exports.webdavRouter.get("*", requireWebdavAuth, async (req, res) => {
    try {
        const { tenantId } = req.webdav;
        const rawPath = req.path.replace(/^\/+/, "");
        const pathSegments = rawPath.split("/").filter(Boolean);
        if (pathSegments.length === 0) {
            return res.status(400).send("Cannot GET root WebDAV collection directly.");
        }
        let targetFile = null;
        let parentId = null;
        for (let i = 0; i < pathSegments.length; i++) {
            const decoded = decodeURIComponent(pathSegments[i]);
            const found = await prisma.mediaFile.findFirst({
                where: {
                    tenantId,
                    status: "ACTIVE",
                    parentId,
                    fileName: decoded,
                },
            });
            if (found) {
                targetFile = found;
                parentId = found.id;
            }
        }
        if (!targetFile || targetFile.isFolder) {
            return res.status(404).send("File not found in WebDAV directory.");
        }
        // Safety: Quarantined files blocked
        if (targetFile.scanStatus === "INFECTED" || targetFile.scanStatus === "QUARANTINED") {
            return res.status(403).send("File is quarantined due to security violation.");
        }
        const buffer = await document_preview_service_1.DocumentPreviewService.getFileBuffer(targetFile);
        if (!buffer) {
            return res.status(404).send("File binary stream unreadable.");
        }
        res.setHeader("Content-Type", targetFile.mimeType || "application/octet-stream");
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Last-Modified", webdav_service_1.WebdavService.toHttpDate(new Date(targetFile.updatedAt || targetFile.createdAt)));
        res.setHeader("ETag", `"${targetFile.checksumSha || targetFile.id}"`);
        if (req.method === "HEAD") {
            return res.status(200).end();
        }
        return res.status(200).send(buffer);
    }
    catch (err) {
        console.error("[WebDAV GET Error]:", err);
        return res.status(500).send("Internal server error streaming file over WebDAV.");
    }
});

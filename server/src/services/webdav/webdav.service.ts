/**
 * MASTERHRMS — Phase F6 Read-Only WebDAV Service
 * 
 * Implements RFC 4918 read-only filesystem gateway:
 * - Token management (SHA-256 hashed keys)
 * - PROPFIND multistatus XML generation
 * - GET / HEAD streaming
 * - Strict read-only invariant (all mutation methods return 405 Method Not Allowed)
 */

import crypto from "crypto";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { DocumentPreviewService } from "../files/document-preview.service";

const prisma = rawPrisma || proxiedPrisma;

export class WebdavService {
  /**
   * Generate a secure WebDAV access token.
   */
  static async createToken(tenantId: string, userId: string, tokenName: string) {
    const rawSecret = crypto.randomBytes(32).toString("hex");
    const prefix = "dav_";
    const fullToken = `${prefix}${rawSecret}`;
    const tokenHash = crypto.createHash("sha256").update(fullToken).digest("hex");

    const record = await (prisma as any).webdavToken.create({
      data: {
        tenantId,
        userId,
        tokenName: tokenName || "Desktop Mount Token",
        tokenHash,
        prefix,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000), // 90 days validity
      },
    });

    return {
      tokenId: record.id,
      tokenName: record.tokenName,
      token: fullToken, // Only returned once on creation
      expiresAt: record.expiresAt,
    };
  }

  /**
   * Validate incoming token (from Bearer header or Basic Auth password).
   */
  static async verifyToken(tokenString: string) {
    if (!tokenString) return null;
    const cleanToken = tokenString.trim();
    const hash = crypto.createHash("sha256").update(cleanToken).digest("hex");

    const record = await (prisma as any).webdavToken.findFirst({
      where: {
        tokenHash: hash,
        isRevoked: false,
      },
    });

    if (!record) return null;

    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return null;
    }

    // Update last used timestamp
    await (prisma as any).webdavToken.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return record;
  }

  /**
   * List tokens for user.
   */
  static async listTokens(tenantId: string, userId: string) {
    return (prisma as any).webdavToken.findMany({
      where: { tenantId, userId, isRevoked: false },
      select: {
        id: true,
        tokenName: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Revoke token.
   */
  static async revokeToken(tenantId: string, tokenId: string, userId: string) {
    return (prisma as any).webdavToken.update({
      where: { id: tokenId, tenantId, userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Escape XML text for RFC 4918 response.
   */
  static escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Format RFC 1123 HTTP date.
   */
  static toHttpDate(date: Date): string {
    return date.toUTCString();
  }

  /**
   * Build PROPFIND XML Multistatus response.
   */
  static buildMultistatusXml(
    baseUri: string,
    currentNode: any | null,
    children: any[]
  ): string {
    let xml = `<?xml version="1.0" encoding="utf-8" ?>\n`;
    xml += `<D:multistatus xmlns:D="DAV:">\n`;

    // 1. Current Resource (Depth 0 or root of collection)
    const currentHref = baseUri.endsWith("/") ? baseUri : `${baseUri}/`;
    const currentName = currentNode ? currentNode.fileName : "root";
    const currentModified = currentNode?.updatedAt ? this.toHttpDate(new Date(currentNode.updatedAt)) : this.toHttpDate(new Date());

    xml += `  <D:response>\n`;
    xml += `    <D:href>${this.escapeXml(currentHref)}</D:href>\n`;
    xml += `    <D:propstat>\n`;
    xml += `      <D:prop>\n`;
    xml += `        <D:displayname>${this.escapeXml(currentName)}</D:displayname>\n`;
    xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
    xml += `        <D:getlastmodified>${currentModified}</D:getlastmodified>\n`;
    xml += `      </D:prop>\n`;
    xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
    xml += `    </D:propstat>\n`;
    xml += `  </D:response>\n`;

    // 2. Children (Depth 1)
    for (const child of children) {
      // Exclude quarantined files
      if (child.scanStatus === "INFECTED" || child.scanStatus === "QUARANTINED") {
        continue;
      }

      const childHref = `${currentHref}${encodeURIComponent(child.fileName)}${child.isFolder ? "/" : ""}`;
      const childModified = this.toHttpDate(new Date(child.updatedAt || child.createdAt));

      xml += `  <D:response>\n`;
      xml += `    <D:href>${this.escapeXml(childHref)}</D:href>\n`;
      xml += `    <D:propstat>\n`;
      xml += `      <D:prop>\n`;
      xml += `        <D:displayname>${this.escapeXml(child.fileName)}</D:displayname>\n`;
      if (child.isFolder) {
        xml += `        <D:resourcetype><D:collection/></D:resourcetype>\n`;
      } else {
        xml += `        <D:resourcetype/>\n`;
        xml += `        <D:getcontentlength>${child.fileSize || 0}</D:getcontentlength>\n`;
        xml += `        <D:getcontenttype>${this.escapeXml(child.mimeType || "application/octet-stream")}</D:getcontenttype>\n`;
      }
      xml += `        <D:getlastmodified>${childModified}</D:getlastmodified>\n`;
      xml += `      </D:prop>\n`;
      xml += `      <D:status>HTTP/1.1 200 OK</D:status>\n`;
      xml += `    </D:propstat>\n`;
      xml += `  </D:response>\n`;
    }

    xml += `</D:multistatus>`;
    return xml;
  }
}

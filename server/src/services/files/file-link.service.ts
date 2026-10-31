/**
 * MASTERHRMS — Phase F5 File Link & Entity Permission Delegation Service
 * 
 * Manages zero-byte linking of File Manager assets to business entities (expenses,
 * chat, KYC, employee documents, support tickets, billing) and dynamically resolves
 * delegated entity-level read permissions.
 */

import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";

const prisma = rawPrisma || proxiedPrisma;

export interface CreateFileLinkInput {
  fileId: string;
  tenantId: string;
  module: string;
  pageKey: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  linkedBy: string;
}

export class FileLinkService {
  /**
   * Links a file to a business entity without duplicating bytes.
   */
  public static async createLink(input: CreateFileLinkInput) {
    const { fileId, tenantId, module, pageKey, entityType, entityId, fieldKey, linkedBy } = input;

    // 1. Verify file existence and tenant matching
    const file = await prisma.mediaFile.findUnique({
      where: { id: fileId },
    });

    if (!file || file.deletedAt || file.status === "TRASHED") {
      const err: any = new Error("File not found or has been moved to trash.");
      err.status = 404;
      throw err;
    }

    if (file.tenantId && file.tenantId !== tenantId) {
      const err: any = new Error("Forbidden: Cross-tenant file linking is not permitted.");
      err.status = 403;
      throw err;
    }

    // 2. Idempotent link creation
    const existing = await prisma.fileLink.findFirst({
      where: {
        fileId,
        entityType,
        entityId,
        fieldKey,
      },
    });

    if (existing) {
      return existing;
    }

    const link = await prisma.fileLink.create({
      data: {
        fileId,
        module,
        pageKey,
        entityType,
        entityId,
        fieldKey,
        linkedBy,
      },
    });

    // 3. Mirror in legacy media_usages for backward compatibility
    try {
      const existingUsage = await prisma.mediaUsage.findFirst({
        where: {
          mediaId: fileId,
          entityType,
          entityId,
          fieldKey,
        },
      });
      if (!existingUsage) {
        await prisma.mediaUsage.create({
          data: {
            mediaId: fileId,
            entityType,
            entityId,
            fieldKey,
          },
        });
      }
    } catch (e) {
      // Non-blocking mirror
    }

    return link;
  }

  /**
   * Retrieves all file links for a specific business entity
   */
  public static async getLinksByEntity(entityType: string, entityId: string) {
    return await prisma.fileLink.findMany({
      where: { entityType, entityId },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            filePath: true,
            thumbnailKey: true,
            isPublic: true,
            category: true,
            status: true,
            createdAt: true,
            ownerId: true,
          },
        },
      },
      orderBy: { linkedAt: "desc" },
    });
  }

  /**
   * Retrieves all entity links for a specific file
   */
  public static async getLinksByFile(fileId: string) {
    return await prisma.fileLink.findMany({
      where: { fileId },
      orderBy: { linkedAt: "desc" },
    });
  }

  /**
   * Removes a file link without deleting the underlying physical file.
   */
  public static async removeLink(linkId: string, userId: string, isSuper = false) {
    const link = await prisma.fileLink.findUnique({
      where: { id: linkId },
      include: { file: true },
    });

    if (!link) {
      const err: any = new Error("File link not found.");
      err.status = 404;
      throw err;
    }

    // Permission check: uploader, linker, or super admin can remove link
    if (!isSuper && link.linkedBy !== userId && link.file.ownerId !== userId && link.file.uploadedBy !== userId) {
      const err: any = new Error("Forbidden: You do not have permission to remove this file link.");
      err.status = 403;
      throw err;
    }

    await prisma.fileLink.delete({
      where: { id: linkId },
    });

    // Mirror cleanup in legacy media_usages
    try {
      await prisma.mediaUsage.deleteMany({
        where: {
          mediaId: link.fileId,
          entityType: link.entityType,
          entityId: link.entityId,
          fieldKey: link.fieldKey,
        },
      });
    } catch (e) {
      // Non-blocking
    }

    return true;
  }

  /**
   * Cascading unlink: called when a business entity (e.g. Expense, Support Ticket) is deleted.
   * Removes all links pointing to the entity, preserving physical files.
   */
  public static async removeLinksByEntity(entityType: string, entityId: string): Promise<number> {
    const deleted = await prisma.fileLink.deleteMany({
      where: { entityType, entityId },
    });

    try {
      await prisma.mediaUsage.deleteMany({
        where: { entityType, entityId },
      });
    } catch (e) {
      // Non-blocking
    }

    return deleted.count;
  }

  /**
   * Evaluates whether a user can access a file through its linked business entities.
   * Implements Module Permission Delegation.
   */
  public static async canAccessViaEntity(
    userId: string,
    tenantId: string | null,
    fileId: string,
    userRoles: string[] = []
  ): Promise<boolean> {
    // 1. Admin roles have baseline read access
    if (userRoles.includes("super_admin") || userRoles.includes("tenant_admin") || userRoles.includes("admin")) {
      return true;
    }

    // 2. Fetch all links for this file
    const links = await prisma.fileLink.findMany({
      where: { fileId },
    });

    if (links.length === 0) {
      return false;
    }

    // 3. Find employee record for user
    const employee = await prisma.employee.findFirst({
      where: { userId, tenantId: tenantId || undefined },
      select: { id: true, departmentId: true, managerId: true },
    });

    for (const link of links) {
      const { entityType, entityId } = link;

      // Public branding / public job assets
      if (entityType === "workspace_branding" || entityType === "blog_post" || entityType === "public_job") {
        return true;
      }

      // Chat Messages: participant check
      if (entityType === "chat_message" || entityType === "chat_attachment") {
        const message = await prisma.chatMessage.findUnique({
          where: { id: entityId },
          select: { senderId: true, threadId: true },
        });
        if (message) {
          if (message.senderId === userId) {
            return true;
          }
          if (message.threadId?.includes(userId)) {
            return true;
          }
        }
      }

      // Expense Claims: Claimant, Approving Manager, or Finance/HR Admin
      if (entityType === "expense_claim" || entityType === "expense_receipt") {
        const claim = await prisma.expenseClaim.findUnique({
          where: { id: entityId },
          select: { employeeId: true },
        });
        if (claim) {
          if (employee && claim.employeeId === employee.id) return true;
          if (userRoles.includes("hr_admin") || userRoles.includes("finance_admin") || userRoles.includes("manager")) {
            return true;
          }
        }
      }

      // Employee Documents / KYC
      if (entityType === "employee_document" || entityType === "employee_kyc" || entityType === "employee") {
        if (employee && entityId === employee.id) return true;
        if (userRoles.includes("hr_admin") || userRoles.includes("manager")) return true;
      }

      // Support Tickets: Creator or Assigned Agent
      if (entityType === "support_ticket" || entityType === "helpdesk_ticket") {
        const ticket = await prisma.helpdeskTicket.findUnique({
          where: { id: entityId },
          select: { employeeId: true },
        });
        if (ticket) {
          if (employee && ticket.employeeId === employee.id) return true;
          if (userRoles.includes("hr_admin") || userRoles.includes("support_agent")) return true;
        }
      }

      // General fallback: if user linked this file, they have access
      if (link.linkedBy === userId) {
        return true;
      }
    }

    return false;
  }
}

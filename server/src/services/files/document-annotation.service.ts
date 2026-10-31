/**
 * MASTERHRMS — Phase F6 Document Annotation Service
 * 
 * Version-aware, multi-user document annotations & threaded discussion replies.
 */

import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;

export interface CreateAnnotationDTO {
  fileId: string;
  fileVersion?: number;
  pageNumber?: number;
  coordinates: { x: number; y: number; width?: number; height?: number };
  content: string;
  color?: string;
}

export interface UpdateAnnotationDTO {
  content?: string;
  status?: "ACTIVE" | "RESOLVED" | "DELETED";
  color?: string;
}

export class DocumentAnnotationService {
  /**
   * List annotations for a specific file, optionally filtered by version.
   */
  static async getAnnotations(tenantId: string | null, fileId: string, fileVersion?: number) {
    const where: any = {
      fileId,
      status: { not: "DELETED" },
    };
    if (tenantId) where.tenantId = tenantId;
    if (fileVersion) where.fileVersion = fileVersion;

    const annotations = await (prisma as any).documentAnnotation.findMany({
      where,
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
    });

    return annotations;
  }

  /**
   * Create an annotation on a document page/coordinates.
   */
  static async createAnnotation(tenantId: string, userId: string, data: CreateAnnotationDTO) {
    if (!data.fileId || !data.content?.trim()) {
      throw new Error("File ID and non-empty content are required for annotations.");
    }

    // Verify file exists
    const file = await prisma.mediaFile.findFirst({
      where: { id: data.fileId, tenantId },
    });
    if (!file) {
      throw new Error("Target document not found or access denied.");
    }

    const fileVersion = data.fileVersion || file.version || 1;
    const pageNumber = data.pageNumber || 1;

    const annotation = await (prisma as any).documentAnnotation.create({
      data: {
        tenantId,
        fileId: data.fileId,
        fileVersion,
        pageNumber,
        coordinates: data.coordinates || { x: 10, y: 10 },
        content: data.content.trim(),
        color: data.color || "#FFEB3B",
        status: "ACTIVE",
        createdBy: userId,
      },
      include: {
        replies: true,
      },
    });

    return annotation;
  }

  /**
   * Update an annotation's text, resolved status, or highlight color.
   */
  static async updateAnnotation(
    tenantId: string,
    annotationId: string,
    userId: string,
    data: UpdateAnnotationDTO,
    isSuper = false
  ) {
    const existing = await (prisma as any).documentAnnotation.findFirst({
      where: { id: annotationId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!existing) {
      throw new Error("Annotation not found.");
    }

    if (!isSuper && existing.createdBy !== userId) {
      // Non-author can only update status (resolve/reopen), not alter text
      if (data.content && data.content !== existing.content) {
        throw new Error("Only the original author can edit annotation content.");
      }
    }

    const updateData: any = {};
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.color !== undefined) updateData.color = data.color;

    const updated = await (prisma as any).documentAnnotation.update({
      where: { id: annotationId },
      data: updateData,
      include: { replies: true },
    });

    return updated;
  }

  /**
   * Delete an annotation (soft-delete to DELETED status).
   */
  static async deleteAnnotation(tenantId: string, annotationId: string, userId: string, isSuper = false) {
    const existing = await (prisma as any).documentAnnotation.findFirst({
      where: { id: annotationId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!existing) {
      throw new Error("Annotation not found.");
    }

    if (!isSuper && existing.createdBy !== userId) {
      throw new Error("Permission denied. Only author or admin can delete annotations.");
    }

    await (prisma as any).documentAnnotation.update({
      where: { id: annotationId },
      data: { status: "DELETED" },
    });

    return { success: true };
  }

  /**
   * Add a threaded reply to an existing annotation.
   */
  static async addReply(tenantId: string, annotationId: string, userId: string, content: string) {
    if (!content?.trim()) {
      throw new Error("Reply content cannot be empty.");
    }

    const annotation = await (prisma as any).documentAnnotation.findFirst({
      where: { id: annotationId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!annotation) {
      throw new Error("Annotation not found.");
    }

    const reply = await (prisma as any).documentAnnotationReply.create({
      data: {
        annotationId,
        tenantId,
        userId,
        content: content.trim(),
      },
    });

    return reply;
  }

  /**
   * Delete a reply from an annotation thread.
   */
  static async deleteReply(tenantId: string, replyId: string, userId: string, isSuper = false) {
    const reply = await (prisma as any).documentAnnotationReply.findFirst({
      where: { id: replyId, ...(tenantId ? { tenantId } : {}) },
    });

    if (!reply) {
      throw new Error("Reply not found.");
    }

    if (!isSuper && reply.userId !== userId) {
      throw new Error("Permission denied to delete this reply.");
    }

    await (prisma as any).documentAnnotationReply.delete({
      where: { id: replyId },
    });

    return { success: true };
  }
}

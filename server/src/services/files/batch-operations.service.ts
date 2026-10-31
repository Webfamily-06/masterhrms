/**
 * MASTERHRMS — Phase F6 Batch Operations Service
 * 
 * Atomic multi-file actions (Move, Trash, Restore, Star, Tag, Scan)
 * with itemized partial-failure reporting and legal-hold protection.
 */

import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { FilesService } from "./files.service";
import { MalwareScannerService } from "../security/malware-scanner.service";

const prisma = rawPrisma || proxiedPrisma;

export interface BatchActionResult {
  action: string;
  total: number;
  successful: string[];
  failed: Array<{ id: string; reason: string }>;
}

export class BatchOperationsService {
  /**
   * Execute batch action across multiple file IDs.
   */
  static async executeBatchAction(
    tenantId: string | null,
    userId: string,
    params: {
      action: "move" | "trash" | "restore" | "star" | "tag" | "scan";
      fileIds: string[];
      targetFolderId?: string | null;
      star?: boolean;
      tags?: string[];
      engine?: string;
    }
  ): Promise<BatchActionResult> {
    const { action, fileIds, targetFolderId, star, tags, engine } = params;
    const successful: string[] = [];
    const failed: Array<{ id: string; reason: string }> = [];

    if (!fileIds || fileIds.length === 0) {
      return { action, total: 0, successful, failed };
    }

    // 1. Batch MOVE
    if (action === "move") {
      let targetParent: any = null;
      if (targetFolderId) {
        targetParent = await prisma.mediaFile.findFirst({
          where: { id: targetFolderId, isFolder: true, ...(tenantId ? { tenantId } : {}) },
        });
        if (!targetParent) {
          throw new Error("Target destination folder does not exist.");
        }
      }

      for (const id of fileIds) {
        try {
          if (id === targetFolderId) {
            failed.push({ id, reason: "Cannot move a folder into itself." });
            continue;
          }

          const file = await prisma.mediaFile.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
          });

          if (!file) {
            failed.push({ id, reason: "File not found." });
            continue;
          }

          // Cycle check: if moving a folder into its own subfolder
          if (file.isFolder && targetParent?.materializedPath?.includes(`/${file.id}/`)) {
            failed.push({ id, reason: "Cannot move a folder into its own subfolder." });
            continue;
          }

          const newDepth = targetParent ? targetParent.depth + 1 : 0;
          const newPath = targetParent ? `${targetParent.materializedPath}${file.id}/` : `/${file.id}/`;

          await prisma.mediaFile.update({
            where: { id },
            data: {
              parentId: targetFolderId || null,
              materializedPath: newPath,
              depth: newDepth,
            },
          });
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Move failed" });
        }
      }
    }

    // 2. Batch TRASH
    else if (action === "trash") {
      for (const id of fileIds) {
        try {
          // Check for active legal holds
          const activeHold = await (prisma as any).storageLegalHold.findFirst({
            where: { fileId: id, releasedAt: null },
          });

          if (activeHold) {
            failed.push({
              id,
              reason: `Protected by active legal hold (${activeHold.reason}). Trashing blocked.`,
            });
            continue;
          }

          await prisma.mediaFile.update({
            where: { id },
            data: {
              status: "TRASHED",
              trashedAt: new Date(),
              trashedBy: userId,
            },
          });
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Trash failed" });
        }
      }
    }

    // 3. Batch RESTORE
    else if (action === "restore") {
      for (const id of fileIds) {
        try {
          await prisma.mediaFile.update({
            where: { id },
            data: {
              status: "ACTIVE",
              trashedAt: null,
              trashedBy: null,
            },
          });
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Restore failed" });
        }
      }
    }

    // 4. Batch STAR
    else if (action === "star") {
      const isStarring = star !== undefined ? star : true;
      for (const id of fileIds) {
        try {
          if (isStarring) {
            await (prisma as any).fileStar.upsert({
              where: { fileId_userId: { fileId: id, userId } },
              create: { fileId: id, userId, tenantId },
              update: {},
            });
          } else {
            await (prisma as any).fileStar.deleteMany({
              where: { fileId: id, userId },
            });
          }
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Star toggle failed" });
        }
      }
    }

    // 5. Batch TAG
    else if (action === "tag") {
      const newTags = tags || [];
      for (const id of fileIds) {
        try {
          const file = await prisma.mediaFile.findUnique({ where: { id } });
          if (!file) {
            failed.push({ id, reason: "File not found" });
            continue;
          }
          const mergedTags = Array.from(new Set([...(file.tags || []), ...newTags]));
          await prisma.mediaFile.update({
            where: { id },
            data: { tags: mergedTags },
          });
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Tagging failed" });
        }
      }
    }

    // 6. Batch SCAN (Antivirus)
    else if (action === "scan") {
      for (const id of fileIds) {
        try {
          const res = await MalwareScannerService.scanFile(id, tenantId, engine);
          successful.push(id);
        } catch (err: any) {
          failed.push({ id, reason: err?.message || "Scan failed" });
        }
      }
    }

    return {
      action,
      total: fileIds.length,
      successful,
      failed,
    };
  }
}

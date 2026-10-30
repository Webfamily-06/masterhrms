/**
 * Chat Folder & Attachment Integration Service
 * 
 * Organizes Chat attachments into canonical, permission-isolated organization folder hierarchies:
 * Organization Files/
 * └── Communication/
 *     └── Organization Chat/
 *         ├── General/
 *         │   └── Attachments/
 *         ├── Departments/ (or Groups)
 *         │   ├── HR/
 *         │   │   └── Attachments/
 *         │   └── ...
 *         └── Direct Conversations/
 *             └── Attachments/
 */

import { prisma, rawPrisma } from "../../prisma";

export class ChatFolderService {
  private static db() {
    return rawPrisma || prisma;
  }

  /**
   * Helper to find or create a folder node in MediaFile hierarchy
   */
  private static async getOrCreateFolderNode(
    tenantId: string,
    name: string,
    folderPath: string,
    parentId: string | null = null,
    creatorId = "system"
  ): Promise<any> {
    const db = this.db();
    const existing = await db.mediaFile.findFirst({
      where: {
        tenantId,
        fileName: name,
        isFolder: true,
        parentId,
        deletedAt: null,
      },
    });

    if (existing) {
      if (existing.ownerType === "ORGANIZATION" && (existing.ownerId !== "system" || existing.uploadedBy !== "system")) {
        await db.mediaFile.update({
          where: { id: existing.id },
          data: { ownerId: "system", uploadedBy: "system" },
        });
      }
      return existing;
    }

    return await db.mediaFile.create({
      data: {
        tenantId,
        fileName: name,
        nameKey: name.toLowerCase(),
        filePath: folderPath,
        url: "",
        storageDisk: "LOCAL",
        mimeType: "inode/directory",
        fileSize: 0,
        checksumSha: "",
        folder: folderPath,
        isFolder: true,
        parentId,
        ownerType: "ORGANIZATION",
        ownerId: "system",
        uploadedBy: "system",
        type: "FOLDER",
        category: "All",
        status: "ACTIVE",
        tags: ["system", "communication", "chat"],
      },
    });
  }

  /**
   * Resolves the canonical folder hierarchy for a chat thread
   */
  static async resolveChatFolderHierarchy(
    tenantId: string,
    threadId?: string,
    currentUserId = "system"
  ): Promise<{ folderPath: string; folderId: string; aclUsers?: string[] }> {
    const db = this.db();

    // 1. Root: Communication
    const commFolder = await this.getOrCreateFolderNode(
      tenantId,
      "Communication",
      "Communication",
      null,
      "system"
    );

    // 2. Organization Chat
    const chatFolder = await this.getOrCreateFolderNode(
      tenantId,
      "Organization Chat",
      "Communication/Organization Chat",
      commFolder.id,
      "system"
    );

    let subCategoryName = "General";
    let aclUsers: string[] | undefined = undefined;

    if (threadId && threadId.startsWith("group_")) {
      const groupId = threadId.slice(6);
      const group = await db.chatGroup.findFirst({
        where: { id: groupId, tenantId },
        select: { name: true },
      });
      subCategoryName = group?.name ? group.name.replace(/[\\/:*?"<>|]/g, "_") : "General Channel";
    } else if (threadId && threadId.startsWith("direct_")) {
      subCategoryName = "Direct Conversations";
      const parts = threadId.slice(7).split("_");
      if (parts.length >= 2) {
        aclUsers = parts;
      }
    }

    // 3. Thread Group Folder (e.g. "General", "HR Department", "Direct Conversations")
    const groupFolder = await this.getOrCreateFolderNode(
      tenantId,
      subCategoryName,
      `Communication/Organization Chat/${subCategoryName}`,
      chatFolder.id,
      "system"
    );

    // 4. Attachments leaf folder
    const attachmentsFolder = await this.getOrCreateFolderNode(
      tenantId,
      "Attachments",
      `Communication/Organization Chat/${subCategoryName}/Attachments`,
      groupFolder.id,
      "system"
    );

    return {
      folderPath: attachmentsFolder.folder,
      folderId: attachmentsFolder.id,
      aclUsers,
    };
  }

  /**
   * Backfill existing Chat attachments into the canonical folder hierarchy
   */
  static async backfillExistingAttachments(tenantId?: string): Promise<{ processed: number; updated: number }> {
    const db = this.db();
    const where: any = {
      attachments: { not: null },
    };
    if (tenantId) where.tenantId = tenantId;

    const messages = await db.chatMessage.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        threadId: true,
        senderId: true,
        attachments: true,
      },
    });

    let processed = 0;
    let updated = 0;

    for (const msg of messages) {
      if (!msg.attachments || !Array.isArray(msg.attachments) || msg.attachments.length === 0) {
        continue;
      }

      const folderContext = await this.resolveChatFolderHierarchy(
        msg.tenantId,
        msg.threadId,
        msg.senderId
      );

      for (const att of (msg.attachments as any[])) {
        processed++;
        const attObj = att as any;
        const mediaId = attObj?.mediaId || (attObj?.id && !String(attObj.id).startsWith("att_") ? attObj.id : null);
        if (!mediaId) continue;

        const media = await db.mediaFile.findUnique({
          where: { id: mediaId },
          select: { id: true, parentId: true, folder: true },
        });

        if (media && (!media.parentId || !media.folder.startsWith("Communication/Organization Chat"))) {
          await db.mediaFile.update({
            where: { id: media.id },
            data: {
              parentId: folderContext.folderId,
              folder: folderContext.folderPath,
              systemModule: "chat",
            },
          });

          // If direct conversation, ensure ACL exists for participants
          if (folderContext.aclUsers && folderContext.aclUsers.length > 0) {
            for (const uid of folderContext.aclUsers) {
              const existingAcl = await db.fileAcl.findFirst({
                where: {
                  fileId: media.id,
                  principalType: "USER",
                  principalId: uid,
                },
              });

              if (!existingAcl) {
                await db.fileAcl.create({
                  data: {
                    fileId: media.id,
                    principalType: "USER",
                    principalId: uid,
                    permission: "VIEWER",
                    createdBy: msg.senderId,
                  },
                });
              }
            }
          }

          updated++;
        }
      }
    }

    return { processed, updated };
  }
}

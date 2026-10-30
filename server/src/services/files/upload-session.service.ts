import crypto from "crypto";
import path from "path";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
const prisma = rawPrisma || proxiedPrisma;
import { StorageProviderFactory } from "../storage/storage-provider.factory";
import { FileInvariantsService } from "./file-invariants.service";
import { QuotaService } from "./quota.service";
import { OutboxService } from "../outbox.service";
import { broadcastToTenant } from "../../socket";

export interface InitiateSessionParams {
  tenantId: string | null;
  userId: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export class UploadSessionService {
  /**
   * Initiates a direct upload session:
   * 1. Validates Windows filename constraints.
   * 2. Checks sibling uniqueness.
   * 3. Atomically reserves quota bytes.
   * 4. Requests a pre-authorized upload endpoint from StorageProvider.
   * 5. Saves FileUploadSession in INITIATED state.
   */
  public static async initiateSession(params: InitiateSessionParams) {
    const { tenantId, userId, folderId, fileName, mimeType, sizeBytes } = params;

    // 1. Validate Windows filename
    const validation = FileInvariantsService.validateFileName(fileName);
    if (!validation.isValid) {
      const err: any = new Error(validation.error);
      err.code = validation.code;
      err.status = 400;
      throw err;
    }

    const nameKey = FileInvariantsService.computeNameKey(fileName);
    const fileId = crypto.randomUUID();

    // 2. Validate folder hierarchy if specified
    let targetParentId: string | null = null;

    if (folderId && folderId !== "root" && folderId !== "null") {
      targetParentId = folderId;
      const folder = await prisma.mediaFile.findUnique({
        where: { id: folderId },
      });

      if (!folder || folder.status === "TRASHED" || folder.deletedAt) {
        throw new Error("Target destination folder does not exist or has been trashed.");
      }

      if (folder.type !== "FOLDER" && !folder.isFolder) {
        throw new Error("Specified destination parent is not a folder.");
      }

      if (tenantId && folder.tenantId && folder.tenantId !== tenantId) {
        throw new Error("Cannot upload file into a folder belonging to another workspace.");
      }
    }

    // 3. Request pre-authorized upload endpoint
    const storageProvider = StorageProviderFactory.getProvider();
    const uploadAuth = await storageProvider.initiateUpload({
      tenantId,
      fileId,
      versionNo: 1,
      fileName,
      mimeType,
      sizeBytes,
    });

    const session = await prisma.$transaction(async (tx) => {
      // Sibling uniqueness check
      await FileInvariantsService.assertSiblingUniqueness(tx, tenantId, targetParentId, nameKey);

      // Quota reservation
      await QuotaService.reserveUploadBytes(tx, tenantId, userId, sizeBytes);

      // Create session in DB
      return await tx.fileUploadSession.create({
        data: {
          id: fileId,
          tenantId: tenantId || "platform",
          userId,
          fileId,
          parentId: targetParentId,
          name: fileName,
          sizeBytes: BigInt(sizeBytes),
          mimeType,
          storageKey: uploadAuth.storageKey,
          uploadUrl: uploadAuth.uploadUrl,
          uploadToken: uploadAuth.token || null,
          status: "INITIATED",
          expiresAt: uploadAuth.expiresAt,
        },
      });
    });

    return {
      sessionId: session.id,
      fileId: session.fileId,
      uploadUrl: uploadAuth.uploadUrl,
      storageKey: uploadAuth.storageKey,
      headers: uploadAuth.headers,
      provider: uploadAuth.provider,
      expiresAt: uploadAuth.expiresAt,
      sizeBytes,
    };
  }

  /**
   * Completes a direct upload session:
   * 1. Verifies physical file presence via StorageProvider.
   * 2. Atomically creates MediaFile & FileVersion records.
   * 3. Commits reserved quota bytes into usedBytes.
   * 4. Emits transactional Outbox event and realtime notification.
   */
  public static async completeSession(sessionId: string, userId: string, tenantId: string | null) {
    const session = await prisma.fileUploadSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error("Upload session not found.");
    }

    if (session.userId !== userId && tenantId !== null && session.tenantId !== tenantId) {
      throw new Error("Unauthorized to complete this upload session.");
    }

    if (session.status === "COMPLETED") {
      const existing = await prisma.mediaFile.findUnique({
        where: { id: session.fileId },
      });
      if (existing) return existing;
    }

    if (session.status !== "INITIATED" && session.status !== "UPLOADING") {
      throw new Error(`Upload session cannot be completed because its status is ${session.status}.`);
    }

    if (new Date() > session.expiresAt) {
      throw new Error("Upload session has expired. Please initiate a new upload.");
    }

    // Verify storage object
    const storageProvider = StorageProviderFactory.getProvider();
    const verification = await storageProvider.verifyUpload(session.storageKey, Number(session.sizeBytes));
    if (!verification.exists) {
      throw new Error("File object was not found in storage. Upload may have failed or timed out.");
    }

    const ext = path.extname(session.name).replace(".", "").toLowerCase();
    const nameKey = FileInvariantsService.computeNameKey(session.name);

    // Complete in atomic transaction
    const finalFile = await prisma.$transaction(async (tx) => {
      // 1. Resolve materializedPath
      let materializedPath = `/${session.fileId}`;
      let depth = 0;
      if (session.parentId) {
        const parent = await tx.mediaFile.findUnique({ where: { id: session.parentId } });
        if (parent) {
          materializedPath = `${parent.materializedPath || `/${parent.id}`}/${session.fileId}`;
          depth = (parent.depth || 0) + 1;
        }
      }

      // 2. Create MediaFile record first (parent for foreign key)
      const mediaFile = await tx.mediaFile.create({
        data: {
          id: session.fileId,
          tenantId: session.tenantId === "platform" ? null : session.tenantId,
          nameKey,
          fileName: session.name,
          fileSize: Number(session.sizeBytes),
          mimeType: session.mimeType || verification.checksum || "application/octet-stream",
          extension: ext,
          filePath: session.storageKey,
          url: "",
          checksumSha: verification.checksum || "",
          folder: session.parentId ? "subfolder" : "general",
          tags: ["file-manager"],
          isFolder: false,
          type: "FILE",
          ownerType: session.tenantId === "platform" ? "SYSTEM" : "USER",
          ownerId: userId,
          status: "ACTIVE",
          parentId: session.parentId,
          materializedPath,
          depth,
          uploadedBy: userId,
          version: 1,
        },
      });

      // 3. Create FileVersion record (v1)
      const version = await tx.fileVersion.create({
        data: {
          fileId: session.fileId,
          versionNo: 1,
          storageKey: session.storageKey,
          sizeBytes: session.sizeBytes,
          checksum: verification.checksum || null,
          createdBy: userId,
          isCurrent: true,
        },
      });

      // 4. Link currentVersionId
      await tx.mediaFile.update({
        where: { id: mediaFile.id },
        data: { currentVersionId: version.id },
      });

      // 4. Commit quota bytes
      const actualTenantId = session.tenantId === "platform" ? null : session.tenantId;
      await QuotaService.commitUploadBytes(tx, actualTenantId, userId, Number(session.sizeBytes));

      // 5. Update session status
      await tx.fileUploadSession.update({
        where: { id: session.id },
        data: {
          status: "COMPLETED",
        },
      });

      // 6. Record activity
      if (actualTenantId) {
        await tx.fileActivity.create({
          data: {
            fileId: session.fileId,
            tenantId: actualTenantId,
            actorId: userId,
            action: "FILE_UPLOAD",
            metaJson: {
              fileName: session.name,
              sizeBytes: Number(session.sizeBytes),
              versionNo: 1,
              storageKey: session.storageKey,
            },
          },
        });
      }

      // 7. Queue Outbox Event
      if (actualTenantId) {
        await OutboxService.createOutboxEvent(
          {
            tenantId: actualTenantId,
            eventType: "file.created",
            entityType: "MediaFile",
            entityId: session.fileId,
            actorId: userId,
            payload: {
              id: session.fileId,
              fileName: session.name,
              sizeBytes: Number(session.sizeBytes),
              parentId: session.parentId,
              status: "ACTIVE",
            },
          },
          tx
        );
      }

      return mediaFile;
    });

    // Realtime notification
    const notificationTenantId = session.tenantId === "platform" ? null : session.tenantId;
    if (notificationTenantId) {
      try {
        broadcastToTenant(notificationTenantId, "file:created", finalFile);
      } catch {}
    }

    return finalFile;
  }

  /**
   * Aborts an in-flight upload session and releases reserved bytes.
   */
  public static async abortSession(sessionId: string, userId: string, tenantId: string | null) {
    const session = await prisma.fileUploadSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return { success: true, message: "Session does not exist." };
    }

    if (session.status !== "INITIATED" && session.status !== "UPLOADING") {
      return { success: true, message: `Session already in state: ${session.status}` };
    }

    const actualTenantId = session.tenantId === "platform" ? null : session.tenantId;

    await prisma.$transaction(async (tx) => {
      await tx.fileUploadSession.update({
        where: { id: session.id },
        data: { status: "ABORTED" },
      });

      // Release reserved quota
      await QuotaService.releaseReservedBytes(
        tx,
        actualTenantId,
        session.userId,
        Number(session.sizeBytes)
      );
    });

    // Clean up partial object from storage if possible
    try {
      const storageProvider = StorageProviderFactory.getProvider();
      await storageProvider.deleteObject(session.storageKey);
    } catch {}

    return { success: true, message: "Upload session aborted and reserved quota released." };
  }

  /**
   * Periodic or on-demand cleanup of expired INITIATED sessions.
   */
  public static async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await prisma.fileUploadSession.findMany({
      where: {
        status: { in: ["INITIATED", "UPLOADING"] },
        expiresAt: { lt: new Date() },
      },
      take: 100,
    });

    let cleaned = 0;
    for (const session of expiredSessions) {
      try {
        const actualTenantId = session.tenantId === "platform" ? null : session.tenantId;
        await prisma.$transaction(async (tx) => {
          await tx.fileUploadSession.update({
            where: { id: session.id },
            data: { status: "EXPIRED" },
          });

          await QuotaService.releaseReservedBytes(
            tx,
            actualTenantId,
            session.userId,
            Number(session.sizeBytes)
          );
        });
        cleaned++;
      } catch (err) {
        console.error(`[UploadSessionService] Failed to clean expired session ${session.id}:`, err);
      }
    }

    return cleaned;
  }
}

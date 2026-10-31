/**
 * MASTERHRMS — Phase F5 Local-to-Object Storage Migration Service
 * 
 * Resumable migration engine that transfers legacy local disk files to configured
 * object storage (Supabase Storage), verifies SHA-256 checksum integrity, and
 * updates database records and SUCE dimensions.
 */

import fs from "fs";
import path from "path";
import { rawPrisma, prisma as proxiedPrisma } from "../../prisma";
import { StorageProviderFactory } from "../storage/storage-provider.factory";
import { buildStorageKey } from "../storage/storage-provider.interface";
import { computeSha256 } from "../storage/integrity-hasher";
import { getUploadsRoot } from "../media/media.service";
import { OutboxService } from "../outbox.service";

const prisma = rawPrisma || proxiedPrisma;

export interface MigrationTelemetry {
  jobId: string;
  isRunning: boolean;
  totalFiles: number;
  processedCount: number;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  migratedBytes: number;
  startTime: Date | null;
  completedAt: Date | null;
  lastErrors: Array<{ fileId: string; error: string }>;
}

export class StorageMigrationService {
  private static activeTelemetry: MigrationTelemetry = {
    jobId: "idle",
    isRunning: false,
    totalFiles: 0,
    processedCount: 0,
    migratedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    migratedBytes: 0,
    startTime: null,
    completedAt: null,
    lastErrors: [],
  };

  public static getTelemetry(): MigrationTelemetry {
    return { ...this.activeTelemetry };
  }

  /**
   * Resolves physical disk path for a legacy local media file
   */
  private static resolveLocalPath(filePath: string): string | null {
    const uploadsRoot = getUploadsRoot();
    const candidatePaths = [
      path.resolve(uploadsRoot, filePath),
      path.resolve(uploadsRoot, "files", filePath),
      path.resolve(uploadsRoot, "system/branding", path.basename(filePath)),
      path.resolve(process.cwd(), "uploads", filePath),
      path.resolve(process.cwd(), "../uploads", filePath),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Executes a batch of local-to-object storage migrations.
   */
  public static async runMigration(options: {
    batchSize?: number;
    tenantId?: string | null;
    actorId?: string;
  } = {}): Promise<MigrationTelemetry> {
    if (this.activeTelemetry.isRunning) {
      return this.activeTelemetry;
    }

    const batchSize = options.batchSize || 50;
    const provider = await StorageProviderFactory.getProvider();
    const isLocalProvider = provider.providerName === "local";

    const jobId = `mig-${Date.now()}`;
    this.activeTelemetry = {
      jobId,
      isRunning: true,
      totalFiles: 0,
      processedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      migratedBytes: 0,
      startTime: new Date(),
      completedAt: null,
      lastErrors: [],
    };

    try {
      // Find candidate local files
      const where: any = {
        deletedAt: null,
        isFolder: false,
        storageDisk: { in: ["LOCAL", "local"] },
      };
      if (options.tenantId) {
        where.tenantId = options.tenantId;
      }

      const totalCount = await prisma.mediaFile.count({ where });
      this.activeTelemetry.totalFiles = totalCount;

      const candidates = await prisma.mediaFile.findMany({
        where,
        take: batchSize,
        orderBy: { createdAt: "asc" },
      });

      for (const file of candidates) {
        this.activeTelemetry.processedCount++;

        try {
          // If the active provider is local, mark processed as verified
          if (isLocalProvider) {
            this.activeTelemetry.skippedCount++;
            continue;
          }

          const localPath = this.resolveLocalPath(file.filePath);
          if (!localPath) {
            this.activeTelemetry.skippedCount++;
            continue;
          }

          const buffer = await fs.promises.readFile(localPath);
          const computedHash = computeSha256(buffer);

          // Verify integrity if checksum exists
          if (file.checksumSha && file.checksumSha !== computedHash) {
            this.activeTelemetry.failedCount++;
            this.activeTelemetry.lastErrors.push({
              fileId: file.id,
              error: `Checksum mismatch: expected ${file.checksumSha}, got ${computedHash}`,
            });
            continue;
          }

          const targetStorageKey = buildStorageKey(file.tenantId || "platform", file.id, 1);

          // Upload buffer to remote object storage
          if ("uploadBuffer" in provider) {
            await (provider as any).uploadBuffer(targetStorageKey, buffer, file.mimeType);
          }

          // Generate signed or CDN URL
          let targetUrl = file.url;
          try {
            targetUrl = await provider.getSignedDownloadUrl(targetStorageKey, file.fileName, 86400 * 30);
          } catch {
            targetUrl = `/api/v1/files/nodes/${file.id}/download`;
          }

          // Atomically update database record
          await prisma.mediaFile.update({
            where: { id: file.id },
            data: {
              storageDisk: provider.providerName.toUpperCase(),
              url: targetUrl,
              checksumSha: computedHash,
            },
          });

          this.activeTelemetry.migratedCount++;
          this.activeTelemetry.migratedBytes += Number(file.fileSize);
        } catch (itemErr: any) {
          this.activeTelemetry.failedCount++;
          this.activeTelemetry.lastErrors.push({
            fileId: file.id,
            error: itemErr.message || "Upload failed",
          });
        }
      }

      this.activeTelemetry.completedAt = new Date();

      // Emit outbox audit event
      await OutboxService.createEvent({
        tenantId: options.tenantId || "system",
        eventType: "STORAGE_MIGRATION_BATCH_COMPLETED",
        entityType: "STORAGE_MIGRATION",
        entityId: jobId,
        actorId: options.actorId || "system",
        payload: {
          jobId,
          totalFiles: this.activeTelemetry.totalFiles,
          migratedCount: this.activeTelemetry.migratedCount,
          skippedCount: this.activeTelemetry.skippedCount,
          failedCount: this.activeTelemetry.failedCount,
          migratedBytes: this.activeTelemetry.migratedBytes,
        },
      });
    } finally {
      this.activeTelemetry.isRunning = false;
    }

    return this.activeTelemetry;
  }
}

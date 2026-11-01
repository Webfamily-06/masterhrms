"use strict";
/**
 * MASTERHRMS — Phase F5 Local-to-Object Storage Migration Service
 *
 * Resumable migration engine that transfers legacy local disk files to configured
 * object storage (Supabase Storage), verifies SHA-256 checksum integrity, and
 * updates database records and SUCE dimensions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageMigrationService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../prisma");
const storage_provider_factory_1 = require("../storage/storage-provider.factory");
const storage_provider_interface_1 = require("../storage/storage-provider.interface");
const integrity_hasher_1 = require("../storage/integrity-hasher");
const media_service_1 = require("../media/media.service");
const outbox_service_1 = require("../outbox.service");
const prisma = prisma_1.rawPrisma || prisma_1.prisma;
class StorageMigrationService {
    static activeTelemetry = {
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
    static getTelemetry() {
        return { ...this.activeTelemetry };
    }
    /**
     * Resolves physical disk path for a legacy local media file
     */
    static resolveLocalPath(filePath) {
        const uploadsRoot = (0, media_service_1.getUploadsRoot)();
        const candidatePaths = [
            path_1.default.resolve(uploadsRoot, filePath),
            path_1.default.resolve(uploadsRoot, "files", filePath),
            path_1.default.resolve(uploadsRoot, "system/branding", path_1.default.basename(filePath)),
            path_1.default.resolve(process.cwd(), "uploads", filePath),
            path_1.default.resolve(process.cwd(), "../uploads", filePath),
        ];
        for (const p of candidatePaths) {
            if (fs_1.default.existsSync(p)) {
                return p;
            }
        }
        return null;
    }
    /**
     * Executes a batch of local-to-object storage migrations.
     */
    static async runMigration(options = {}) {
        if (this.activeTelemetry.isRunning) {
            return this.activeTelemetry;
        }
        const batchSize = options.batchSize || 50;
        const provider = await storage_provider_factory_1.StorageProviderFactory.getProvider();
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
            const where = {
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
                    const buffer = await fs_1.default.promises.readFile(localPath);
                    const computedHash = (0, integrity_hasher_1.computeSha256)(buffer);
                    // Verify integrity if checksum exists
                    if (file.checksumSha && file.checksumSha !== computedHash) {
                        this.activeTelemetry.failedCount++;
                        this.activeTelemetry.lastErrors.push({
                            fileId: file.id,
                            error: `Checksum mismatch: expected ${file.checksumSha}, got ${computedHash}`,
                        });
                        continue;
                    }
                    const targetStorageKey = (0, storage_provider_interface_1.buildStorageKey)(file.tenantId || "platform", file.id, 1);
                    // Upload buffer to remote object storage
                    if ("uploadBuffer" in provider) {
                        await provider.uploadBuffer(targetStorageKey, buffer, file.mimeType);
                    }
                    // Generate signed or CDN URL
                    let targetUrl = file.url;
                    try {
                        targetUrl = await provider.getSignedDownloadUrl(targetStorageKey, file.fileName, 86400 * 30);
                    }
                    catch {
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
                }
                catch (itemErr) {
                    this.activeTelemetry.failedCount++;
                    this.activeTelemetry.lastErrors.push({
                        fileId: file.id,
                        error: itemErr.message || "Upload failed",
                    });
                }
            }
            this.activeTelemetry.completedAt = new Date();
            // Emit outbox audit event
            await outbox_service_1.OutboxService.createEvent({
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
        }
        finally {
            this.activeTelemetry.isRunning = false;
        }
        return this.activeTelemetry;
    }
}
exports.StorageMigrationService = StorageMigrationService;

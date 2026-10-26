"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.LocalEncryptedStorageService = exports.STORAGE_ROOT_DIR = void 0;
exports.getStorageRootDir = getStorageRootDir;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const stream_1 = require("stream");
const prisma_1 = require("../../prisma");
const integrity_hasher_1 = require("./integrity-hasher");
const file_validator_1 = require("./file-validator");
const os_1 = __importDefault(require("os"));
// Base directory for stored files (strictly outside public directory)
function getStorageRootDir() {
    if (process.env.STORAGE_ROOT_DIR) {
        return path_1.default.resolve(process.env.STORAGE_ROOT_DIR);
    }
    if (process.env.VERCEL ||
        process.env.VERCEL_ENV ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.LAMBDA_TASK_ROOT ||
        (process.env.NODE_ENV === 'production' && process.cwd().startsWith('/var/task'))) {
        return path_1.default.resolve(os_1.default.tmpdir(), 'storage', 'tenants');
    }
    return path_1.default.resolve(process.cwd(), 'storage', 'tenants');
}
exports.STORAGE_ROOT_DIR = getStorageRootDir();
// Ensure base storage directory exists safely without crashing module load in read-only filesystems
try {
    if (!fs_1.default.existsSync(exports.STORAGE_ROOT_DIR)) {
        fs_1.default.mkdirSync(exports.STORAGE_ROOT_DIR, { recursive: true, mode: 0o700 });
    }
}
catch (err) {
    console.warn(`[STORAGE WARNING]: Could not initialize base storage directory at ${exports.STORAGE_ROOT_DIR}: ${err?.message}`);
}
/**
 * Derives a 256-bit AES key from environment variables or JWT secret with salt.
 */
function getEncryptionKey() {
    const customKey = process.env.STORAGE_ENCRYPTION_KEY;
    if (customKey && customKey.length === 64) {
        return Buffer.from(customKey, 'hex');
    }
    const secret = process.env.JWT_SECRET || 'master-hrms-default-storage-encryption-key-salt';
    return crypto_1.default.scryptSync(secret, 'master-hrms-storage-salt-v1', 32);
}
/**
 * Returns active encryption key followed by any legacy keys in the rotation ring.
 */
function getDecryptionKeys() {
    const keys = [getEncryptionKey()];
    const ring = process.env.STORAGE_ENCRYPTION_KEY_RING;
    if (ring) {
        const hexKeys = ring.split(',').map((k) => k.trim()).filter((k) => k.length === 64);
        for (const hex of hexKeys) {
            keys.push(Buffer.from(hex, 'hex'));
        }
    }
    return keys;
}
/**
 * Local Encrypted Disk Storage Engine with AES-256-GCM and Tenant Directory Partitioning.
 */
class LocalEncryptedStorageService {
    encryptionKey;
    constructor() {
        this.encryptionKey = getEncryptionKey();
    }
    /**
     * Encrypts and saves a validated document file under tenant-isolated storage.
     */
    async save(tenantId, file, entityType, entityId, uploadedById) {
        // 1. Server-side validation
        const val = (0, file_validator_1.validateFileBuffer)(file.buffer, file.originalName, file.mimeType);
        if (!val.isValid) {
            throw new Error(`File Validation Failed: ${val.error}`);
        }
        // 2. Compute plaintext SHA-256 integrity hash
        const sha256Hash = (0, integrity_hasher_1.computeSha256)(file.buffer);
        // 3. Generate random server-side storage identifier (UUID)
        const storageId = crypto_1.default.randomUUID();
        const safeExt = val.detectedExt || '.bin';
        const storageKey = `${storageId}${safeExt}.enc`;
        // 4. Resolve tenant-isolated directory path
        // Path sanitization: disallow path traversal tokens in tenantId or entityType
        const sanitizedTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
        const sanitizedEntity = (entityType || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
        const tenantDir = path_1.default.join(exports.STORAGE_ROOT_DIR, sanitizedTenant, sanitizedEntity);
        if (!fs_1.default.existsSync(tenantDir)) {
            fs_1.default.mkdirSync(tenantDir, { recursive: true, mode: 0o700 });
        }
        const physicalPath = path_1.default.join(tenantDir, storageKey);
        // Verify target path does not escape root (anti-path-traversal)
        if (!physicalPath.startsWith(exports.STORAGE_ROOT_DIR)) {
            throw new Error('Security Violation: Invalid file path traversal detected.');
        }
        // 5. Encrypt buffer with AES-256-GCM
        const iv = crypto_1.default.randomBytes(12); // Standard 96-bit IV for GCM
        const cipher = crypto_1.default.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encryptedBody = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
        const authTag = cipher.getAuthTag(); // 16 bytes authentication tag
        // Disk format: [12 bytes IV] + [16 bytes AuthTag] + [Encrypted Data]
        const diskPayload = Buffer.concat([iv, authTag, encryptedBody]);
        // 6. Write atomically to disk with restrictive permissions
        await fs_1.default.promises.writeFile(physicalPath, diskPayload, { mode: 0o600 });
        // 7. Persist record in Prisma database
        const docRecord = await prisma_1.prisma.storedDocument.create({
            data: {
                id: storageId,
                tenantId,
                storageKey: `${sanitizedTenant}/${sanitizedEntity}/${storageKey}`,
                originalName: path_1.default.basename(file.originalName),
                mimeType: val.detectedMime || file.mimeType,
                sizeBytes: file.buffer.length,
                sha256Hash,
                isEncrypted: true,
                encryptionAlgo: 'aes-256-gcm',
                entityType: sanitizedEntity,
                entityId: entityId || null,
                uploadedById: uploadedById || null,
            },
        });
        return {
            id: docRecord.id,
            tenantId: docRecord.tenantId,
            storageKey: docRecord.storageKey,
            originalName: docRecord.originalName,
            mimeType: docRecord.mimeType,
            sizeBytes: docRecord.sizeBytes,
            sha256Hash: docRecord.sha256Hash,
            isEncrypted: docRecord.isEncrypted,
            encryptionAlgo: docRecord.encryptionAlgo,
            entityType: docRecord.entityType,
            entityId: docRecord.entityId,
            uploadedById: docRecord.uploadedById,
            createdAt: docRecord.createdAt,
        };
    }
    /**
     * Retrieves and decrypts a document buffer, verifying integrity.
     */
    async getBuffer(tenantId, documentId) {
        const doc = await prisma_1.prisma.storedDocument.findFirst({
            where: { id: documentId, tenantId },
        });
        if (!doc) {
            throw new Error('Document not found or access denied for this organization.');
        }
        const physicalPath = path_1.default.join(exports.STORAGE_ROOT_DIR, doc.storageKey);
        if (!fs_1.default.existsSync(physicalPath)) {
            throw new Error('Document binary file missing from storage repository.');
        }
        const rawDisk = await fs_1.default.promises.readFile(physicalPath);
        if (!doc.isEncrypted) {
            return { buffer: rawDisk, metadata: doc };
        }
        // Extract IV (12 bytes), AuthTag (16 bytes), and Ciphertext
        if (rawDisk.length < 28) {
            throw new Error('Corrupted document container: File payload too small for AES-GCM headers.');
        }
        const iv = rawDisk.slice(0, 12);
        const authTag = rawDisk.slice(12, 28);
        const ciphertext = rawDisk.slice(28);
        const keys = getDecryptionKeys();
        let decrypted = null;
        let lastError = null;
        for (const key of keys) {
            try {
                const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', key, iv);
                decipher.setAuthTag(authTag);
                decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
                break; // Successfully decrypted with matching key
            }
            catch (err) {
                lastError = err;
            }
        }
        if (!decrypted) {
            throw new Error(`Decryption failed: Integrity tag mismatch or altered cipher payload across all rotation keys (${lastError?.message}).`);
        }
        // Integrity cross-check
        const computedHash = (0, integrity_hasher_1.computeSha256)(decrypted);
        if (computedHash !== doc.sha256Hash) {
            throw new Error('Integrity verification failed: Decrypted buffer does not match stored SHA-256 hash.');
        }
        return { buffer: decrypted, metadata: doc };
    }
    /**
     * Streams a decrypted file for authenticated HTTP delivery.
     */
    async getStream(tenantId, documentId) {
        const { buffer, metadata } = await this.getBuffer(tenantId, documentId);
        const stream = stream_1.Readable.from(buffer);
        return { stream, metadata };
    }
    /**
     * Deletes a stored file and its database record.
     */
    async delete(tenantId, documentId) {
        const doc = await prisma_1.prisma.storedDocument.findFirst({
            where: { id: documentId, tenantId },
        });
        if (!doc)
            return false;
        const physicalPath = path_1.default.join(exports.STORAGE_ROOT_DIR, doc.storageKey);
        if (fs_1.default.existsSync(physicalPath)) {
            try {
                await fs_1.default.promises.unlink(physicalPath);
            }
            catch (e) {
                console.warn(`[STORAGE DELETE WARNING]: Could not unlink file ${physicalPath}`);
            }
        }
        await prisma_1.prisma.storedDocument.delete({ where: { id: documentId } });
        return true;
    }
    /**
     * Verifies that the physical file exists, decrypts cleanly, and matches SHA-256 hash.
     */
    async verifyIntegrity(tenantId, documentId) {
        try {
            await this.getBuffer(tenantId, documentId);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.LocalEncryptedStorageService = LocalEncryptedStorageService;
// Export singleton instance
exports.storageService = new LocalEncryptedStorageService();

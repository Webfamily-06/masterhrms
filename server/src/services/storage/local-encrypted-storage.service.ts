import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { prisma } from '../../prisma';
import { IStorageService, StorageFile, StoredFileMetadata } from './storage.types';
import { computeSha256 } from './integrity-hasher';
import { validateFileBuffer } from './file-validator';

// Base directory for stored files (strictly outside public directory)
const STORAGE_ROOT_DIR = path.resolve(process.cwd(), 'storage', 'tenants');

// Ensure base storage directory exists
if (!fs.existsSync(STORAGE_ROOT_DIR)) {
  fs.mkdirSync(STORAGE_ROOT_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Derives a 256-bit AES key from environment variables or JWT secret with salt.
 */
function getEncryptionKey(): Buffer {
  const customKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (customKey && customKey.length === 64) {
    return Buffer.from(customKey, 'hex');
  }
  const secret = process.env.JWT_SECRET || 'master-hrms-default-storage-encryption-key-salt';
  return crypto.scryptSync(secret, 'master-hrms-storage-salt-v1', 32);
}

/**
 * Returns active encryption key followed by any legacy keys in the rotation ring.
 */
function getDecryptionKeys(): Buffer[] {
  const keys: Buffer[] = [getEncryptionKey()];
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
export class LocalEncryptedStorageService implements IStorageService {
  private encryptionKey: Buffer;

  constructor() {
    this.encryptionKey = getEncryptionKey();
  }

  /**
   * Encrypts and saves a validated document file under tenant-isolated storage.
   */
  async save(
    tenantId: string,
    file: StorageFile,
    entityType: string,
    entityId?: string,
    uploadedById?: string
  ): Promise<StoredFileMetadata> {
    // 1. Server-side validation
    const val = validateFileBuffer(file.buffer, file.originalName, file.mimeType);
    if (!val.isValid) {
      throw new Error(`File Validation Failed: ${val.error}`);
    }

    // 2. Compute plaintext SHA-256 integrity hash
    const sha256Hash = computeSha256(file.buffer);

    // 3. Generate random server-side storage identifier (UUID)
    const storageId = crypto.randomUUID();
    const safeExt = val.detectedExt || '.bin';
    const storageKey = `${storageId}${safeExt}.enc`;

    // 4. Resolve tenant-isolated directory path
    // Path sanitization: disallow path traversal tokens in tenantId or entityType
    const sanitizedTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedEntity = (entityType || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
    const tenantDir = path.join(STORAGE_ROOT_DIR, sanitizedTenant, sanitizedEntity);

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true, mode: 0o700 });
    }

    const physicalPath = path.join(tenantDir, storageKey);

    // Verify target path does not escape root (anti-path-traversal)
    if (!physicalPath.startsWith(STORAGE_ROOT_DIR)) {
      throw new Error('Security Violation: Invalid file path traversal detected.');
    }

    // 5. Encrypt buffer with AES-256-GCM
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encryptedBody = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag(); // 16 bytes authentication tag

    // Disk format: [12 bytes IV] + [16 bytes AuthTag] + [Encrypted Data]
    const diskPayload = Buffer.concat([iv, authTag, encryptedBody]);

    // 6. Write atomically to disk with restrictive permissions
    await fs.promises.writeFile(physicalPath, diskPayload, { mode: 0o600 });

    // 7. Persist record in Prisma database
    const docRecord = await prisma.storedDocument.create({
      data: {
        id: storageId,
        tenantId,
        storageKey: `${sanitizedTenant}/${sanitizedEntity}/${storageKey}`,
        originalName: path.basename(file.originalName),
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
  async getBuffer(
    tenantId: string,
    documentId: string
  ): Promise<{ buffer: Buffer; metadata: StoredFileMetadata }> {
    const doc = await prisma.storedDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) {
      throw new Error('Document not found or access denied for this organization.');
    }

    const physicalPath = path.join(STORAGE_ROOT_DIR, doc.storageKey);

    if (!fs.existsSync(physicalPath)) {
      throw new Error('Document binary file missing from storage repository.');
    }

    const rawDisk = await fs.promises.readFile(physicalPath);

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
    let decrypted: Buffer | null = null;
    let lastError: any = null;

    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        break; // Successfully decrypted with matching key
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!decrypted) {
      throw new Error(`Decryption failed: Integrity tag mismatch or altered cipher payload across all rotation keys (${lastError?.message}).`);
    }

    // Integrity cross-check
    const computedHash = computeSha256(decrypted);
    if (computedHash !== doc.sha256Hash) {
      throw new Error('Integrity verification failed: Decrypted buffer does not match stored SHA-256 hash.');
    }

    return { buffer: decrypted, metadata: doc };
  }

  /**
   * Streams a decrypted file for authenticated HTTP delivery.
   */
  async getStream(
    tenantId: string,
    documentId: string
  ): Promise<{ stream: Readable; metadata: StoredFileMetadata }> {
    const { buffer, metadata } = await this.getBuffer(tenantId, documentId);
    const stream = Readable.from(buffer);
    return { stream, metadata };
  }

  /**
   * Deletes a stored file and its database record.
   */
  async delete(tenantId: string, documentId: string): Promise<boolean> {
    const doc = await prisma.storedDocument.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!doc) return false;

    const physicalPath = path.join(STORAGE_ROOT_DIR, doc.storageKey);
    if (fs.existsSync(physicalPath)) {
      try {
        await fs.promises.unlink(physicalPath);
      } catch (e) {
        console.warn(`[STORAGE DELETE WARNING]: Could not unlink file ${physicalPath}`);
      }
    }

    await prisma.storedDocument.delete({ where: { id: documentId } });
    return true;
  }

  /**
   * Verifies that the physical file exists, decrypts cleanly, and matches SHA-256 hash.
   */
  async verifyIntegrity(tenantId: string, documentId: string): Promise<boolean> {
    try {
      await this.getBuffer(tenantId, documentId);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new LocalEncryptedStorageService();

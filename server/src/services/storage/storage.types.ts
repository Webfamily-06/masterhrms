import { Readable } from 'stream';

export interface StorageFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StoredFileMetadata {
  id: string;
  tenantId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  isEncrypted: boolean;
  encryptionAlgo: string;
  entityType: string;
  entityId?: string | null;
  uploadedById?: string | null;
  createdAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedMime?: string;
  detectedExt?: string;
}

export interface IStorageService {
  save(
    tenantId: string,
    file: StorageFile,
    entityType: string,
    entityId?: string,
    uploadedById?: string
  ): Promise<StoredFileMetadata>;

  getBuffer(
    tenantId: string,
    documentId: string
  ): Promise<{ buffer: Buffer; metadata: StoredFileMetadata }>;

  getStream(
    tenantId: string,
    documentId: string
  ): Promise<{ stream: Readable; metadata: StoredFileMetadata }>;

  delete(tenantId: string, documentId: string): Promise<boolean>;

  verifyIntegrity(tenantId: string, documentId: string): Promise<boolean>;
}

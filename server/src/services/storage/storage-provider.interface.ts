export interface InitiateUploadParams {
  tenantId: string | null;
  fileId: string;
  versionNo: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresInSeconds?: number;
}

export interface UploadAuthorization {
  uploadUrl: string;
  storageKey: string;
  headers?: Record<string, string>;
  expiresAt: Date;
  provider: "supabase" | "local";
  token?: string;
}

export interface VerifyUploadResult {
  exists: boolean;
  sizeBytes: number;
  checksum?: string;
}

export interface IStorageProvider {
  readonly providerName: string;

  /**
   * Generates a pre-authorized upload endpoint / signed URL for direct browser-to-storage upload.
   */
  initiateUpload(params: InitiateUploadParams): Promise<UploadAuthorization>;

  /**
   * Confirms that an uploaded object exists in the storage provider and verifies its size.
   */
  verifyUpload(storageKey: string, expectedSize?: number): Promise<VerifyUploadResult>;

  /**
   * Generates a short-lived signed URL for downloading the file as an attachment.
   */
  getSignedDownloadUrl(
    storageKey: string,
    fileName?: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Generates a short-lived signed URL for previewing/streaming the file inline in the browser.
   */
  getSignedPreviewUrl(
    storageKey: string,
    mimeType?: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Permanently deletes an object from object storage.
   */
  deleteObject(storageKey: string): Promise<boolean>;

  /**
   * Direct server-side upload of a Buffer (used for migration, local dev, or fallback).
   */
  uploadBuffer?(storageKey: string, buffer: Buffer, mimeType: string): Promise<boolean>;
}

/**
 * Generates the canonical, unguessable storage key.
 * Original filenames live in the database ONLY, never in the storage key.
 */
export function buildStorageKey(tenantId: string | null, fileId: string, versionNo: number): string {
  const versionTag = `v${versionNo}`;
  if (tenantId) {
    return `tenant/${tenantId}/${fileId}/${versionTag}`;
  }
  return `platform/${fileId}/${versionTag}`;
}


import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  IStorageProvider,
  InitiateUploadParams,
  UploadAuthorization,
  VerifyUploadResult,
  buildStorageKey,
} from "./storage-provider.interface";
import { getUploadsRoot } from "../media/media.service";

const SIGNED_URL_SECRET = process.env.JWT_SECRET || "local-storage-secret-signing-key";

export class LocalStorageProvider implements IStorageProvider {
  public readonly providerName = "local";
  private baseDir: string;

  constructor(customBaseDir?: string) {
    const root = customBaseDir || getUploadsRoot();
    this.baseDir = path.resolve(root, "files");
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err) {
        console.warn("[LocalStorageProvider] Failed to create baseDir:", err);
      }
    }
  }

  private resolvePhysicalPath(storageKey: string): string {
    const safeKey = storageKey.replace(/^[/\\]+/, "");
    const inFiles = path.resolve(this.baseDir, safeKey);
    if (fs.existsSync(inFiles)) return inFiles;
    const inRoot = path.resolve(getUploadsRoot(), safeKey);
    if (fs.existsSync(inRoot)) return inRoot;
    return inFiles;
  }

  /**
   * Generates a local upload URL pointing to the server's local binary upload endpoint.
   */
  async initiateUpload(params: InitiateUploadParams): Promise<UploadAuthorization> {
    const storageKey = buildStorageKey(params.tenantId, params.fileId, params.versionNo);
    const expiresInSeconds = params.expiresInSeconds || 3600;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const token = crypto
      .createHmac("sha256", SIGNED_URL_SECRET)
      .update(`${storageKey}:${expiresAt.getTime()}`)
      .digest("hex");

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const uploadUrl = `${baseUrl}/api/v1/files/uploads/${params.fileId}/binary?token=${token}&exp=${expiresAt.getTime()}&key=${encodeURIComponent(storageKey)}`;

    return {
      uploadUrl,
      storageKey,
      token,
      expiresAt,
      provider: "local",
      headers: {
        "Content-Type": params.mimeType,
        "X-Storage-Key": storageKey,
      },
    };
  }

  /**
   * Verifies that the file exists on the local filesystem.
   */
  async verifyUpload(storageKey: string, expectedSize?: number): Promise<VerifyUploadResult> {
    const filePath = this.resolvePhysicalPath(storageKey);
    if (!fs.existsSync(filePath)) {
      return { exists: false, sizeBytes: 0 };
    }

    const stat = fs.statSync(filePath);
    return {
      exists: true,
      sizeBytes: stat.size,
    };
  }

  /**
   * Generates a signed download URL using HMAC signature.
   */
  async getSignedDownloadUrl(
    storageKey: string,
    fileName?: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sig = crypto
      .createHmac("sha256", SIGNED_URL_SECRET)
      .update(`download:${storageKey}:${expiresAt}`)
      .digest("hex");

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const encodedKey = encodeURIComponent(storageKey);
    const downloadParam = fileName ? `&download=${encodeURIComponent(fileName)}` : "";

    return `${baseUrl}/api/v1/files/stream?key=${encodedKey}&exp=${expiresAt}&sig=${sig}${downloadParam}`;
  }

  /**
   * Generates a signed preview URL using HMAC signature.
   */
  async getSignedPreviewUrl(
    storageKey: string,
    _mimeType?: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const sig = crypto
      .createHmac("sha256", SIGNED_URL_SECRET)
      .update(`preview:${storageKey}:${expiresAt}`)
      .digest("hex");

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const encodedKey = encodeURIComponent(storageKey);

    return `${baseUrl}/api/v1/files/stream?key=${encodedKey}&exp=${expiresAt}&sig=${sig}&inline=true`;
  }

  /**
   * Deletes the file from the local filesystem.
   */
  async deleteObject(storageKey: string): Promise<boolean> {
    try {
      const filePath = this.resolvePhysicalPath(storageKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.error("[LocalStorageProvider] deleteObject error:", err);
      return false;
    }
  }

  /**
   * Saves a buffer directly to local disk.
   */
  async uploadBuffer(storageKey: string, buffer: Buffer, _mimeType: string): Promise<boolean> {
    const filePath = this.resolvePhysicalPath(storageKey);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
    return true;
  }

  /**
   * Helper to verify HMAC signature on stream requests.
   */
  verifySignature(type: "download" | "preview", storageKey: string, exp: number, sig: string): boolean {
    if (Date.now() > exp) {
      return false;
    }
    const expected = crypto
      .createHmac("sha256", SIGNED_URL_SECRET)
      .update(`${type}:${storageKey}:${exp}`)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  }

  getPhysicalPath(storageKey: string): string {
    return this.resolvePhysicalPath(storageKey);
  }
}


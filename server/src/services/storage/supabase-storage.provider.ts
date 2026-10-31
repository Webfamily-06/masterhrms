import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "path";
import {
  IStorageProvider,
  InitiateUploadParams,
  UploadAuthorization,
  VerifyUploadResult,
  buildStorageKey,
} from "./storage-provider.interface";

export interface SupabaseStorageConfig {
  supabaseUrl: string;
  supabaseKey: string;
  bucketName?: string;
}

export class SupabaseStorageProvider implements IStorageProvider {
  public readonly providerName = "supabase";
  private client: SupabaseClient;
  private bucket: string;

  constructor(config: SupabaseStorageConfig) {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error("SupabaseStorageProvider requires supabaseUrl and supabaseKey.");
    }
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    this.bucket = config.bucketName || process.env.SUPABASE_STORAGE_BUCKET || "hrms-files";
  }

  /**
   * Generates a pre-authorized direct signed upload URL from Supabase Storage.
   */
  async initiateUpload(params: InitiateUploadParams): Promise<UploadAuthorization> {
    const storageKey = buildStorageKey(params.tenantId, params.fileId, params.versionNo);
    const expiresInSeconds = params.expiresInSeconds || 3600; // 1 hour default
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storageKey);

    if (error || !data?.signedUrl) {
      console.error("[Supabase Storage Error] Failed to create signed upload URL:", error);
      throw new Error(`Failed to generate Supabase signed upload URL: ${error?.message || "Unknown error"}`);
    }

    return {
      uploadUrl: data.signedUrl,
      storageKey,
      token: data.token,
      expiresAt,
      provider: "supabase",
      headers: {
        "Content-Type": params.mimeType,
      },
    };
  }

  /**
   * Verifies an uploaded object exists in the Supabase bucket.
   */
  async verifyUpload(storageKey: string, expectedSize?: number): Promise<VerifyUploadResult> {
    try {
      const dir = path.dirname(storageKey);
      const filename = path.basename(storageKey);

      const { data, error } = await this.client.storage
        .from(this.bucket)
        .list(dir === "." ? "" : dir, {
          search: filename,
          limit: 10,
        });

      if (error) {
        console.error("[Supabase Storage Error] List error during verify:", error);
        return { exists: false, sizeBytes: 0 };
      }

      const match = data?.find((f) => f.name === filename);
      if (!match) {
        return { exists: false, sizeBytes: 0 };
      }

      const size = match.metadata?.size || expectedSize || 0;
      return {
        exists: true,
        sizeBytes: Number(size),
        checksum: match.metadata?.mimetype || undefined,
      };
    } catch (err: any) {
      console.error("[Supabase Storage Error] verifyUpload exception:", err);
      return { exists: false, sizeBytes: 0 };
    }
  }

  /**
   * Generates a short-lived signed URL for download (attachment).
   */
  async getSignedDownloadUrl(
    storageKey: string,
    fileName?: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const options: { download?: string } = {};
    if (fileName) {
      options.download = fileName;
    }

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds, options);

    if (error || !data?.signedUrl) {
      console.error("[Supabase Storage Error] Failed to generate signed download URL:", error);
      throw new Error(`Failed to generate signed download URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }

  /**
   * Generates a short-lived signed URL for inline preview.
   */
  async getSignedPreviewUrl(
    storageKey: string,
    _mimeType?: string,
    expiresInSeconds: number = 300
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error("[Supabase Storage Error] Failed to generate signed preview URL:", error);
      throw new Error(`Failed to generate signed preview URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }

  /**
   * Permanently deletes an object from Supabase bucket.
   */
  async deleteObject(storageKey: string): Promise<boolean> {
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .remove([storageKey]);

      if (error) {
        console.error("[Supabase Storage Error] Remove failed:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[Supabase Storage Error] deleteObject exception:", err);
      return false;
    }
  }

  /**
   * Uploads a Buffer directly to Supabase storage.
   */
  async uploadBuffer(storageKey: string, buffer: Buffer, mimeType: string): Promise<boolean> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error("[Supabase Storage Error] Direct upload failed:", error);
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
    return true;
  }
}


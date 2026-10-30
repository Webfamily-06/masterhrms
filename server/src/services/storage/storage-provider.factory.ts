import { IStorageProvider } from "./storage-provider.interface";
import { SupabaseStorageProvider } from "./supabase-storage.provider";
import { LocalStorageProvider } from "./local-storage.provider";

export class StorageProviderFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Returns the singleton storage provider instance.
   */
  public static getProvider(): IStorageProvider {
    if (this.instance) {
      return this.instance;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      console.log("[StorageProviderFactory] Initializing Supabase Storage Provider.");
      this.instance = new SupabaseStorageProvider({
        supabaseUrl,
        supabaseKey,
        bucketName: process.env.SUPABASE_STORAGE_BUCKET || "hrms-files",
      });
      return this.instance;
    }

    // Fallback to LocalStorageProvider for offline / local development
    console.warn(
      "[StorageProviderFactory] Supabase credentials not found in environment; using LocalStorageProvider for local development."
    );
    this.instance = new LocalStorageProvider();
    return this.instance;
  }

  /**
   * For testing or dynamic reconfiguration: set or reset the provider instance.
   */
  public static setProvider(provider: IStorageProvider | null): void {
    this.instance = provider;
  }
}


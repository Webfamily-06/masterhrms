"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageProviderFactory = void 0;
const supabase_storage_provider_1 = require("./supabase-storage.provider");
const local_storage_provider_1 = require("./local-storage.provider");
class StorageProviderFactory {
    static instance = null;
    /**
     * Returns the singleton storage provider instance.
     */
    static getProvider() {
        if (this.instance) {
            return this.instance;
        }
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_ANON_KEY ||
            process.env.SUPABASE_KEY;
        if (supabaseUrl && supabaseKey) {
            console.log("[StorageProviderFactory] Initializing Supabase Storage Provider.");
            this.instance = new supabase_storage_provider_1.SupabaseStorageProvider({
                supabaseUrl,
                supabaseKey,
                bucketName: process.env.SUPABASE_STORAGE_BUCKET || "hrms-files",
            });
            return this.instance;
        }
        // Fallback to LocalStorageProvider for offline / local development
        console.warn("[StorageProviderFactory] Supabase credentials not found in environment; using LocalStorageProvider for local development.");
        this.instance = new local_storage_provider_1.LocalStorageProvider();
        return this.instance;
    }
    /**
     * For testing or dynamic reconfiguration: set or reset the provider instance.
     */
    static setProvider(provider) {
        this.instance = provider;
    }
}
exports.StorageProviderFactory = StorageProviderFactory;

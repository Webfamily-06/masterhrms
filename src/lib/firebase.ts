/**
 * MASTERHRMS — FIREBASE CLIENT CONFIGURATION & INITIALIZATION
 * 
 * Strict Zero-Hardcoding Policy:
 * All keys and certificates are dynamically loaded from environment variables (.env).
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Helper to resolve environment variables across Vite, Next.js, and Node environments
function getEnv(key: string, nextKey?: string): string {
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    const val = (import.meta as any).env[key];
    if (val) return val;
  }
  if (typeof process !== "undefined" && process.env) {
    if (nextKey && process.env[nextKey]) return process.env[nextKey]!;
    if (process.env[key]) return process.env[key]!;
  }
  return "";
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "NEXT_PUBLIC_FIREBASE_APP_ID"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") || undefined,
};

// Web Push / VAPID Key pair for Firebase Cloud Messaging
export const firebaseVapidKey: string = getEnv("VITE_FIREBASE_VAPID_KEY", "NEXT_PUBLIC_FIREBASE_VAPID_KEY") || getEnv("VAPID_PUBLIC_KEY");
export const firebaseMessagingSenderId: string = firebaseConfig.messagingSenderId;

let firebaseAppInstance: any = null;
let firebaseAnalyticsInstance: any = null;

/**
 * Initializes and retrieves the Firebase app singleton instance.
 */
export async function getFirebaseApp() {
  if (firebaseAppInstance) return firebaseAppInstance;
  if (!firebaseConfig.apiKey) {
    console.warn("[Firebase] API key is not configured in .env variables.");
    return null;
  }

  try {
    // @ts-ignore
    const { initializeApp, getApps, getApp } = await import("firebase/app");
    if (getApps().length > 0) {
      firebaseAppInstance = getApp();
    } else {
      firebaseAppInstance = initializeApp(firebaseConfig);
    }
    return firebaseAppInstance;
  } catch (err) {
    console.warn("[Firebase] Firebase SDK initialization deferred or package not present:", err);
    return null;
  }
}

/**
 * Initializes and retrieves the Firebase Analytics singleton in browser environments.
 */
export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  if (firebaseAnalyticsInstance) return firebaseAnalyticsInstance;

  try {
    const app = await getFirebaseApp();
    if (!app) return null;

    // @ts-ignore
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    const supported = await isSupported().catch(() => false);
    if (supported) {
      firebaseAnalyticsInstance = getAnalytics(app);
      return firebaseAnalyticsInstance;
    }
    return null;
  } catch (err) {
    console.warn("[Firebase] Analytics initialization deferred:", err);
    return null;
  }
}

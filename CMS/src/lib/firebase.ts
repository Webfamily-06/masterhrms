/**
 * MASTERHRMS CMS — FIREBASE CLIENT CONFIGURATION & INITIALIZATION
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

function getEnv(key: string, nextKey?: string): string {
  if (typeof process !== "undefined" && process.env) {
    if (nextKey && process.env[nextKey]) return process.env[nextKey]!;
    if (process.env[key]) return process.env[key]!;
  }
  if (typeof window !== "undefined" && (window as any).__ENV__) {
    if (nextKey && (window as any).__ENV__[nextKey]) return (window as any).__ENV__[nextKey];
    if ((window as any).__ENV__[key]) return (window as any).__ENV__[key];
  }
  return "";
}

export const firebaseConfig: FirebaseConfig = {
  apiKey: getEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID"),
  measurementId: getEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "VITE_FIREBASE_MEASUREMENT_ID") || undefined,
};

export const firebaseVapidKey: string = getEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", "VITE_FIREBASE_VAPID_KEY") || getEnv("VAPID_PUBLIC_KEY");
export const firebaseMessagingSenderId: string = firebaseConfig.messagingSenderId;

let firebaseAppInstance: any = null;
let firebaseAnalyticsInstance: any = null;

export async function getFirebaseApp() {
  if (firebaseAppInstance) return firebaseAppInstance;
  if (!firebaseConfig.apiKey) {
    console.warn("[Firebase CMS] API key is not configured in .env variables.");
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
    console.warn("[Firebase CMS] Firebase SDK initialization deferred or package not present:", err);
    return null;
  }
}

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
    console.warn("[Firebase CMS] Analytics initialization deferred:", err);
    return null;
  }
}

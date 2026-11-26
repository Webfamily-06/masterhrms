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

export function getResolvedFirebaseConfig(): FirebaseConfig & { vapidKey?: string; enabled?: boolean } {
  const runtimeFb =
    typeof window !== "undefined" && (window as any).__MASTERHRMS_FIREBASE__
      ? (window as any).__MASTERHRMS_FIREBASE__
      : null;

  return {
    apiKey: runtimeFb?.apiKey || getEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY"),
    authDomain: runtimeFb?.authDomain || getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: runtimeFb?.projectId || getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"),
    storageBucket: runtimeFb?.storageBucket || getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId:
      runtimeFb?.messagingSenderId || getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: runtimeFb?.appId || getEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID"),
    measurementId:
      runtimeFb?.measurementId || getEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "VITE_FIREBASE_MEASUREMENT_ID") || undefined,
    vapidKey:
      runtimeFb?.vapidKey || getEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", "VITE_FIREBASE_VAPID_KEY") || getEnv("VAPID_PUBLIC_KEY"),
    enabled: runtimeFb?.enabled ?? true,
  };
}

export const firebaseConfig: FirebaseConfig = getResolvedFirebaseConfig();

export const firebaseVapidKey: string =
  getResolvedFirebaseConfig().vapidKey || "";
export const firebaseMessagingSenderId: string = firebaseConfig.messagingSenderId;

const optionalImport = (specifier: string): Promise<any> =>
  new Function("s", "return import(s)")(specifier);

let firebaseAppInstance: any = null;
let firebaseAnalyticsInstance: any = null;
let lastFirebaseFingerprint = "";

export async function getFirebaseApp() {
  const activeCfg = getResolvedFirebaseConfig();
  if (activeCfg.enabled === false || !activeCfg.apiKey) {
    return null;
  }
  const fp = `${activeCfg.apiKey}:${activeCfg.projectId}:${activeCfg.appId}`;
  if (firebaseAppInstance && lastFirebaseFingerprint === fp) {
    return firebaseAppInstance;
  }

  try {
    const { initializeApp, getApps, getApp } = await optionalImport("firebase/app");
    if (getApps().length > 0 && lastFirebaseFingerprint === fp) {
      firebaseAppInstance = getApp();
    } else if (getApps().length > 0) {
      firebaseAppInstance = initializeApp(activeCfg, `masterhrms-${Date.now()}`);
    } else {
      firebaseAppInstance = initializeApp(activeCfg);
    }
    lastFirebaseFingerprint = fp;
    return firebaseAppInstance;
  } catch (err) {
    console.warn("[Firebase CMS] Firebase SDK initialization deferred or package not present:", err);
    return null;
  }
}
let firebaseMessagingInitialized = false;

export async function initFirebaseMessagingIfConfigured(
  swReg?: ServiceWorkerRegistration
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (firebaseMessagingInitialized) return true;
  const activeCfg = getResolvedFirebaseConfig();
  if (
    activeCfg.enabled === false ||
    !activeCfg.apiKey ||
    !activeCfg.projectId ||
    !activeCfg.messagingSenderId ||
    !activeCfg.appId
  ) {
    return false;
  }

  try {
    const app = await getFirebaseApp();
    if (!app) return false;

    const { getMessaging, isSupported, onMessage, getToken } = await optionalImport(
      "firebase/messaging"
    );
    const supported = await isSupported().catch(() => false);
    if (!supported) return false;

    const messaging = getMessaging(app);
    firebaseMessagingInitialized = true;

    const resolvedVapid = activeCfg.vapidKey || firebaseVapidKey;
    if ("Notification" in window && Notification.permission === "granted" && resolvedVapid) {
      await getToken(messaging, {
        vapidKey: resolvedVapid,
        serviceWorkerRegistration: swReg,
      }).catch(() => null);
    }

    onMessage(messaging, (payload: any) => {
      const title =
        payload?.notification?.title || payload?.data?.title || "MasterHRMS Notification";
      const body = payload?.notification?.body || payload?.data?.body || "";
      const actionUrl =
        payload?.data?.actionUrl || payload?.data?.linkTo || payload?.data?.url || "/chat";
      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        (document.visibilityState === "hidden" || !document.hasFocus())
      ) {
        const regPromise = swReg
          ? Promise.resolve(swReg)
          : "serviceWorker" in navigator
          ? navigator.serviceWorker.ready
          : Promise.reject();
        regPromise
          .then((reg) =>
            reg.showNotification(title, {
              body,
              icon: "/assets/img/logo-small.svg",
              badge: "/assets/img/favicon.png",
              tag: payload?.data?.tag || `fcm_${Date.now()}`,
              data: { actionUrl, url: actionUrl, linkTo: actionUrl },
            })
          )
          .catch(() => {
            try {
              new Notification(title, { body, icon: "/assets/img/logo-small.svg" });
            } catch {}
          });
      }
    });

    return true;
  } catch {
    return false;
  }
}

import { useState, useEffect, useCallback } from "react";
import type { BrowserNotificationPayload, NotificationPermissionStatus } from "./types";

/**
 * Check if browser supports the Web Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationPermissionStatus;
  } catch {
    return "denied";
  }
}

/**
 * Play a subtle chime sound for urgent HRMS notifications (leaves, clock-in, approvals)
 */
function playNotificationChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted before interaction
  }
}

/**
 * Dispatch a modern Browser Push / Desktop Notification
 */
export function sendBrowserNotification(
  payload: BrowserNotificationPayload
): Notification | null {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  const {
    title,
    body,
    icon = "/favicon.webp",
    badge = "/favicon.webp",
    tag = "hrms-alert",
    data,
    silent = false,
    requireInteraction = false,
    onClick,
  } = payload;

  try {
    if (!silent) {
      playNotificationChime();
    }

    const notification = new Notification(title, {
      body,
      icon,
      badge,
      tag,
      data,
      silent: true, // We handled chime manually to avoid system bell clashes
      requireInteraction,
    });

    if (onClick) {
      notification.onclick = (e) => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    return notification;
  } catch {
    return null;
  }
}

/**
 * Reactive React Hook for Notification API
 */
export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>(() => {
    return getNotificationPermission();
  });

  const isSupported = isNotificationSupported();

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const request = useCallback(async (): Promise<NotificationPermissionStatus> => {
    const res = await requestNotificationPermission();
    setPermission(res);
    return res;
  }, []);

  const notify = useCallback(
    (payload: BrowserNotificationPayload): Notification | null => {
      if (permission !== "granted") return null;
      return sendBrowserNotification(payload);
    },
    [permission]
  );

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    requestPermission: request,
    sendNotification: notify,
  };
}

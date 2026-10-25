import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useCurrentProfile, useSession } from "./session";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : (typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1" &&
    !window.location.hostname.endsWith(".localhost")
      ? window.location.origin
      : "http://localhost:4000");

let globalSocket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: (callback) => callback({ token: localStorage.getItem("hrms_auth_token") }),
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    const reconnect = () => {
      globalSocket?.disconnect();
      if (localStorage.getItem("hrms_auth_token")) globalSocket?.connect();
    };
    window.addEventListener("auth-token-changed", reconnect);
    window.addEventListener("storage", (event) => {
      if (event.key === "hrms_auth_token") reconnect();
    });
  }
  return globalSocket;
}

export type NotificationCategory =
  | "punch"
  | "leave"
  | "payroll"
  | "chat"
  | "calendar"
  | "system";

export type RealtimeNotification = {
  id: string;
  title: string;
  description: string;
  type: NotificationCategory;
  timestamp: string;
  read: boolean;
  linkTo?: string | null;
};

/**
 * Accurately normalizes any backend module, event, or notification type into canonical category
 */
export function normalizeNotificationType(rawType?: string | null): NotificationCategory {
  if (!rawType) return "system";
  const lower = String(rawType).toLowerCase().trim();

  if (
    lower.includes("calendar") ||
    lower.includes("meeting") ||
    lower.includes("schedule") ||
    lower.startsWith("event_")
  ) {
    return "calendar";
  }
  if (
    lower.includes("punch") ||
    lower.includes("attendance") ||
    lower.includes("clock") ||
    lower.includes("biometric")
  ) {
    return "punch";
  }
  if (
    lower.includes("leave") ||
    lower.includes("vacation") ||
    lower.includes("holiday") ||
    lower.includes("time_off")
  ) {
    return "leave";
  }
  if (
    lower.includes("payroll") ||
    lower.includes("salary") ||
    lower.includes("payslip") ||
    lower.includes("invoice") ||
    lower.includes("payment") ||
    lower.includes("billing")
  ) {
    return "payroll";
  }
  if (lower.includes("chat") || lower.includes("message") || lower.includes("dm")) {
    return "chat";
  }
  return "system";
}

// Module-level in-memory cache and subscribers to prevent duplicate subscriptions and state divergence
let memoryNotifications: RealtimeNotification[] = [];
const subscribers = new Set<(items: RealtimeNotification[]) => void>();

function loadInitialNotifications(): RealtimeNotification[] {
  try {
    const stored = localStorage.getItem("master_hrms_live_notifications");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const seenIds = new Set<string>();
    const deduped: RealtimeNotification[] = [];

    for (const item of parsed) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        deduped.push({
          ...item,
          type: normalizeNotificationType(item.type),
        });
      }
    }
    return deduped;
  } catch {
    return [];
  }
}

memoryNotifications = loadInitialNotifications();

function broadcastNotifications(items: RealtimeNotification[]) {
  // Deduplicate array by stable ID while preserving order
  const seenIds = new Set<string>();
  const uniqueItems: RealtimeNotification[] = [];
  for (const item of items) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  memoryNotifications = uniqueItems.slice(0, 50);
  try {
    localStorage.setItem(
      "master_hrms_live_notifications",
      JSON.stringify(memoryNotifications)
    );
  } catch {
    // ignore quota error
  }
  subscribers.forEach((fn) => fn(memoryNotifications));
}

export function useRealtimeSocket() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(() => memoryNotifications);

  // Subscribe to module-level notification store
  useEffect(() => {
    const handler = (items: RealtimeNotification[]) => {
      setNotifications(items);
    };
    subscribers.add(handler);
    handler(memoryNotifications);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  // Fetch initial notifications from API on mount
  useEffect(() => {
    if (!tenantId) return;

    api
      .get<any>("/shared/notifications", { params: { limit: 30 } })
      .then((res) => {
        const serverList = res?.notifications || [];
        if (!Array.isArray(serverList) || serverList.length === 0) return;

        const serverItems: RealtimeNotification[] = serverList.map((n: any) => ({
          id: n.id,
          title: n.title,
          description: n.body || n.description || "",
          type: normalizeNotificationType(n.module || n.type),
          timestamp: n.createdAt || n.timestamp || new Date().toISOString(),
          read: Boolean(n.readAt),
          linkTo: n.linkTo,
        }));

        const map = new Map<string, RealtimeNotification>();
        for (const item of serverItems) {
          map.set(item.id, item);
        }
        for (const item of memoryNotifications) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          }
        }

        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        broadcastNotifications(merged);
      })
      .catch(() => {
        // Fallback to local storage
      });
  }, [tenantId]);

  useEffect(() => {
    const socket = getSocketClient();

    function onConnect() {
      setIsConnected(true);
      if (tenantId) {
        socket.emit("join-tenant", tenantId);
      }
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewPunch(punch: any) {
      toast.info(
        `Live Attendance: ${punch.employeeName} clocked ${
          punch.type === "check_in" ? "IN" : "OUT"
        } at ${punch.time}`
      );
      qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["attendance-records"] });
      qc.invalidateQueries({ queryKey: ["dashboard-hrm-realtime-data"] });
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
      qc.invalidateQueries({ queryKey: ["ess-dashboard"] });
      qc.invalidateQueries({ queryKey: ["tenant-dashboard-metrics"] });
    }

    function onLeaveUpdated(req: any) {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["dashboard-hrm-realtime-data"] });
      qc.invalidateQueries({ queryKey: ["my-leaves"] });
      qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
      qc.invalidateQueries({ queryKey: ["ess-dashboard"] });
    }

    function onPaymentConfirmed(data: any) {
      toast.success("Payment Confirmed", {
        description: `Invoice #${data.invoiceNo || data.invoiceId} verified! Subscription is active.`,
      });
      qc.invalidateQueries({ queryKey: ["workspace-subscription"] });
      qc.invalidateQueries({ queryKey: ["billing-plans"] });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices"] });
      qc.invalidateQueries({ queryKey: ["tenant-billing-history"] });
      qc.invalidateQueries({ queryKey: ["super-transactions-list"] });
    }

    function onPaymentRejected(data: any) {
      toast.error("Payment Verification Failed", {
        description:
          data.reason ||
          `Payment for Invoice #${data.invoiceNo || data.invoiceId} was rejected.`,
      });
      qc.invalidateQueries({ queryKey: ["workspace-subscription"] });
      qc.invalidateQueries({ queryKey: ["billing-plans"] });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-invoices"] });
      qc.invalidateQueries({ queryKey: ["tenant-billing-history"] });
      qc.invalidateQueries({ queryKey: ["super-transactions-list"] });
    }

    function onSubscriptionUpdated(data: any) {
      qc.invalidateQueries({ queryKey: ["workspace-subscription"] });
      qc.invalidateQueries({ queryKey: ["billing-plans"] });
      qc.invalidateQueries({ queryKey: ["tenant-features"] });
      qc.invalidateQueries({ queryKey: ["tenant-dashboard-metrics"] });
      qc.invalidateQueries({ queryKey: ["super-realtime-stats"] });
      qc.invalidateQueries({ queryKey: ["super-transactions-list"] });
    }

    function onSuperTransactionUpdated() {
      qc.invalidateQueries({ queryKey: ["super-transactions-list"] });
    }

    function onSettingsUpdated(data: any) {
      console.log("[Realtime] settings.updated received:", data);
      qc.invalidateQueries({ queryKey: ["app-config"] });
      qc.invalidateQueries({ queryKey: ["tenant-branding"] });
      qc.invalidateQueries({ queryKey: ["realtime-platform-settings"] });
      if (data?.group) {
        qc.invalidateQueries({ queryKey: ["settings", data.group] });
      }
      window.dispatchEvent(new CustomEvent("settings-updated", { detail: data }));
    }

    function onNotification(notif: any) {
      if (!notif) return;

      const stableId =
        notif.id ||
        notif.notificationId ||
        (notif.metadata?.eventId && notif.metadata?.reminderId
          ? `${notif.metadata.eventId}-${notif.metadata.reminderId}`
          : null) ||
        (notif.metadataJson?.eventId && notif.metadataJson?.reminderId
          ? `${notif.metadataJson.eventId}-${notif.metadataJson.reminderId}`
          : null);

      const title = notif.title || "New Platform Alert";
      const description = notif.description || notif.body || notif.message || "";
      const type = normalizeNotificationType(notif.type || notif.module);
      const timestamp = notif.timestamp || notif.createdAt || new Date().toISOString();
      const read = Boolean(notif.read || notif.readAt);
      const linkTo = notif.linkTo || null;

      const finalId =
        stableId ||
        `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // 1. Strict stable ID idempotency check
      if (memoryNotifications.some((item) => item.id === finalId)) {
        return;
      }

      // 2. Exact content suppression within 3-second window to prevent duplicate socket echoes
      const isDuplicateRecent = memoryNotifications.some(
        (item) =>
          item.title === title &&
          item.description === description &&
          Math.abs(new Date(item.timestamp).getTime() - new Date(timestamp).getTime()) < 3000
      );
      if (isDuplicateRecent) {
        return;
      }

      const newNotif: RealtimeNotification = {
        id: finalId,
        title,
        description,
        type,
        timestamp,
        read,
        linkTo,
      };

      broadcastNotifications([newNotif, ...memoryNotifications]);

      toast(title, {
        description,
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("punch:new", onNewPunch);
    socket.on("leave:updated", onLeaveUpdated);
    socket.on("notification:new", onNotification);
    socket.on("payment:confirmed", onPaymentConfirmed);
    socket.on("payment:rejected", onPaymentRejected);
    socket.on("subscription:activated", onSubscriptionUpdated);
    socket.on("subscription:updated", onSubscriptionUpdated);
    socket.on("super:transaction_updated", onSuperTransactionUpdated);
    socket.on("settings.updated", onSettingsUpdated);

    if (socket.connected) {
      onConnect();
    }

    // Connect Pusher client when configured & enabled in Settings
    let pusherClient: any = null;
    let userChannel: any = null;
    let tenantChannel: any = null;
    const currentUserId = user?.id || (profile as any)?.userId;

    if (typeof window !== "undefined") {
      api
        .get<any>("/pusher/config")
        .then(async (res) => {
          const cfg = res?.data || res;
          if (!cfg?.enabled || !cfg?.key) return;

          const PusherModule = await import("pusher-js");
          const PusherClient = PusherModule.default || PusherModule;

          const token = localStorage.getItem("hrms_auth_token");
          pusherClient = new PusherClient(cfg.key, {
            cluster: cfg.cluster || "ap2",
            authEndpoint: `${SOCKET_URL}/api/pusher/auth`,
            auth: {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          });

          if (currentUserId) {
            userChannel = pusherClient.subscribe(`private-user-${currentUserId}`);
            userChannel.bind("notification:new", onNotification);
            userChannel.bind("calendar:reminder-due", (data: any) => {
              onNotification({
                id: `reminder-${data?.reminderId || data?.eventId || Date.now()}`,
                title: data?.title || "Calendar Reminder",
                description: data?.message || data?.description || "Upcoming event scheduled",
                type: "calendar",
                timestamp: data?.timestamp || new Date().toISOString(),
              });
              qc.invalidateQueries({ queryKey: ["calendar-events"] });
            });
            userChannel.bind("calendar:event-shared", (data: any) => {
              onNotification({
                id: `share-${data?.eventId}-${Date.now()}`,
                title: "Event Shared With You",
                description: `${data?.sharedByName || "A colleague"} shared "${data?.eventTitle || "an event"}" with you`,
                type: "calendar",
                timestamp: data?.timestamp || new Date().toISOString(),
              });
              qc.invalidateQueries({ queryKey: ["calendar-events"] });
            });
            userChannel.bind("calendar:event-updated", (data: any) => {
              onNotification({
                id: `update-${data?.eventId}-${Date.now()}`,
                title: "Calendar Event Updated",
                description: `Event "${data?.eventTitle || "Scheduled event"}" was updated`,
                type: "calendar",
                timestamp: data?.timestamp || new Date().toISOString(),
              });
              qc.invalidateQueries({ queryKey: ["calendar-events"] });
            });
            userChannel.bind("calendar:event-cancelled", (data: any) => {
              onNotification({
                id: `cancel-${data?.eventId}-${Date.now()}`,
                title: "Calendar Event Cancelled",
                description: `Event "${data?.eventTitle || "Scheduled event"}" has been cancelled`,
                type: "calendar",
                timestamp: data?.timestamp || new Date().toISOString(),
              });
              qc.invalidateQueries({ queryKey: ["calendar-events"] });
            });
            userChannel.bind("calendar:rsvp-updated", (data: any) => {
              onNotification({
                id: `rsvp-${data?.eventId}-${data?.responderId || Date.now()}`,
                title: "RSVP Response Received",
                description: `${data?.responderName || "Attendee"} responded "${data?.status || "accepted"}" to "${data?.eventTitle || "event"}"`,
                type: "calendar",
                timestamp: data?.timestamp || new Date().toISOString(),
              });
              qc.invalidateQueries({ queryKey: ["calendar-events"] });
            });
          }

          if (tenantId) {
            tenantChannel = pusherClient.subscribe(`private-tenant-${tenantId}`);
            tenantChannel.bind("punch:new", onNewPunch);
            tenantChannel.bind("leave:updated", onLeaveUpdated);
            tenantChannel.bind("notification:new", onNotification);
            tenantChannel.bind("settings.updated", onSettingsUpdated);
            tenantChannel.bind("payment:confirmed", onPaymentConfirmed);
            tenantChannel.bind("payment:rejected", onPaymentRejected);
          }
        })
        .catch(() => {});
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("punch:new", onNewPunch);
      socket.off("leave:updated", onLeaveUpdated);
      socket.off("notification:new", onNotification);
      socket.off("payment:confirmed", onPaymentConfirmed);
      socket.off("payment:rejected", onPaymentRejected);
      socket.off("subscription:activated", onSubscriptionUpdated);
      socket.off("subscription:updated", onSubscriptionUpdated);
      socket.off("super:transaction_updated", onSuperTransactionUpdated);
      socket.off("settings.updated", onSettingsUpdated);

      if (pusherClient) {
        if (userChannel) userChannel.unbind_all();
        if (tenantChannel) tenantChannel.unbind_all();
        pusherClient.disconnect();
      }
    };
  }, [tenantId, user?.id, qc]);

  const markAllAsRead = () => {
    const updated = memoryNotifications.map((n) => ({ ...n, read: true }));
    broadcastNotifications(updated);
    api.post("/shared/notifications/read-all").catch(() => {});
  };

  const markAsRead = (id: string) => {
    const updated = memoryNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    broadcastNotifications(updated);
    api.post(`/shared/notifications/${id}/read`).catch(() => {});
  };

  const clearAllNotifications = () => {
    broadcastNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    isConnected,
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAllNotifications,
  };
}

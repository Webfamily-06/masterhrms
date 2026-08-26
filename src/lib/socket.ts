import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useCurrentProfile, useSession } from "./session";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
  : "http://localhost:4000";

let globalSocket: Socket | null = null;

export function getSocketClient(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return globalSocket;
}

export type RealtimeNotification = {
  id: string;
  title: string;
  description: string;
  type: "punch" | "leave" | "payroll" | "chat" | "system" | "invoice";
  timestamp: string;
  read: boolean;
};

export function useRealtimeSocket() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(() => {
    try {
      const stored = localStorage.getItem("master_hrms_live_notifications");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveNotifications = (items: RealtimeNotification[]) => {
    setNotifications(items);
    try {
      localStorage.setItem("master_hrms_live_notifications", JSON.stringify(items.slice(0, 50)));
    } catch {
      // ignore
    }
  };

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
      toast.info(`⚡ Live Attendance: ${punch.employeeName} clocked ${punch.type === "check_in" ? "IN" : "OUT"} at ${punch.time}`);
      qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["attendance-records"] });
    }

    function onLeaveUpdated(req: any) {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["realtime-tenant-dashboard-stats"] });
    }

    function onNotification(notif: { title: string; description: string; type?: any; timestamp?: string }) {
      const newNotif: RealtimeNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: notif.title || "New Platform Alert",
        description: notif.description || "",
        type: notif.type || "system",
        timestamp: notif.timestamp || new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        const updated = [newNotif, ...prev];
        saveNotifications(updated);
        return updated;
      });

      toast(notif.title, {
        description: notif.description,
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("punch:new", onNewPunch);
    socket.on("leave:updated", onLeaveUpdated);
    socket.on("notification:new", onNotification);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("punch:new", onNewPunch);
      socket.off("leave:updated", onLeaveUpdated);
      socket.off("notification:new", onNotification);
    };
  }, [tenantId, qc]);

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    isConnected,
    notifications,
    unreadCount,
    markAllAsRead,
    clearAllNotifications,
  };
}

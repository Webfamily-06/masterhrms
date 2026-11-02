"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { getSocketClient, isSocketDisabled } from "@/lib/socket";
import { toast } from "sonner";

export interface IncomingCallInfo {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callerPhone?: string;
  callerEmail?: string;
  callType: "audio" | "video";
  threadId?: string;
  tenantId?: string;
  receivedAt?: number;
}

interface IncomingCallContextValue {
  incomingCall: IncomingCallInfo | null;
  isRinging: boolean;
  acceptCall: () => void;
  rejectCall: (reason?: string) => void;
  dismissCall: () => void;
  isPushSupported: boolean;
  pushPermission: NotificationPermission;
  isSubscribedToPush: boolean;
  enablePushNotifications: () => Promise<boolean>;
}

const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

// Pure Web Audio API synthesized dual-tone telephone ring (440Hz + 480Hz)
class RingtonePlayer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isPlaying = false;

  public start() {
    if (this.isPlaying || typeof window === "undefined") return;
    this.isPlaying = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }

      const playToneBurst = () => {
        if (!this.isPlaying || !this.ctx) return;
        try {
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

          gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.05);
          gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime + 0.35);
          gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

          gainNode.gain.setValueAtTime(0, this.ctx.currentTime + 0.6);
          gainNode.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.65);
          gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime + 0.95);
          gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          gainNode.connect(this.ctx.destination);

          osc1.start(this.ctx.currentTime);
          osc2.start(this.ctx.currentTime);
          osc1.stop(this.ctx.currentTime + 1.05);
          osc2.stop(this.ctx.currentTime + 1.05);
        } catch {}
      };

      playToneBurst();
      this.intervalId = setInterval(playToneBurst, 3000);
    } catch (e) {
      console.warn("[RingtonePlayer] AudioContext initialization failed:", e);
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);

  const ringtoneRef = useRef<RingtonePlayer | null>(null);
  const autoRejectTimerRef = useRef<any>(null);

  // Initialize ringtone instance
  useEffect(() => {
    ringtoneRef.current = new RingtonePlayer();
    return () => {
      ringtoneRef.current?.stop();
    };
  }, []);

  // Check push support on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setIsPushSupported(supported);
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Web Push is not supported in this browser.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        toast.warning("Push notifications permission was denied.");
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const token = localStorage.getItem("hrms_auth_token");
      if (!token) {
        toast.error("You must be logged in to enable call notifications.");
        return false;
      }

      const statusRes = await fetch("/api/notifications/push/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statusData = await statusRes.json();
      if (!statusData?.success || !statusData?.data?.vapidPublicKey) {
        throw new Error(statusData?.error || "Failed to retrieve VAPID public key");
      }

      const applicationServerKey = urlBase64ToUint8Array(statusData.data.vapidPublicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      const subJson = sub.toJSON();
      const saveRes = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
        }),
      });

      const saveData = await saveRes.json();
      if (saveData?.success) {
        setIsSubscribedToPush(true);
        toast.success("Incoming call notifications enabled!");
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("[IncomingCallProvider] Push subscription error:", err);
      toast.error(err.message || "Failed to enable notifications");
      return false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const checkSub = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribedToPush(!!sub);
        }
      } catch {}
    };
    checkSub();
  }, []);

  const stopCallAlert = useCallback(() => {
    ringtoneRef.current?.stop();
    setIsRinging(false);
    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
      autoRejectTimerRef.current = null;
    }
  }, []);

  const handleIncomingCallEvent = useCallback((data: any) => {
    if (!data?.callId) return;

    // DEVICE-LEVEL SESSION SECURITY: Validate active authentication on this device
    const token = typeof window !== "undefined"
      ? (localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token"))
      : null;
    if (!token) {
      console.warn("[IncomingCallProvider] Ignored incoming call on unauthenticated/logged-out device.");
      return;
    }

    const callerId = data.callerId || data.fromUserId;
    const callerName = data.callerName || "A Colleague";
    const callType = (data.callType || data.type || "audio").toLowerCase() as "audio" | "video";

    setIncomingCall({
      callId: data.callId,
      callerId,
      callerName,
      callerAvatar: data.callerAvatar || data.callerAvatarUrl || null,
      callerPhone: data.callerPhone,
      callerEmail: data.callerEmail,
      callType,
      threadId: data.threadId,
      tenantId: data.tenantId,
      receivedAt: Date.now(),
    });

    setIsRinging(true);
    ringtoneRef.current?.start();

    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
    }
    autoRejectTimerRef.current = setTimeout(() => {
      stopCallAlert();
      setIncomingCall(null);
    }, 60000);
  }, [stopCallAlert]);

  const handleCallCancelledEvent = useCallback((data: any) => {
    stopCallAlert();
    setIncomingCall((current) => {
      if (current && (!data?.callId || current.callId === data.callId)) {
        toast.info(`Call from ${current.callerName} ended.`);
        return null;
      }
      return current;
    });
  }, [stopCallAlert]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    const call = incomingCall;
    stopCallAlert();
    setIncomingCall(null);

    try {
      const socket = getSocketClient();
      socket.emit("call:accept", {
        callId: call.callId,
        targetUserId: call.callerId,
      });
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hrms:global-call-accepted", {
          detail: call,
        })
      );

      if (!window.location.pathname.includes("/chat")) {
        window.location.href = `/chat?callId=${encodeURIComponent(call.callId)}`;
      }
    }
  }, [incomingCall, stopCallAlert]);

  const rejectCall = useCallback((reason: string = "declined") => {
    if (!incomingCall) return;
    const call = incomingCall;
    stopCallAlert();
    setIncomingCall(null);

    try {
      const socket = getSocketClient();
      socket.emit("call:reject", {
        callId: call.callId,
        targetUserId: call.callerId,
        reason,
      });
    } catch {}

    const token = localStorage.getItem("hrms_auth_token");
    if (token) {
      fetch(`/api/calls/${encodeURIComponent(call.callId)}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }).catch(() => {});
    }
  }, [incomingCall, stopCallAlert]);

  const dismissCall = useCallback(() => {
    rejectCall("dismissed");
  }, [rejectCall]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let socket: any = null;
    // Only connect Socket.IO when: a dedicated server is configured AND the user is authenticated.
    // This prevents unauthenticated visitors and public pages from triggering 404 reconnect loops
    // on Vercel serverless deployments where no persistent Socket.IO server exists.
    const authToken = localStorage.getItem("hrms_auth_token");
    if (!isSocketDisabled() && authToken) {
      try {
        socket = getSocketClient();
        // Connect on demand (autoConnect is false in the updated socket.ts)
        if (socket && !socket.connected) socket.connect();
        if (socket) {
          socket.on("call:incoming", handleIncomingCallEvent);
          socket.on("call:cancelled", handleCallCancelledEvent);
          socket.on("call:timeout", handleCallCancelledEvent);
          socket.on("call:rejected", handleCallCancelledEvent);
        }
      } catch (e) {
        console.warn("[IncomingCallProvider] Socket initialization error:", e);
      }
    }

    const handlePusherEvent = (event: Event) => {
      const { eventName, data } = (event as CustomEvent).detail || {};
      if (eventName === "call:incoming") handleIncomingCallEvent(data);
      if (eventName === "call:cancelled" || eventName === "call:timeout") handleCallCancelledEvent(data);
    };
    window.addEventListener("hrms:pusher", handlePusherEvent);

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === "CALL_INCOMING_PUSH") {
        handleIncomingCallEvent(data);
      } else if (data.type === "CALL_CANCELLED_PUSH") {
        handleCallCancelledEvent(data);
      } else if (data.type === "CALL_ACTION_REJECT") {
        stopCallAlert();
        setIncomingCall(null);
      } else if (data.type === "CALL_ACTION_NAVIGATE") {
        // Notification click: Validate active authenticated session on this device
        const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
        if (!token) {
          console.warn("[IncomingCallProvider] Stale notification clicked after logout; redirecting to login.");
          if (typeof window !== "undefined") {
            window.location.href = "/auth";
          }
          return;
        }

        // Display pending incoming call interface. Never auto-accept.
        if (data.callId && !incomingCall) {
          fetch(`/api/calls/${encodeURIComponent(data.callId)}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((result) => {
              if (result?.success && result?.data?.status === "ringing") {
                handleIncomingCallEvent(result.data);
              }
            })
            .catch(() => {});
        }
      }
    };

    const handleLogout = () => {
      stopCallAlert();
      setIncomingCall(null);
    };
    window.addEventListener("hrms:logout", handleLogout);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      if (socket) {
        socket.off("call:incoming", handleIncomingCallEvent);
        socket.off("call:cancelled", handleCallCancelledEvent);
        socket.off("call:timeout", handleCallCancelledEvent);
        socket.off("call:rejected", handleCallCancelledEvent);
      }
      window.removeEventListener("hrms:pusher", handlePusherEvent);
      window.removeEventListener("hrms:logout", handleLogout);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
      stopCallAlert();
    };
  }, [handleIncomingCallEvent, handleCallCancelledEvent, stopCallAlert, acceptCall]);

  return (
    <IncomingCallContext.Provider
      value={{
        incomingCall,
        isRinging,
        acceptCall,
        rejectCall,
        dismissCall,
        isPushSupported,
        pushPermission,
        isSubscribedToPush,
        enablePushNotifications,
      }}
    >
      {children}
    </IncomingCallContext.Provider>
  );
}

export function useIncomingCall() {
  const context = useContext(IncomingCallContext);
  if (!context) {
    throw new Error("useIncomingCall must be used within an IncomingCallProvider");
  }
  return context;
}

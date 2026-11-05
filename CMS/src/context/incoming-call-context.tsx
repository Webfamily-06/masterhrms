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
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
}

interface IncomingCallContextValue {
  autoplayBlocked: boolean;
  unlockAudio: () => void;
  incomingCall: IncomingCallInfo | null;
  isRinging: boolean;
  isAccepting: boolean;
  isDeclining: boolean;
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
  public isAutoplayBlocked = false;

  public unlock() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().then(() => {
        this.isAutoplayBlocked = false;
      }).catch(() => {});
    }
  }

  public start() {
    if (this.isPlaying || typeof window === "undefined") return;
    this.isPlaying = true;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      if (this.ctx.state === "suspended") {
        this.isAutoplayBlocked = true;
        this.ctx.resume().then(() => {
          this.isAutoplayBlocked = false;
        }).catch(() => {
          this.isAutoplayBlocked = true;
        });
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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);

  const ringtoneRef = useRef<RingtonePlayer | null>(null);
  const autoRejectTimerRef = useRef<any>(null);
  const seenCallsRef = useRef<Map<string, number>>(new Map());
  const isActingRef = useRef<boolean>(false);

  const unlockAudio = useCallback(() => {
    ringtoneRef.current?.unlock();
    setAutoplayBlocked(false);
  }, []);

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
    isActingRef.current = false;
    setIsAccepting(false);
    setIsDeclining(false);
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

    // 1. SELF-CALL GUARD: Never display incoming ringing modal or ringtone to the caller themselves
    let currentUserId: string | null = null;
    try {
      const userRaw = localStorage.getItem("hrms_user");
      if (userRaw) {
        const u = JSON.parse(userRaw);
        currentUserId = u.id || u.userId || u.sub;
      }
    } catch {}
    if (currentUserId && (callerId === currentUserId || data.callerId === currentUserId || data.fromUserId === currentUserId)) {
      return;
    }

    // 2. DEDUPLICATION: Drop duplicate events within 15 seconds across Socket.IO and Pusher
    const now = Date.now();
    const lastSeen = seenCallsRef.current.get(data.callId);
    if (lastSeen && now - lastSeen < 15000 && incomingCall?.callId === data.callId) {
      return;
    }
    seenCallsRef.current.set(data.callId, now);

    isActingRef.current = false;
    setIsAccepting(false);
    setIsDeclining(false);

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
      receivedAt: now,
      isGroup: !!data.isGroup,
      groupId: data.groupId,
      groupName: data.groupName,
    });

    setIsRinging(true);
    ringtoneRef.current?.start();
    if (ringtoneRef.current?.isAutoplayBlocked) {
      setAutoplayBlocked(true);
    }

    // 60-second client-side auto-dismiss
    if (autoRejectTimerRef.current) {
      clearTimeout(autoRejectTimerRef.current);
    }
    autoRejectTimerRef.current = setTimeout(() => {
      stopCallAlert();
      setIncomingCall(null);
    }, 60000);
  }, [incomingCall, stopCallAlert]);

  const handleGroupIncoming = useCallback((data: any) => {
    if (!data?.callId) return;
    handleIncomingCallEvent({
      ...data,
      isGroup: true,
      callerId: data.callerId,
      callerName: data.callerName || "Colleague",
      callerAvatar: data.callerAvatar,
      groupName: data.groupName || "Group Meeting",
      groupId: data.groupId,
      callType: data.callType || "audio",
    });
  }, [handleIncomingCallEvent]);

  const handleCallCancelledEvent = useCallback((data: any) => {
    stopCallAlert();
    setIncomingCall((current) => {
      const targetId = data?.callId || data?.callSessionId;
      if (current && (!targetId || current.callId === targetId)) {
        toast.info(`Call from ${current.callerName} ended.`);
        return null;
      }
      return current;
    });
  }, [stopCallAlert]);

  const handleAnsweredElsewhere = useCallback((data: any) => {
    stopCallAlert();
    setIncomingCall((current) => {
      const targetId = data?.callId || data?.callSessionId;
      if (current && (!targetId || current.callId === targetId)) {
        toast.info("Call answered on another device.");
        return null;
      }
      return current;
    });
  }, [stopCallAlert]);

  // Server-authoritative, strictly idempotent Accept Call
  const acceptCall = useCallback(() => {
    if (isActingRef.current || !incomingCall) return;
    isActingRef.current = true;
    setIsAccepting(true);

    const call = incomingCall;
    stopCallAlert();
    setIncomingCall(null);

    const token = typeof window !== "undefined"
      ? (localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token"))
      : null;

    // Handle Group Call Acceptance
    if (call.isGroup) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hrms:global-group-call-accepted", {
            detail: call,
          })
        );

        const userRaw = localStorage.getItem("hrms_user");
        let prefix = "/tenant";
        if (userRaw) {
          try {
            const u = JSON.parse(userRaw);
            if (u.roles?.includes("hr_admin") || u.roles?.includes("admin")) {
              prefix = "/hr";
            } else if (u.roles?.includes("employee")) {
              prefix = "/me";
            }
          } catch {}
        }

        if (!window.location.pathname.includes("/chat")) {
          window.location.href = `${prefix}/chat?groupId=${encodeURIComponent(call.groupId || "")}&meetingCallId=${encodeURIComponent(call.callId)}&autoJoin=true`;
        }
      }
      return;
    }

    // Handle 1:1 or Mid-call Colleague Call Acceptance
    if (token) {
      fetch(`/api/calls/${encodeURIComponent(call.callId)}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});

      // Also call accept-invitation if this was an in-call mid-call invite
      fetch(`/api/calls/${encodeURIComponent(call.callId)}/accept-invitation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});
    }

    try {
      const socket = getSocketClient();
      if (socket) {
        socket.emit("call:accept", {
          callId: call.callId,
          targetUserId: call.callerId,
        });
      }
    } catch {}

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hrms:global-call-accepted", {
          detail: call,
        })
      );

      const userRaw = localStorage.getItem("hrms_user");
      let prefix = "/tenant";
      if (userRaw) {
        try {
          const u = JSON.parse(userRaw);
          if (u.roles?.includes("hr_admin") || u.roles?.includes("admin")) {
            prefix = "/hr";
          } else if (u.roles?.includes("employee")) {
            prefix = "/me";
          }
        } catch {}
      }

      if (!window.location.pathname.includes("/chat")) {
        window.location.href = `${prefix}/chat?callId=${encodeURIComponent(call.callId)}&autoAnswer=true`;
      }
    }
  }, [incomingCall, stopCallAlert]);

  // Server-authoritative, strictly idempotent Reject Call
  const rejectCall = useCallback((reason: string = "declined") => {
    if (isActingRef.current || !incomingCall) return;
    isActingRef.current = true;
    setIsDeclining(true);

    const call = incomingCall;
    stopCallAlert();
    setIncomingCall(null);

    const token = typeof window !== "undefined"
      ? (localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token"))
      : null;

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

    try {
      const socket = getSocketClient();
      if (socket) {
        if (call.isGroup) {
          socket.emit("group-call:leave", { callId: call.callId });
        } else {
          socket.emit("call:reject", {
            callId: call.callId,
            targetUserId: call.callerId,
            reason,
          });
        }
      }
    } catch {}
  }, [incomingCall, stopCallAlert]);

  const dismissCall = useCallback(() => {
    rejectCall("dismissed");
  }, [rejectCall]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let socket: any = null;
    const authToken = localStorage.getItem("hrms_auth_token");
    if (!isSocketDisabled() && authToken) {
      try {
        socket = getSocketClient();
        if (socket && !socket.connected) socket.connect();
        if (socket) {
          // 1:1 Call signaling
          socket.on("call:incoming", handleIncomingCallEvent);
          socket.on("call.incoming", handleIncomingCallEvent);
          socket.on("call:cancelled", handleCallCancelledEvent);
          socket.on("call.cancelled", handleCallCancelledEvent);
          socket.on("call:timeout", handleCallCancelledEvent);
          socket.on("call.timeout", handleCallCancelledEvent);
          socket.on("call:rejected", handleCallCancelledEvent);
          socket.on("call.rejected", handleCallCancelledEvent);
          socket.on("call.answered_elsewhere", handleAnsweredElsewhere);
          socket.on("call:answered_elsewhere", handleAnsweredElsewhere);
          socket.on("call:ended", handleCallCancelledEvent);
          socket.on("call.ended", handleCallCancelledEvent);
          socket.on("call:participant_joined", (data: any) => {
            const userRaw = localStorage.getItem("hrms_user");
            let cUserId = "";
            if (userRaw) {
              try { cUserId = JSON.parse(userRaw).id; } catch {}
            }
            if (data?.userId === cUserId || data?.participant?.userId === cUserId) {
              stopCallAlert();
              setIncomingCall(null);
            }
          });

          // Group Call signaling
          socket.on("group-call:incoming", handleGroupIncoming);
          socket.on("group-call.incoming", handleGroupIncoming);
          socket.on("group-call:ended", handleCallCancelledEvent);
          socket.on("group-call:user_left", (data: any) => {
            const userRaw = localStorage.getItem("hrms_user");
            let cUserId = "";
            if (userRaw) {
              try { cUserId = JSON.parse(userRaw).id; } catch {}
            }
            if (data?.userId === cUserId) {
              stopCallAlert();
              setIncomingCall(null);
            }
          });
          socket.on("group-call:user_joined", (data: any) => {
            const userRaw = localStorage.getItem("hrms_user");
            let cUserId = "";
            if (userRaw) {
              try { cUserId = JSON.parse(userRaw).id; } catch {}
            }
            if (data?.userId === cUserId) {
              stopCallAlert();
              setIncomingCall(null);
            }
          });
        }
      } catch (e) {
        console.warn("[IncomingCallProvider] Socket initialization error:", e);
      }
    }

    const handlePusherEvent = (event: Event) => {
      const { eventName, data } = (event as CustomEvent).detail || {};
      if (eventName === "call:incoming" || eventName === "call.incoming") handleIncomingCallEvent(data);
      if (eventName === "group-call:incoming" || eventName === "group-call.incoming") handleGroupIncoming(data);
      if (
        eventName === "call:cancelled" ||
        eventName === "call.cancelled" ||
        eventName === "call:timeout" ||
        eventName === "call.timeout" ||
        eventName === "call:rejected" ||
        eventName === "call.rejected" ||
        eventName === "call:ended" ||
        eventName === "call.ended" ||
        eventName === "group-call:ended"
      ) {
        handleCallCancelledEvent(data);
      }
      if (eventName === "call:accepted" || eventName === "call.accepted" || eventName === "call.answered_elsewhere" || eventName === "call:answered_elsewhere") {
        handleAnsweredElsewhere(data);
      }
    };
    window.addEventListener("hrms:pusher", handlePusherEvent);

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "CALL_INCOMING") handleIncomingCallEvent(data.payload);
      if (data.type === "CALL_CANCELLED") handleCallCancelledEvent(data.payload);
      if (data.type === "CALL_ACCEPTED_ON_DEVICE") {
        acceptCall();
      }
      if (data.type === "CALL_DECLINED_ON_DEVICE") {
        rejectCall("declined_via_notification");
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    return () => {
      if (socket) {
        socket.off("call:incoming", handleIncomingCallEvent);
        socket.off("call.incoming", handleIncomingCallEvent);
        socket.off("call:cancelled", handleCallCancelledEvent);
        socket.off("call.cancelled", handleCallCancelledEvent);
        socket.off("call:timeout", handleCallCancelledEvent);
        socket.off("call.timeout", handleCallCancelledEvent);
        socket.off("call:rejected", handleCallCancelledEvent);
        socket.off("call.rejected", handleCallCancelledEvent);
        socket.off("call.answered_elsewhere", handleAnsweredElsewhere);
        socket.off("call:answered_elsewhere", handleAnsweredElsewhere);
        socket.off("call:ended", handleCallCancelledEvent);
        socket.off("call.ended", handleCallCancelledEvent);
        socket.off("group-call:incoming", handleGroupIncoming);
        socket.off("group-call.incoming", handleGroupIncoming);
        socket.off("group-call:ended", handleCallCancelledEvent);
      }
      window.removeEventListener("hrms:pusher", handlePusherEvent);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, [handleIncomingCallEvent, handleGroupIncoming, handleCallCancelledEvent, handleAnsweredElsewhere, stopCallAlert, acceptCall, rejectCall]);

  const checkPendingCall = useCallback(async () => {
    const token = typeof window !== "undefined"
      ? (localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token"))
      : null;
    if (!token) return;

    try {
      const res = await fetch("/api/calls/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.success && body?.hasPendingCall && body?.data) {
          handleIncomingCallEvent(body.data);
        } else if (body?.success && !body?.hasPendingCall && incomingCall) {
          stopCallAlert();
          setIncomingCall(null);
        }
      }
    } catch {}
  }, [handleIncomingCallEvent, incomingCall, stopCallAlert]);

  useEffect(() => {
    checkPendingCall();
    const handleFocus = () => checkPendingCall();
    const handleOnline = () => checkPendingCall();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkPendingCall]);

  return (
    <IncomingCallContext.Provider
      value={{
        incomingCall,
        isRinging,
        autoplayBlocked,
        unlockAudio,
        isAccepting,
        isDeclining,
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

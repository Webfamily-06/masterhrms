"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { getSocketClient, isSocketDisabled } from "@/lib/socket";
import { api, getAuthToken } from "@/lib/api";
import { initFirebaseMessagingIfConfigured } from "@/lib/firebase";
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
  isAdditionalParticipant?: boolean;
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
  enablePushNotifications: (silentOrEvent?: boolean | React.SyntheticEvent) => Promise<boolean>;
}

export const IncomingCallContext = createContext<IncomingCallContextValue | null>(null);

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
  const actedCallsRef = useRef<Set<string>>(new Set());
  const incomingCallRef = useRef<IncomingCallInfo | null>(null);
  const isActingRef = useRef<boolean>(false);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

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

  const enablePushNotifications = useCallback(async (silentOrEvent?: boolean | React.SyntheticEvent): Promise<boolean> => {
    const isSilent = silentOrEvent === true;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      if (!isSilent) toast.error("Web Push is not supported in this browser.");
      return false;
    }

    try {
      let permission: NotificationPermission =
        "Notification" in window ? Notification.permission : "denied";
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      setPushPermission(permission);
      if (permission !== "granted") {
        if (!isSilent) toast.warning("Push notifications permission was denied.");
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      initFirebaseMessagingIfConfigured(reg).catch(() => {});

      const token = getAuthToken();
      if (!token) {
        if (!isSilent) toast.error("You must be logged in to enable call notifications.");
        return false;
      }

      const statusData = await api.get<any>("/notifications/push/status");
      const vapidKey = statusData?.data?.vapidPublicKey || statusData?.vapidPublicKey;
      if (!vapidKey) {
        throw new Error(statusData?.error || "Failed to retrieve VAPID public key");
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      let sub = await reg.pushManager.getSubscription();
      // Re-subscribe when the server VAPID key rotated / was corrected, otherwise the push service
      // rejects every delivery for the stale subscription and OS notifications silently stop.
      if (sub) {
        try {
          const existingKey = sub.options?.applicationServerKey;
          if (existingKey) {
            const bytes = new Uint8Array(existingKey as ArrayBuffer);
            let bin = "";
            bytes.forEach((b) => (bin += String.fromCharCode(b)));
            const existingB64 = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            const serverB64 = String(vapidKey).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            if (existingB64 !== serverB64) {
              await sub.unsubscribe().catch(() => {});
              sub = null;
            }
          }
        } catch {}
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      const subJson = sub.toJSON();
      const saveData = await api.post<any>("/notifications/push/subscribe", {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });

      if (saveData?.success !== false) {
        setIsSubscribedToPush(true);
        if (!isSilent) toast.success("Device notifications enabled!");
        return true;
      }
      return false;
    } catch (err: any) {
      if (!isSilent) {
        console.error("[IncomingCallProvider] Push subscription error:", err);
        toast.error(err.message || "Failed to enable notifications");
      }
      return false;
    }
  }, []);

  // Always auto-register /sw.js, initialize Firebase Messaging if configured, and sync Web Push subscription
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cleanupGestureListener: (() => void) | null = null;

    const registerAndSyncPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        initFirebaseMessagingIfConfigured(reg).catch(() => {});

        const existingSub = await reg.pushManager.getSubscription();
        setIsSubscribedToPush(!!existingSub);

        const token = getAuthToken();
        if (!token || !("Notification" in window)) return;

        setPushPermission(Notification.permission);
        if (Notification.permission === "granted") {
          await enablePushNotifications(true).catch(() => {});
        } else if (
          Notification.permission === "default" &&
          !sessionStorage.getItem("hrms_notif_prompted")
        ) {
          let prompting = false;
          const detachListeners = () => {
            window.removeEventListener("click", onFirstInteraction);
            window.removeEventListener("touchend", onFirstInteraction);
            window.removeEventListener("keydown", onFirstInteraction);
          };
          const onFirstInteraction = () => {
            if (prompting || sessionStorage.getItem("hrms_notif_prompted")) return;
            prompting = true;
            // Mobile Chrome & iOS Safari require transient user activation (click/touchend/keydown, NOT pointerdown)
            Notification.requestPermission()
              .then((perm) => {
                setPushPermission(perm);
                if (perm === "granted" || perm === "denied") {
                  sessionStorage.setItem("hrms_notif_prompted", "1");
                  detachListeners();
                }
                if (perm === "granted") {
                  enablePushNotifications(true).catch(() => {});
                }
              })
              .catch(() => {})
              .finally(() => {
                prompting = false;
              });
          };
          window.addEventListener("click", onFirstInteraction, { passive: true });
          window.addEventListener("touchend", onFirstInteraction, { passive: true });
          window.addEventListener("keydown", onFirstInteraction);
          cleanupGestureListener = detachListeners;
        }
      } catch (err) {
        console.warn("[IncomingCallContext] Service worker registration/sync warning:", err);
      }
    };

    registerAndSyncPush();
    const onAuthChanged = () => registerAndSyncPush();
    window.addEventListener("auth-token-changed", onAuthChanged);

    return () => {
      window.removeEventListener("auth-token-changed", onAuthChanged);
      if (cleanupGestureListener) cleanupGestureListener();
    };
  }, [enablePushNotifications]);

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

    // Defer group meeting modal to UnifiedChatApp when mounted on the Chat page (which renders IncomingGroupMeetingDialog),
    // while keeping FullScreenIncomingCall active for all 1:1 and mid-call colleague invites!
    if (data.isGroup && typeof window !== "undefined" && (window as any).__HRMS_CHAT_APP_MOUNTED__) {
      return;
    }

    // DEVICE-LEVEL SESSION SECURITY: Validate active authentication on this device
    const token = getAuthToken();
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

    // 2. DEDUPLICATION & ACTED-UPON GUARD: Never re-open a call that was already accepted/declined/ended or seen within 30s
    const now = Date.now();
    const lastSeen = seenCallsRef.current.get(data.callId);
    if (actedCallsRef.current.has(data.callId) || (lastSeen && now - lastSeen < 30000)) {
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
      isAdditionalParticipant: Boolean(data.isAdditionalParticipant),
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
  }, [stopCallAlert]);

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
    const targetId = data?.callId || data?.callSessionId;
    if (targetId) {
      actedCallsRef.current.add(targetId);
    }
    stopCallAlert();
    setIncomingCall((current) => {
      if (current && (!targetId || current.callId === targetId)) {
        actedCallsRef.current.add(current.callId);
        toast.info(`Call from ${current.callerName} ended.`);
        return null;
      }
      return current;
    });
  }, [stopCallAlert]);

  const handleAnsweredElsewhere = useCallback((data: any) => {
    const targetId = data?.callId || data?.callSessionId;
    if (targetId) {
      actedCallsRef.current.add(targetId);
    }
    stopCallAlert();
    setIncomingCall((current) => {
      if (current && (!targetId || current.callId === targetId)) {
        actedCallsRef.current.add(current.callId);
        toast.info("Call answered on another device.");
        return null;
      }
      return current;
    });
  }, [stopCallAlert]);

  // Coordinate call acceptance: DO NOT emit server `call:accept` BEFORE UnifiedChatApp prepares RTCPeerConnection!
  // Otherwise, the caller sends the SDP offer before the callee's RTCPeerConnection is mounted, causing dropped audio/video.
  const acceptCall = useCallback(() => {
    if (isActingRef.current || !incomingCall) return;
    isActingRef.current = true;
    setIsAccepting(true);

    const call = incomingCall;
    actedCallsRef.current.add(call.callId);
    stopCallAlert();
    setIncomingCall(null);

    if (typeof window === "undefined") return;

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

    // Handle Group Call Acceptance
    if (call.isGroup) {
      (window as any).__HRMS_PENDING_ACCEPTED_GROUP_CALL__ = call;
      window.dispatchEvent(
        new CustomEvent("hrms:global-group-call-accepted", {
          detail: call,
        })
      );

      if (!window.location.pathname.includes("/chat")) {
        window.location.href = `${prefix}/chat?groupId=${encodeURIComponent(call.groupId || "")}&meetingCallId=${encodeURIComponent(call.callId)}&autoJoin=true`;
      }
      return;
    }

    // Handle 1:1 or Mid-call Colleague Call Acceptance:
    // Store pending call on window (in case we navigate to /chat) AND dispatch event for mounted UnifiedChatApp.
    // UnifiedChatApp creates RTCPeerConnection + local tracks FIRST and then emits call:accept / POST /calls/:id/accept.
    (window as any).__HRMS_PENDING_ACCEPTED_CALL__ = call;
    window.dispatchEvent(
      new CustomEvent("hrms:global-call-accepted", {
        detail: call,
      })
    );

    if (!window.location.pathname.includes("/chat")) {
      window.location.href = `${prefix}/chat?callId=${encodeURIComponent(call.callId)}&autoAnswer=true`;
    }
  }, [incomingCall, stopCallAlert]);

  // Server-authoritative, strictly idempotent Reject Call
  const rejectCall = useCallback((reason: string = "declined") => {
    if (isActingRef.current || !incomingCall) return;
    isActingRef.current = true;
    setIsDeclining(true);

    const call = incomingCall;
    actedCallsRef.current.add(call.callId);
    stopCallAlert();
    setIncomingCall(null);

    const token = getAuthToken();
    if (token) {
      api.post(`/calls/${encodeURIComponent(call.callId)}/reject`, { reason }).catch(() => {});
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
    const authToken = getAuthToken();
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

    const handleSwMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "CALL_INCOMING" || data.type === "CALL_INCOMING_PUSH") {
        handleIncomingCallEvent(data.payload || data);
      }
      if (data.type === "CALL_CANCELLED" || data.type === "CALL_CANCELLED_PUSH") {
        handleCallCancelledEvent(data.payload || data);
      }
      if (data.type === "CALL_ACCEPTED_ON_DEVICE") {
        const callPayload = data.payload || incomingCallRef.current;
        if (callPayload && !incomingCallRef.current) {
          handleIncomingCallEvent(callPayload);
        }
        // Verify microphone & camera access BEFORE accepting from notification (Item 4)
        const activeCall = incomingCallRef.current || callPayload;
        if (activeCall) {
          const isVid = String(activeCall.callType || "audio").toLowerCase() === "video";
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: isVid,
            });
            (window as any).__HRMS_VERIFIED_CALLEE_STREAM__ = {
              callId: activeCall.callId,
              stream,
              createdAt: Date.now(),
            };
            if (!(window as any).__HRMS_ACTIVE_MEDIA_STREAMS__) {
              (window as any).__HRMS_ACTIVE_MEDIA_STREAMS__ = new Set();
            }
            (window as any).__HRMS_ACTIVE_MEDIA_STREAMS__.add(stream);
            acceptCall();
          } catch {
            toast.error(
              isVid
                ? "Please allow Camera and Microphone permissions to answer the video call."
                : "Please allow Microphone permission to answer the audio call."
            );
          }
        }
      }
      if (data.type === "CALL_DECLINED_ON_DEVICE" || data.type === "CALL_ACTION_REJECT") {
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
    const token = getAuthToken();
    if (!token) return;

    try {
      const body = await api.get<any>("/calls/pending");
      if (body?.success && body?.hasPendingCall && body?.data) {
        handleIncomingCallEvent(body.data);
      } else if (body?.success && !body?.hasPendingCall && incomingCallRef.current) {
        stopCallAlert();
        setIncomingCall(null);
      }
    } catch {}
  }, [handleIncomingCallEvent, stopCallAlert]);

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

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Maximize2, Video, VideoOff, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ActiveCallState {
  callId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: "audio" | "video";
  status: "connected" | "connecting" | "ringing";
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimized: boolean;
}

export function FloatingMiniCallWidget() {
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [isOnChatPage, setIsOnChatPage] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Monitor current route path to determine if full chat screen is visible
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkRoute = () => {
      setIsOnChatPage(window.location.pathname.includes("/chat"));
    };

    checkRoute();
    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);

    // Periodic check in case SPA router transitions without full page reload
    const interval = setInterval(checkRoute, 500);

    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
      clearInterval(interval);
    };
  }, []);

  // Listen to active call events across SPA route transitions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCallStart = (e: any) => {
      const data = e.detail;
      if (!data?.callId) return;
      setActiveCall({
        callId: data.callId,
        callerName: data.callerName || "Colleague",
        callerAvatar: data.callerAvatar || null,
        callType: data.callType || "audio",
        status: data.status || "connected",
        durationSeconds: data.durationSeconds || 0,
        isMuted: !!data.isMuted,
        isVideoOff: !!data.isVideoOff,
        isMinimized: !!data.isMinimized,
      });
    };

    const handleCallUpdate = (e: any) => {
      const data = e.detail;
      if (!data) return;
      setActiveCall((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          durationSeconds: typeof data.durationSeconds === "number" ? data.durationSeconds : prev.durationSeconds,
          isMuted: typeof data.isMuted === "boolean" ? data.isMuted : prev.isMuted,
          isVideoOff: typeof data.isVideoOff === "boolean" ? data.isVideoOff : prev.isVideoOff,
          isMinimized: typeof data.isMinimized === "boolean" ? data.isMinimized : prev.isMinimized,
          status: data.status || prev.status,
        };
      });
    };

    const handleCallEnd = () => {
      setActiveCall(null);
    };

    window.addEventListener("hrms:active-call-start", handleCallStart);
    window.addEventListener("hrms:active-call-update", handleCallUpdate);
    window.addEventListener("hrms:active-call-end", handleCallEnd);

    // Sync media stream if attached to window.__HRMS_REMOTE_STREAM__
    const streamSync = setInterval(() => {
      const remoteStream = (window as any).__HRMS_REMOTE_STREAM__;
      if (videoRef.current && remoteStream && videoRef.current.srcObject !== remoteStream) {
        videoRef.current.srcObject = remoteStream;
      }
    }, 1000);

    return () => {
      window.removeEventListener("hrms:active-call-start", handleCallStart);
      window.removeEventListener("hrms:active-call-update", handleCallUpdate);
      window.removeEventListener("hrms:active-call-end", handleCallEnd);
      clearInterval(streamSync);
    };
  }, []);

  // Increment duration timer if active call is running outside chat page
  useEffect(() => {
    if (!activeCall || activeCall.status !== "connected") return;
    const timer = setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  const handleToggleMute = useCallback(() => {
    if (!activeCall) return;
    const newMute = !activeCall.isMuted;
    setActiveCall((prev) => (prev ? { ...prev, isMuted: newMute } : null));
    window.dispatchEvent(new CustomEvent("hrms:active-call-toggle-mute", { detail: { isMuted: newMute } }));
  }, [activeCall]);

  const handleMaximize = useCallback(() => {
    if (typeof window === "undefined" || !activeCall) return;
    setActiveCall((prev) => (prev ? { ...prev, isMinimized: false } : null));
    window.dispatchEvent(new CustomEvent("hrms:active-call-maximize", { detail: activeCall }));

    if (!window.location.pathname.includes("/chat")) {
      window.location.href = `/chat?callId=${encodeURIComponent(activeCall.callId)}`;
    }
  }, [activeCall]);

  const handleEndCall = useCallback(() => {
    if (!activeCall) return;
    const callId = activeCall.callId;
    setActiveCall(null);

    // Notify backend and WebRTC coordinator
    window.dispatchEvent(new CustomEvent("hrms:active-call-hangup", { detail: { callId } }));
    const token = localStorage.getItem("hrms_auth_token") || localStorage.getItem("auth_token") || localStorage.getItem("token");
    if (token) {
      fetch(`/api/calls/${encodeURIComponent(callId)}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});
    }
  }, [activeCall]);

  // Mobile & Desktop Native Picture-in-Picture Trigger
  const handleToggleNativePiP = useCallback(async () => {
    if (typeof window === "undefined") return;

    // 1. Desktop Chromium Document Picture-in-Picture
    if ("documentPictureInPicture" in window && (window as any).documentPictureInPicture?.requestWindow) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 320,
          height: 220,
        });

        // Copy styles to Document PiP window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
            const style = document.createElement("style");
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch {}
        });

        const container = pipWindow.document.createElement("div");
        container.className = "p-4 bg-slate-900 text-white flex flex-col items-center justify-between h-full font-sans";
        container.innerHTML = `
          <div style="font-weight: bold; font-size: 14px;">${activeCall?.callerName || "Call"}</div>
          <div style="color: #10b981; font-family: monospace; font-size: 12px; margin-top: 4px;">In Call</div>
        `;
        pipWindow.document.body.appendChild(container);
        return;
      } catch (e) {
        console.warn("[FloatingMiniCall] Document PiP request failed, falling back to Video/In-App PiP:", e);
      }
    }

    // 2. HTMLVideoElement PiP (Android Chrome & iOS Safari video track)
    if (videoRef.current && "requestPictureInPicture" in videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
        return;
      } catch (e) {
        console.warn("[FloatingMiniCall] Video element PiP failed:", e);
      }
    }
  }, [activeCall]);

  // Determine visibility: Show floating widget when call is active AND (user is NOT on /chat OR isMinimized is true)
  const shouldShow = activeCall && (!isOnChatPage || activeCall.isMinimized);
  if (!shouldShow) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isVideo = activeCall.callType === "video";
  const initials = activeCall.callerName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      aria-label="Active Call Floating Overlay"
      data-testid="floating-pip-widget"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99990] bg-slate-950/95 backdrop-blur-xl text-white border border-slate-800/80 rounded-2xl p-3 shadow-2xl max-w-[calc(100vw-32px)] sm:max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-200 select-none"
    >
      {isVideo ? (
        <div className="flex flex-col gap-2.5">
          {/* Video Container */}
          <div className="relative w-56 sm:w-64 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {activeCall.isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-1.5 text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
                  {initials}
                </div>
                <span className="text-[11px] text-slate-300 font-medium truncate max-w-[140px]">
                  {activeCall.callerName}
                </span>
              </div>
            )}
            {/* Header chip on video */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatTime(activeCall.durationSeconds)}</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 pr-1">
              <p className="text-xs font-semibold truncate max-w-[110px] text-white">
                {activeCall.callerName}
              </p>
              <p className="text-[10px] text-slate-400">Video Call</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                data-testid="pip-btn-mute"
                className={`w-7 h-7 rounded-full transition-colors ${
                  activeCall.isMuted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
                onClick={handleToggleMute}
                title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {activeCall.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                data-testid="pip-btn-native-pip"
                className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={handleToggleNativePiP}
                title="Picture-in-Picture window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                data-testid="pip-btn-maximize"
                className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
                onClick={handleMaximize}
                title="Maximize Call Window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                data-testid="pip-btn-hangup"
                className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white"
                onClick={handleEndCall}
                title="End Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Audio Mini Card */
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>

          <div className="min-w-0 pr-1">
            <p className="text-xs font-semibold truncate max-w-[120px] text-white">
              {activeCall.callerName}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{formatTime(activeCall.durationSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
            <Button
              variant="ghost"
              size="icon"
              data-testid="pip-btn-mute"
              className={`w-7 h-7 rounded-full transition-colors ${
                activeCall.isMuted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
              onClick={handleToggleMute}
              title={activeCall.isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {activeCall.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              data-testid="pip-btn-maximize"
              className="w-7 h-7 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={handleMaximize}
              title="Maximize Call Window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              data-testid="pip-btn-hangup"
              className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white"
              onClick={handleEndCall}
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}

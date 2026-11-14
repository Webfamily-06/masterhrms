import React, { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Maximize2, ExternalLink, GripHorizontal, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSocketClient, isSocketDisabled } from "@/lib/socket";

export interface ActiveCallState {
  callId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: "audio" | "video";
  status: "connected" | "connecting" | "calling" | "ringing";
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isMinimized: boolean;
  isOnHold?: boolean;
  remoteIsOnHold?: boolean;
  remoteHoldByName?: string | null;
}

export function FloatingMiniCallWidget() {
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [isOnChatPage, setIsOnChatPage] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const widgetRef = useRef<HTMLElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipTimerRef = useRef<any>(null);

  // Monitor current route path to determine if full chat screen is mounted
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkRoute = () => {
      setIsOnChatPage(
        window.location.pathname.includes("/chat") && Boolean((window as any).__HRMS_CHAT_APP_MOUNTED__)
      );
    };

    checkRoute();
    window.addEventListener("popstate", checkRoute);
    window.addEventListener("hashchange", checkRoute);

    const interval = setInterval(checkRoute, 400);

    return () => {
      window.removeEventListener("popstate", checkRoute);
      window.removeEventListener("hashchange", checkRoute);
      clearInterval(interval);
    };
  }, []);

  // Listen to active call events across SPA route transitions
  useEffect(() => {
    if (typeof window === "undefined") return;

    const upsertFromEvent = (e: any) => {
      const data = e?.detail;
      if (!data) return;
      setActiveCall((prev) => {
        if (!prev && !data.callId) return null;
        return {
          callId: data.callId || prev?.callId || "",
          callerName: data.callerName || prev?.callerName || "Colleague",
          callerAvatar: data.callerAvatar !== undefined ? data.callerAvatar : prev?.callerAvatar || null,
          callType: data.callType || prev?.callType || "audio",
          status: data.status || prev?.status || "connected",
          durationSeconds:
            typeof data.durationSeconds === "number" ? data.durationSeconds : prev?.durationSeconds || 0,
          isMuted: typeof data.isMuted === "boolean" ? data.isMuted : Boolean(prev?.isMuted),
          isVideoOff: typeof data.isVideoOff === "boolean" ? data.isVideoOff : Boolean(prev?.isVideoOff),
          isMinimized: typeof data.isMinimized === "boolean" ? data.isMinimized : Boolean(prev?.isMinimized),
          isOnHold: typeof data.isOnHold === "boolean" ? data.isOnHold : Boolean(prev?.isOnHold),
          remoteIsOnHold:
            typeof data.remoteIsOnHold === "boolean" ? data.remoteIsOnHold : Boolean(prev?.remoteIsOnHold),
          remoteHoldByName:
            data.remoteHoldByName !== undefined ? data.remoteHoldByName : prev?.remoteHoldByName || null,
        };
      });
    };

    const handleCallEnd = () => {
      setActiveCall(null);
      if (pipTimerRef.current) {
        clearInterval(pipTimerRef.current);
        pipTimerRef.current = null;
      }
      if (typeof document !== "undefined" && document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };

    // Hydrate immediately if an active call snapshot was already published on window
    if ((window as any).__HRMS_ACTIVE_CALL_SNAPSHOT__?.callId) {
      upsertFromEvent({ detail: (window as any).__HRMS_ACTIVE_CALL_SNAPSHOT__ });
    }

    window.addEventListener("hrms:active-call-start", upsertFromEvent);
    window.addEventListener("hrms:active-call-update", upsertFromEvent);
    window.addEventListener("hrms:active-call-end", handleCallEnd);

    // Sync media stream if attached to window.__HRMS_REMOTE_STREAM__
    const streamSync = setInterval(() => {
      const remoteStream = (window as any).__HRMS_REMOTE_STREAM__ as MediaStream | null | undefined;
      if (videoRef.current && remoteStream && videoRef.current.srcObject !== remoteStream) {
        videoRef.current.srcObject = remoteStream;
        videoRef.current.play?.().catch?.(() => {});
      }
      if (audioRef.current && remoteStream && audioRef.current.srcObject !== remoteStream) {
        audioRef.current.srcObject = remoteStream;
        audioRef.current.muted = false;
        audioRef.current.play?.().catch?.(() => {});
      }
    }, 600);

    return () => {
      window.removeEventListener("hrms:active-call-start", upsertFromEvent);
      window.removeEventListener("hrms:active-call-update", upsertFromEvent);
      window.removeEventListener("hrms:active-call-end", handleCallEnd);
      clearInterval(streamSync);
    };
  }, []);

  // Increment duration timer if active call is running outside chat page
  useEffect(() => {
    if (!activeCall || activeCall.status !== "connected" || isOnChatPage) return;
    const timer = setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeCall?.status, isOnChatPage]);

  // Clamp draggable position on viewport resize
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      setDragPos((prev) => {
        if (!prev) return null;
        const rect = widgetRef.current?.getBoundingClientRect();
        const w = rect?.width || 280;
        const h = rect?.height || 120;
        return {
          x: Math.max(8, Math.min(window.innerWidth - w - 8, prev.x)),
          y: Math.max(8, Math.min(window.innerHeight - h - 8, prev.y)),
        };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    const el = widgetRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: dragPos ? dragPos.x : rect.left,
      originY: dragPos ? dragPos.y : rect.top,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const st = dragStateRef.current;
    if (!st || st.pointerId !== e.pointerId) return;
    const el = widgetRef.current;
    const w = el?.offsetWidth || 260;
    const h = el?.offsetHeight || 96;
    const nextX = Math.max(8, Math.min(window.innerWidth - w - 8, st.originX + (e.clientX - st.startX)));
    const nextY = Math.max(8, Math.min(window.innerHeight - h - 8, st.originY + (e.clientY - st.startY)));
    setDragPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (dragStateRef.current?.pointerId === e.pointerId) {
      dragStateRef.current = null;
      try {
        widgetRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

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
      let prefix = "/tenant";
      try {
        const userRaw = localStorage.getItem("hrms_user");
        if (userRaw) {
          const u = JSON.parse(userRaw);
          if (u.roles?.includes("hr_admin") || u.roles?.includes("admin")) {
            prefix = "/hr";
          } else if (u.roles?.includes("employee")) {
            prefix = "/me";
          }
        }
      } catch {}
      window.location.href = `${prefix}/chat?callId=${encodeURIComponent(activeCall.callId)}`;
    }
  }, [activeCall]);

  const handleEndCall = useCallback(() => {
    if (!activeCall) return;
    const callId = activeCall.callId;
    const wasConnected = activeCall.status === "connected" || activeCall.durationSeconds > 0;
    setActiveCall(null);
    if (typeof window !== "undefined") {
      (window as any).__HRMS_ACTIVE_CALL_SNAPSHOT__ = null;
    }

    window.dispatchEvent(new CustomEvent("hrms:active-call-hangup", { detail: { callId } }));
    try {
      if (!isSocketDisabled()) {
        const socket = getSocketClient();
        if (socket) {
          socket.emit(wasConnected ? "call:hangup" : "call:cancel", { callId });
        }
      }
    } catch {}
    const token =
      localStorage.getItem("hrms_auth_token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token");
    if (token) {
      const endpoint = wasConnected ? "end" : "cancel";
      fetch(`/api/calls/${encodeURIComponent(callId)}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ durationSeconds: activeCall.durationSeconds || 0 }),
      }).catch(() => {});
    }
  }, [activeCall]);

  // Cross-Tab & Outside-App Native OS Picture-in-Picture Trigger (Video & Audio Calls)
  const handleToggleNativePiP = useCallback(async () => {
    if (typeof window === "undefined" || !activeCall) return;

    // Delegate to UnifiedChatApp's rich OS PiP controller if mounted
    if (typeof (window as any).__HRMS_TOGGLE_OS_PIP__ === "function") {
      await (window as any).__HRMS_TOGGLE_OS_PIP__();
      return;
    }

    // 1. Toggle off if already in Picture-in-Picture
    const docPip = (window as any).documentPictureInPicture;
    if (docPip?.window) {
      try {
        docPip.window.close();
      } catch {}
      return;
    }
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
      return;
    }

    // 2. Desktop Chromium Document Picture-in-Picture (works across tabs & outside browser)
    if (docPip?.requestWindow) {
      try {
        const pipWindow = await docPip.requestWindow({ width: 320, height: 220 });
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.background = "#020617";
        pipWindow.document.body.style.color = "#f8fafc";
        pipWindow.document.body.style.fontFamily = "system-ui, -apple-system, sans-serif";
        const wrap = pipWindow.document.createElement("div");
        wrap.style.cssText =
          "display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:100vh;padding:14px;box-sizing:border-box;background:#0f172a;";
        const titleEl = pipWindow.document.createElement("div");
        titleEl.style.cssText = "font-weight:700;font-size:14px;text-align:center;";
        titleEl.textContent = activeCall.callerName || "MasterHRMS Call";
        const subEl = pipWindow.document.createElement("div");
        subEl.style.cssText = "font-family:monospace;font-size:12px;color:#34d399;";
        subEl.textContent = activeCall.remoteIsOnHold
          ? "On Hold"
          : `${activeCall.callType === "video" ? "Video" : "Audio"} Call Active`;
        const row = pipWindow.document.createElement("div");
        row.style.cssText = "display:flex;gap:10px;";
        const endBtn = pipWindow.document.createElement("button");
        endBtn.textContent = "End Call";
        endBtn.style.cssText =
          "background:#e11d48;color:#fff;border:none;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;";
        endBtn.onclick = () => {
          handleEndCall();
          pipWindow.close();
        };
        row.appendChild(endBtn);
        wrap.appendChild(titleEl);
        wrap.appendChild(subEl);
        wrap.appendChild(row);
        pipWindow.document.body.appendChild(wrap);
        return;
      } catch {}
    }

    // 3. HTMLVideoElement PiP (live video OR dynamic canvas stream for Audio Calls!)
    const remoteStream = (window as any).__HRMS_REMOTE_STREAM__ as MediaStream | null | undefined;
    const hasLiveVideo =
      videoRef.current &&
      remoteStream &&
      remoteStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");

    if (hasLiveVideo && videoRef.current) {
      const v = videoRef.current as any;
      if (typeof v.requestPictureInPicture === "function") {
        await v.requestPictureInPicture().catch(() => {});
        return;
      }
      if (typeof v.webkitSetPresentationMode === "function") {
        v.webkitSetPresentationMode("picture-in-picture");
        return;
      }
    }

    // Canvas-backed <video> stream so Audio Calls (and camera-off calls) also pop out into OS PiP!
    try {
      let canvas = pipCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = 360;
        canvas.height = 200;
        pipCanvasRef.current = canvas;
      }
      const drawFrame = () => {
        const ctx = canvas!.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, canvas!.width, canvas!.height);
        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.arc(180, 74, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const init = (activeCall.callerName || "C").slice(0, 2).toUpperCase();
        ctx.fillText(init, 180, 74);
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.fillText(activeCall.callerName || "Colleague", 180, 134);
        ctx.fillStyle = activeCall.remoteIsOnHold || activeCall.isOnHold ? "#f59e0b" : "#34d399";
        ctx.font = "13px monospace";
        ctx.fillText(
          activeCall.remoteIsOnHold || activeCall.isOnHold ? "Call On Hold" : "Active Call • MasterHRMS",
          180,
          162
        );
      };
      drawFrame();
      if (pipTimerRef.current) clearInterval(pipTimerRef.current);
      pipTimerRef.current = setInterval(drawFrame, 1000);

      let pipVid = pipVideoRef.current;
      if (!pipVid) {
        pipVid = document.createElement("video");
        pipVid.muted = true;
        pipVid.playsInline = true;
        pipVid.autoplay = true;
        pipVid.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;right:0;";
        document.body.appendChild(pipVid);
        pipVideoRef.current = pipVid;
      }
      const cStream = (canvas as any).captureStream ? (canvas as any).captureStream(5) : null;
      if (cStream) {
        pipVid.srcObject = cStream;
        await pipVid.play().catch(() => {});
        if (typeof (pipVid as any).requestPictureInPicture === "function") {
          await (pipVid as any).requestPictureInPicture();
        } else if (typeof (pipVid as any).webkitSetPresentationMode === "function") {
          (pipVid as any).webkitSetPresentationMode("picture-in-picture");
        }
      }
    } catch (err) {
      console.warn("[FloatingMiniCall] Canvas OS PiP fallback warning:", err);
    }
  }, [activeCall, handleEndCall]);

  // Only render FloatingMiniCallWidget when NOT on the mounted Chat page (UnifiedChatApp renders its own draggable PiP on /chat)
  const shouldShow = Boolean(activeCall && !isOnChatPage);
  if (!shouldShow || !activeCall) return null;

  const formatTime = (secs: number) => {
    const safe = Number.isFinite(secs) && secs > 0 ? Math.floor(secs) : 0;
    const m = Math.floor(safe / 60);
    const s = safe % 60;
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
      ref={widgetRef}
      aria-label="Active Call Floating Overlay"
      data-testid="floating-pip-widget"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={
        dragPos
          ? { left: `${dragPos.x}px`, top: `${dragPos.y}px`, right: "auto", bottom: "auto", touchAction: "none" }
          : { touchAction: "none" }
      }
      className={`fixed ${
        dragPos ? "" : "bottom-4 right-4 sm:bottom-6 sm:right-6"
      } z-[99990] bg-slate-950/95 backdrop-blur-xl text-white border border-slate-800/80 rounded-2xl p-3 shadow-2xl max-w-[calc(100vw-16px)] sm:max-w-xs select-none cursor-grab active:cursor-grabbing`}
    >
      {/* Keep remote audio alive across non-chat HRMS routes */}
      <audio ref={audioRef} autoPlay playsInline className="sr-only pointer-events-none" />

      {/* Drag Grip Indicator */}
      <div className="flex items-center justify-center -mt-1.5 mb-1 text-slate-500">
        <GripHorizontal className="w-4 h-3.5" />
      </div>

      {(activeCall.remoteIsOnHold || activeCall.isOnHold) && (
        <div className="mb-2 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center justify-center gap-1">
          <Pause className="w-3 h-3" />
          <span>
            {activeCall.remoteIsOnHold
              ? `${activeCall.remoteHoldByName || activeCall.callerName} put call on hold`
              : "Call On Hold"}
          </span>
        </div>
      )}

      {isVideo ? (
        <div className="flex flex-col gap-2.5">
          {/* Video Container */}
          <div className="relative w-56 sm:w-64 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover pointer-events-none"
            />
            {activeCall.isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 gap-1.5 text-center">
                {activeCall.callerAvatar ? (
                  <img
                    src={activeCall.callerAvatar}
                    alt={activeCall.callerName}
                    className="w-10 h-10 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white">
                    {initials}
                  </div>
                )}
                <span className="text-[11px] text-slate-300 font-medium truncate max-w-[140px]">
                  {activeCall.callerName}
                </span>
              </div>
            )}
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
              <p className="text-[10px] text-slate-400">Drag to move • Video Call</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                data-testid="pip-btn-mute"
                className={`w-7 h-7 rounded-full transition-colors ${
                  activeCall.isMuted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
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
                title="Pop out OS Picture-in-Picture window (works across tabs & apps)"
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
            {activeCall.callerAvatar ? (
              <img
                src={activeCall.callerAvatar}
                alt={activeCall.callerName}
                className="w-10 h-10 rounded-full object-cover shadow-md pointer-events-none"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>

          <div className="min-w-0 pr-1">
            <p className="text-xs font-semibold truncate max-w-[110px] text-white">
              {activeCall.callerName}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>{formatTime(activeCall.durationSeconds)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <Button
              variant="ghost"
              size="icon"
              data-testid="pip-btn-mute"
              className={`w-7 h-7 rounded-full transition-colors ${
                activeCall.isMuted
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
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
              title="Pop out OS Picture-in-Picture window (works across tabs & apps)"
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
      )}
    </aside>
  );
}

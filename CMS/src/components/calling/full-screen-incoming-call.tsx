"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useIncomingCall } from "@/context/incoming-call-context";
import {
  Phone,
  PhoneOff,
  Video,
  Users,
  Loader2,
  VolumeX,
  ShieldAlert,
  Mic,
  Camera,
} from "lucide-react";

declare global {
  interface Window {
    __HRMS_ACTIVE_MEDIA_STREAMS__?: Set<MediaStream>;
    __HRMS_VERIFIED_CALLEE_STREAM__?: {
      callId: string;
      stream: MediaStream;
      createdAt: number;
    } | null;
  }
}

function registerGlobalMediaStream(stream: MediaStream) {
  if (typeof window === "undefined") return;
  if (!window.__HRMS_ACTIVE_MEDIA_STREAMS__) {
    window.__HRMS_ACTIVE_MEDIA_STREAMS__ = new Set<MediaStream>();
  }
  window.__HRMS_ACTIVE_MEDIA_STREAMS__.add(stream);
}

export function FullScreenIncomingCall() {
  const {
    incomingCall,
    acceptCall,
    rejectCall,
    autoplayBlocked,
    unlockAudio,
    isAccepting,
    isDeclining,
  } = useIncomingCall();

  const acceptButtonRef = useRef<HTMLButtonElement | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    setPermissionError(null);
    setCheckingPermissions(false);
  }, [incomingCall?.callId]);

  const verifyMediaAndAccept = useCallback(async () => {
    if (!incomingCall || isAccepting || isDeclining || checkingPermissions) return;

    unlockAudio();
    setCheckingPermissions(true);
    setPermissionError(null);

    const needsVideo = incomingCall.callType === "video";

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPermissionError(
          needsVideo
            ? "Camera and microphone access are unavailable in this browser context. Please allow media permissions over HTTPS or localhost to answer."
            : "Microphone access is unavailable in this browser context. Please allow microphone permission to answer."
        );
        setCheckingPermissions(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: needsVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      });

      const liveAudio = stream.getAudioTracks().some((t) => t.readyState === "live");
      const liveVideo = !needsVideo || stream.getVideoTracks().some((t) => t.readyState === "live");

      if (!liveAudio || !liveVideo) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        setPermissionError(
          needsVideo
            ? "Both a working camera and microphone are required to answer this video call. Please check your devices and allow access."
            : "A working microphone is required to answer this call. Please check your microphone and allow access."
        );
        setCheckingPermissions(false);
        return;
      }

      registerGlobalMediaStream(stream);
      if (typeof window !== "undefined") {
        // Stop any stale verified stream before storing the new one
        if (
          window.__HRMS_VERIFIED_CALLEE_STREAM__?.stream &&
          window.__HRMS_VERIFIED_CALLEE_STREAM__.stream !== stream
        ) {
          window.__HRMS_VERIFIED_CALLEE_STREAM__.stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
        }
        window.__HRMS_VERIFIED_CALLEE_STREAM__ = {
          callId: incomingCall.callId,
          stream,
          createdAt: Date.now(),
        };
      }

      setCheckingPermissions(false);
      await acceptCall();
    } catch (err: any) {
      const errName = err?.name || "";
      let message = needsVideo
        ? "Camera and microphone permission is blocked. Please allow access in your browser address bar and tap Allow Permission & Answer."
        : "Microphone permission is blocked. Please allow microphone access in your browser address bar and tap Allow Permission & Answer.";

      if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        message = needsVideo
          ? "No working camera or microphone was detected. Connect your camera & microphone and tap Retry."
          : "No working microphone was detected. Connect a microphone and tap Retry.";
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        message = needsVideo
          ? "Your camera or microphone is currently busy in another application. Close the other app and tap Retry."
          : "Your microphone is currently busy in another application. Close the other app and tap Retry.";
      }

      setPermissionError(message);
      setCheckingPermissions(false);
    }
  }, [incomingCall, isAccepting, isDeclining, checkingPermissions, unlockAudio, acceptCall]);

  // Keyboard accessibility: Enter to verify & accept, Escape to decline
  useEffect(() => {
    if (!incomingCall) return;

    acceptButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void verifyMediaAndAccept();
      } else if (e.key === "Escape") {
        e.preventDefault();
        rejectCall("declined_by_esc");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [incomingCall, verifyMediaAndAccept, rejectCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";
  const isGroup = !!incomingCall.isGroup;
  const busyAccepting = isAccepting || checkingPermissions;
  const initials = incomingCall.callerName
    ? incomingCall.callerName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "HR";

  return (
    <div
      role="dialog"
      data-testid="incoming-call-dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-caller"
      onClick={unlockAudio}
      className="fixed inset-0 z-[100005] flex flex-col items-center justify-between py-6 sm:py-12 px-4 sm:px-6 bg-slate-950/95 opacity-100 backdrop-blur-2xl text-white select-none min-h-[100dvh] max-h-[100dvh] overflow-y-auto"
    >
      {/* Top Banner / Call Type Tag & Autoplay indicator */}
      <div className="flex flex-col items-center gap-2 pt-2 sm:pt-4 shrink-0">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/70 text-xs font-semibold tracking-wider uppercase text-slate-200 shadow-inner">
          {isGroup ? (
            <>
              <Users className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Incoming Group Call</span>
            </>
          ) : isVideo ? (
            <>
              <Video className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Incoming Video Call</span>
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Incoming Voice Call</span>
            </>
          )}
        </div>
        <p className="text-slate-400 text-xs sm:text-sm font-medium">
          {isGroup && incomingCall.groupName ? incomingCall.groupName : "MasterHRMS Direct Call"}
        </p>
        {autoplayBlocked && (
          <button
            type="button"
            onClick={unlockAudio}
            className="mt-1 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            <VolumeX className="size-3.5 text-amber-400 shrink-0" />
            <span>Ringtone muted by browser — tap to unmute</span>
          </button>
        )}
      </div>

      {/* Center Section: Radiating Rings + Caller Profile */}
      <div className="flex flex-col items-center my-auto py-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-48 h-48 sm:w-72 sm:h-72 rounded-full border border-indigo-500/20 bg-indigo-500/5 animate-ping pointer-events-none" />
          <div className="absolute w-36 h-36 sm:w-56 sm:h-56 rounded-full border border-indigo-400/30 bg-indigo-500/10 animate-pulse pointer-events-none" />

          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center z-10">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-800 text-white font-bold text-3xl sm:text-5xl">
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Caller Details */}
        <div className="mt-6 sm:mt-8 text-center max-w-md px-2">
          <h2
            id="incoming-call-caller"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1 sm:mb-2 drop-shadow-md"
          >
            {incomingCall.callerName}
          </h2>
          <p className="text-xs sm:text-base text-slate-300 font-medium">
            {isGroup
              ? `Inviting you to join ${incomingCall.groupName || "group call"}`
              : incomingCall.callerEmail || incomingCall.callerPhone || "Colleague"}
          </p>
          <p className="text-xs text-indigo-300 mt-2 font-mono tracking-wide">
            {checkingPermissions
              ? isVideo
                ? "Checking camera & microphone..."
                : "Checking microphone..."
              : isAccepting
                ? "Connecting call..."
                : isDeclining
                  ? "Declining call..."
                  : "Ringing..."}
          </p>
        </div>

        {/* Permission Gate Banner (Item 4) */}
        {permissionError && (
          <div
            role="alert"
            data-testid="callee-permission-gate-alert"
            className="mt-4 w-full max-w-md rounded-xl border border-amber-400/50 bg-amber-500/15 p-3.5 text-left shadow-lg"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-amber-100 leading-snug">
                  {permissionError}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-retry-callee-permissions"
                    disabled={busyAccepting || isDeclining}
                    onClick={() => void verifyMediaAndAccept()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isVideo ? <Camera className="size-3.5" /> : <Mic className="size-3.5" />}
                    <span>Allow Permission & Answer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Clean Action Bar for BOTH Mobile & Desktop (Item 8 — no duplicate swipe bar) */}
      <div
        data-testid="incoming-call-actions"
        className="w-full max-w-sm flex items-center justify-around pt-2 shrink-0"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 20px))" }}
      >
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            data-testid="btn-decline-call"
            disabled={busyAccepting || isDeclining}
            onClick={() => rejectCall("declined_by_user")}
            aria-label="Decline call"
            style={{ touchAction: "manipulation" }}
            className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 shadow-xl shadow-rose-900/40 focus:outline-none focus:ring-4 focus:ring-rose-500/50 cursor-pointer"
          >
            {isDeclining ? (
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            ) : (
              <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white transition-transform duration-200 pointer-events-none" />
            )}
          </button>
          <span className="text-xs font-medium text-slate-300">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            ref={acceptButtonRef}
            type="button"
            data-testid="btn-accept-call"
            disabled={busyAccepting || isDeclining}
            onClick={() => void verifyMediaAndAccept()}
            aria-label="Accept call"
            style={{ touchAction: "manipulation" }}
            className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 shadow-xl shadow-emerald-900/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 cursor-pointer"
          >
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping opacity-75 pointer-events-none" />
            {busyAccepting ? (
              <Loader2 className="w-7 h-7 text-white animate-spin relative z-10" />
            ) : isGroup ? (
              <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 pointer-events-none" />
            ) : isVideo ? (
              <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 pointer-events-none" />
            ) : (
              <Phone className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 pointer-events-none" />
            )}
          </button>
          <span className="text-xs font-semibold text-emerald-400">
            {permissionError ? "Retry & Answer" : "Accept"}
          </span>
        </div>
      </div>
    </div>
  );
}

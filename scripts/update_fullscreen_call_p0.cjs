const fs = require('fs');
const path = require('path');

const fullScreenIncomingCallCode = `"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useIncomingCall } from "@/context/incoming-call-context";
import { Phone, PhoneOff, Video, Users, ChevronUp, Loader2 } from "lucide-react";

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

  // Mobile swipe gesture state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 80; // pixels to trigger answer

  // Keyboard accessibility: Enter to accept, Escape to decline
  useEffect(() => {
    if (!incomingCall) return;

    acceptButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        acceptCall();
      } else if (e.key === "Escape") {
        e.preventDefault();
        rejectCall("declined_by_esc");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [incomingCall, acceptCall, rejectCall]);

  // Touch gesture handlers for mobile swipe-to-accept
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAccepting || isDeclining) return;
    touchStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, [isAccepting, isDeclining]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null || isAccepting || isDeclining) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY; // positive when dragged UP
    if (diff > 0) {
      setDragY(Math.min(diff, 120)); // clamp max drag height
    } else {
      setDragY(0);
    }
  }, [isAccepting, isDeclining]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY.current === null) return;
    if (dragY >= SWIPE_THRESHOLD && !isAccepting && !isDeclining) {
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([40, 60, 40]);
        }
      } catch {}
      acceptCall();
    }
    touchStartY.current = null;
    setIsDragging(false);
    setDragY(0);
  }, [dragY, isAccepting, isDeclining, acceptCall]);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";
  const isGroup = !!incomingCall.isGroup;
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
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between py-8 sm:py-12 px-6 bg-slate-950/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300"
      style={{ touchAction: "none" }}
    >
      {/* Top Banner / Call Type Tag & Autoplay indicator */}
      <div className="flex flex-col items-center gap-2 pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold tracking-wider uppercase text-slate-300 shadow-inner">
          {isGroup ? (
            <>
              <Users className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Incoming Group Meeting</span>
            </>
          ) : isVideo ? (
            <>
              <Video className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Incoming Video Call</span>
            </>
          ) : (
            <>
              <Phone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Incoming Audio Call</span>
            </>
          )}
        </div>
        <p className="text-slate-400 text-xs sm:text-sm font-medium">
          {isGroup && incomingCall.groupName ? incomingCall.groupName : "MasterHRMS Calling Network"}
        </p>
        {autoplayBlocked && (
          <button
            type="button"
            onClick={unlockAudio}
            className="mt-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-medium flex items-center gap-1.5 animate-bounce hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            <span>🔇 Audio muted by browser — tap anywhere to unmute</span>
          </button>
        )}
      </div>

      {/* Center Section: Radiating Rings + Caller Profile */}
      <div className="flex flex-col items-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Pulsing Concentric Sound Waves */}
          <div className="absolute w-56 h-56 sm:w-80 sm:h-80 rounded-full border border-indigo-500/20 bg-indigo-500/5 animate-ping duration-1000 pointer-events-none" />
          <div className="absolute w-44 h-44 sm:w-60 sm:h-60 rounded-full border border-indigo-400/30 bg-indigo-500/10 animate-pulse pointer-events-none" />
          
          {/* Avatar Container */}
          <div className="relative w-28 h-28 sm:w-40 sm:h-40 rounded-full border-4 border-slate-800/80 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center z-10">
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
        <div className="mt-6 sm:mt-8 text-center max-w-md">
          <h2
            id="incoming-call-caller"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1 sm:mb-2 drop-shadow-md"
          >
            {incomingCall.callerName}
          </h2>
          <p className="text-xs sm:text-base text-slate-300 font-medium">
            {isGroup
              ? \`Inviting you to join \${incomingCall.groupName || "group call"}\`
              : (incomingCall.callerEmail || incomingCall.callerPhone || "Colleague")}
          </p>
          <p className="text-xs text-indigo-400/90 mt-2 font-mono tracking-wide">
            {isAccepting ? "Connecting call..." : isDeclining ? "Declining call..." : "Ringing..."}
          </p>
        </div>
      </div>

      {/* Bottom Controls Area: Mobile Swipe + Tap Buttons */}
      <div className="w-full max-w-md flex flex-col items-center gap-6 pb-6 pt-2">
        {/* Mobile Dedicated Swipe-to-Answer Slider (Visible on small screens) */}
        <div className="w-full max-w-xs flex flex-col items-center sm:hidden">
          <div
            className="relative w-full h-16 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner flex items-center justify-center overflow-hidden"
            style={{ touchAction: "none" }}
          >
            {/* Background Hint with Animated Chevrons */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 text-slate-400 text-xs font-semibold tracking-wider uppercase pointer-events-none">
              <ChevronUp className="w-4 h-4 animate-bounce text-emerald-400" />
              <span>Swipe Up to Answer</span>
            </div>

            {/* Draggable Handle */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: \`translateY(-\${dragY}px)\`,
                transition: isDragging ? "none" : "transform 0.25s ease-out",
                touchAction: "none",
              }}
              className="absolute bottom-1.5 flex items-center justify-center w-13 h-13 rounded-full bg-emerald-600 shadow-lg shadow-emerald-900/50 cursor-grab active:cursor-grabbing border-2 border-emerald-400"
            >
              {isAccepting ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : isGroup ? (
                <Users className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <Phone className="w-6 h-6 text-white animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Standard Tap Action Buttons (Desktop and Mobile Fast Tap) */}
        <div className="w-full max-w-sm flex items-center justify-around">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              data-testid="btn-decline-call"
              disabled={isAccepting || isDeclining}
              onTouchEnd={(e) => {
                e.preventDefault();
                rejectCall("declined_by_touch");
              }}
              onClick={() => rejectCall("declined_by_user")}
              aria-label="Decline call (Press Escape)"
              style={{ touchAction: "manipulation" }}
              className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 shadow-xl shadow-rose-900/40 focus:outline-none focus:ring-4 focus:ring-rose-500/50 cursor-pointer"
            >
              {isDeclining ? (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              ) : (
                <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white group-hover:rotate-12 transition-transform duration-200 pointer-events-none" />
              )}
            </button>
            <span className="text-xs font-medium text-slate-400">Decline (Esc)</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              ref={acceptButtonRef}
              type="button"
              data-testid="btn-accept-call"
              disabled={isAccepting || isDeclining}
              onTouchEnd={(e) => {
                e.preventDefault();
                acceptCall();
              }}
              onClick={acceptCall}
              aria-label="Accept call (Press Enter)"
              style={{ touchAction: "manipulation" }}
              className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 shadow-xl shadow-emerald-900/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 cursor-pointer"
            >
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping opacity-75 pointer-events-none" />
              {isAccepting ? (
                <Loader2 className="w-7 h-7 text-white animate-spin relative z-10" />
              ) : isGroup ? (
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-200 pointer-events-none" />
              ) : isVideo ? (
                <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-200 pointer-events-none" />
              ) : (
                <Phone className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-200 pointer-events-none" />
              )}
            </button>
            <span className="text-xs font-semibold text-emerald-400">Accept (Enter)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const srcPath = path.join(__dirname, '..', 'src', 'components', 'calling', 'full-screen-incoming-call.tsx');
const cmsPath = path.join(__dirname, '..', 'CMS', 'src', 'components', 'calling', 'full-screen-incoming-call.tsx');

fs.writeFileSync(srcPath, fullScreenIncomingCallCode, 'utf8');
console.log('✅ Synchronized src/components/calling/full-screen-incoming-call.tsx with Group Call & Ringtone P0');

fs.writeFileSync(cmsPath, fullScreenIncomingCallCode, 'utf8');
console.log('✅ Synchronized CMS/src/components/calling/full-screen-incoming-call.tsx with Group Call & Ringtone P0');


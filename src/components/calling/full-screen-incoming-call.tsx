import React, { useEffect, useRef } from "react";
import { useIncomingCall } from "@/context/incoming-call-context";
import { Phone, PhoneOff, Video, User } from "lucide-react";

export function FullScreenIncomingCall() {
  const { incomingCall, acceptCall, rejectCall } = useIncomingCall();
  const acceptButtonRef = useRef<HTMLButtonElement | null>(null);

  // Keyboard accessibility: Enter to accept, Escape to decline
  useEffect(() => {
    if (!incomingCall) return;

    // Focus accept button when modal opens
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

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";
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
      aria-modal="true"
      aria-labelledby="incoming-call-caller"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between py-12 px-6 bg-slate-950/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-300"
    >
      {/* Top Banner / Call Type Tag */}
      <div className="flex flex-col items-center gap-2 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold tracking-wider uppercase text-slate-300 shadow-inner">
          {isVideo ? (
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
        <p className="text-slate-400 text-sm font-medium">MasterHRMS Calling Network</p>
      </div>

      {/* Center Section: Radiating Rings + Caller Profile */}
      <div className="flex flex-col items-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Pulsing Concentric Sound Waves */}
          <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-indigo-500/20 bg-indigo-500/5 animate-ping duration-1000" />
          <div className="absolute w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-indigo-400/30 bg-indigo-500/10 animate-pulse" />
          
          {/* Avatar Container */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-slate-800/80 shadow-2xl overflow-hidden bg-slate-900 flex items-center justify-center z-10">
            {incomingCall.callerAvatar ? (
              <img
                src={incomingCall.callerAvatar}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-800 text-white font-bold text-4xl sm:text-5xl">
                {initials}
              </div>
            )}
          </div>
        </div>

        {/* Caller Details */}
        <div className="mt-8 text-center max-w-md">
          <h2
            id="incoming-call-caller"
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 drop-shadow-md"
          >
            {incomingCall.callerName}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-medium">
            {incomingCall.callerEmail || incomingCall.callerPhone || "Colleague"}
          </p>
          <p className="text-xs text-indigo-400/90 mt-2 font-mono tracking-wide">
            Ringing...
          </p>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full max-w-sm flex items-center justify-around pb-8 pt-4">
        {/* Decline Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => rejectCall("declined_by_user")}
            aria-label="Decline call (Press Escape)"
            className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all duration-200 shadow-xl shadow-rose-900/40 focus:outline-none focus:ring-4 focus:ring-rose-500/50"
          >
            <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white group-hover:rotate-12 transition-transform duration-200" />
          </button>
          <span className="text-xs font-medium text-slate-400">Decline (Esc)</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            ref={acceptButtonRef}
            type="button"
            onClick={acceptCall}
            aria-label="Accept call (Press Enter)"
            className="group relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all duration-200 shadow-xl shadow-emerald-900/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
          >
            <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping opacity-75" />
            {isVideo ? (
              <Video className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <Phone className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10 group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>
          <span className="text-xs font-semibold text-emerald-400">Accept (Enter)</span>
        </div>
      </div>
    </div>
  );
}


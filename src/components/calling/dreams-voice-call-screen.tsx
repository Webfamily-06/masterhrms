"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  MonitorUp,
  UserPlus,
  PhoneOff,
  MessageSquare,
  Volume2,
  User,
  Pause,
  Play,
  AudioLines,
  PictureInPicture2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GridParticipant } from "./adaptive-video-grid";

export interface DreamsVoiceCallScreenProps {
  targetName: string;
  targetAvatar?: string | null;
  targetPhone?: string | null;
  targetEmail?: string | null;
  callDurationSeconds: number;
  callStatus: "calling" | "ringing" | "connected" | "ended";
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  remoteStream?: MediaStream | null;
  remoteAudioRef?: React.RefObject<HTMLAudioElement | null>;
  participants?: GridParticipant[];
  remoteIsSpeaking?: boolean;
  localIsSpeaking?: boolean;

  isMuted: boolean;
  isOnHold?: boolean;
  remoteIsOnHold?: boolean;
  remoteHoldByName?: string | null;
  onToggleMute: () => void;
  onToggleHold?: () => void;
  onToggleVideo: () => void;
  onMinimize: () => void;
  onTogglePiP?: () => void;
  onEndCall: () => void;
  onAddParticipant: () => void;
  onOpenSettings: () => void;
  onToggleScreenShare?: () => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function VoicePeerAudio({
  stream,
  audioRef,
}: {
  stream: MediaStream | null | undefined;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}) {
  const internalRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (stream && stream.getAudioTracks().length > 0) {
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.muted = false;
      el.volume = 1;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <audio
      ref={(el) => {
        internalRef.current = el;
        if (audioRef) {
          (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el;
        }
        if (el && stream && stream.getAudioTracks().length > 0 && el.srcObject !== stream) {
          el.srcObject = stream;
          el.muted = false;
          el.volume = 1;
          el.play().catch(() => {});
        }
      }}
      autoPlay
      playsInline
      className="sr-only pointer-events-none"
    />
  );
}

export function DreamsVoiceCallScreen({
  targetName,
  targetAvatar,
  targetPhone,
  targetEmail,
  callDurationSeconds,
  callStatus,
  currentUserAvatar,
  currentUserName,
  remoteStream,
  remoteAudioRef,
  participants = [],
  remoteIsSpeaking,
  localIsSpeaking,
  isMuted,
  isOnHold,
  remoteIsOnHold = false,
  remoteHoldByName,
  onToggleMute,
  onToggleHold,
  onToggleVideo,
  onMinimize,
  onTogglePiP,
  onEndCall,
  onAddParticipant,
  onOpenSettings,
  onToggleScreenShare,
}: DreamsVoiceCallScreenProps) {
  const [localHold, setLocalHold] = useState(false);
  const effectiveHold = typeof isOnHold === "boolean" ? isOnHold : localHold;

  const handleHoldClick = () => {
    if (onToggleHold) {
      onToggleHold();
    } else {
      setLocalHold((h) => !h);
    }
  };

  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const uniqueRemoteStreams: MediaStream[] = [];
  if (remoteStream) uniqueRemoteStreams.push(remoteStream);
  for (const p of remoteParticipants) {
    if (p.stream && !uniqueRemoteStreams.includes(p.stream)) {
      uniqueRemoteStreams.push(p.stream);
    }
  }

  // Always show BOTH User-A (You) and User-B (plus any 3+ mesh peers) on the Audio Call stage!
  const selfDisplayName =
    currentUserName && currentUserName !== "You" ? `${currentUserName} (You)` : "You";
  const stageParticipants: Array<{
    userId: string;
    name: string;
    avatarUrl?: string | null;
    isLocal: boolean;
    isSpeaking?: boolean;
    isMuted?: boolean;
    subtitle: string;
  }> = [
    {
      userId: "local-self",
      name: selfDisplayName,
      avatarUrl: currentUserAvatar || null,
      isLocal: true,
      isSpeaking: Boolean(localIsSpeaking && !isMuted && !effectiveHold),
      isMuted,
      subtitle: effectiveHold ? "On Hold" : isMuted ? "Mic Muted" : "Connected",
    },
    ...(remoteParticipants.length > 0
      ? remoteParticipants.map((p) => ({
          userId: p.userId,
          name: p.name || targetName || "Colleague",
          avatarUrl: p.avatarUrl || targetAvatar || null,
          isLocal: false,
          isSpeaking: Boolean((p.isSpeaking || remoteIsSpeaking) && !remoteIsOnHold),
          isMuted: Boolean(p.isMuted),
          subtitle: remoteIsOnHold
            ? "Put Call On Hold"
            : callStatus === "connected"
            ? p.isMuted
              ? "Muted"
              : "Connected"
            : callStatus === "ringing"
            ? "Ringing..."
            : "Calling...",
        }))
      : [
          {
            userId: "remote-peer",
            name: targetName || "Colleague",
            avatarUrl: targetAvatar || null,
            isLocal: false,
            isSpeaking: Boolean(remoteIsSpeaking && !remoteIsOnHold),
            isMuted: false,
            subtitle: remoteIsOnHold
              ? "Put Call On Hold"
              : callStatus === "connected"
              ? "Connected"
              : callStatus === "ringing"
              ? "Ringing..."
              : "Calling...",
          },
        ]),
  ];

  return (
    <div
      data-testid="dreams-voice-call-screen"
      className="w-full h-full flex flex-col font-sans select-none text-gray-900 dark:text-white bg-white dark:bg-card"
    >
      {/* Hidden WebRTC Audio Outputs for primary + mesh peers */}
      {uniqueRemoteStreams.length > 0 ? (
        uniqueRemoteStreams.map((stream, idx) => (
          <VoicePeerAudio
            key={stream.id || idx}
            stream={stream}
            audioRef={idx === 0 ? remoteAudioRef : undefined}
          />
        ))
      ) : (
        remoteAudioRef && <audio ref={remoteAudioRef as any} autoPlay playsInline className="sr-only" />
      )}

      {/* Clean Single Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 lg:mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-gray-900 dark:text-white text-base sm:text-lg font-bold mb-0">
            Voice Call
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            {stageParticipants.length} Participants
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onTogglePiP && (
            <button
              type="button"
              data-testid="call-btn-pip"
              onClick={onTogglePiP}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-border-color bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              title="Pop out Picture-in-Picture window (works across tabs & apps)"
            >
              <PictureInPicture2 className="size-3.5" />
              <span>PiP</span>
            </button>
          )}
          <button
            type="button"
            data-testid="call-btn-hold"
            onClick={handleHoldClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors",
              effectiveHold
                ? "border-amber-500/60 bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                : "border-border-color bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {effectiveHold ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span>{effectiveHold ? "Resume" : "Hold"}</span>
          </button>
        </div>
      </div>

      {/* Main voice call card wrapper */}
      <div className="bg-white dark:bg-card border border-border-color rounded-md p-3 sm:p-4 flex flex-col justify-between flex-1 min-h-0 overflow-hidden shadow-xs">
        {/* Caller bar */}
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-10 rounded-full border border-border-color shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {targetAvatar ? (
                <img src={targetAvatar} className="size-full object-cover" alt={targetName} />
              ) : (
                <User className="size-5 text-gray-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-title truncate mb-0">
                {targetName || "Participant"}
              </p>
              <p className="text-[11px] text-default mb-0 truncate text-gray-500 dark:text-gray-400">
                {remoteIsOnHold
                  ? `${remoteHoldByName || targetName || "Participant"} put this call on hold`
                  : effectiveHold
                  ? "Call On Hold"
                  : targetPhone ||
                    targetEmail ||
                    (callStatus === "connected" ? "Voice Call Connected" : "Connecting...")}
              </p>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-white">
            {formatDuration(callDurationSeconds)}
          </span>
        </div>

        {/* Voice call canvas — Displays BOTH User-A and User-B clearly side by side */}
        <div
          data-testid="voice-call-participants-stage"
          className="relative rounded-md overflow-hidden bg-slate-100/80 dark:bg-slate-800/40 flex items-center justify-center flex-1 min-h-[220px] sm:min-h-[300px] my-1 p-4 sm:p-6"
        >
          {(effectiveHold || remoteIsOnHold) && (
            <div
              data-testid="call-hold-banner"
              className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 z-20 whitespace-nowrap"
            >
              <Pause className="size-3.5 shrink-0" />
              <span>
                {remoteIsOnHold
                  ? `${remoteHoldByName || targetName || "Participant"} put this call on hold`
                  : "You put this call on hold — click Resume to continue"}
              </span>
            </div>
          )}

          {!effectiveHold && !remoteIsOnHold && remoteIsSpeaking && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 animate-pulse z-10">
              <AudioLines className="size-3.5" />
              <span>{targetName} Speaking</span>
            </div>
          )}

          <div
            className={cn(
              "w-full max-w-2xl grid gap-4 sm:gap-6 items-center justify-items-center",
              stageParticipants.length === 2
                ? "grid-cols-2"
                : stageParticipants.length === 3
                ? "grid-cols-2 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-3"
            )}
          >
            {stageParticipants.map((p) => {
              const initials = (p.name || "U")
                .replace(/\s*\(You\)\s*/i, "")
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={p.userId}
                  data-testid={`voice-participant-card-${p.isLocal ? "self" : p.userId}`}
                  className={cn(
                    "w-full max-w-[230px] rounded-xl bg-white/90 dark:bg-slate-900/90 border p-4 sm:p-5 flex flex-col items-center justify-center gap-2.5 shadow-md transition-all",
                    p.isSpeaking
                      ? "border-emerald-500 ring-4 ring-emerald-500/30 scale-[1.02]"
                      : "border-slate-200 dark:border-slate-700/80"
                  )}
                >
                  <div className="relative">
                    <div
                      className={cn(
                        "size-20 sm:size-24 rounded-full overflow-hidden border-2 flex items-center justify-center shadow-md",
                        p.isLocal
                          ? "bg-gradient-to-br from-primary to-indigo-600 text-white border-primary/40"
                          : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500/40"
                      )}
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} className="size-full object-cover" alt={p.name} />
                      ) : (
                        <span className="text-xl sm:text-2xl font-bold tracking-wide">
                          {initials || "U"}
                        </span>
                      )}
                    </div>
                    {p.isMuted && (
                      <span className="absolute -bottom-1 -right-1 size-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow">
                        <MicOff className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate mb-0.5">
                      {p.name}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] font-medium mb-0 truncate",
                        p.subtitle.includes("Hold")
                          ? "text-amber-600 dark:text-amber-400 font-semibold"
                          : p.isSpeaking
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {p.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Single Control Bar (Zero duplicated buttons) */}
        <div className="border-t border-border-color pt-3 sm:pt-4 mt-2 sm:mt-3 flex items-center justify-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            data-testid="call-btn-mute"
            onClick={onToggleMute}
            className={cn(
              "size-9 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isMuted
                ? "bg-red-50 text-rose-600 border border-rose-500/40 dark:bg-red-950/40 dark:text-rose-400"
                : "bg-slate-100 text-gray-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
            aria-label="Mute"
          >
            {isMuted ? <MicOff className="size-4 sm:size-5" /> : <Mic className="size-4 sm:size-5" />}
          </button>

          <button
            type="button"
            data-testid="call-btn-video"
            onClick={onToggleVideo}
            className="size-9 sm:size-10 rounded-full bg-slate-100 text-gray-900 inline-flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Switch to Video Call"
            aria-label="Video"
          >
            <Video className="size-4 sm:size-5" />
          </button>

          <button
            type="button"
            data-testid="call-btn-minimize"
            onClick={onMinimize}
            className="size-9 sm:size-10 rounded-full bg-slate-100 text-gray-900 inline-flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Minimize to Chat"
            aria-label="Chat"
          >
            <MessageSquare className="size-4 sm:size-5" />
          </button>

          <button
            type="button"
            data-testid="call-btn-hangup"
            onClick={onEndCall}
            className="size-10 sm:size-11 rounded-full bg-rose-600 text-white inline-flex items-center justify-center hover:bg-rose-500 cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
            title="End Call"
            aria-label="End call"
          >
            <PhoneOff className="size-5" />
          </button>

          <button
            type="button"
            data-testid="call-btn-settings"
            onClick={onOpenSettings}
            className="size-9 sm:size-10 rounded-full bg-slate-100 text-gray-900 inline-flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Audio Settings"
            aria-label="Volume"
          >
            <Volume2 className="size-4 sm:size-5" />
          </button>

          <button
            type="button"
            data-testid="call-btn-add-participant"
            onClick={onAddParticipant}
            className="size-9 sm:size-10 rounded-full bg-slate-100 text-gray-900 inline-flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Add Colleague to Call"
            aria-label="Add Participant"
          >
            <UserPlus className="size-4 sm:size-5" />
          </button>

          {onToggleScreenShare && (
            <button
              type="button"
              data-testid="call-btn-screenshare"
              onClick={onToggleScreenShare}
              className="size-9 sm:size-10 rounded-full bg-slate-100 text-gray-900 inline-flex items-center justify-center hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
              title="Share Screen"
              aria-label="Screen share"
            >
              <MonitorUp className="size-4 sm:size-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

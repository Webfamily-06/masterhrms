"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { GridParticipant } from "./adaptive-video-grid";

export interface DreamsVideoCallScreenProps {
  targetName: string;
  targetAvatar?: string | null;
  targetPhone?: string | null;
  targetEmail?: string | null;
  callDurationSeconds: number;
  callStatus: "calling" | "ringing" | "connected" | "ended";
  networkQuality?: "excellent" | "good" | "poor";
  networkRttMs?: number;

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  participants?: GridParticipant[];
  activeSpeakerId?: string | null;

  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isCallFullscreen: boolean;
  isReconnecting?: boolean;
  peerReconnecting?: { graceSecondsRemaining: number } | null;

  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  onEndCall: () => void;
  onAddParticipant: () => void;
  onOpenSettings: () => void;
  onSwitchCamera?: () => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function DreamsVideoCallScreen({
  targetName,
  targetAvatar,
  callDurationSeconds,
  callStatus,
  localVideoRef,
  remoteVideoRef,
  participants = [],
  isMuted,
  isVideoOff,
  isScreenSharing,
  isReconnecting,
  peerReconnecting,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleFullscreen,
  onMinimize,
  onEndCall,
  onAddParticipant,
  onOpenSettings,
}: DreamsVideoCallScreenProps) {
  const [selectedHeroUserId, setSelectedHeroUserId] = useState<string | null>(null);

  // Filter participants for bottom filmstrip (remote participants + self)
  const filmstripList = participants.length > 0 ? participants : [
    {
      userId: "local-user",
      name: "You",
      avatarUrl: null,
      isLocal: true,
      isCameraOff: isVideoOff,
      isMuted,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col font-sans select-none text-gray-900 dark:text-white bg-white dark:bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-4 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold mb-0">Video Call</h1>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Encrypted
          </span>
        </div>
        <button
          type="button"
          onClick={onAddParticipant}
          className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-1.5 hover:bg-primary-hover hover:border-primary-hover cursor-pointer px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors"
        >
          <i className="ph ph-plus"></i> Add New
        </button>
      </div>

      {/* Main video call wrapper matching HRMS-HTML/video-call.html */}
      <div className="bg-white dark:bg-card border border-border-color rounded-md p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden shadow-xs">
        {/* Main speaker tile */}
        <div className="relative rounded-md overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-800 dark:to-slate-900 aspect-video flex items-center justify-center flex-1 min-h-[240px] sm:min-h-[340px]">
          {/* Real WebRTC/LiveKit Video Element */}
          <video
            ref={remoteVideoRef as any}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Background portrait placeholder when video stream is absent/disabled */}
          <div className="absolute inset-0 bg-gradient-to-br from-warning-transparent via-orange-transparent to-warning-transparent pointer-events-none opacity-50" />
          
          <div
            id="video-call-hero-avatar"
            className="relative size-28 sm:size-36 rounded-full bg-gradient-to-br from-warning to-orange flex items-center justify-center text-white shadow-xl overflow-hidden z-10"
          >
            {targetAvatar ? (
              <img
                src={targetAvatar}
                alt={targetName}
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <i className="ph-duotone ph-user text-5xl sm:text-7xl"></i>
            )}
          </div>

          {/* Top-left badges (Name + Timer) */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
            <span className="bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md shadow-sm border border-border-color/40 flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate max-w-[140px] sm:max-w-[200px]">{targetName || "Participant"}</span>
            </span>
            <span className="bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold px-2 py-1 rounded-md shadow-sm border border-border-color/40 font-mono">
              {formatDuration(callDurationSeconds)}
            </span>
          </div>

          {/* Top-right fullscreen & minimize */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            <button
              type="button"
              onClick={onMinimize}
              className="size-8 rounded-md bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white inline-flex items-center justify-center shadow-sm hover:bg-light dark:hover:bg-slate-800 cursor-pointer border border-border-color/40 transition-colors"
              title="Minimize to widget"
            >
              <i className="ph ph-caret-down text-base"></i>
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="size-8 rounded-md bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white inline-flex items-center justify-center shadow-sm hover:bg-light dark:hover:bg-slate-800 cursor-pointer border border-border-color/40 transition-colors"
              title="Toggle fullscreen"
            >
              <i className="ph ph-arrows-out text-base"></i>
            </button>
          </div>

          {/* Reconnecting Alert Banner */}
          {isReconnecting && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 z-30 animate-pulse">
              <i className="ph ph-arrows-clockwise animate-spin"></i>
              <span>Reconnecting WebRTC media stream...</span>
            </div>
          )}

          {/* Peer Reconnecting (Grace Period) */}
          {peerReconnecting && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 z-30 animate-pulse">
              <i className="ph ph-arrows-clockwise animate-spin"></i>
              <span>{targetName} disconnected. Grace period: {peerReconnecting.graceSecondsRemaining}s</span>
            </div>
          )}
        </div>

        {/* Participant strip matching HRMS-HTML/video-call.html */}
        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0">
          {filmstripList.map((participant, index) => {
            const isLocal = participant.isLocal;
            const gradients = [
              "from-gray-200 to-gray-400 dark:from-slate-700 dark:to-slate-800",
              "from-purple to-purple-hover",
              "from-gray-300 to-gray-500",
              "from-pink to-pink-hover",
              "from-danger to-danger-hover",
            ];
            const gradientClass = gradients[index % gradients.length];

            return (
              <div
                key={participant.userId || index}
                onClick={() => setSelectedHeroUserId(participant.userId)}
                className={cn(
                  "relative lg:aspect-4/2 aspect-[4/3] rounded-md overflow-hidden bg-gradient-to-br flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.02] border border-border-color/40 shadow-xs",
                  gradientClass
                )}
              >
                {/* If local user and camera is ON, render local preview video */}
                {isLocal && !isVideoOff && (
                  <video
                    ref={localVideoRef as any}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Avatar Icon */}
                {(isLocal && isVideoOff) || (!isLocal && participant.isCameraOff) || (!isLocal && !participant.stream) ? (
                  participant.avatarUrl ? (
                    <img src={participant.avatarUrl} alt={participant.name} className="size-10 sm:size-12 rounded-full object-cover border-2 border-white/80 shadow" />
                  ) : (
                    <i className="ph-duotone ph-user text-white text-3xl sm:text-4xl opacity-80"></i>
                  )
                ) : null}

                {/* Speaking Waveform Badge */}
                {participant.isSpeaking && (
                  <span className="absolute top-2 left-2 size-6 rounded-full bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-xs">
                    <i className="ph-fill ph-waveform text-purple animate-pulse text-xs"></i>
                  </span>
                )}

                {/* Participant Name Badge */}
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-900/95 text-gray-900 dark:text-white text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap border border-border-color/30">
                  {participant.name} {isLocal && "(You)"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Control bar matching HRMS-HTML/video-call.html */}
        <div className="border-t border-border-color pt-3 sm:pt-4 flex items-center justify-center gap-2 sm:gap-3 shrink-0">
          {/* Mute Mic */}
          <button
            type="button"
            data-testid="call-btn-mute"
            onClick={onToggleMute}
            className={cn(
              "size-8 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isMuted
                ? "bg-red-50 text-danger border border-danger/40 dark:bg-red-950/40"
                : "bg-light text-gray-900 hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
            aria-label="Mute"
          >
            <i className={cn("text-base sm:text-lg", isMuted ? "ph-duotone ph-microphone-slash text-danger" : "ph-duotone ph-microphone")}></i>
          </button>

          {/* Camera Video Toggle */}
          <button
            type="button"
            data-testid="call-btn-video"
            onClick={onToggleVideo}
            className={cn(
              "size-8 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isVideoOff
                ? "bg-red-50 text-danger border border-danger/40 dark:bg-red-950/40"
                : "bg-light text-gray-900 hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
            aria-label="Video"
          >
            <i className={cn("text-base sm:text-lg", isVideoOff ? "ph-duotone ph-video-camera-slash text-danger" : "ph-duotone ph-video-camera")}></i>
          </button>

          {/* Minimize to Chat */}
          <button
            type="button"
            data-testid="call-btn-minimize"
            onClick={onMinimize}
            className="size-8 sm:size-10 rounded-full bg-light text-gray-900 inline-flex items-center justify-center hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Chat"
            aria-label="Chat"
          >
            <i className="ph-duotone ph-chat-circle text-base sm:text-lg"></i>
          </button>

          {/* End Call (Red Highlight Button in Center) */}
          <button
            type="button"
            data-testid="call-btn-hangup"
            onClick={onEndCall}
            className="size-9 sm:size-11 rounded-full bg-danger text-white inline-flex items-center justify-center hover:bg-danger-hover cursor-pointer shadow-md transition-transform hover:scale-105 active:scale-95"
            title="End Call"
            aria-label="End call"
          >
            <i className="ph-fill ph-phone-slash text-lg sm:text-xl"></i>
          </button>

          {/* Volume / Audio Settings */}
          <button
            type="button"
            data-testid="call-btn-settings"
            onClick={onOpenSettings}
            className="size-8 sm:size-10 rounded-full bg-light text-gray-900 inline-flex items-center justify-center hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Audio / Device Settings"
            aria-label="Volume"
          >
            <i className="ph-duotone ph-speaker-high text-base sm:text-lg"></i>
          </button>

          {/* In-Call Add Participant / Emoji */}
          <button
            type="button"
            data-testid="call-btn-add-participant"
            onClick={onAddParticipant}
            className="size-8 sm:size-10 rounded-full bg-light text-gray-900 inline-flex items-center justify-center hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Add Colleague to Call"
            aria-label="Add Participant"
          >
            <i className="ph-duotone ph-user-plus text-base sm:text-lg"></i>
          </button>

          {/* Screen Share */}
          <button
            type="button"
            data-testid="call-btn-screenshare"
            onClick={onToggleScreenShare}
            className={cn(
              "size-8 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isScreenSharing
                ? "bg-primary text-white ring-2 ring-primary shadow-sm"
                : "bg-light text-gray-900 hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            aria-label="Screen share"
          >
            <i className="ph-duotone ph-monitor-arrow-up text-base sm:text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

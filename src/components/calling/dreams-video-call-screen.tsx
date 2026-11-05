"use client";

import React, { useState, useEffect, useRef } from "react";
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
  screenStream?: MediaStream | null;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  participants?: GridParticipant[];
  activeSpeakerId?: string | null;

  isMuted: boolean;
  isVideoOff: boolean;
  remoteIsVideoOff?: boolean;
  isScreenSharing: boolean;
  remoteIsScreenSharing?: boolean;
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
  localStream,
  remoteStream,
  screenStream,
  localVideoRef,
  remoteVideoRef,
  participants = [],
  isMuted,
  isVideoOff,
  remoteIsVideoOff = false,
  isScreenSharing,
  remoteIsScreenSharing = false,
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
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const presentationVideoRef = useRef<HTMLVideoElement | null>(null);

  // Assemble full participants list
  const fullList: GridParticipant[] = participants.length > 0 ? participants : [
    {
      userId: "local-user",
      name: "You",
      avatarUrl: null,
      stream: localStream,
      isLocal: true,
      isCameraOff: isVideoOff,
      isMuted,
    },
    {
      userId: "remote-user",
      name: targetName || "Colleague",
      avatarUrl: targetAvatar || null,
      stream: remoteStream,
      isLocal: false,
      isCameraOff: remoteIsVideoOff,
      isMuted: false,
    },
  ];

  // Determine which participant is in the hero stage
  // Default: Primary remote participant is hero; local user is in strip
  const defaultHero = fullList.find((p) => !p.isLocal) || fullList[0];
  const currentHero = selectedHeroUserId
    ? (fullList.find((p) => p.userId === selectedHeroUserId) || defaultHero)
    : defaultHero;

  const isHeroLocal = !!currentHero?.isLocal;
  const heroName = currentHero ? (isHeroLocal ? "You" : currentHero.name) : targetName || "Colleague";
  const heroAvatar = currentHero?.avatarUrl || (isHeroLocal ? null : targetAvatar);

  // Determine whether Hero camera video is actively streaming
  const activeHeroStream = isHeroLocal ? localStream : (currentHero?.stream || remoteStream);
  const hasLiveVideoTrack = !!activeHeroStream && activeHeroStream.getVideoTracks().some(
    (t) => t.enabled && t.readyState === "live"
  );
  const isHeroVideoActive = isHeroLocal
    ? (!isVideoOff && hasLiveVideoTrack)
    : (!remoteIsVideoOff && !currentHero?.isCameraOff && hasLiveVideoTrack);

  const isPresentationActive = isScreenSharing || remoteIsScreenSharing;

  // Keep Hero video element synchronized with live stream
  useEffect(() => {
    const videoEl = heroVideoRef.current;
    if (!videoEl || isPresentationActive) return;
    if (activeHeroStream) {
      if (videoEl.srcObject !== activeHeroStream) {
        videoEl.srcObject = activeHeroStream;
      }
      videoEl.play().catch(() => {});
    } else {
      videoEl.srcObject = null;
    }
  }, [activeHeroStream, isHeroLocal, isHeroVideoActive, isPresentationActive]);

  // Keep Presentation video element synchronized
  useEffect(() => {
    const presEl = presentationVideoRef.current;
    if (!presEl || !isPresentationActive) return;
    const streamToPresent = isScreenSharing ? (screenStream || localStream) : remoteStream;
    if (streamToPresent) {
      if (presEl.srcObject !== streamToPresent) {
        presEl.srcObject = streamToPresent;
      }
      presEl.play().catch(() => {});
    }
  }, [isPresentationActive, isScreenSharing, screenStream, localStream, remoteStream]);

  // Filmstrip shows all participants who are NOT currently displayed as hero (or all if > 2)
  const filmstripList = fullList;

  return (
    <div
      data-testid="dreams-video-call-screen"
      className="w-full h-full flex flex-col font-sans select-none text-gray-900 dark:text-white bg-white dark:bg-card"
    >
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
          data-testid="call-btn-add-new-header"
          className="btn-sm bg-dark text-white border border-dark inline-flex items-center gap-1.5 hover:bg-primary-hover hover:border-primary-hover cursor-pointer px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors"
        >
          <i className="ph ph-plus"></i> Add New
        </button>
      </div>

      {/* Main video call wrapper */}
      <div className="bg-white dark:bg-card border border-border-color rounded-md p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden shadow-xs">
        {/* Main Stage: Either Presentation Canvas OR Hero Speaker Tile */}
        {isPresentationActive ? (
          /* 1. HIGH-DEFINITION SCREEN SHARE PRESENTATION CANVAS */
          <div
            id="call-presentation-canvas"
            data-testid="screen-share-presentation-stage"
            className="relative rounded-md overflow-hidden bg-slate-950 aspect-video flex items-center justify-center flex-1 min-h-[240px] sm:min-h-[340px] border border-border-color/40 shadow-inner"
          >
            <video
              ref={(el) => {
                presentationVideoRef.current = el;
                const streamToPresent = isScreenSharing ? (screenStream || localStream) : remoteStream;
                if (el && streamToPresent && el.srcObject !== streamToPresent) {
                  el.srcObject = streamToPresent;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted={isScreenSharing}
              className="w-full h-full object-contain"
            />

            {/* Top Presenter Status Banner */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md shadow-md flex items-center gap-1.5">
                <i className="ph-duotone ph-monitor-arrow-up text-sm animate-pulse"></i>
                <span>{isScreenSharing ? "You are presenting" : `${targetName || "Colleague"} is presenting`}</span>
              </span>
              <span className="bg-slate-900/90 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-white/10 font-mono">
                {formatDuration(callDurationSeconds)}
              </span>
            </div>

            {/* Local Presenter Quick Stop Button */}
            {isScreenSharing && (
              <div className="absolute top-3 right-20 z-20">
                <button
                  type="button"
                  id="btn-stop-sharing-top"
                  data-testid="btn-stop-presentation"
                  onClick={onToggleScreenShare}
                  className="bg-danger text-white text-xs font-semibold px-3 py-1 rounded-md shadow-md hover:bg-danger-hover cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <i className="ph ph-stop-circle text-sm"></i>
                  <span>Stop Sharing</span>
                </button>
              </div>
            )}

            {/* Top-right controls */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={onMinimize}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors"
                title="Minimize to widget"
                aria-label="Minimize"
              >
                <i className="ph ph-caret-down text-base"></i>
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors"
                title="Toggle fullscreen"
                aria-label="Fullscreen"
              >
                <i className="ph ph-arrows-out text-base"></i>
              </button>
            </div>
          </div>
        ) : (
          /* 2. HERO SPEAKER VIDEO TILE */
          <div
            data-testid="hero-video-stage"
            className="relative rounded-md overflow-hidden bg-slate-900 aspect-video flex items-center justify-center flex-1 min-h-[240px] sm:min-h-[340px] border border-border-color/40 shadow-inner"
          >
            {/* Live Camera Video Element */}
            <video
              id="video-call-hero-video"
              ref={(el) => {
                heroVideoRef.current = el;
                if (!isHeroLocal && remoteVideoRef) {
                  (remoteVideoRef as any).current = el;
                }
                if (isHeroLocal && localVideoRef) {
                  (localVideoRef as any).current = el;
                }
                if (el && activeHeroStream && el.srcObject !== activeHeroStream) {
                  el.srcObject = activeHeroStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted={isHeroLocal}
              className={cn(
                "w-full h-full object-cover absolute inset-0 z-0",
                !isHeroVideoActive && "hidden"
              )}
            />

            {/* Avatar & Camera Off Fallback (Only shown when hero camera is off/inactive) */}
            {!isHeroVideoActive && (
              <div className="flex flex-col items-center justify-center gap-3 z-10 p-4">
                <div
                  id="video-call-hero-avatar"
                  className="size-24 sm:size-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl overflow-hidden border-2 border-white/20"
                >
                  {heroAvatar ? (
                    <img
                      src={heroAvatar}
                      alt={heroName}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <i className="ph-duotone ph-user text-5xl sm:text-6xl text-white"></i>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-semibold mb-0.5">{heroName}</p>
                  <p className="text-xs text-slate-400 mb-0 flex items-center justify-center gap-1.5">
                    <i className="ph ph-video-camera-slash text-danger"></i>
                    <span>Camera is turned off</span>
                  </p>
                </div>
              </div>
            )}

            {/* Top-left badges (Name + Timer) */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
              <span className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md shadow-sm border border-white/10 flex items-center gap-1.5 backdrop-blur-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{heroName}</span>
              </span>
              <span className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold px-2 py-1 rounded-md shadow-sm border border-white/10 font-mono backdrop-blur-xs">
                {formatDuration(callDurationSeconds)}
              </span>
            </div>

            {/* Top-right fullscreen & minimize */}
            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={onMinimize}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors backdrop-blur-xs"
                title="Minimize to widget"
                aria-label="Minimize"
              >
                <i className="ph ph-caret-down text-base"></i>
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors backdrop-blur-xs"
                title="Toggle fullscreen"
                aria-label="Fullscreen"
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
        )}

        {/* Participant Strip (Filmstrip) */}
        <div
          id="video-call-filmstrip"
          data-testid="call-participant-filmstrip"
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0"
        >
          {filmstripList.map((participant, index) => {
            const isLocal = participant.isLocal;
            const isCurrentHero = currentHero?.userId === participant.userId;
            const pStream = isLocal ? localStream : (participant.stream || remoteStream);
            const pHasVideo = !!pStream && pStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
            const pVideoActive = isLocal ? (!isVideoOff && pHasVideo) : (!remoteIsVideoOff && !participant.isCameraOff && pHasVideo);

            const gradients = [
              "from-slate-700 to-slate-800",
              "from-purple-900 to-slate-900",
              "from-indigo-900 to-slate-900",
              "from-pink-900 to-slate-900",
              "from-slate-800 to-slate-950",
            ];
            const gradientClass = gradients[index % gradients.length];

            return (
              <div
                key={participant.userId || index}
                id={`filmstrip-tile-${participant.userId || index}`}
                data-testid={`filmstrip-tile-${participant.userId || index}`}
                onClick={() => setSelectedHeroUserId(participant.userId)}
                className={cn(
                  "relative lg:aspect-4/2 aspect-[4/3] rounded-md overflow-hidden bg-gradient-to-br flex items-center justify-center cursor-pointer transition-all border shadow-xs",
                  isCurrentHero ? "border-primary ring-2 ring-primary/60 scale-[1.02]" : "border-border-color/40 hover:scale-[1.02]",
                  gradientClass
                )}
                title={`Click to focus on ${participant.name}`}
              >
                {/* Live Video for participant in filmstrip */}
                {pVideoActive && (
                  <video
                    ref={(el) => {
                      if (el && pStream && el.srcObject !== pStream) {
                        el.srcObject = pStream;
                        el.play().catch(() => {});
                      }
                      if (isLocal && localVideoRef) {
                        (localVideoRef as any).current = el;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-cover absolute inset-0 z-0"
                  />
                )}

                {/* Avatar Fallback */}
                {!pVideoActive && (
                  participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      className="size-10 sm:size-12 rounded-full object-cover border-2 border-white/80 shadow z-10"
                    />
                  ) : (
                    <i className="ph-duotone ph-user text-white text-3xl sm:text-4xl opacity-80 z-10"></i>
                  )
                )}

                {/* Speaking Waveform Badge */}
                {participant.isSpeaking && (
                  <span className="absolute top-2 left-2 size-6 rounded-full bg-slate-900/90 flex items-center justify-center shadow-xs z-20">
                    <i className="ph-fill ph-waveform text-purple animate-pulse text-xs"></i>
                  </span>
                )}

                {/* Participant Name Badge */}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap border border-white/20 z-20">
                  {participant.name} {isLocal && "(You)"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Control bar */}
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

          {/* In-Call Add Participant */}
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

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  StopCircle,
  UserPlus,
  PhoneOff,
  Maximize2,
  ChevronDown,
  MessageSquare,
  Volume2,
  User,
  RefreshCw,
  AudioLines,
} from "lucide-react";
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
  remoteScreenStream?: MediaStream | null;
  remotePresenterName?: string | null;
  localVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef?: React.RefObject<HTMLVideoElement | null>;
  remoteAudioRef?: React.RefObject<HTMLAudioElement | null>;
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

function RemoteStreamAudio({
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

export function DreamsVideoCallScreen({
  targetName,
  targetAvatar,
  callDurationSeconds,
  localStream,
  remoteStream,
  screenStream,
  remoteScreenStream,
  remotePresenterName,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
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
  const fullList: GridParticipant[] =
    participants.length > 0
      ? participants
      : [
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

  // Collect all unique remote streams for guaranteed unmuted audio playback
  const uniqueRemoteStreams: MediaStream[] = [];
  if (remoteStream) uniqueRemoteStreams.push(remoteStream);
  for (const p of fullList) {
    if (!p.isLocal && p.stream && !uniqueRemoteStreams.includes(p.stream)) {
      uniqueRemoteStreams.push(p.stream);
    }
  }

  // Determine which participant is in the hero stage
  const defaultHero = fullList.find((p) => !p.isLocal) || fullList[0];
  const currentHero = selectedHeroUserId
    ? fullList.find((p) => p.userId === selectedHeroUserId) || defaultHero
    : defaultHero;

  const isHeroLocal = !!currentHero?.isLocal;
  const heroName = currentHero
    ? isHeroLocal
      ? "You"
      : currentHero.name
    : targetName || "Colleague";
  const heroAvatar = currentHero?.avatarUrl || (isHeroLocal ? null : targetAvatar);

  const activeHeroStream = isHeroLocal ? localStream : currentHero?.stream || remoteStream;
  const hasLiveVideoTrack =
    !!activeHeroStream &&
    activeHeroStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  const isHeroVideoActive = isHeroLocal
    ? !isVideoOff && hasLiveVideoTrack
    : !remoteIsVideoOff && !currentHero?.isCameraOff && hasLiveVideoTrack;

  const isPresentationActive = isScreenSharing || remoteIsScreenSharing;
  const activePresentationStream = isScreenSharing
    ? screenStream || localStream
    : remoteScreenStream || remoteStream;

  // Synchronize Hero video element
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

  // Synchronize Presentation video element
  useEffect(() => {
    const presEl = presentationVideoRef.current;
    if (!presEl || !isPresentationActive) return;
    if (activePresentationStream) {
      if (presEl.srcObject !== activePresentationStream) {
        presEl.srcObject = activePresentationStream;
      }
      presEl.play().catch(() => {});
    }
  }, [isPresentationActive, activePresentationStream]);

  return (
    <div
      data-testid="dreams-video-call-screen"
      className="w-full h-full flex flex-col font-sans select-none text-gray-900 dark:text-white bg-white dark:bg-card"
    >
      {/* Always-mounted unmuted audio outputs for every remote participant */}
      {uniqueRemoteStreams.map((stream, idx) => (
        <RemoteStreamAudio
          key={stream.id || idx}
          stream={stream}
          audioRef={idx === 0 ? remoteAudioRef : undefined}
        />
      ))}

      {/* Clean Single Header (Zero duplicated Add Participant icon) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 lg:mb-3 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-gray-900 dark:text-white text-base sm:text-lg font-bold mb-0">
            Video Call
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted</span>
          </span>
          {fullList.length > 2 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              {fullList.length} in call
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-semibold text-muted-foreground">
          {formatDuration(callDurationSeconds)}
        </span>
      </div>

      {/* Main video call wrapper */}
      <div className="bg-white dark:bg-card border border-border-color rounded-md p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden shadow-xs">
        {/* Main Stage: Either Presentation Canvas OR Hero Speaker Tile */}
        {isPresentationActive ? (
          <div
            id="call-presentation-canvas"
            data-testid="screen-share-presentation-stage"
            className="relative rounded-md overflow-hidden bg-slate-950 aspect-video flex items-center justify-center flex-1 min-h-[220px] sm:min-h-[320px] border border-border-color/40 shadow-inner"
          >
            <video
              ref={(el) => {
                presentationVideoRef.current = el;
                if (el && activePresentationStream && el.srcObject !== activePresentationStream) {
                  el.srcObject = activePresentationStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-md shadow-md flex items-center gap-1.5">
                <MonitorUp className="size-3.5 animate-pulse" />
                <span>
                  {isScreenSharing
                    ? "You are presenting"
                    : `${remotePresenterName || targetName || "Colleague"} is presenting`}
                </span>
              </span>
              <span className="bg-slate-900/90 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-sm border border-white/10 font-mono">
                {formatDuration(callDurationSeconds)}
              </span>
            </div>

            {isScreenSharing && (
              <div className="absolute top-3 right-24 z-20">
                <button
                  type="button"
                  id="btn-stop-sharing-top"
                  data-testid="btn-stop-presentation"
                  onClick={onToggleScreenShare}
                  className="bg-rose-600 text-white text-xs font-semibold px-3 py-1 rounded-md shadow-md hover:bg-rose-500 cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <StopCircle className="size-3.5" />
                  <span>Stop Sharing</span>
                </button>
              </div>
            )}

            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={onMinimize}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors"
                title="Minimize to widget"
                aria-label="Minimize"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors"
                title="Toggle fullscreen"
                aria-label="Fullscreen"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            data-testid="hero-video-stage"
            className="relative rounded-md overflow-hidden bg-slate-900 aspect-video flex items-center justify-center flex-1 min-h-[220px] sm:min-h-[320px] border border-border-color/40 shadow-inner"
          >
            <video
              id="video-call-hero-video"
              ref={(el) => {
                heroVideoRef.current = el;
                if (!isHeroLocal && remoteVideoRef) {
                  (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                }
                if (isHeroLocal && localVideoRef) {
                  (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                }
                if (el && activeHeroStream && el.srcObject !== activeHeroStream) {
                  el.srcObject = activeHeroStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover absolute inset-0 z-0",
                !isHeroVideoActive && "opacity-0 pointer-events-none"
              )}
            />

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
                    <User className="size-12 sm:size-14 text-white" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-semibold mb-0.5">{heroName}</p>
                  <p className="text-xs text-slate-400 mb-0 flex items-center justify-center gap-1.5">
                    <VideoOff className="size-3.5 text-rose-400" />
                    <span>Camera is turned off</span>
                  </p>
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
              <span className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md shadow-sm border border-white/10 flex items-center gap-1.5 backdrop-blur-xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{heroName}</span>
              </span>
              <span className="bg-slate-900/90 text-white text-xs sm:text-sm font-semibold px-2 py-1 rounded-md shadow-sm border border-white/10 font-mono backdrop-blur-xs">
                {formatDuration(callDurationSeconds)}
              </span>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={onMinimize}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors backdrop-blur-xs"
                title="Minimize to widget"
                aria-label="Minimize"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="size-8 rounded-md bg-slate-900/90 text-white inline-flex items-center justify-center shadow-sm hover:bg-slate-800 cursor-pointer border border-white/10 transition-colors backdrop-blur-xs"
                title="Toggle fullscreen"
                aria-label="Fullscreen"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>

            {isReconnecting && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 z-30 animate-pulse">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Reconnecting WebRTC media stream...</span>
              </div>
            )}

            {peerReconnecting && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-2 z-30 animate-pulse">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>
                  {targetName} reconnecting ({peerReconnecting.graceSecondsRemaining}s)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Participant Filmstrip */}
        <div
          id="video-call-filmstrip"
          data-testid="call-participant-filmstrip"
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0"
        >
          {fullList.map((participant, index) => {
            const isLocal = participant.isLocal;
            const isCurrentHero = currentHero?.userId === participant.userId;
            const pStream = isLocal ? localStream : participant.stream || remoteStream;
            const pHasVideo =
              !!pStream &&
              pStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
            const pVideoActive = isLocal
              ? !isVideoOff && pHasVideo
              : !participant.isCameraOff && pHasVideo;

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
                  isCurrentHero
                    ? "border-primary ring-2 ring-primary/60 scale-[1.01]"
                    : "border-border-color/40 hover:scale-[1.01]",
                  gradientClass
                )}
                title={`Focus on ${participant.name}`}
              >
                {pVideoActive && (
                  <video
                    ref={(el) => {
                      if (el && pStream && el.srcObject !== pStream) {
                        el.srcObject = pStream;
                        el.play().catch(() => {});
                      }
                      if (isLocal && localVideoRef) {
                        (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current =
                          el;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover absolute inset-0 z-0"
                  />
                )}

                {!pVideoActive &&
                  (participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt={participant.name}
                      className="size-10 sm:size-12 rounded-full object-cover border-2 border-white/80 shadow z-10"
                    />
                  ) : (
                    <User className="size-8 sm:size-10 text-white/80 z-10" />
                  ))}

                {participant.isSpeaking && (
                  <span className="absolute top-2 left-2 size-6 rounded-full bg-slate-900/90 flex items-center justify-center shadow-xs z-20">
                    <AudioLines className="size-3.5 text-emerald-400 animate-pulse" />
                  </span>
                )}

                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap border border-white/20 z-20 max-w-[92%] truncate">
                  {participant.name} {isLocal && "(You)"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Single Bottom Control Dock (Zero duplicate icons) */}
        <div className="border-t border-border-color pt-3 sm:pt-4 flex items-center justify-center gap-2 sm:gap-3 shrink-0">
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
            className={cn(
              "size-9 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isVideoOff
                ? "bg-red-50 text-rose-600 border border-rose-500/40 dark:bg-red-950/40 dark:text-rose-400"
                : "bg-slate-100 text-gray-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
            aria-label="Video"
          >
            {isVideoOff ? (
              <VideoOff className="size-4 sm:size-5" />
            ) : (
              <Video className="size-4 sm:size-5" />
            )}
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
            title="Audio & Camera Settings"
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

          <button
            type="button"
            data-testid="call-btn-screenshare"
            onClick={onToggleScreenShare}
            className={cn(
              "size-9 sm:size-10 rounded-full inline-flex items-center justify-center cursor-pointer transition-all",
              isScreenSharing
                ? "bg-primary text-white ring-2 ring-primary shadow-sm"
                : "bg-slate-100 text-gray-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            )}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            aria-label="Screen share"
          >
            <MonitorUp className="size-4 sm:size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

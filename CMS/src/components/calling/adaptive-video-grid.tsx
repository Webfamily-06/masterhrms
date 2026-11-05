"use client";

import React, { useMemo } from "react";
import {
  MicOff,
  VideoOff,
  Activity,
  Loader2,
  Users,
  ShieldAlert,
  Maximize2,
  Tv,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface GridParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  stream?: MediaStream | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  isLocal?: boolean;
  isCameraOff?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  state?: "INVITED" | "RINGING" | "JOINED" | "RECONNECTING" | "LEFT";
  reconnectCountdown?: number;
}

export interface AdaptiveVideoGridProps {
  participants: GridParticipant[];
  className?: string;
  onTileClick?: (participant: GridParticipant) => void;
  activeSpeakerId?: string | null;
}

/**
 * Deterministic initials generator:
 * - "Sarah Connor" -> "SC"
 * - "Priya" -> "PR"
 * - "" -> "U"
 */
export function getDeterministicInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic avatar color pairing based on name hash
 */
export function getDeterministicAvatarColor(name?: string | null): string {
  if (!name) return "bg-primary/20 text-primary border-primary/30";
  const palettes = [
    "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
}

/**
 * Single Video Tile Component with aspect-ratio preservation,
 * avatar fallback, speaking indicator, and lifecycle states.
 */
export function VideoParticipantTile({
  participant,
  isHero = false,
  onClick,
}: {
  participant: GridParticipant;
  isHero?: boolean;
  onClick?: () => void;
}) {
  const {
    userId,
    name,
    avatarUrl,
    stream,
    videoRef,
    isLocal,
    isCameraOff,
    isMuted,
    isSpeaking,
    isScreenSharing,
    state = "JOINED",
    reconnectCountdown,
  } = participant;

  const initials = useMemo(() => getDeterministicInitials(name), [name]);
  const avatarBg = useMemo(() => getDeterministicAvatarColor(name), [name]);

  const isReconnecting = state === "RECONNECTING";
  const isInvited = state === "INVITED" || state === "RINGING";
  const isLeft = state === "LEFT";

  return (
    <div
      data-testid={`participant-tile-${userId}`}
      data-user-id={userId}
      data-state={state}
      data-speaking={isSpeaking ? "true" : "false"}
      data-camera-off={isCameraOff ? "true" : "false"}
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden bg-card border transition-all duration-200 select-none",
        "flex items-center justify-center",
        isHero ? "w-full h-full min-h-[300px]" : "w-full h-full aspect-video min-h-[140px]",
        // Active speaking emerald ring
        isSpeaking && !isReconnecting && !isLeft
          ? "ring-4 ring-emerald-500 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.01]"
          : "border-border",
        // Reconnecting amber pulsation
        isReconnecting && "border-amber-500/50 ring-2 ring-amber-500/30",
        // Invited subtle border
        isInvited && "border-primary/40 border-dashed",
        // Left grayed
        isLeft && "opacity-50 grayscale"
      )}
    >
      {/* 1. VIDEO LAYER (when camera is on and active) */}
      {!isCameraOff && !isLeft && (
        <video
          ref={(el) => {
            if (videoRef) {
              (videoRef as any).current = el;
            }
            if (el && stream) {
              if (el.srcObject !== stream) {
                el.srcObject = stream;
              }
            }
          }}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isReconnecting && "blur-xs opacity-60"
          )}
        />
      )}

      {/* 2. AVATAR FALLBACK LAYER (when camera is off, reconnecting without video, or invited) */}
      {(isCameraOff || isInvited || isLeft) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-background/95">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                data-testid={`avatar-img-${userId}`}
                className={cn(
                  "rounded-full object-cover shadow-lg border-2 border-border transition-all duration-200",
                  isHero ? "size-28 sm:size-36" : "size-16 sm:size-20",
                  isSpeaking && "ring-4 ring-emerald-500 scale-105"
                )}
                onError={(e) => {
                  // Fallback to initials if image URL fails to load
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallbackEl) fallbackEl.style.display = "flex";
                }}
              />
            ) : null}

            {/* Deterministic Initials Fallback */}
            <div
              data-testid={`avatar-initials-${userId}`}
              style={{ display: avatarUrl ? "none" : "flex" }}
              className={cn(
                "rounded-full items-center justify-center font-bold tracking-wider shadow-lg border transition-all duration-200",
                avatarBg,
                isHero ? "size-28 sm:size-36 text-3xl sm:text-4xl" : "size-16 sm:size-20 text-lg sm:text-xl",
                isSpeaking && "ring-4 ring-emerald-500 scale-105"
              )}
            >
              {initials}
            </div>

            {/* Speaking Badge Overlay on Avatar */}
            {isSpeaking && (
              <div
                data-testid={`speaking-indicator-${userId}`}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-semibold animate-pulse shadow-md flex items-center gap-1 shrink-0"
              >
                <Activity className="size-2.5" />
                <span>Speaking</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">
              {name} {isLocal && "(You)"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              {isCameraOff ? (
                <>
                  <VideoOff className="size-3 text-muted-foreground" />
                  <span>Camera paused</span>
                </>
              ) : isInvited ? (
                <span>Ringing colleague...</span>
              ) : null}
            </p>
          </div>
        </div>
      )}

      {/* 3. LIFECYCLE OVERLAYS */}
      {/* 3A. RECONNECTING OVERLAY (30s Grace Period) */}
      {isReconnecting && (
        <div
          data-testid="participant-reconnecting-overlay"
          className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center z-20 animate-in fade-in"
        >
          <Loader2 className="size-8 text-amber-500 animate-spin mb-2" />
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Reconnecting Peer
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px]">
            Connection lost. Grace period:{" "}
            <span className="font-bold text-foreground">
              {reconnectCountdown !== undefined ? `${reconnectCountdown}s` : "30s"}
            </span>
          </p>
        </div>
      )}

      {/* 3B. INVITED / RINGING OVERLAY */}
      {isInvited && (
        <div
          data-testid="participant-invited-badge"
          className="absolute top-2 right-2 z-20"
        >
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] flex items-center gap-1 shadow-xs animate-pulse"
          >
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>Invited</span>
          </Badge>
        </div>
      )}

      {/* 3C. PARTICIPANT LEFT OVERLAY */}
      {isLeft && (
        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center p-3 text-center z-20">
          <p className="text-xs font-semibold text-muted-foreground">Participant Left</p>
        </div>
      )}

      {/* 4. BOTTOM PARTICIPANT BAR */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] max-w-[80%] truncate shadow-xs">
          <span className="truncate">{name} {isLocal && "(You)"}</span>
          {isScreenSharing && (
            <span className="text-blue-400 flex items-center gap-0.5 text-[10px]">
              <Tv className="size-3" />
            </span>
          )}
        </div>

        {/* Mic Status */}
        <div className="flex items-center gap-1">
          {isMuted && (
            <div
              data-testid={`mic-muted-icon-${userId}`}
              className="p-1 rounded-md bg-destructive text-destructive-foreground shadow-xs"
              title="Microphone Muted"
            >
              <MicOff className="size-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ADAPTIVE PARTICIPANT GRID
 *
 * Implements strict layouts based on connected participant count:
 * - 1 participant: Full-stage layout (100% stage, aspect-video).
 * - 2 participants: Balanced 50/50 split (grid-cols-1 md:grid-cols-2).
 * - 3–4 participants: Adaptive 2x2 grid (grid-cols-2 grid-rows-2).
 * - 5+ participants: Active-speaker hero stage with participant filmstrip.
 *
 * P2P Mesh Limits:
 * - 2-4 peers: Recommended optimal P2P bandwidth.
 * - 5 peers: Technical maximum for P2P mesh without SFU.
 */
export function AdaptiveVideoGrid({
  participants,
  className,
  onTileClick,
  activeSpeakerId,
}: AdaptiveVideoGridProps) {
  const count = participants.length;

  // Active speaker selection for 5+ participant hero stage
  const heroParticipant = useMemo(() => {
    if (activeSpeakerId) {
      const found = participants.find((p) => p.userId === activeSpeakerId);
      if (found) return found;
    }
    // Default to first speaking participant, or remote participant, or first in list
    return (
      participants.find((p) => p.isSpeaking) ||
      participants.find((p) => !p.isLocal) ||
      participants[0]
    );
  }, [participants, activeSpeakerId]);

  const filmstripParticipants = useMemo(() => {
    if (count < 5) return [];
    return participants.filter((p) => p.userId !== heroParticipant?.userId);
  }, [participants, heroParticipant, count]);

  return (
    <div
      data-testid="adaptive-video-grid"
      data-participant-count={count}
      className={cn("w-full h-full relative flex flex-col p-2 font-sans select-none", className)}
    >
      {/* P2P MESH NOTICE FOR 3+ PARTICIPANTS */}
      {count >= 3 && (
        <div
          data-testid="p2p-mesh-indicator"
          className="mb-2 px-3 py-1 rounded-md bg-muted/70 border border-border flex items-center justify-between text-xs text-muted-foreground shrink-0"
        >
          <div className="flex items-center gap-1.5 font-medium">
            <Users className="size-3.5 text-primary" />
            <span>P2P Direct Mesh Calling ({count}/5 max peers)</span>
          </div>
          {count >= 5 && (
            <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/40">
              Mesh Limit Reached
            </Badge>
          )}
        </div>
      )}

      {/* 1 PARTICIPANT: FULL STAGE */}
      {count <= 1 && (
        <div
          data-testid="grid-layout-1"
          className="w-full flex-1 min-h-0 flex items-center justify-center p-2"
        >
          {participants[0] ? (
            <div className="w-full max-w-4xl h-full flex items-center justify-center">
              <VideoParticipantTile
                participant={participants[0]}
                isHero
                onClick={() => onTileClick?.(participants[0])}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-xs">Waiting for participants...</div>
          )}
        </div>
      )}

      {/* 2 PARTICIPANTS: BALANCED 50/50 SPLIT */}
      {count === 2 && (
        <div
          data-testid="grid-layout-2"
          className="w-full flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 p-1"
        >
          {participants.map((p) => (
            <div key={p.userId} className="w-full h-full min-h-0 flex items-center justify-center">
              <VideoParticipantTile
                participant={p}
                onClick={() => onTileClick?.(p)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 OR 4 PARTICIPANTS: ADAPTIVE 2X2 GRID */}
      {(count === 3 || count === 4) && (
        <div
          data-testid="grid-layout-4"
          className="w-full flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 p-1"
        >
          {participants.map((p) => (
            <div key={p.userId} className="w-full h-full min-h-0 flex items-center justify-center">
              <VideoParticipantTile
                participant={p}
                onClick={() => onTileClick?.(p)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 5+ PARTICIPANTS: ACTIVE-SPEAKER STAGE + FILMSTRIP */}
      {count >= 5 && (
        <div
          data-testid="grid-layout-5plus"
          className="w-full flex-1 min-h-0 flex flex-col gap-2"
        >
          {/* Main Stage (80% area) */}
          <div className="w-full flex-1 min-h-0 relative flex items-center justify-center">
            {heroParticipant && (
              <VideoParticipantTile
                participant={heroParticipant}
                isHero
                onClick={() => onTileClick?.(heroParticipant)}
              />
            )}
          </div>

          {/* Participant Filmstrip along bottom (20% area) */}
          <div
            data-testid="participant-filmstrip"
            className="w-full h-24 sm:h-28 flex items-center gap-2 overflow-x-auto py-1 px-0.5 shrink-0"
          >
            {filmstripParticipants.map((p) => (
              <div
                key={p.userId}
                className="h-full aspect-video shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <VideoParticipantTile
                  participant={p}
                  onClick={() => onTileClick?.(p)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


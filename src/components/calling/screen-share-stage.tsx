"use client";

import React, { useEffect, useRef } from "react";
import {
  Tv,
  StopCircle,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GridParticipant, VideoParticipantTile } from "./adaptive-video-grid";

export interface ScreenShareStageProps {
  presenter: GridParticipant;
  participants: GridParticipant[];
  screenStream?: MediaStream | null;
  isLocalPresenter?: boolean;
  onStopScreenShare: () => void;
  className?: string;
}

/**
 * ScreenShareStage
 *
 * Implements an 85–90% presentation canvas with black letterboxing (object-contain)
 * and a participant filmstrip along the bottom.
 * Handles native browser stop (screenTrack.onended) to restore camera track
 * without WebRTC renegotiation races.
 */
export function ScreenShareStage({
  presenter,
  participants,
  screenStream,
  isLocalPresenter = false,
  onStopScreenShare,
  className,
}: ScreenShareStageProps) {
  const presentationVideoRef = useRef<HTMLVideoElement | null>(null);

  // Bind screenStream to the main presentation video element
  useEffect(() => {
    const videoEl = presentationVideoRef.current;
    if (videoEl && screenStream) {
      if (videoEl.srcObject !== screenStream) {
        videoEl.srcObject = screenStream;
      }
    }
  }, [screenStream]);

  // Browser-native stop screen share handling (e.g. Chrome's "Stop sharing" floating pill)
  useEffect(() => {
    if (!screenStream) return;
    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) return;

    const handleTrackEnded = () => {
      console.log("[SCREEN_SHARE_ENDED] Detected native screenTrack.onended event");
      onStopScreenShare();
    };

    screenTrack.addEventListener("ended", handleTrackEnded);
    return () => {
      screenTrack.removeEventListener("ended", handleTrackEnded);
    };
  }, [screenStream, onStopScreenShare]);

  return (
    <div
      data-testid="screen-share-stage"
      className={cn(
        "w-full h-full relative flex flex-col bg-background font-sans select-none overflow-hidden p-2",
        className
      )}
    >
      {/* 1. TOP PRESENTER BANNER */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-card border border-border shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Badge
            variant="default"
            className="bg-primary text-primary-foreground flex items-center gap-1.5 text-xs font-semibold py-0.5 px-2.5"
          >
            <Tv className="size-3.5 animate-pulse" />
            <span>
              {isLocalPresenter ? "You are presenting" : `${presenter.name} is presenting`}
            </span>
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            1080p High-Definition Presentation Canvas
          </span>
        </div>

        {/* Local Presenter Stop Button */}
        {isLocalPresenter && (
          <Button
            size="sm"
            variant="destructive"
            data-testid="btn-stop-screen-share"
            onClick={onStopScreenShare}
            className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <StopCircle className="size-3.5" />
            <span>Stop Sharing</span>
          </Button>
        )}
      </div>

      {/* 2. 85-90% PRESENTATION VIEWPORT (Black letterbox, object-contain) */}
      <div
        data-testid="screen-share-canvas"
        className="w-full flex-1 min-h-0 relative rounded-xl overflow-hidden flex items-center justify-center bg-black border border-border/40 shadow-inner"
      >
        <video
          ref={presentationVideoRef}
          autoPlay
          playsInline
          muted={isLocalPresenter}
          className="w-full h-full object-contain"
        />

        {/* Subtle watermark / status */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white/80 pointer-events-none backdrop-blur-xs flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Live Screen Share</span>
        </div>
      </div>

      {/* 3. 10-15% PARTICIPANT FILMSTRIP */}
      <div
        data-testid="screen-share-filmstrip"
        className="w-full h-24 sm:h-28 pt-2 flex items-center gap-2 overflow-x-auto shrink-0 z-10"
      >
        {participants.map((p) => (
          <div
            key={p.userId}
            className="h-full aspect-video shrink-0 rounded-lg overflow-hidden border border-border shadow-xs"
          >
            <VideoParticipantTile participant={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

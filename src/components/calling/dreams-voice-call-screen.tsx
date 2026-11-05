"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface DreamsVoiceCallScreenProps {
  targetName: string;
  targetAvatar?: string | null;
  targetPhone?: string | null;
  targetEmail?: string | null;
  callDurationSeconds: number;
  callStatus: "calling" | "ringing" | "connected" | "ended";
  currentUserAvatar?: string | null;
  currentUserName?: string | null;
  remoteAudioRef?: React.RefObject<HTMLAudioElement | null>;
  remoteIsSpeaking?: boolean;
  localIsSpeaking?: boolean;

  isMuted: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void; // Upgrades to video call
  onMinimize: () => void;
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

export function DreamsVoiceCallScreen({
  targetName,
  targetAvatar,
  targetPhone,
  targetEmail,
  callDurationSeconds,
  callStatus,
  currentUserAvatar,
  remoteAudioRef,
  remoteIsSpeaking,
  localIsSpeaking,
  isMuted,
  onToggleMute,
  onToggleVideo,
  onMinimize,
  onEndCall,
  onAddParticipant,
  onOpenSettings,
  onToggleScreenShare,
}: DreamsVoiceCallScreenProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isHold, setIsHold] = useState(false);

  return (
    <div className="w-full h-full flex flex-col font-sans select-none text-gray-900 dark:text-white bg-white dark:bg-card">
      {/* Hidden WebRTC Audio Output */}
      {remoteAudioRef && <audio ref={remoteAudioRef as any} autoPlay />}

      {/* Header matching HRMS-HTML/voice-call.html */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 lg:mb-4 px-1 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-gray-900 dark:text-white text-lg sm:text-xl font-bold mb-0">Voice Call</h1>
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

      {/* Main voice call card wrapper matching HRMS-HTML/voice-call.html */}
      <div className="bg-white dark:bg-card border border-border-color rounded-md p-3 sm:p-4 flex flex-col justify-between flex-1 min-h-0 overflow-hidden shadow-xs">
        {/* Caller bar */}
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-10 rounded-full border border-border-color shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              {targetAvatar ? (
                <img src={targetAvatar} className="size-full object-cover" alt="user" />
              ) : (
                <i className="ph-duotone ph-user text-xl text-gray-500"></i>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-title truncate mb-0">{targetName || "Participant"}</p>
              <p className="text-[11px] text-default mb-0 truncate text-gray-500 dark:text-gray-400">
                {targetPhone || targetEmail || (callStatus === "connected" ? "Voice Call Connected" : "Connecting...")}
              </p>
            </div>
          </div>

          {/* Top-Right In-Call Dropdown Menu */}
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="cursor-pointer size-8 bg-white dark:bg-slate-800 border border-border-color text-gray-600 dark:text-gray-300 inline-flex items-center justify-center rounded-md hover:bg-light hover:text-gray-900 transition-colors shadow-xs"
              aria-label="Call options"
            >
              <i className="ph ph-dots-three-vertical text-lg"></i>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-border-color shadow-xl rounded-md p-1.5 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onAddParticipant();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-gray-800 dark:text-gray-200 hover:bg-light dark:hover:bg-slate-800 cursor-pointer text-left"
                >
                  <i className="ph ph-user-plus text-sm"></i> Add Participant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHold(!isHold);
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-gray-800 dark:text-gray-200 hover:bg-light dark:hover:bg-slate-800 cursor-pointer text-left"
                >
                  <i className={cn("text-sm ph", isHold ? "ph-play" : "ph-pause")}></i> {isHold ? "Resume Call" : "Hold Call"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-gray-800 dark:text-gray-200 hover:bg-light dark:hover:bg-slate-800 cursor-pointer text-left"
                >
                  <i className="ph ph-gear text-sm"></i> Device Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    onEndCall();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-danger hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer text-left"
                >
                  <i className="ph ph-phone-slash text-sm"></i> End Call
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Voice call canvas matching HRMS-HTML/voice-call.html */}
        <div className="relative rounded-md overflow-hidden bg-light dark:bg-slate-800/40 flex items-center justify-center flex-1 min-h-[240px] sm:min-h-[340px] my-1">
          {/* Centered Caller Avatar */}
          <div
            className={cn(
              "size-36 sm:size-48 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center transition-all duration-300",
              remoteIsSpeaking && "ring-8 ring-emerald-500/40 scale-105"
            )}
          >
            {targetAvatar ? (
              <img src={targetAvatar} className="size-full object-cover" alt="user" />
            ) : (
              <i className="ph-duotone ph-user text-6xl sm:text-7xl text-gray-400"></i>
            )}
          </div>

          {/* Active Speaking Indicator Overlay */}
          {remoteIsSpeaking && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 animate-pulse z-10">
              <i className="ph-fill ph-waveform text-sm"></i>
              <span>{targetName} Speaking</span>
            </div>
          )}

          {/* Hold Notice */}
          {isHold && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 z-10">
              <i className="ph ph-pause"></i>
              <span>Call On Hold</span>
            </div>
          )}

          {/* Timer below avatar */}
          <span className="absolute left-1/2 -translate-x-1/2 bottom-3 bg-white dark:bg-slate-900 border border-border-color text-gray-900 dark:text-white text-xs sm:text-sm font-semibold px-3 py-1 rounded-md shadow-sm font-mono">
            {formatDuration(callDurationSeconds)}
          </span>

          {/* Self thumbnail bottom-right */}
          <div
            className="absolute bottom-3 right-3 size-12 sm:size-16 rounded-md overflow-hidden border-2 border-white dark:border-slate-700 shadow-md bg-white dark:bg-slate-900 flex items-center justify-center"
            title="You"
          >
            {currentUserAvatar ? (
              <img src={currentUserAvatar} className="size-full object-cover" alt="You" />
            ) : (
              <span className="font-bold text-xs text-primary">You</span>
            )}
          </div>
        </div>

        {/* Control bar matching HRMS-HTML/voice-call.html */}
        <div className="border-t border-border-color pt-3 sm:pt-4 mt-2 sm:mt-4 flex items-center justify-center gap-2 sm:gap-3 shrink-0">
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

          {/* Switch to Video Camera */}
          <button
            type="button"
            data-testid="call-btn-video"
            onClick={onToggleVideo}
            className="size-8 sm:size-10 rounded-full bg-light text-gray-900 inline-flex items-center justify-center hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Switch to Video Call"
            aria-label="Video"
          >
            <i className="ph-duotone ph-video-camera text-base sm:text-lg"></i>
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

          {/* In-Call Add Participant / Colleague */}
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
            className="size-8 sm:size-10 rounded-full bg-light text-gray-900 inline-flex items-center justify-center hover:bg-light-hover dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer transition-colors"
            title="Share Screen"
            aria-label="Screen share"
          >
            <i className="ph-duotone ph-monitor-arrow-up text-base sm:text-lg"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MonitorUp,
  MonitorOff,
  Users,
  UserPlus,
  MessageSquare,
  Maximize2,
  Minimize2,
  Sliders,
  Grid,
  LayoutGrid,
  Activity,
  Volume2,
  VolumeX,
  AlertCircle,
  X,
  ChevronRight,
  LogOut,
  Send,
  Pin,
  PinOff,
  Info,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
  ConnectionState,
} from "livekit-client";

export interface RemoteTrackInfo {
  videoTrack?: RemoteTrack | null;
  audioTrack?: RemoteTrack | null;
  stream?: MediaStream | null;
}

export interface MeetingParticipant {
  userId: string;
  name: string;
  avatar?: string | null;
  role: "host" | "participant";
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isLocal?: boolean;
  mediaStream?: MediaStream | null;
  videoTrack?: any;
  audioTrack?: any;
}

export interface ActiveMeetingState {
  callId: string;
  groupId: string;
  groupName: string;
  callType: "audio" | "video";
  isHost: boolean;
  creatorId: string;
  startedAt: number;
  status: "connecting" | "connected" | "reconnecting" | "ended";
}

export interface SfuDiagnosticInfo {
  configured: boolean;
  provider: string;
  url?: string | null;
  hasTurn?: boolean;
  missing?: string[];
  setupGuide?: string;
  iceServers?: any[];
}

export interface ColleagueItem {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  department?: string | null;
}

function getAvatarColor(_name: string): string {
  return "bg-primary text-primary-foreground";
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// 1. INCOMING GROUP MEETING DIALOG
// ============================================================================

export interface IncomingGroupMeetingProps {
  incoming: {
    callId: string;
    groupId: string;
    groupName: string;
    callType: "audio" | "video";
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    eventId?: string;
  } | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingGroupMeetingDialog({
  incoming,
  onAccept,
  onDecline,
}: IncomingGroupMeetingProps) {
  if (!incoming) return null;

  return (
    <Dialog open={!!incoming} onOpenChange={() => onDecline()}>
      <DialogContent
        data-testid="incoming-group-meeting-dialog"
        className="sm:max-w-md p-0 overflow-hidden border-primary/30 bg-background text-foreground shadow-2xl font-sans"
      >
        <div className="relative p-6 flex flex-col items-center text-center space-y-4">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

          {/* Call Type Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
            <span className="size-2 rounded-full bg-primary/20 animate-ping" />
            <span>Incoming Group {incoming.callType === "video" ? "Video" : "Voice"} Meeting</span>
          </div>

          {/* Group Avatar & Caller */}
          <div className="relative my-2">
            <div
              className={cn(
                "size-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xl ring-4 ring-primary/30 animate-pulse",
                getAvatarColor(incoming.groupName)
              )}
            >
              {incoming.groupName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-primary shadow-md">
              {incoming.callType === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground tracking-tight">{incoming.groupName}</h3>
            <p className="text-xs text-muted-foreground">
              Started by <span className="font-semibold text-foreground">{incoming.callerName}</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground max-w-xs">
            Colleagues in this group are gathering. Join the live conversation anytime.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-8 pt-4 w-full">
            <div className="flex flex-col items-center gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                data-testid="btn-decline-group-meeting"
                className="rounded-full size-14 shadow-lg bg-destructive hover:bg-destructive cursor-pointer transition-transform active:scale-95"
                onClick={onDecline}
                title="Decline"
              >
                <PhoneOff className="size-6 text-foreground" />
              </Button>
              <span className="text-[11px] font-medium text-muted-foreground">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Button
                size="icon"
                data-testid="btn-accept-group-meeting"
                className="rounded-full size-14 shadow-xl bg-primary hover:bg-primary text-primary-foreground cursor-pointer ring-4 ring-primary/30 animate-pulse transition-transform active:scale-95"
                onClick={onAccept}
                title="Join Meeting"
              >
                <Phone className="size-6 text-foreground" />
              </Button>
              <span className="text-[11px] font-medium text-primary font-semibold">Join</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. MAIN MULTI-PARTICIPANT MEETING COMPONENT
// ============================================================================

export interface MultiParticipantMeetingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: ActiveMeetingState | null;
  participants: MeetingParticipant[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  localStream: MediaStream | null;
  screenStream?: MediaStream | null;
  sfuConfig?: SfuDiagnosticInfo | null;
  availableColleagues?: ColleagueItem[];
  threadMessages?: Array<{ id: string; senderName?: string; content: string; createdAt?: string }>;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onEndMeetingForEveryone: () => void;
  onRemoveParticipant: (targetUserId: string) => void;
  onInviteColleagues: (targetUserIds: string[]) => void;
  onSendMessage?: (content: string) => void;
}

export function MultiParticipantMeetingDialog({
  open,
  onOpenChange,
  meeting,
  participants,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isMuted,
  isVideoOff,
  isScreenSharing,
  localStream,
  screenStream,
  sfuConfig,
  availableColleagues = [],
  threadMessages = [],
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onEndMeetingForEveryone,
  onRemoveParticipant,
  onInviteColleagues,
  onSendMessage,
}: MultiParticipantMeetingProps) {
  // Local Layout & Drawer states
  const [layoutMode, setLayoutMode] = useState<"grid" | "speaker">("grid");
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isParticipantsDrawerOpen, setIsParticipantsDrawerOpen] = useState<boolean>(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [inviteSearch, setInviteSearch] = useState<string>("");
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [inMeetingMessage, setInMeetingMessage] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Device selectors
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Timer effect
  useEffect(() => {
    if (!open || !meeting) {
      setElapsedSeconds(0);
      return;
    }
    const start = meeting.startedAt || Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [open, meeting]);

  // Attach local stream to local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff, open]);

  // Attach screen share stream
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, isScreenSharing]);

  // LiveKit SFU Client Connection & Remote Tracks
  const [livekitConnectionState, setLivekitConnectionState] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "error" | "unconfigured"
  >("idle");
  const [livekitError, setLivekitError] = useState<string | null>(null);
  const [remoteTracksMap, setRemoteTracksMap] = useState<Map<string, RemoteTrackInfo>>(new Map());
  const livekitRoomRef = useRef<Room | null>(null);

  // Audio constraints & processing capabilities
  const supportedConstraints = useMemo(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getSupportedConstraints) {
      return navigator.mediaDevices.getSupportedConstraints();
    }
    return null;
  }, []);
  const isNoiseSuppressionSupported = Boolean(supportedConstraints?.noiseSuppression);
  const isEchoCancellationSupported = Boolean(supportedConstraints?.echoCancellation);

  // LiveKit Client Room Lifecycle
  useEffect(() => {
    if (!open || !meeting) {
      if (livekitRoomRef.current) {
        try {
          livekitRoomRef.current.disconnect();
        } catch (_) {}
        livekitRoomRef.current = null;
      }
      setLivekitConnectionState("idle");
      setLivekitError(null);
      setRemoteTracksMap(new Map());
      return;
    }

    if (!sfuConfig || !sfuConfig.configured) {
      setLivekitConnectionState("unconfigured");
      return;
    }

    let isCancelled = false;
    let roomInstance: Room | null = null;

    const connectToLiveKit = async () => {
      try {
        setLivekitConnectionState("connecting");
        setLivekitError(null);

        // Fetch scoped token from server
        const tokenRes: any = await api.post(`/api/chat/meetings/${meeting.callId}/token`, {
          groupId: meeting.groupId,
          callType: meeting.callType,
        });

        const tokenData = tokenRes?.data || tokenRes;
        const { token, url, iceServers } = tokenData || {};

        if (!token || !url) {
          throw new Error("Server did not return a valid LiveKit token or URL.");
        }

        if (isCancelled) return;

        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
        });
        livekitRoomRef.current = roomInstance;

        roomInstance.on(RoomEvent.Connected, () => {
          if (!isCancelled) {
            setLivekitConnectionState("connected");
            setLivekitError(null);
          }
        });

        roomInstance.on(RoomEvent.Reconnecting, () => {
          if (!isCancelled) setLivekitConnectionState("reconnecting");
        });

        roomInstance.on(RoomEvent.Reconnected, () => {
          if (!isCancelled) setLivekitConnectionState("connected");
        });

        roomInstance.on(RoomEvent.Disconnected, () => {
          if (!isCancelled) setLivekitConnectionState("idle");
        });

        roomInstance.on(
          RoomEvent.TrackSubscribed,
          (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            const userId = participant.identity;
            setRemoteTracksMap((prev) => {
              const next = new Map(prev);
              const existing = next.get(userId) || {};
              if (track.kind === Track.Kind.Video) {
                const stream = new MediaStream([track.mediaStreamTrack]);
                next.set(userId, { ...existing, videoTrack: track, stream });
              } else if (track.kind === Track.Kind.Audio) {
                next.set(userId, { ...existing, audioTrack: track });
              }
              return next;
            });
          }
        );

        roomInstance.on(
          RoomEvent.TrackUnsubscribed,
          (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
            const userId = participant.identity;
            setRemoteTracksMap((prev) => {
              const next = new Map(prev);
              const existing = next.get(userId);
              if (existing) {
                if (track.kind === Track.Kind.Video) {
                  next.set(userId, { ...existing, videoTrack: null, stream: null });
                } else if (track.kind === Track.Kind.Audio) {
                  next.set(userId, { ...existing, audioTrack: null });
                }
              }
              return next;
            });
          }
        );

        // Connect room to SFU server
        await roomInstance.connect(url, token, {
          autoSubscribe: true,
          rtcConfig: {
            iceServers: iceServers && iceServers.length > 0 ? iceServers : undefined,
          },
        });

        if (isCancelled) {
          roomInstance.disconnect();
          return;
        }

        // Publish initial local tracks
        try {
          await roomInstance.localParticipant.setMicrophoneEnabled(!isMuted);
          await roomInstance.localParticipant.setCameraEnabled(!isVideoOff);
        } catch (pubErr) {
          console.warn("Failed to publish initial tracks to LiveKit room:", pubErr);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("LiveKit SFU connection error:", err);
          setLivekitConnectionState("error");
          setLivekitError(err.message || "Failed to establish media connection to LiveKit server.");
        }
      }
    };

    connectToLiveKit();

    return () => {
      isCancelled = true;
      if (roomInstance) {
        try {
          roomInstance.disconnect();
        } catch (_) {}
      }
      livekitRoomRef.current = null;
    };
  }, [open, meeting?.callId, sfuConfig?.configured]);

  // Sync mute state to LiveKit
  useEffect(() => {
    const room = livekitRoomRef.current;
    if (room && room.state === ConnectionState.Connected) {
      room.localParticipant.setMicrophoneEnabled(!isMuted).catch((e) => console.warn(e));
    }
  }, [isMuted]);

  // Sync camera state to LiveKit
  useEffect(() => {
    const room = livekitRoomRef.current;
    if (room && room.state === ConnectionState.Connected) {
      room.localParticipant.setCameraEnabled(!isVideoOff).catch((e) => console.warn(e));
    }
  }, [isVideoOff]);

  // Sync screen share state to LiveKit
  useEffect(() => {
    const room = livekitRoomRef.current;
    if (room && room.state === ConnectionState.Connected) {
      room.localParticipant.setScreenShareEnabled(isScreenSharing).catch((e) => console.warn(e));
    }
  }, [isScreenSharing]);

  // Enumerate devices on open
  useEffect(() => {
    if (!open) return;
    const fetchDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoInputDevices(devices.filter((d) => d.kind === "videoinput"));
        setAudioOutputDevices(devices.filter((d) => d.kind === "audiooutput"));
      } catch (err) {
        console.warn("Failed to enumerate devices:", err);
      }
    };
    fetchDevices();
  }, [open]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (isChatDrawerOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [threadMessages, isChatDrawerOpen]);

  // Resolve active speaker or spotlight user
  const effectiveSpotlightUser = useMemo(() => {
    if (spotlightUserId) {
      const match = participants.find((p) => p.userId === spotlightUserId);
      if (match) return match;
    }
    // Default to the first participant speaking, or host, or first remote
    const speaking = participants.find((p) => p.isSpeaking);
    if (speaking) return speaking;
    const remote = participants.find((p) => !p.isLocal);
    if (remote) return remote;
    return participants[0] || null;
  }, [spotlightUserId, participants]);

  // Check if someone is sharing their screen
  const screenSharingParticipant = useMemo(() => {
    if (isScreenSharing) {
      return {
        userId: currentUserId,
        name: currentUserName,
        isLocal: true,
      };
    }
    return participants.find((p) => p.isScreenSharing) || null;
  }, [isScreenSharing, currentUserId, currentUserName, participants]);

  // Filter available colleagues for invitation
  const inviteColleaguesList = useMemo(() => {
    const existingIds = new Set(participants.map((p) => p.userId));
    return availableColleagues
      .filter((c) => !existingIds.has(c.id) && c.id !== currentUserId)
      .filter((c) =>
        inviteSearch
          ? c.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
            (c.email && c.email.toLowerCase().includes(inviteSearch.toLowerCase()))
          : true
      );
  }, [availableColleagues, participants, currentUserId, inviteSearch]);

  const handleSendInvite = () => {
    if (selectedInviteIds.length === 0) return;
    onInviteColleagues(selectedInviteIds);
    setSelectedInviteIds([]);
    setIsInviteDialogOpen(false);
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inMeetingMessage.trim() || !onSendMessage) return;
    onSendMessage(inMeetingMessage.trim());
    setInMeetingMessage("");
  };

  if (!open || !meeting) return null;

  // ==========================================================================
  // FLOATING PICTURE-IN-PICTURE (MINIMIZED) VIEW
  // ==========================================================================
  if (isMinimized) {
    return (
      <div
        data-testid="meeting-pip-widget"
        className="fixed bottom-5 right-5 z-50 w-72 md:w-80 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-success animate-ping" />
            <h4 className="text-xs font-bold truncate">{meeting.groupName}</h4>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-foreground hover:text-foreground hover:bg-card"
              onClick={() => setIsMinimized(false)}
              title="Expand Meeting"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono text-success">{formatDuration(elapsedSeconds)}</span>
          <span className="flex items-center gap-1">
            <Users className="size-3 text-muted-foreground" />
            {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </span>
        </div>

        {/* PiP Action Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleMute}
            className={cn("size-8 p-0 rounded-full", isMuted ? "text-destructive hover:bg-destructive/40" : "text-success hover:bg-success/40")}
          >
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleVideo}
            className={cn("size-8 p-0 rounded-full", isVideoOff ? "text-destructive hover:bg-destructive/40" : "text-primary hover:bg-primary/40")}
          >
            {isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onLeaveMeeting}
            className="h-7 px-3 text-xs rounded-full bg-destructive hover:bg-destructive"
          >
            <LogOut className="size-3 mr-1" /> Leave
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // FULL MEETING MODAL VIEW
  // ==========================================================================
  return (
    <Dialog open={open && !isMinimized} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="multi-participant-meeting-dialog"
        className="max-w-[96vw] md:max-w-7xl h-[92vh] p-0 overflow-hidden border border-border bg-background text-foreground rounded-2xl shadow-2xl flex flex-col font-sans [&>button:last-child]:hidden"
      >
        {/* TOP HEADER */}
        <div className="h-14 px-4 md:px-6 bg-card/90 border-b border-border/80 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("size-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-md", getAvatarColor(meeting.groupName))}>
              {meeting.groupName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-foreground truncate max-w-[200px] md:max-w-md">
                  {meeting.groupName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-success/20 text-success border border-success/30">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" />
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {meeting.isHost ? "You are the Meeting Host" : `Host: ${meeting.creatorId === currentUserId ? "You" : "Colleague"}`} &bull; {participants.length} Active
              </p>
            </div>
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-2">
            {/* SFU Connection & Diagnostic Badges */}
            {livekitConnectionState === "connected" ? (
              <span
                data-testid="badge-sfu-connected"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 border border-success/30 text-success text-[11px] font-medium"
              >
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span>LiveKit SFU Active</span>
              </span>
            ) : livekitConnectionState === "connecting" ? (
              <span
                data-testid="badge-sfu-connecting"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent-foreground text-[11px] font-medium"
              >
                <span className="size-2 rounded-full bg-accent animate-ping" />
                <span>Connecting SFU...</span>
              </span>
            ) : livekitConnectionState === "error" ? (
              <span
                data-testid="badge-sfu-error"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-destructive text-[11px] font-medium"
                title={livekitError || "SFU connection error"}
              >
                <AlertCircle className="size-3.5 text-destructive" />
                <span>SFU Connect Failed</span>
              </span>
            ) : (!sfuConfig || !sfuConfig.configured || livekitConnectionState === "unconfigured") ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    data-testid="btn-sfu-diagnostic-notice"
                    className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 border border-warning/30 text-warning text-[11px] hover:bg-warning/25 transition-colors cursor-pointer"
                  >
                    <AlertCircle className="size-3.5 text-warning" />
                    <span>LiveKit SFU Notice</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-card border-border text-foreground text-xs space-y-2">
                  <div className="font-semibold text-warning flex items-center gap-1.5">
                    <Info className="size-4" /> LiveKit SFU Required for Production
                  </div>
                  <p className="text-[11px] text-foreground leading-relaxed">
                    LiveKit SFU credentials are unset on this server. Media preview and local device loops are active. Set <code className="text-primary">LIVEKIT_URL</code>, <code className="text-primary">LIVEKIT_API_KEY</code>, and <code className="text-primary">LIVEKIT_API_SECRET</code> for cloud SFU multi-party relay.
                  </p>
                  <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
                    STUN/TURN: {sfuConfig?.hasTurn ? "Configured" : "Google Public STUN Active"}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}

            {/* Layout Toggle Quick Action */}
            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-toggle-meeting-layout"
              onClick={() => setLayoutMode(layoutMode === "grid" ? "speaker" : "grid")}
              className="size-8 text-foreground hover:text-foreground hover:bg-card rounded-lg cursor-pointer relative z-20"
              title={layoutMode === "grid" ? "Switch to Speaker Spotlight View" : "Switch to Equal Grid View"}
            >
              {layoutMode === "grid" ? <LayoutGrid className="size-4" /> : <Grid className="size-4" />}
            </Button>

            {/* Minimize to PiP */}
            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-minimize-meeting"
              onClick={() => setIsMinimized(true)}
              className="size-8 text-foreground hover:text-foreground hover:bg-card rounded-lg cursor-pointer relative z-20"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* SFU NOT CONFIGURED NOTIFICATION BANNER */}
        {(!sfuConfig || !sfuConfig.configured) && (
          <div className="bg-warning/40 border-b border-warning/50 px-4 py-1.5 flex items-center justify-between text-[11px] text-warning">
            <span className="flex items-center gap-1.5 truncate">
              <AlertCircle className="size-3.5 shrink-0 text-warning" />
              LiveKit SFU credentials unconfigured. Signaling and local media preview active. Configure LiveKit for production multiparty relay.
            </span>
            <span className="text-[10px] text-warning font-mono hidden md:inline">STUN/TURN Active</span>
          </div>
        )}

        {/* MIDDLE STAGE AREA (VIDEO GRID / SPOTLIGHT / SCREEN SHARE + DRAWERS) */}
        <div className="flex-1 min-h-0 relative flex overflow-hidden bg-background">
          {/* MAIN PRESENTATION / VIDEO STAGE */}
          <div className="flex-1 min-h-0 relative flex flex-col p-3 overflow-hidden">
            {/* 1. SCREEN SHARE PRESENTATION STAGE (IF ANYONE IS SHARING SCREEN) */}
            {screenSharingParticipant ? (
              <div data-testid="meeting-screen-stage" className="flex-1 min-h-0 flex flex-col gap-2 relative">
                {/* Screen Share Dominant Video Container */}
                <div className="flex-1 min-h-0 bg-black rounded-2xl border border-border overflow-hidden relative flex items-center justify-center">
                  {screenSharingParticipant.isLocal ? (
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <MonitorUp className="size-12 text-primary animate-pulse" />
                      <p className="text-sm font-semibold text-foreground">
                        {screenSharingParticipant.name} is presenting their screen
                      </p>
                    </div>
                  )}

                  {/* Top Floating Pill */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-card/80 backdrop-blur-md border border-border text-xs font-medium text-foreground flex items-center gap-2 shadow-lg">
                    <MonitorUp className="size-3.5 text-primary" />
                    <span>
                      {screenSharingParticipant.isLocal ? "You are presenting" : `${screenSharingParticipant.name} is presenting`}
                    </span>
                  </div>

                  {/* Stop Sharing Button if local user is sharing */}
                  {screenSharingParticipant.isLocal && (
                    <div className="absolute top-3 right-3 z-20">
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid="btn-stop-screen-share"
                        onClick={onToggleScreenShare}
                        className="rounded-full h-8 px-3 text-xs gap-1.5 shadow-xl bg-destructive hover:bg-destructive font-semibold cursor-pointer"
                      >
                        <MonitorOff className="size-3.5" /> Stop Sharing
                      </Button>
                    </div>
                  )}
                </div>

                {/* Compact Participant Filmstrip below screen stage */}
                <div className="h-28 shrink-0 flex items-center gap-2 overflow-x-auto py-1 px-1">
                  {participants.map((p) => (
                    <ParticipantCard
                      key={p.userId}
                      participant={p}
                      isLocalUser={p.isLocal || p.userId === currentUserId}
                      localStreamRef={localVideoRef}
                      isHost={meeting.isHost}
                      onRemove={() => onRemoveParticipant(p.userId)}
                      onPin={() => setSpotlightUserId(spotlightUserId === p.userId ? null : p.userId)}
                      isPinned={spotlightUserId === p.userId}
                      remoteTrackInfo={remoteTracksMap.get(p.userId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : layoutMode === "speaker" && effectiveSpotlightUser ? (
              // 2. ACTIVE SPEAKER SPOTLIGHT MODE
              <div data-testid="meeting-speaker-stage" className="flex-1 min-h-0 flex flex-col gap-2 relative">
                {/* Large Spotlight Tile */}
                <div className="flex-1 min-h-0 relative">
                  <ParticipantCard
                    participant={effectiveSpotlightUser}
                    isLocalUser={effectiveSpotlightUser.isLocal || effectiveSpotlightUser.userId === currentUserId}
                    localStreamRef={localVideoRef}
                    isHost={meeting.isHost}
                    onRemove={() => onRemoveParticipant(effectiveSpotlightUser.userId)}
                    onPin={() => setSpotlightUserId(null)}
                    isPinned={true}
                    remoteTrackInfo={remoteTracksMap.get(effectiveSpotlightUser.userId)}
                    spotlight
                  />
                </div>

                {/* Bottom Horizontal Filmstrip */}
                <div className="h-28 shrink-0 flex items-center gap-2 overflow-x-auto py-1 px-1">
                  {participants.map((p) => (
                    <ParticipantCard
                      key={p.userId}
                      participant={p}
                      isLocalUser={p.isLocal || p.userId === currentUserId}
                      localStreamRef={localVideoRef}
                      isHost={meeting.isHost}
                      onRemove={() => onRemoveParticipant(p.userId)}
                      onPin={() => setSpotlightUserId(spotlightUserId === p.userId ? null : p.userId)}
                      isPinned={spotlightUserId === p.userId}
                      remoteTrackInfo={remoteTracksMap.get(p.userId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : (
              // 3. EQUAL-SIZE RESPONSIVE PARTICIPANT GRID (1, 2, 3, 4, 5+ PARTICIPANTS)
              <div
                data-testid="meeting-participant-grid"
                className={cn(
                  "flex-1 min-h-0 grid gap-3 w-full h-full",
                  participants.length === 1 && "grid-cols-1",
                  participants.length === 2 && "grid-cols-1 md:grid-cols-2",
                  (participants.length === 3 || participants.length === 4) && "grid-cols-2",
                  participants.length >= 5 && "grid-cols-2 md:grid-cols-3"
                )}
              >
                {participants.map((p) => (
                  <ParticipantCard
                    key={p.userId}
                    participant={p}
                    isLocalUser={p.isLocal || p.userId === currentUserId}
                    localStreamRef={localVideoRef}
                    isHost={meeting.isHost}
                    onRemove={() => onRemoveParticipant(p.userId)}
                    onPin={() => {
                      setSpotlightUserId(p.userId);
                      setLayoutMode("speaker");
                    }}
                    isPinned={spotlightUserId === p.userId}
                    remoteTrackInfo={remoteTracksMap.get(p.userId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT-HAND COLLAPSIBLE PARTICIPANTS DRAWER */}
          {isParticipantsDrawerOpen && (
            <div
              data-testid="meeting-participants-drawer"
              className="w-80 shrink-0 border-l border-border bg-card/95 flex flex-col z-20 animate-in slide-in-from-right duration-200"
            >
              <div className="h-12 px-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <Users className="size-4 text-primary" />
                  <span>Participants ({participants.length})</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsParticipantsDrawerOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Invite Colleagues Action Button */}
              <div className="p-3 border-b border-border">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="btn-open-invite-dialog"
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="w-full h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <UserPlus className="size-3.5" /> Invite Colleagues
                </Button>
              </div>

              {/* Participant Roster List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {participants.map((p) => {
                  const isSelf = p.isLocal || p.userId === currentUserId;
                  return (
                    <div
                      key={p.userId}
                      className="p-2 rounded-xl bg-background/60 border border-border/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                            getAvatarColor(p.name),
                            p.isSpeaking && "ring-2 ring-success"
                          )}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {p.name} {isSelf && <span className="text-muted-foreground text-[10px]">(You)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.role === "host" ? "Host" : "Member"}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges & Host Controls */}
                      <div className="flex items-center gap-1.5">
                        {p.isSpeaking && (
                          <span title="Speaking">
                            <Activity className="size-3.5 text-success animate-pulse" />
                          </span>
                        )}
                        {p.isMuted ? (
                          <span title="Muted">
                            <MicOff className="size-3.5 text-destructive" />
                          </span>
                        ) : (
                          <span title="Mic live">
                            <Mic className="size-3.5 text-success" />
                          </span>
                        )}
                        {p.isCameraOff ? (
                          <span title="Camera off">
                            <VideoOff className="size-3.5 text-destructive" />
                          </span>
                        ) : (
                          <span title="Camera on">
                            <Video className="size-3.5 text-primary" />
                          </span>
                        )}

                        {meeting.isHost && !isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onRemoveParticipant(p.userId)}
                            className="size-6 text-destructive hover:text-destructive hover:bg-destructive/40 rounded-full"
                            title="Remove from meeting"
                          >
                            <X className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT-HAND IN-MEETING CHAT DRAWER */}
          {isChatDrawerOpen && (
            <div
              data-testid="meeting-chat-drawer"
              className="w-80 shrink-0 border-l border-border bg-card/95 flex flex-col z-20 animate-in slide-in-from-right duration-200"
            >
              <div className="h-12 px-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <MessageSquare className="size-4 text-primary" />
                  <span>In-Meeting Chat</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsChatDrawerOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Chat Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {threadMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-foreground text-xs">
                    <MessageSquare className="size-8 mb-2 opacity-40" />
                    <span>No chat messages yet.</span>
                    <span className="text-[10px] text-muted-foreground">Send notes to all attendees.</span>
                  </div>
                ) : (
                  threadMessages.map((msg) => (
                    <div key={msg.id} className="p-2 rounded-xl bg-background/80 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold text-primary">{msg.senderName || "Colleague"}</span>
                        <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                      </div>
                      <p className="text-foreground text-xs break-words">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="p-2 border-t border-border flex items-center gap-2">
                <Input
                  value={inMeetingMessage}
                  onChange={(e) => setInMeetingMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="h-8 text-xs bg-background border-border text-foreground placeholder:text-foreground"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inMeetingMessage.trim()}
                  className="size-8 bg-primary hover:bg-primary text-primary-foreground shrink-0"
                >
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* BOTTOM FLOATING MEETING TOOLBAR */}
        <div className="h-20 bg-card/90 border-t border-border/80 px-4 flex items-center justify-center shrink-0 relative select-none">
          <div
            data-testid="meeting-toolbar"
            className="flex items-center gap-2 md:gap-3 bg-background/80 backdrop-blur-md border border-border rounded-2xl px-3 md:px-5 py-2 shadow-2xl overflow-x-auto max-w-full"
          >
            {/* 1. Mic Button */}
            <Button
              size="icon"
              data-testid="btn-meeting-toggle-mic"
              onClick={onToggleMute}
              className={cn(
                "rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] cursor-pointer transition-all duration-150 active:scale-95",
                isMuted
                  ? "bg-destructive hover:bg-destructive text-destructive-foreground ring-2 ring-destructive/30"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>

            {/* 2. Camera Button */}
            <Button
              size="icon"
              data-testid="btn-meeting-toggle-camera"
              onClick={onToggleVideo}
              className={cn(
                "rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] cursor-pointer transition-all duration-150 active:scale-95",
                isVideoOff
                  ? "bg-destructive hover:bg-destructive text-destructive-foreground ring-2 ring-destructive/30"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
            </Button>

            {/* 3. Screen Share Button */}
            <Button
              size="icon"
              data-testid="btn-meeting-toggle-screenshare"
              onClick={onToggleScreenShare}
              className={cn(
                "rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] cursor-pointer transition-all duration-150 active:scale-95",
                isScreenSharing
                  ? "bg-primary hover:bg-primary text-primary-foreground ring-4 ring-primary/30"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Entire Screen"}
            >
              {isScreenSharing ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
            </Button>

            <div className="h-6 w-px bg-card mx-1 hidden sm:block" />

            {/* 4. Layout Mode Toggle */}
            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-toggle-grid-speaker"
              onClick={() => setLayoutMode(layoutMode === "grid" ? "speaker" : "grid")}
              className="rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] bg-card hover:bg-secondary text-foreground cursor-pointer hidden sm:flex"
              title={layoutMode === "grid" ? "Switch to Speaker Spotlight View" : "Switch to Grid View"}
            >
              {layoutMode === "grid" ? <LayoutGrid className="size-5" /> : <Grid className="size-5" />}
            </Button>

            {/* 5. Device Settings Popover */}
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid="btn-meeting-device-settings"
                  className="rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] bg-card hover:bg-secondary text-foreground cursor-pointer"
                  title="Audio & Video Device Settings"
                >
                  <Sliders className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-card border-border text-foreground space-y-3 font-sans">
                <div className="font-semibold text-xs text-primary flex items-center gap-1.5 border-b border-border pb-2">
                  <Sliders className="size-3.5" /> Media Device Settings
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Microphone</label>
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => setSelectedAudioInput(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2 text-foreground"
                  >
                    {audioInputDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Camera</label>
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => setSelectedVideoInput(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2 text-foreground"
                  >
                    {videoInputDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Speaker / Output</label>
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => setSelectedAudioOutput(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2 text-foreground"
                  >
                    {audioOutputDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Speaker ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Audio Processing & Constraints Diagnostics */}
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Audio Processing
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground font-medium">Noise Suppression</span>
                    <span
                      data-testid="badge-noise-suppression"
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-mono font-medium",
                        isNoiseSuppressionSupported
                          ? "bg-success/80 text-success border border-success/50"
                          : "bg-card text-muted-foreground"
                      )}
                    >
                      {isNoiseSuppressionSupported ? "Browser Supported" : "Not Available"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground font-medium">Echo Cancellation</span>
                    <span
                      data-testid="badge-echo-cancellation"
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-mono font-medium",
                        isEchoCancellationSupported
                          ? "bg-success/80 text-success border border-success/50"
                          : "bg-card text-muted-foreground"
                      )}
                    >
                      {isEchoCancellationSupported ? "Browser Supported" : "Not Available"}
                    </span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* 6. Participants Drawer Toggle */}
            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-toggle-participants"
              onClick={() => {
                setIsParticipantsDrawerOpen(!isParticipantsDrawerOpen);
                if (isChatDrawerOpen) setIsChatDrawerOpen(false);
              }}
              className={cn(
                "rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] cursor-pointer relative",
                isParticipantsDrawerOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title="Participants Roster"
            >
              <Users className="size-5" />
              <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {participants.length}
              </Badge>
            </Button>

            {/* 7. Chat Drawer Toggle */}
            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-toggle-chat"
              onClick={() => {
                setIsChatDrawerOpen(!isChatDrawerOpen);
                if (isParticipantsDrawerOpen) setIsParticipantsDrawerOpen(false);
              }}
              className={cn(
                "rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] cursor-pointer",
                isChatDrawerOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title="In-Meeting Chat"
            >
              <MessageSquare className="size-5" />
            </Button>

            <div className="h-6 w-px bg-card mx-1" />

            {/* 8. Leave / End Call Button */}
            {meeting.isHost ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    data-testid="btn-meeting-leave-or-end"
                    className="rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] bg-destructive hover:bg-destructive text-destructive-foreground cursor-pointer ring-2 ring-destructive/40"
                    title="Leave or End Meeting"
                  >
                    <PhoneOff className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-card border-border text-foreground space-y-1 font-sans">
                  <button
                    data-testid="btn-meeting-leave-only"
                    onClick={onLeaveMeeting}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-card flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="size-4 text-muted-foreground" />
                    <span>Leave Meeting</span>
                  </button>
                  <button
                    data-testid="btn-meeting-end-for-everyone"
                    onClick={onEndMeetingForEveryone}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/40 flex items-center gap-2 cursor-pointer"
                  >
                    <PhoneOff className="size-4 text-destructive" />
                    <span>End Meeting for Everyone</span>
                  </button>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                size="icon"
                variant="destructive"
                data-testid="btn-meeting-leave-only"
                onClick={onLeaveMeeting}
                className="rounded-full size-11 shrink-0 min-w-[44px] min-h-[44px] bg-destructive hover:bg-destructive text-destructive-foreground cursor-pointer ring-2 ring-destructive/40"
                title="Leave Meeting"
              >
                <PhoneOff className="size-5" />
              </Button>
            )}
          </div>
        </div>

        {/* IN-MEETING COLLEAGUE INVITATION DIALOG */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent
            data-testid="meeting-invite-colleagues-dialog"
            className="sm:max-w-md bg-card border-border text-foreground font-sans"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <UserPlus className="size-4 text-primary" />
                  <span>Invite Colleagues to Meeting</span>
                </div>
              </div>

              <Input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                placeholder="Search colleagues by name or email..."
                className="h-9 text-xs bg-background border-border text-foreground"
              />

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {inviteColleaguesList.length === 0 ? (
                  <p className="text-center py-6 text-xs text-foreground">
                    No available colleagues found to invite.
                  </p>
                ) : (
                  inviteColleaguesList.map((colleague) => {
                    const isSelected = selectedInviteIds.includes(colleague.id);
                    return (
                      <div
                        key={colleague.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInviteIds(selectedInviteIds.filter((id) => id !== colleague.id));
                          } else {
                            setSelectedInviteIds([...selectedInviteIds, colleague.id]);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/40 border-primary/60"
                            : "bg-background/40 border-border hover:bg-card/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "size-8 rounded-full flex items-center justify-center font-bold text-xs text-foreground",
                              getAvatarColor(colleague.name)
                            )}
                          >
                            {colleague.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{colleague.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{colleague.email || "Team Colleague"}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="size-4 rounded-sm text-primary border-border"
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteDialogOpen(false)}
                  className="h-8 text-xs border-border text-foreground hover:bg-card"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  data-testid="btn-confirm-send-invitations"
                  disabled={selectedInviteIds.length === 0}
                  onClick={handleSendInvite}
                  className="h-8 text-xs bg-primary hover:bg-primary text-primary-foreground font-semibold"
                >
                  Send Invitation ({selectedInviteIds.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. REUSABLE PARTICIPANT TILE / CARD
// ============================================================================

interface ParticipantCardProps {
  participant: MeetingParticipant;
  isLocalUser: boolean;
  localStreamRef: React.RefObject<HTMLVideoElement | null>;
  isHost: boolean;
  onRemove: () => void;
  onPin: () => void;
  isPinned?: boolean;
  compact?: boolean;
  spotlight?: boolean;
  remoteTrackInfo?: RemoteTrackInfo;
}

function ParticipantCard({
  participant,
  isLocalUser,
  localStreamRef,
  isHost,
  onRemove,
  onPin,
  isPinned,
  compact = false,
  spotlight = false,
  remoteTrackInfo,
}: ParticipantCardProps) {
  const isCameraOff = participant.isCameraOff;
  const hasRemoteMedia = Boolean(participant.mediaStream || remoteTrackInfo?.stream || remoteTrackInfo?.videoTrack);

  return (
    <div
      data-testid={`participant-card-${participant.userId}`}
      className={cn(
        "bg-card border rounded-2xl overflow-hidden relative flex items-center justify-center transition-all duration-200 select-none group",
        participant.isSpeaking
          ? "border-success/30 ring-2 ring-success/50 shadow-md"
          : "border-border/80 hover:border-border",
        compact && "w-36 h-24 shrink-0 rounded-xl",
        spotlight && "w-full h-full",
        !compact && !spotlight && "w-full h-full min-h-[160px]"
      )}
    >
      {/* Video Stream or Fallback Avatar */}
      {isLocalUser ? (
        <video
          ref={localStreamRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover transition-opacity",
            isCameraOff ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        />
      ) : (
        <div className="w-full h-full relative flex items-center justify-center bg-card/60 overflow-hidden">
          <video
            ref={(el) => {
              if (el) {
                if (participant.mediaStream) {
                  el.srcObject = participant.mediaStream;
                } else if (remoteTrackInfo?.stream) {
                  el.srcObject = remoteTrackInfo.stream;
                } else if (remoteTrackInfo?.videoTrack) {
                  remoteTrackInfo.videoTrack.attach(el);
                }
              }
            }}
            data-testid={`remote-video-${participant.userId}`}
            autoPlay
            playsInline
            className={cn(
              "w-full h-full object-cover transition-opacity",
              isCameraOff || !hasRemoteMedia
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            )}
          />
          {remoteTrackInfo?.audioTrack && (
            <audio
              ref={(el) => {
                if (el && remoteTrackInfo.audioTrack) {
                  remoteTrackInfo.audioTrack.attach(el);
                }
              }}
              autoPlay
              data-testid={`remote-audio-${participant.userId}`}
            />
          )}
        </div>
      )}

      {/* Fallback Camera Off Avatar */}
      {(isCameraOff || (!isLocalUser && !hasRemoteMedia)) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-card">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold text-foreground shadow-xl transition-all duration-200",
              getAvatarColor(participant.name),
              compact ? "size-10 text-xs" : spotlight ? "size-28 text-3xl" : "size-18 text-xl",
              participant.isSpeaking && "ring-4 ring-success scale-105"
            )}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          {!compact && (
            <span className="text-[11px] text-muted-foreground mt-2 font-medium">
              {isCameraOff ? "Camera is off" : "Connecting media..."}
            </span>
          )}
        </div>
      )}

      {/* Bottom Left Name & Role Pill */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
        <div className="px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-md border border-border text-[11px] font-medium text-foreground flex items-center gap-1.5 shadow-md">
          <span className="truncate max-w-[100px] md:max-w-[140px]">{participant.name}</span>
          {isLocalUser && <span className="text-primary text-[10px]">(You)</span>}
          {participant.role === "host" && (
            <Badge className="h-4 px-1 text-[9px] bg-warning/20 text-warning border-none font-semibold">
              Host
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Right Mic Badge */}
      <div className="absolute bottom-2 right-2 z-10">
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center shadow-md",
            participant.isMuted
              ? "bg-destructive/90 text-destructive-foreground"
              : participant.isSpeaking
              ? "bg-success text-success-foreground ring-2 ring-success animate-pulse"
              : "bg-card/90 text-foreground"
          )}
          title={participant.isMuted ? "Muted" : "Active"}
        >
          {participant.isMuted ? <MicOff className="size-3" /> : <Mic className="size-3" />}
        </div>
      </div>

      {/* Top Right Quick Controls on Hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="ghost"
          onClick={onPin}
          className="size-7 rounded-full bg-background/80 text-foreground hover:text-foreground"
          title={isPinned ? "Unpin Spotlight" : "Pin Spotlight"}
        >
          {isPinned ? <PinOff className="size-3.5 text-primary" /> : <Pin className="size-3.5" />}
        </Button>

        {isHost && !isLocalUser && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="size-7 rounded-full bg-destructive/80 text-destructive hover:bg-destructive"
            title="Remove from meeting"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

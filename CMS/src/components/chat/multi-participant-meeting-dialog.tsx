"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  X,
  LogOut,
  Send,
  Pin,
  PinOff,
  ShieldAlert,
  Camera,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getSocketClient, isSocketDisabled } from "@/lib/socket";

export interface RemoteTrackInfo {
  stream?: MediaStream | null;
  screenShareStream?: MediaStream | null;
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

export interface ColleagueItem {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  department?: string | null;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function registerGlobalMediaStream(stream: MediaStream) {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (!w.__HRMS_ACTIVE_MEDIA_STREAMS__) {
    w.__HRMS_ACTIVE_MEDIA_STREAMS__ = new Set<MediaStream>();
  }
  w.__HRMS_ACTIVE_MEDIA_STREAMS__.add(stream);
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
// 1. INCOMING GROUP MEETING DIALOG (WITH CAMERA & MIC GATE — ITEMS 4 & 12)
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
  const [checkingMedia, setCheckingMedia] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    setCheckingMedia(false);
    setPermissionError(null);
  }, [incoming?.callId]);

  const verifyAndJoin = useCallback(async () => {
    if (!incoming || checkingMedia) return;
    setCheckingMedia(true);
    setPermissionError(null);

    const needsVideo = incoming.callType === "video";
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setPermissionError(
          needsVideo
            ? "Camera and microphone permissions are required to join this video meeting."
            : "Microphone permission is required to join this voice meeting."
        );
        setCheckingMedia(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: needsVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });

      registerGlobalMediaStream(stream);
      if (typeof window !== "undefined") {
        (window as any).__HRMS_VERIFIED_CALLEE_STREAM__ = {
          callId: incoming.callId,
          stream,
          createdAt: Date.now(),
        };
      }

      setCheckingMedia(false);
      onAccept();
    } catch (err: any) {
      const msg = needsVideo
        ? "Camera and microphone access is blocked. Please allow browser permission and tap Allow Permission & Join."
        : "Microphone access is blocked. Please allow browser permission and tap Allow Permission & Join.";
      setPermissionError(msg);
      setCheckingMedia(false);
    }
  }, [incoming, checkingMedia, onAccept]);

  if (!incoming) return null;

  return (
    <Dialog open={!!incoming} onOpenChange={(v) => !v && onDecline()}>
      <DialogContent
        data-testid="incoming-group-meeting-dialog"
        className="sm:max-w-md p-0 overflow-hidden border-primary/30 bg-background text-foreground shadow-2xl font-sans"
      >
        <div className="relative p-6 flex flex-col items-center text-center space-y-4">
          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-semibold">
            <span className="size-2 rounded-full bg-primary animate-ping" />
            <span>
              Incoming Group {incoming.callType === "video" ? "Video" : "Voice"} Call
            </span>
          </div>

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
              {incoming.callType === "video" ? (
                <Video className="size-4" />
              ) : (
                <Phone className="size-4" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {incoming.groupName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Invited by{" "}
              <span className="font-semibold text-foreground">{incoming.callerName}</span>
            </p>
          </div>

          {permissionError && (
            <div
              role="alert"
              data-testid="group-callee-permission-alert"
              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 p-3 text-left text-xs space-y-2"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <span className="font-medium text-foreground">{permissionError}</span>
              </div>
              <Button
                size="sm"
                onClick={() => void verifyAndJoin()}
                disabled={checkingMedia}
                className="w-full h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {incoming.callType === "video" ? (
                  <Camera className="size-3.5" />
                ) : (
                  <Mic className="size-3.5" />
                )}
                <span>Allow Permission & Join</span>
              </Button>
            </div>
          )}

          <div className="flex items-center justify-center gap-8 pt-2 w-full">
            <div className="flex flex-col items-center gap-1.5">
              <Button
                variant="destructive"
                size="icon"
                data-testid="btn-decline-group-meeting"
                disabled={checkingMedia}
                className="rounded-full size-14 shadow-lg cursor-pointer transition-transform active:scale-95"
                onClick={() => onDecline()}
                title="Decline"
              >
                <PhoneOff className="size-6 text-white" />
              </Button>
              <span className="text-[11px] font-medium text-muted-foreground">Decline</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Button
                size="icon"
                data-testid="btn-accept-group-meeting"
                disabled={checkingMedia}
                className="rounded-full size-14 shadow-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer ring-4 ring-emerald-500/30 transition-transform active:scale-95"
                onClick={() => void verifyAndJoin()}
                title="Join Meeting"
              >
                {checkingMedia ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : incoming.callType === "video" ? (
                  <Video className="size-6" />
                ) : (
                  <Phone className="size-6" />
                )}
              </Button>
              <span className="text-[11px] font-semibold text-emerald-500">Join</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. MAIN MULTI-PARTICIPANT WEBRTC MESH MEETING COMPONENT
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
  isMuted,
  isVideoOff,
  isScreenSharing,
  localStream,
  screenStream,
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

  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Pure WebRTC Mesh P2P state & refs
  const [meshConnectionState, setMeshConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [remoteTracksMap, setRemoteTracksMap] = useState<Map<string, RemoteTrackInfo>>(new Map());
  const [meshRemoteRoster, setMeshRemoteRoster] = useState<Map<string, MeetingParticipant>>(
    new Map()
  );

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream || null);
  const isScreenSharingRef = useRef<boolean>(isScreenSharing);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localStream) registerGlobalMediaStream(localStream);
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream || null;
    isScreenSharingRef.current = isScreenSharing;
    if (screenStream) registerGlobalMediaStream(screenStream);
  }, [screenStream, isScreenSharing]);

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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff, open]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      if (screenVideoRef.current.srcObject !== screenStream) {
        screenVideoRef.current.srcObject = screenStream;
      }
      screenVideoRef.current.play().catch(() => {});
    }
  }, [screenStream, isScreenSharing]);

  const supportedConstraints = useMemo(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getSupportedConstraints) {
      return navigator.mediaDevices.getSupportedConstraints();
    }
    return null;
  }, []);
  const isNoiseSuppressionSupported = Boolean(supportedConstraints?.noiseSuppression);
  const isEchoCancellationSupported = Boolean(supportedConstraints?.echoCancellation);

  const sendMeshSignal = useCallback(
    (targetUserId: string, signal: any) => {
      if (!meeting?.callId || !targetUserId || targetUserId === currentUserId) return;
      const signalId = `${currentUserId}:${targetUserId}:${signal.type}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      if (!isSocketDisabled()) {
        try {
          const socket = getSocketClient();
          if (socket?.connected) {
            socket.emit("group-call:signal", {
              callId: meeting.callId,
              targetUserId,
              signal: { ...signal, _sid: signalId },
            });
          }
        } catch {}
      }

      api
        .post(`/chat/meetings/${encodeURIComponent(meeting.callId)}/signal`, {
          targetUserId,
          signal: { ...signal, _sid: signalId },
        })
        .catch(() => {});
    },
    [meeting?.callId, currentUserId]
  );

  const getOrCreatePeerConnection = useCallback(
    (peerUserId: string): RTCPeerConnection => {
      const existing = peerConnectionsRef.current.get(peerUserId);
      if (existing && existing.signalingState !== "closed") {
        return existing;
      }

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      peerConnectionsRef.current.set(peerUserId, pc);

      // Attach local audio + active video/screen tracks
      const baseStream = localStreamRef.current;
      if (baseStream) {
        for (const audioTrack of baseStream.getAudioTracks()) {
          pc.addTrack(audioTrack, baseStream);
        }
      }

      const activeScreenTrack =
        isScreenSharingRef.current && screenStreamRef.current
          ? screenStreamRef.current.getVideoTracks()[0]
          : null;
      const activeCamTrack = baseStream ? baseStream.getVideoTracks()[0] : null;
      const videoTrackToSend = activeScreenTrack || activeCamTrack;

      if (videoTrackToSend) {
        const ownerStream =
          activeScreenTrack && screenStreamRef.current
            ? screenStreamRef.current
            : baseStream || new MediaStream([videoTrackToSend]);
        pc.addTrack(videoTrackToSend, ownerStream);
      } else {
        try {
          pc.addTransceiver("video", { direction: "recvonly" });
        } catch {}
      }

      if (!baseStream || baseStream.getAudioTracks().length === 0) {
        try {
          pc.addTransceiver("audio", { direction: "recvonly" });
        } catch {}
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendMeshSignal(peerUserId, {
            type: "candidate",
            candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate,
          });
        }
      };

      pc.ontrack = (e) => {
        const publishRemoteTracks = () => {
          setRemoteTracksMap((prev) => {
            const next = new Map(prev);
            const prevEntry = next.get(peerUserId) || {};
            const prevTracks = prevEntry.stream ? prevEntry.stream.getTracks() : [];
            const incomingTracks =
              e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track];
            const trackByKind = new Map<string, MediaStreamTrack>();
            for (const t of prevTracks) {
              if (t.readyState === "live") trackByKind.set(t.kind, t);
            }
            for (const t of incomingTracks) {
              trackByKind.set(t.kind, t);
            }
            const combinedStream = new MediaStream(Array.from(trackByKind.values()));
            next.set(peerUserId, {
              ...prevEntry,
              stream: combinedStream,
              screenShareStream: combinedStream,
            });
            return next;
          });
          setMeshConnectionState("connected");
        };
        publishRemoteTracks();
        const tracks = e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track];
        tracks.forEach((tr) => {
          tr.onunmute = publishRemoteTracks;
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setMeshConnectionState("connected");
        }
      };

      return pc;
    },
    [sendMeshSignal]
  );

  // Pure WebRTC Mesh P2P Lifecycle
  useEffect(() => {
    if (!open || !meeting?.callId) {
      for (const pc of peerConnectionsRef.current.values()) {
        try {
          pc.close();
        } catch {}
      }
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      processedSignalsRef.current.clear();
      setRemoteTracksMap(new Map());
      setMeshRemoteRoster(new Map());
      setMeshConnectionState("idle");
      return;
    }

    let cancelled = false;
    setMeshConnectionState("connecting");

    const handleIncomingMeshSignal = async (payload: any) => {
      if (cancelled || !payload || payload.callId !== meeting.callId) return;
      const senderId = payload.senderId || payload.fromUserId;
      const signal = payload.signal;
      if (!senderId || senderId === currentUserId || !signal) return;

      if (signal._sid) {
        if (processedSignalsRef.current.has(signal._sid)) return;
        processedSignalsRef.current.add(signal._sid);
      }

      const pc = getOrCreatePeerConnection(senderId);

      try {
        if (signal.type === "offer" && signal.sdp) {
          const isPolite = String(currentUserId) > String(senderId);
          if (pc.signalingState !== "stable") {
            if (!isPolite) return;
            await pc.setLocalDescription({ type: "rollback" } as any).catch(() => {});
          }
          await pc.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: signal.sdp })
          );
          const queued = pendingCandidatesRef.current.get(senderId) || [];
          pendingCandidatesRef.current.delete(senderId);
          for (const c of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendMeshSignal(senderId, { type: "answer", sdp: answer.sdp });
          setMeshConnectionState("connected");
        } else if (signal.type === "answer" && signal.sdp) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: signal.sdp })
            );
            const queued = pendingCandidatesRef.current.get(senderId) || [];
            pendingCandidatesRef.current.delete(senderId);
            for (const c of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
            setMeshConnectionState("connected");
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            const list = pendingCandidatesRef.current.get(senderId) || [];
            list.push(signal.candidate);
            pendingCandidatesRef.current.set(senderId, list);
          }
        }
      } catch (err) {
        console.warn("[WebRTC Mesh] Signal handling warning:", err);
      }
    };

    const handleUserJoined = async (data: any) => {
      if (cancelled || !data || data.callId !== meeting.callId) return;
      const peerId = data.userId;
      if (!peerId || peerId === currentUserId) return;

      setMeshRemoteRoster((prev) => {
        const next = new Map(prev);
        next.set(peerId, {
          userId: peerId,
          name: data.userName || data.name || "Colleague",
          avatar: data.avatar || data.avatarUrl || null,
          role: "participant",
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          isSpeaking: false,
          isLocal: false,
        });
        return next;
      });

      if (String(currentUserId) < String(peerId)) {
        try {
          const pc = getOrCreatePeerConnection(peerId);
          if (pc.signalingState === "stable") {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMeshSignal(peerId, { type: "offer", sdp: offer.sdp });
          }
        } catch {}
      }
    };

    const handleUserLeft = (data: any) => {
      if (!data || data.callId !== meeting.callId) return;
      const peerId = data.userId;
      if (!peerId) return;
      const pc = peerConnectionsRef.current.get(peerId);
      if (pc) {
        try {
          pc.close();
        } catch {}
        peerConnectionsRef.current.delete(peerId);
      }
      pendingCandidatesRef.current.delete(peerId);
      setRemoteTracksMap((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
      setMeshRemoteRoster((prev) => {
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    };

    const handleRemoteMediaState = (data: any) => {
      if (!data || data.callId !== meeting.callId) return;
      const peerId = data.userId;
      if (!peerId || peerId === currentUserId) return;
      setMeshRemoteRoster((prev) => {
        const next = new Map(prev);
        const existing = next.get(peerId) || {
          userId: peerId,
          name: "Colleague",
          role: "participant" as const,
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          isSpeaking: false,
          isLocal: false,
        };
        next.set(peerId, {
          ...existing,
          ...(typeof data.isMuted === "boolean" ? { isMuted: data.isMuted } : {}),
          ...(typeof data.isVideoOff === "boolean" ? { isCameraOff: data.isVideoOff } : {}),
          ...(typeof data.isCameraOff === "boolean" ? { isCameraOff: data.isCameraOff } : {}),
          ...(typeof data.isScreenSharing === "boolean"
            ? { isScreenSharing: data.isScreenSharing }
            : {}),
        });
        return next;
      });
    };

    const socket = !isSocketDisabled() ? getSocketClient() : null;
    if (socket) {
      socket.on("group-call:signal", handleIncomingMeshSignal);
      socket.on("group-call:user_joined", handleUserJoined);
      socket.on("group-call:user_left", handleUserLeft);
      socket.on("group-call:media_state", handleRemoteMediaState);
    }

    const handlePusher = (ev: Event) => {
      const { eventName, data } = (ev as CustomEvent).detail || {};
      if (eventName === "group-call:signal") void handleIncomingMeshSignal(data);
      if (eventName === "group-call:user_joined") void handleUserJoined(data);
      if (eventName === "group-call:user_left") handleUserLeft(data);
      if (eventName === "group-call:media_state") handleRemoteMediaState(data);
    };
    window.addEventListener("hrms:pusher", handlePusher);

    const bootstrapMeshJoin = async () => {
      try {
        const res: any = await api.post(
          `/chat/meetings/${encodeURIComponent(meeting.callId)}/join`,
          {
            groupId: meeting.groupId,
            callType: meeting.callType,
          }
        );
        if (cancelled) return;
        const data = res?.data || res;
        if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
          iceServersRef.current = data.iceServers;
        }

        if (socket?.connected) {
          socket.emit("group-call:join", { callId: meeting.callId });
        }

        const existingPeers: any[] = Array.isArray(data?.participants) ? data.participants : [];
        const remotePeers = existingPeers.filter(
          (p) => p?.userId && p.userId !== currentUserId
        );

        if (remotePeers.length === 0) {
          setMeshConnectionState("connected");
        } else {
          const nextRoster = new Map<string, MeetingParticipant>();
          for (const rp of remotePeers) {
            nextRoster.set(rp.userId, {
              userId: rp.userId,
              name: rp.name || "Colleague",
              avatar: rp.avatar || null,
              role: rp.role === "host" ? "host" : "participant",
              isMuted: false,
              isCameraOff: false,
              isScreenSharing: false,
              isSpeaking: false,
              isLocal: false,
            });
          }
          setMeshRemoteRoster(nextRoster);

          // Newly joined user initiates WebRTC offers to all peers already in the room
          for (const rp of remotePeers) {
            try {
              const pc = getOrCreatePeerConnection(rp.userId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendMeshSignal(rp.userId, { type: "offer", sdp: offer.sdp });
            } catch {}
          }
          setMeshConnectionState("connected");
        }
      } catch (err) {
        if (!cancelled) {
          setMeshConnectionState("connected");
        }
      }
    };

    void bootstrapMeshJoin();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("group-call:signal", handleIncomingMeshSignal);
        socket.off("group-call:user_joined", handleUserJoined);
        socket.off("group-call:user_left", handleUserLeft);
        socket.off("group-call:media_state", handleRemoteMediaState);
      }
      window.removeEventListener("hrms:pusher", handlePusher);
      for (const pc of peerConnectionsRef.current.values()) {
        try {
          pc.close();
        } catch {}
      }
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
    };
  }, [open, meeting?.callId, meeting?.groupId, meeting?.callType, currentUserId, getOrCreatePeerConnection, sendMeshSignal]);

  // Sync Screen Share & Media State across all Mesh PeerConnections (Item 3)
  useEffect(() => {
    if (!open || !meeting?.callId) return;

    const syncTracksAndState = async () => {
      const screenTrack =
        isScreenSharing && screenStream ? screenStream.getVideoTracks()[0] || null : null;
      const cameraTrack =
        !isScreenSharing && localStream ? localStream.getVideoTracks()[0] || null : null;
      const desiredVideoTrack = screenTrack || cameraTrack;

      for (const [peerId, pc] of peerConnectionsRef.current.entries()) {
        if (pc.signalingState === "closed") continue;
        try {
          const videoSender = pc
            .getSenders()
            .find((s) => s.track?.kind === "video");

          if (videoSender) {
            await videoSender.replaceTrack(desiredVideoTrack || null);
            const transceiver = pc
              .getTransceivers()
              .find((t) => t.sender === videoSender);
            if (
              transceiver &&
              desiredVideoTrack &&
              transceiver.direction !== "sendrecv" &&
              transceiver.direction !== "sendonly"
            ) {
              transceiver.direction = "sendrecv";
              if (pc.signalingState === "stable") {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendMeshSignal(peerId, { type: "offer", sdp: offer.sdp });
              }
            }
          } else if (desiredVideoTrack) {
            const ownerStream =
              screenTrack && screenStream
                ? screenStream
                : localStream || new MediaStream([desiredVideoTrack]);
            pc.addTrack(desiredVideoTrack, ownerStream);
            if (pc.signalingState === "stable") {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendMeshSignal(peerId, { type: "offer", sdp: offer.sdp });
            }
          }
        } catch {}
      }

      if (!isSocketDisabled()) {
        try {
          const socket = getSocketClient();
          if (socket?.connected) {
            socket.emit("group-call:media_state", {
              callId: meeting.callId,
              isMuted,
              isVideoOff,
              isScreenSharing,
            });
          }
        } catch {}
      }

      api
        .post(`/chat/meetings/${encodeURIComponent(meeting.callId)}/media-state`, {
          isMuted,
          isVideoOff,
          isScreenSharing,
        })
        .catch(() => {});
    };

    void syncTracksAndState();
  }, [open, meeting?.callId, isScreenSharing, screenStream, localStream, isMuted, isVideoOff, sendMeshSignal]);

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
      } catch {}
    };
    void fetchDevices();
  }, [open]);

  useEffect(() => {
    if (isChatDrawerOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [threadMessages, isChatDrawerOpen]);

  // Enrich participants with real-time Mesh roster & tracks
  const enrichedParticipants = useMemo(() => {
    const mergedMap = new Map<string, MeetingParticipant>();
    for (const p of participants) {
      mergedMap.set(p.userId, p);
    }
    for (const [uid, mp] of meshRemoteRoster.entries()) {
      if (!mergedMap.has(uid)) {
        mergedMap.set(uid, mp);
      } else {
        const cur = mergedMap.get(uid)!;
        mergedMap.set(uid, {
          ...cur,
          isMuted: mp.isMuted,
          isCameraOff: mp.isCameraOff,
          isScreenSharing: Boolean(cur.isScreenSharing || mp.isScreenSharing),
        });
      }
    }
    return Array.from(mergedMap.values()).map((p) => {
      const rt = remoteTracksMap.get(p.userId);
      return {
        ...p,
        mediaStream: p.mediaStream || rt?.stream || null,
      };
    });
  }, [participants, meshRemoteRoster, remoteTracksMap]);

  const effectiveSpotlightUser = useMemo(() => {
    if (spotlightUserId) {
      const match = enrichedParticipants.find((p) => p.userId === spotlightUserId);
      if (match) return match;
    }
    const speaking = enrichedParticipants.find((p) => p.isSpeaking);
    if (speaking) return speaking;
    const remote = enrichedParticipants.find((p) => !p.isLocal && p.userId !== currentUserId);
    if (remote) return remote;
    return enrichedParticipants[0] || null;
  }, [spotlightUserId, enrichedParticipants, currentUserId]);

  const screenSharingParticipant = useMemo(() => {
    if (isScreenSharing) {
      return {
        userId: currentUserId,
        name: currentUserName,
        isLocal: true,
      };
    }
    const remotePresenter = enrichedParticipants.find(
      (p) => p.userId !== currentUserId && p.isScreenSharing
    );
    return remotePresenter
      ? { userId: remotePresenter.userId, name: remotePresenter.name, isLocal: false }
      : null;
  }, [isScreenSharing, currentUserId, currentUserName, enrichedParticipants]);

  // Item 13: Strictly exclude currentUserId and all existing participants, and deduplicate
  const inviteColleaguesList = useMemo(() => {
    const existingIds = new Set<string>([
      String(currentUserId).trim(),
      ...enrichedParticipants.map((p) => String(p.userId).trim()),
    ]);
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();
    const q = inviteSearch.toLowerCase().trim();

    return availableColleagues.filter((c) => {
      const cid = String(c.id || "").trim();
      if (!cid || existingIds.has(cid) || seenIds.has(cid)) return false;
      const email = c.email ? c.email.trim().toLowerCase() : "";
      if (email && seenEmails.has(email)) return false;

      if (q) {
        const matches =
          c.name.toLowerCase().includes(q) || (email && email.includes(q));
        if (!matches) return false;
      }

      seenIds.add(cid);
      if (email) seenEmails.add(email);
      return true;
    });
  }, [availableColleagues, enrichedParticipants, currentUserId, inviteSearch]);

  const handleSendInvite = () => {
    if (selectedInviteIds.length === 0) return;
    onInviteColleagues(selectedInviteIds);
    if (meeting?.callId) {
      api
        .post(`/chat/meetings/${encodeURIComponent(meeting.callId)}/invite`, {
          userIds: selectedInviteIds,
        })
        .catch(() => {});
    }
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

  if (isMinimized) {
    return (
      <div
        data-testid="meeting-pip-widget"
        className="fixed bottom-5 right-5 z-50 w-72 md:w-80 bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 text-foreground"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
            <h4 className="text-xs font-bold truncate">{meeting.groupName}</h4>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-foreground hover:bg-card"
            onClick={() => setIsMinimized(false)}
            title="Expand Meeting"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="font-mono text-emerald-500">{formatDuration(elapsedSeconds)}</span>
          <span className="flex items-center gap-1">
            <Users className="size-3 text-muted-foreground" />
            {enrichedParticipants.length}{" "}
            {enrichedParticipants.length === 1 ? "participant" : "participants"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleMute}
            className={cn(
              "size-8 p-0 rounded-full",
              isMuted ? "text-destructive" : "text-emerald-500"
            )}
          >
            {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleVideo}
            className={cn(
              "size-8 p-0 rounded-full",
              isVideoOff ? "text-destructive" : "text-primary"
            )}
          >
            {isVideoOff ? <VideoOff className="size-4" /> : <Video className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onLeaveMeeting}
            className="h-7 px-3 text-xs rounded-full"
          >
            <LogOut className="size-3 mr-1" /> Leave
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open && !isMinimized} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="multi-participant-meeting-dialog"
        className="max-w-[96vw] md:max-w-7xl h-[92vh] p-0 overflow-hidden border border-border bg-background text-foreground rounded-2xl shadow-2xl flex flex-col font-sans [&>button:last-child]:hidden"
      >
        {/* TOP HEADER */}
        <div className="h-14 px-4 md:px-6 bg-card/90 border-b border-border/80 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "size-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-md",
                getAvatarColor(meeting.groupName)
              )}
            >
              {meeting.groupName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-foreground truncate max-w-[200px] md:max-w-md">
                  {meeting.groupName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {formatDuration(elapsedSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {meeting.isHost ? "You are the Host" : "Group Call"} &bull;{" "}
                {enrichedParticipants.length} Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              data-testid="badge-mesh-connected"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {meshConnectionState === "connecting" ? "Connecting Mesh..." : "WebRTC Encrypted"}
              </span>
            </span>

            <Button
              size="sm"
              variant="outline"
              data-testid="btn-header-invite-colleagues"
              onClick={() => setIsInviteDialogOpen(true)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              <span className="hidden sm:inline">Add People</span>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-toggle-meeting-layout"
              onClick={() => setLayoutMode(layoutMode === "grid" ? "speaker" : "grid")}
              className="size-8 text-foreground hover:bg-card rounded-lg cursor-pointer"
              title={
                layoutMode === "grid"
                  ? "Switch to Speaker Spotlight View"
                  : "Switch to Equal Grid View"
              }
            >
              {layoutMode === "grid" ? (
                <LayoutGrid className="size-4" />
              ) : (
                <Grid className="size-4" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-minimize-meeting"
              onClick={() => setIsMinimized(true)}
              className="size-8 text-foreground hover:bg-card rounded-lg cursor-pointer"
              title="Minimize to Picture-in-Picture"
            >
              <Minimize2 className="size-4" />
            </Button>
          </div>
        </div>

        {/* MIDDLE STAGE AREA */}
        <div className="flex-1 min-h-0 relative flex overflow-hidden bg-background">
          <div className="flex-1 min-h-0 relative flex flex-col p-3 overflow-hidden">
            {screenSharingParticipant ? (
              <div
                data-testid="meeting-screen-stage"
                className="flex-1 min-h-0 flex flex-col gap-2 relative"
              >
                <div className="flex-1 min-h-0 bg-slate-950 rounded-2xl border border-border overflow-hidden relative flex items-center justify-center">
                  {screenSharingParticipant.isLocal ? (
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  ) : remoteTracksMap.get(screenSharingParticipant.userId)?.stream ? (
                    <video
                      data-testid="remote-screen-share-video"
                      ref={(el) => {
                        const rt = remoteTracksMap.get(screenSharingParticipant.userId);
                        if (el && rt?.stream && el.srcObject !== rt.stream) {
                          el.srcObject = rt.stream;
                          el.play().catch(() => {});
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <MonitorUp className="size-12 text-primary animate-pulse" />
                      <p className="text-sm font-semibold text-white">
                        {screenSharingParticipant.name} is presenting their screen
                      </p>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-card/85 backdrop-blur-md border border-border text-xs font-medium text-foreground flex items-center gap-2 shadow-lg">
                    <MonitorUp className="size-3.5 text-primary" />
                    <span>
                      {screenSharingParticipant.isLocal
                        ? "You are presenting"
                        : `${screenSharingParticipant.name} is presenting`}
                    </span>
                  </div>

                  {screenSharingParticipant.isLocal && (
                    <div className="absolute top-3 right-3 z-20">
                      <Button
                        size="sm"
                        variant="destructive"
                        data-testid="btn-stop-screen-share"
                        onClick={onToggleScreenShare}
                        className="rounded-full h-8 px-3 text-xs gap-1.5 shadow-xl font-semibold cursor-pointer"
                      >
                        <MonitorOff className="size-3.5" /> Stop Sharing
                      </Button>
                    </div>
                  )}
                </div>

                <div className="h-28 shrink-0 flex items-center gap-2 overflow-x-auto py-1 px-1">
                  {enrichedParticipants.map((p) => (
                    <ParticipantCard
                      key={p.userId}
                      participant={p}
                      isLocalUser={p.isLocal || p.userId === currentUserId}
                      localStream={localStream}
                      isHost={meeting.isHost}
                      onRemove={() => onRemoveParticipant(p.userId)}
                      onPin={() =>
                        setSpotlightUserId(spotlightUserId === p.userId ? null : p.userId)
                      }
                      isPinned={spotlightUserId === p.userId}
                      remoteTrackInfo={remoteTracksMap.get(p.userId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : layoutMode === "speaker" && effectiveSpotlightUser ? (
              <div
                data-testid="meeting-speaker-stage"
                className="flex-1 min-h-0 flex flex-col gap-2 relative"
              >
                <div className="flex-1 min-h-0 relative">
                  <ParticipantCard
                    participant={effectiveSpotlightUser}
                    isLocalUser={
                      effectiveSpotlightUser.isLocal ||
                      effectiveSpotlightUser.userId === currentUserId
                    }
                    localStream={localStream}
                    isHost={meeting.isHost}
                    onRemove={() => onRemoveParticipant(effectiveSpotlightUser.userId)}
                    onPin={() => setSpotlightUserId(null)}
                    isPinned={true}
                    remoteTrackInfo={remoteTracksMap.get(effectiveSpotlightUser.userId)}
                    spotlight
                  />
                </div>

                <div className="h-28 shrink-0 flex items-center gap-2 overflow-x-auto py-1 px-1">
                  {enrichedParticipants.map((p) => (
                    <ParticipantCard
                      key={p.userId}
                      participant={p}
                      isLocalUser={p.isLocal || p.userId === currentUserId}
                      localStream={localStream}
                      isHost={meeting.isHost}
                      onRemove={() => onRemoveParticipant(p.userId)}
                      onPin={() =>
                        setSpotlightUserId(spotlightUserId === p.userId ? null : p.userId)
                      }
                      isPinned={spotlightUserId === p.userId}
                      remoteTrackInfo={remoteTracksMap.get(p.userId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div
                data-testid="meeting-participant-grid"
                className={cn(
                  "flex-1 min-h-0 grid gap-3 w-full h-full",
                  enrichedParticipants.length === 1 && "grid-cols-1",
                  enrichedParticipants.length === 2 && "grid-cols-1 md:grid-cols-2",
                  (enrichedParticipants.length === 3 || enrichedParticipants.length === 4) &&
                    "grid-cols-2",
                  enrichedParticipants.length >= 5 && "grid-cols-2 md:grid-cols-3"
                )}
              >
                {enrichedParticipants.map((p) => (
                  <ParticipantCard
                    key={p.userId}
                    participant={p}
                    isLocalUser={p.isLocal || p.userId === currentUserId}
                    localStream={localStream}
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

          {/* PARTICIPANTS DRAWER */}
          {isParticipantsDrawerOpen && (
            <div
              data-testid="meeting-participants-drawer"
              className="absolute inset-y-0 right-0 w-full sm:w-80 sm:relative shrink-0 border-l border-border bg-card/95 flex flex-col z-20"
            >
              <div className="h-12 px-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                  <Users className="size-4 text-primary" />
                  <span>Participants ({enrichedParticipants.length})</span>
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

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {enrichedParticipants.map((p) => {
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
                            p.isSpeaking && "ring-2 ring-emerald-500"
                          )}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {p.name}{" "}
                            {isSelf && (
                              <span className="text-muted-foreground text-[10px]">(You)</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.role === "host" ? "Host" : "Member"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.isSpeaking && (
                          <span title="Speaking">
                            <Activity className="size-3.5 text-emerald-500 animate-pulse" />
                          </span>
                        )}
                        {p.isMuted ? (
                          <MicOff className="size-3.5 text-destructive" />
                        ) : (
                          <Mic className="size-3.5 text-emerald-500" />
                        )}
                        {p.isCameraOff ? (
                          <VideoOff className="size-3.5 text-destructive" />
                        ) : (
                          <Video className="size-3.5 text-primary" />
                        )}
                        {meeting.isHost && !isSelf && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onRemoveParticipant(p.userId)}
                            className="size-6 text-destructive hover:bg-destructive/20 rounded-full"
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

          {/* IN-MEETING CHAT DRAWER */}
          {isChatDrawerOpen && (
            <div
              data-testid="meeting-chat-drawer"
              className="absolute inset-y-0 right-0 w-full sm:w-80 sm:relative shrink-0 border-l border-border bg-card/95 flex flex-col z-20"
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

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {threadMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-foreground text-xs">
                    <MessageSquare className="size-8 mb-2 opacity-40" />
                    <span>No chat messages yet.</span>
                  </div>
                ) : (
                  threadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-2 rounded-xl bg-background/80 border border-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-semibold text-primary">
                          {msg.senderName || "Colleague"}
                        </span>
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="text-foreground text-xs break-words">{msg.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleSendChatMessage}
                className="p-2 border-t border-border flex items-center gap-2"
              >
                <Input
                  value={inMeetingMessage}
                  onChange={(e) => setInMeetingMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="h-8 text-xs bg-background border-border"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inMeetingMessage.trim()}
                  className="size-8 bg-primary text-primary-foreground shrink-0"
                >
                  <Send className="size-3.5" />
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* BOTTOM TOOLBAR */}
        <div className="h-20 bg-card/90 border-t border-border/80 px-4 flex items-center justify-center shrink-0 relative select-none">
          <div
            data-testid="meeting-toolbar"
            className="flex items-center gap-2 md:gap-3 bg-background/80 backdrop-blur-md border border-border rounded-2xl px-3 md:px-5 py-2 shadow-2xl overflow-x-auto max-w-full"
          >
            <Button
              size="icon"
              data-testid="btn-meeting-toggle-mic"
              onClick={onToggleMute}
              className={cn(
                "rounded-full size-11 shrink-0 cursor-pointer",
                isMuted
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </Button>

            <Button
              size="icon"
              data-testid="btn-meeting-toggle-camera"
              onClick={onToggleVideo}
              className={cn(
                "rounded-full size-11 shrink-0 cursor-pointer",
                isVideoOff
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
            >
              {isVideoOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
            </Button>

            <Button
              size="icon"
              data-testid="btn-meeting-toggle-screenshare"
              onClick={onToggleScreenShare}
              className={cn(
                "rounded-full size-11 shrink-0 cursor-pointer",
                isScreenSharing
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/30"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              {isScreenSharing ? (
                <MonitorOff className="size-5" />
              ) : (
                <MonitorUp className="size-5" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-device-settings"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="rounded-full size-11 shrink-0 bg-card hover:bg-secondary text-foreground cursor-pointer hidden sm:flex"
              title="Device Info"
            >
              <Sliders className="size-5" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-toggle-participants"
              onClick={() => {
                setIsParticipantsDrawerOpen(!isParticipantsDrawerOpen);
                if (isChatDrawerOpen) setIsChatDrawerOpen(false);
              }}
              className={cn(
                "rounded-full size-11 shrink-0 cursor-pointer relative",
                isParticipantsDrawerOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title="Participants Roster"
            >
              <Users className="size-5" />
              <Badge className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                {enrichedParticipants.length}
              </Badge>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              data-testid="btn-meeting-toggle-chat"
              onClick={() => {
                setIsChatDrawerOpen(!isChatDrawerOpen);
                if (isParticipantsDrawerOpen) setIsParticipantsDrawerOpen(false);
              }}
              className={cn(
                "rounded-full size-11 shrink-0 cursor-pointer",
                isChatDrawerOpen
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary text-foreground"
              )}
              title="In-Meeting Chat"
            >
              <MessageSquare className="size-5" />
            </Button>

            {meeting.isHost ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    data-testid="btn-meeting-leave-or-end"
                    className="rounded-full size-11 shrink-0 cursor-pointer"
                    title="Leave or End Meeting"
                  >
                    <PhoneOff className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-card border-border text-foreground space-y-1 font-sans">
                  <button
                    data-testid="btn-meeting-leave-only"
                    onClick={onLeaveMeeting}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="size-4 text-muted-foreground" />
                    <span>Leave Meeting</span>
                  </button>
                  <button
                    data-testid="btn-meeting-end-for-everyone"
                    onClick={onEndMeetingForEveryone}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/15 flex items-center gap-2 cursor-pointer"
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
                className="rounded-full size-11 shrink-0 cursor-pointer"
                title="Leave Meeting"
              >
                <PhoneOff className="size-5" />
              </Button>
            )}
          </div>
        </div>

        {/* DEVICE SETTINGS DIALOG */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-sm bg-card border-border text-foreground font-sans">
            <div className="space-y-3">
              <div className="font-semibold text-sm flex items-center gap-2 border-b border-border pb-2">
                <Sliders className="size-4 text-primary" /> Media Devices
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Microphone</label>
                <select
                  value={selectedAudioInput}
                  onChange={(e) => setSelectedAudioInput(e.target.value)}
                  className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2"
                >
                  {audioInputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Camera</label>
                <select
                  value={selectedVideoInput}
                  onChange={(e) => setSelectedVideoInput(e.target.value)}
                  className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2"
                >
                  {videoInputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Speaker</label>
                <select
                  value={selectedAudioOutput}
                  onChange={(e) => setSelectedAudioOutput(e.target.value)}
                  className="w-full h-8 rounded-lg bg-background border border-border text-xs px-2"
                >
                  {audioOutputDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Speaker ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-2 border-t border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Noise Suppression</span>
                  <span className="font-mono text-emerald-500">
                    {isNoiseSuppressionSupported ? "Active" : "Standard"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Echo Cancellation</span>
                  <span className="font-mono text-emerald-500">
                    {isEchoCancellationSupported ? "Active" : "Standard"}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* INVITE COLLEAGUES DIALOG */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent
            data-testid="meeting-invite-colleagues-dialog"
            className="sm:max-w-md bg-card border-border text-foreground font-sans"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                  <UserPlus className="size-4 text-primary" />
                  <span>Ring & Add Colleagues to Group Call</span>
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
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    All available colleagues are already in this group call.
                  </p>
                ) : (
                  inviteColleaguesList.map((colleague) => {
                    const isSelected = selectedInviteIds.includes(colleague.id);
                    return (
                      <div
                        key={colleague.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInviteIds(
                              selectedInviteIds.filter((id) => id !== colleague.id)
                            );
                          } else {
                            setSelectedInviteIds([...selectedInviteIds, colleague.id]);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary/20 border-primary"
                            : "bg-background/40 border-border hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "size-8 rounded-full flex items-center justify-center font-bold text-xs",
                              getAvatarColor(colleague.name)
                            )}
                          >
                            {colleague.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {colleague.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {colleague.email || "Team Colleague"}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
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
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  data-testid="btn-confirm-send-invitations"
                  disabled={selectedInviteIds.length === 0}
                  onClick={handleSendInvite}
                  className="h-8 text-xs bg-primary text-primary-foreground font-semibold"
                >
                  Ring & Invite ({selectedInviteIds.length})
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
  localStream: MediaStream | null;
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
  localStream,
  isHost,
  onRemove,
  onPin,
  isPinned,
  compact = false,
  spotlight = false,
  remoteTrackInfo,
}: ParticipantCardProps) {
  const activeStream = isLocalUser
    ? localStream
    : participant.mediaStream || remoteTrackInfo?.stream || null;
  const hasLiveVideo =
    !!activeStream &&
    activeStream.getVideoTracks().some((t) => t.enabled && t.readyState === "live");
  const showVideo = !participant.isCameraOff && hasLiveVideo;

  return (
    <div
      data-testid={`participant-card-${participant.userId}`}
      className={cn(
        "bg-card border rounded-2xl overflow-hidden relative flex items-center justify-center transition-all duration-200 select-none group",
        participant.isSpeaking
          ? "border-emerald-500/40 ring-2 ring-emerald-500/50 shadow-md"
          : "border-border/80 hover:border-border",
        compact && "w-36 h-24 shrink-0 rounded-xl",
        spotlight && "w-full h-full",
        !compact && !spotlight && "w-full h-full min-h-[160px]"
      )}
    >
      <video
        ref={(el) => {
          if (el && activeStream && el.srcObject !== activeStream) {
            el.srcObject = activeStream;
            el.play().catch(() => {});
          }
        }}
        data-testid={isLocalUser ? "local-meeting-video" : `remote-video-${participant.userId}`}
        autoPlay
        playsInline
        muted
        className={cn(
          "w-full h-full object-cover transition-opacity",
          showVideo ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Dedicated unmuted audio element for remote peer */}
      {!isLocalUser && activeStream && (
        <audio
          ref={(el) => {
            if (el && activeStream && el.srcObject !== activeStream) {
              el.srcObject = activeStream;
              el.muted = false;
              el.volume = 1;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          data-testid={`remote-audio-${participant.userId}`}
          className="sr-only pointer-events-none"
        />
      )}

      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-card">
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold shadow-xl transition-all duration-200",
              getAvatarColor(participant.name),
              compact ? "size-10 text-xs" : spotlight ? "size-28 text-3xl" : "size-16 text-xl",
              participant.isSpeaking && "ring-4 ring-emerald-500 scale-105"
            )}
          >
            {participant.name.charAt(0).toUpperCase()}
          </div>
          {!compact && (
            <span className="text-[11px] text-muted-foreground mt-2 font-medium">
              {participant.isCameraOff ? "Camera is off" : "Audio connected"}
            </span>
          )}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
        <div className="px-2 py-0.5 rounded-full bg-background/85 backdrop-blur-md border border-border text-[11px] font-medium text-foreground flex items-center gap-1.5 shadow-md">
          <span className="truncate max-w-[100px] md:max-w-[140px]">{participant.name}</span>
          {isLocalUser && <span className="text-primary text-[10px]">(You)</span>}
          {participant.role === "host" && (
            <Badge className="h-4 px-1 text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-400 border-none font-semibold">
              Host
            </Badge>
          )}
        </div>
      </div>

      <div className="absolute bottom-2 right-2 z-10">
        <div
          className={cn(
            "size-6 rounded-full flex items-center justify-center shadow-md",
            participant.isMuted
              ? "bg-destructive/90 text-destructive-foreground"
              : participant.isSpeaking
                ? "bg-emerald-500 text-white ring-2 ring-emerald-400 animate-pulse"
                : "bg-card/90 text-foreground"
          )}
        >
          {participant.isMuted ? <MicOff className="size-3" /> : <Mic className="size-3" />}
        </div>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          size="icon"
          variant="ghost"
          onClick={onPin}
          className="size-7 rounded-full bg-background/80 text-foreground"
          title={isPinned ? "Unpin Spotlight" : "Pin Spotlight"}
        >
          {isPinned ? <PinOff className="size-3.5 text-primary" /> : <Pin className="size-3.5" />}
        </Button>

        {isHost && !isLocalUser && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="size-7 rounded-full bg-destructive/80 text-white hover:bg-destructive"
            title="Remove from meeting"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

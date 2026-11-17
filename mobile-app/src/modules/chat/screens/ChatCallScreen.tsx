import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Users,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { ChatService } from '../../../core/services/chatService';
import { requestAppMediaPermissions } from '../../../core/services/permissionService';
import { Config } from '../../../config/environment';

type CallLifecycleState =
  | 'DIALING'
  | 'RINGING'
  | 'CONNECTED'
  | 'BUSY'
  | 'DECLINED'
  | 'ENDED'
  | 'ERROR';

interface MeetingPeer {
  userId: string;
  name: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

export const ChatCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const user = useAuthStore((s) => s.user);
  const { activeRole } = usePermission();

  const {
    callId: initialCallId,
    receiverId,
    receiverName = 'Colleague',
    receiverAvatar,
    callerAvatar,
    callType = 'audio',
    threadId,
    groupId,
    groupName,
    isGroupMeeting = false,
    isIncoming = false,
  } = route.params || {};

  const displayAvatar = React.useMemo(() => {
    const raw = receiverAvatar || callerAvatar;
    if (raw) {
      let trimmed = raw.trim();
      if (trimmed.includes('api.dicebear.com') && trimmed.includes('/svg?')) {
        trimmed = trimmed.replace('/svg?', '/png?');
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/')) return `${Config.API_BASE_URL}${trimmed}`;
      if (trimmed.startsWith('uploads/')) return `${Config.API_BASE_URL}/${trimmed}`;
    }
    const seed = encodeURIComponent(receiverName || 'colleague');
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=00d287`;
  }, [receiverAvatar, callerAvatar, receiverName]);

  const selfAvatar = React.useMemo(() => {
    const raw = user?.profile?.avatarUrl;
    if (raw) {
      let trimmed = raw.trim();
      if (trimmed.includes('api.dicebear.com') && trimmed.includes('/svg?')) {
        trimmed = trimmed.replace('/svg?', '/png?');
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/')) return `${Config.API_BASE_URL}${trimmed}`;
      if (trimmed.startsWith('uploads/')) return `${Config.API_BASE_URL}/${trimmed}`;
    }
    const seed = encodeURIComponent(user?.profile?.fullName || user?.email || 'me');
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=4f46e5`;
  }, [user]);

  const hasNativeWebRtc = typeof (globalThis as any).RTCPeerConnection === 'function';

  const [activeCallId, setActiveCallId] = useState<string | null>(initialCallId || null);
  const [callState, setCallState] = useState<CallLifecycleState>(
    isIncoming || isGroupMeeting ? 'CONNECTED' : 'DIALING'
  );
  const [statusNote, setStatusNote] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [peerMuted, setPeerMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Multiparty roster & invite modal
  const [participants, setParticipants] = useState<MeetingPeer[]>([]);
  const [creatorId, setCreatorId] = useState<string>('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [callTimedOut, setCallTimedOut] = useState(false);

  const endedCleanupRef = useRef(false);

  // Request hardware media permissions when call screen opens
  useEffect(() => {
    const acquireHardware = async () => {
      const res = await requestAppMediaPermissions();
      if (!res.camera && (callType === 'video' || isVideoEnabled)) {
        Alert.alert('Camera Access', 'Camera permission was not granted. Video will remain off.');
        setIsVideoEnabled(false);
      }
      if (!res.microphone) {
        Alert.alert('Microphone Access', 'Microphone permission was not granted. You are muted.');
        setIsMuted(true);
      }
    };
    void acquireHardware();
  }, []);

  // 30-second ring timeout: if callee doesn't answer, show 'No Response' UI
  useEffect(() => {
    if (callState !== 'RINGING' && callState !== 'DIALING') return;
    const timer = setTimeout(() => {
      setCallTimedOut(true);
      setCallState('ENDED');
      setStatusNote('No answer');
      if (activeCallId) ChatService.cancelCall(activeCallId).catch(() => {});
    }, 30000);
    return () => clearTimeout(timer);
  }, [callState, activeCallId]);

  const contactsQuery = useQuery({
    queryKey: createTenantQueryKey(['chat', 'contacts']),
    queryFn: () => ChatService.getContacts(),
    enabled: inviteModalOpen,
  });

  // Refresh multiparty roster
  const refreshMeetingRoster = useCallback(async (cid: string) => {
    try {
      const data = await ChatService.getGroupMeetingParticipants(cid);
      if (data?.creatorId) setCreatorId(String(data.creatorId));
      if (Array.isArray(data?.participants)) {
        setParticipants(
          data.participants.map((p: any) => ({
            userId: String(p.userId || p.id),
            name: String(p.name || 'Participant'),
            isMuted: Boolean(p.isMuted),
            isVideoOff: Boolean(p.isVideoOff ?? p.isCameraOff),
          }))
        );
      }
    } catch {
      // Non-fatal
    }
  }, []);

  // Bootstrap real backend call or group meeting session
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        if (isGroupMeeting) {
          if (initialCallId) {
            const joinRes = await ChatService.joinGroupMeeting(initialCallId, groupId);
            if (!mounted) return;
            setActiveCallId(initialCallId);
            setCallState('CONNECTED');
            if (joinRes?.creatorId) setCreatorId(String(joinRes.creatorId));
            if (Array.isArray(joinRes?.participants)) {
              setParticipants(joinRes.participants);
            } else {
              void refreshMeetingRoster(initialCallId);
            }
          }
          return;
        }

        if (isIncoming && initialCallId) {
          setActiveCallId(initialCallId);
          setCallState('CONNECTED');
          return;
        }

        if (receiverId) {
          setCallState('DIALING');
          const res = await ChatService.initiateCall(receiverId, callType, threadId);
          if (!mounted) return;
          setActiveCallId(res.callId);
          setCallState(res.status === 'connected' ? 'CONNECTED' : 'RINGING');
        } else if (initialCallId) {
          const st = await ChatService.getCallStatus(initialCallId);
          if (!mounted) return;
          setActiveCallId(initialCallId);
          setCallState(st?.status === 'connected' ? 'CONNECTED' : 'RINGING');
        } else {
          setCallState('ERROR');
          setStatusNote('Missing target participant ID.');
        }
      } catch (err: any) {
        if (!mounted) return;
        const isBusy = err?.status === 409 || err?.code === 'CALL_BUSY';
        setCallState(isBusy ? 'BUSY' : 'ERROR');
        setStatusNote(
          isBusy ? `${receiverName} is on another call.` : err?.message || 'Unable to start call.'
        );
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [
    isGroupMeeting,
    isIncoming,
    initialCallId,
    receiverId,
    callType,
    threadId,
    groupId,
    receiverName,
    refreshMeetingRoster,
  ]);

  // Realtime signaling & session events
  useEffect(() => {
    if (!activeCallId) return;

    const unsubs = [
      realtimeManager.subscribe('call:accepted', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          setCallState('CONNECTED');
        }
      }),
      realtimeManager.subscribe('call:rejected', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          setCallState('DECLINED');
          setStatusNote('Call declined');
        }
      }),
      realtimeManager.subscribe('call:busy', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          setCallState('BUSY');
          setStatusNote('Recipient is busy');
        }
      }),
      realtimeManager.subscribe('call:cancelled', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          setCallState('ENDED');
          navigation.goBack();
        }
      }),
      realtimeManager.subscribe('call:timeout', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          setCallState('ENDED');
          setStatusNote('No answer');
        }
      }),
      realtimeManager.subscribe('call:ended', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          endedCleanupRef.current = true;
          setCallState('ENDED');
          navigation.goBack();
        }
      }),
      realtimeManager.subscribe('call:media-state', (p) => {
        if (p?.callId === activeCallId && p?.type === 'audio-mute') {
          setPeerMuted(Boolean(p.active));
        }
      }),
      realtimeManager.subscribe('group-call:user_joined', (p) => {
        if (p?.callId === activeCallId) void refreshMeetingRoster(activeCallId);
      }),
      realtimeManager.subscribe('group-call:user_left', (p) => {
        if (p?.callId === activeCallId) void refreshMeetingRoster(activeCallId);
      }),
      realtimeManager.subscribe('group-call:media_state', (p) => {
        if (p?.callId === activeCallId) void refreshMeetingRoster(activeCallId);
      }),
      realtimeManager.subscribe('group-call:removed', (p) => {
        if (p?.callId === activeCallId && (!p?.targetUserId || p.targetUserId === user?.id)) {
          endedCleanupRef.current = true;
          Alert.alert('Meeting', 'You were removed from the meeting.');
          navigation.goBack();
        }
      }),
      realtimeManager.subscribe('group-call:ended', (p) => {
        if (!p?.callId || p.callId === activeCallId) {
          endedCleanupRef.current = true;
          Alert.alert('Meeting Ended', 'The host ended the group meeting.');
          navigation.goBack();
        }
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeCallId, navigation, refreshMeetingRoster, user?.id]);

  // Connected duration counter + 5s backend call heartbeat
  useEffect(() => {
    if (callState !== 'CONNECTED') return;

    const secInterval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    let hbInterval: ReturnType<typeof setInterval> | null = null;
    if (!isGroupMeeting && activeCallId) {
      hbInterval = setInterval(async () => {
        try {
          const hb = await ChatService.sendCallHeartbeat(activeCallId);
          if (hb.peerLeft || hb.status === 'ended' || hb.active === false) {
            endedCleanupRef.current = true;
            setCallState('ENDED');
            navigation.goBack();
          }
        } catch {
          // Ignore transient network blip
        }
      }, 5000);
    }

    return () => {
      clearInterval(secInterval);
      if (hbInterval) clearInterval(hbInterval);
    };
  }, [callState, isGroupMeeting, activeCallId, navigation]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem} mins`;
  };

  const toggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (!activeCallId) return;
    try {
      if (isGroupMeeting) {
        await ChatService.updateGroupMeetingMediaState(activeCallId, { isMuted: next });
      } else {
        await ChatService.updateCallMediaState(activeCallId, 'audio-mute', next);
      }
    } catch {
      // Best-effort sync
    }
  };

  const toggleVideo = async () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    if (!activeCallId) return;
    try {
      if (isGroupMeeting) {
        await ChatService.updateGroupMeetingMediaState(activeCallId, { isVideoOff: !next });
      } else {
        await ChatService.updateCallMediaState(activeCallId, 'video-mute', !next);
      }
    } catch {
      // Best-effort sync
    }
  };

  const handleHangupOrLeave = async () => {
    if (!endedCleanupRef.current && activeCallId) {
      endedCleanupRef.current = true;
      try {
        if (isGroupMeeting) {
          await ChatService.leaveGroupMeeting(activeCallId);
        } else if (callState === 'RINGING' || callState === 'DIALING') {
          await ChatService.cancelCall(activeCallId);
        } else if (callState === 'CONNECTED') {
          await ChatService.endCall(activeCallId, callDuration);
        }
      } catch {
        // Ignore cleanup failure
      }
    }
    navigation.goBack();
  };

  const handleEndMeetingForAll = async () => {
    if (!activeCallId) return;
    endedCleanupRef.current = true;
    try {
      await ChatService.endGroupMeetingForAll(activeCallId);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to end meeting for everyone.');
    }
    navigation.goBack();
  };

  const handleInviteColleague = async (targetUserId: string, name: string) => {
    if (!activeCallId) return;
    try {
      if (isGroupMeeting) {
        await ChatService.inviteUsersToGroupMeeting(activeCallId, [targetUserId]);
      } else {
        await ChatService.inviteColleagueToCall(activeCallId, targetUserId);
      }
      setInviteModalOpen(false);
      Alert.alert('Invited', `Call invitation sent to ${name}.`);
    } catch (err: any) {
      Alert.alert('Invite Error', err?.message || 'Unable to invite colleague.');
    }
  };

  const canEndMeetingForAll =
    isGroupMeeting &&
    (creatorId === user?.id || activeRole === 'tenant_admin');

  const statusHeading =
    callState === 'DIALING'
      ? 'Dialing...'
      : callState === 'RINGING'
      ? 'Ringing...'
      : callState === 'CONNECTED'
      ? formatDuration(callDuration)
      : statusNote || callState;

  // ── 'User Did Not Respond' screen shown after 30-second timeout ──
  if (callTimedOut) {
    const initials = (receiverName || 'U').substring(0, 2).toUpperCase();
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={styles.noAnswerAvatarCircle}>
          <Text style={styles.noAnswerAvatarText}>{initials}</Text>
        </View>
        <Text style={styles.noAnswerName}>{receiverName}</Text>
        <Text style={styles.noAnswerHeading}>Didn't Respond</Text>
        <Text style={styles.noAnswerSub}>Call ended after 30 seconds</Text>
        <View style={styles.noAnswerPhoneWrap}>
          <PhoneOff size={40} color="#EF4444" />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 36 }}>
          <TouchableOpacity
            style={[styles.noAnswerBtn, { backgroundColor: '#00D287' }]}
            onPress={() => {
              setCallTimedOut(false);
              setCallState('DIALING');
            }}
          >
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.noAnswerBtnText}>Call Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.noAnswerBtn, { backgroundColor: '#64748B' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.noAnswerBtnText}>Back to Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          {isGroupMeeting ? (
            <Users size={14} color="#6366F1" />
          ) : callType === 'video' ? (
            <Video size={14} color="#6366F1" />
          ) : (
            <Phone size={14} color="#6366F1" />
          )}
          <Text style={styles.badgeText}>
            {isGroupMeeting
              ? `MULTIPARTY ${callType.toUpperCase()} MEETING`
              : callType === 'video'
              ? 'SECURE VIDEO CALL'
              : 'SECURE VOICE CALL'}
          </Text>
        </View>
        <Text style={styles.titleText} numberOfLines={2}>
          {isGroupMeeting ? groupName || receiverName : receiverName}
        </Text>
        <Text style={styles.statusText}>{statusHeading}</Text>

        {peerMuted && !isGroupMeeting && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            <MicOff size={12} color="#EF4444" />
            <Text style={styles.peerMutedNote}>Peer microphone is muted</Text>
          </View>
        )}

        {!hasNativeWebRtc && (
          <View style={styles.webrtcNotice}>
            <Text style={styles.webrtcNoticeText}>
              Signaling connected via MasterHRMS API • Native audio/video media stream requires a WebRTC native build.
            </Text>
          </View>
        )}
      </View>

      {/* Center Stage: Multiparty Grid or 1:1 Avatar Stage */}
      {isGroupMeeting ? (
        <ScrollView contentContainerStyle={styles.gridWrap}>
          {participants.length === 0 ? (
            <View style={styles.tileCard}>
              <Text style={styles.tileInitials}>
                {(user?.profile?.fullName || 'ME').substring(0, 2).toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={styles.tileName}>You</Text>
                {isMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} color="#10B981" />}
              </View>
            </View>
          ) : (
            participants.map((p) => (
              <View key={p.userId} style={styles.tileCard}>
                <Text style={styles.tileInitials}>
                  {p.name.substring(0, 2).toUpperCase()}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.isMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} color="#10B981" />}
                </View>
                {canEndMeetingForAll && p.userId !== user?.id && activeCallId && (
                  <TouchableOpacity
                    style={styles.removePeerBtn}
                    onPress={() =>
                      ChatService.removeGroupMeetingParticipant(activeCallId, p.userId).then(() =>
                        refreshMeetingRoster(activeCallId)
                      )
                    }
                  >
                    <Text style={styles.removePeerText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      ) : isVideoEnabled ? (
        <View style={styles.videoStage}>
          {/* Peer Video Surface */}
          <View style={styles.peerVideoSurface}>
            <View style={styles.avatarBig}>
              <Image
                source={{ uri: displayAvatar }}
                style={styles.avatarBigImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.videoPeerName}>{receiverName}</Text>
          </View>

          {/* Picture-In-Picture PIP Self Camera (Matches 26_Light_Video Call Room.png) */}
          <View style={styles.pipVideoBox}>
            <View style={styles.pipInnerCamera}>
              <Image
                source={{ uri: selfAvatar }}
                style={styles.pipAvatarImage}
                resizeMode="cover"
              />
              {isMuted && (
                <View style={styles.pipMuteBadge}>
                  <MicOff size={10} color="#FFFFFF" />
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.centerStage}>
          <View style={styles.outerPulse}>
            <View style={styles.avatarBig}>
              <Image
                source={{ uri: displayAvatar }}
                style={styles.avatarBigImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>
      )}

      {/* Bottom Call Controls */}
      <View style={styles.controlsArea}>
        {isIncoming && callState === 'RINGING' ? (
          /* Incoming Call Ringing: Accept & Decline Buttons (Matches 23_Light_Voice Call Ringing.png) */
          <View style={styles.incomingButtonsRow}>
            <TouchableOpacity
              style={styles.declineCircleBtn}
              onPress={handleHangupOrLeave}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Decline incoming call"
            >
              <PhoneOff size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.answerCircleBtn}
              onPress={() => setCallState('CONNECTED')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Answer incoming call"
            >
              <Phone size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        ) : (
          /* Active Call Controls (Matches 24_Light_Voice Call Room.png) */
          <>
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
                onPress={toggleMute}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
              >
                <View style={{ marginBottom: 4 }}>
                  {isMuted ? <MicOff size={22} color="#EF4444" /> : <Mic size={22} color="#0F172A" />}
                </View>
                <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, isVideoEnabled && styles.ctrlBtnActive]}
                onPress={toggleVideo}
                accessibilityRole="button"
                accessibilityLabel="Toggle video"
              >
                <View style={{ marginBottom: 4 }}>
                  {isVideoEnabled ? <Video size={22} color="#00C278" /> : <VideoOff size={22} color="#94A3B8" />}
                </View>
                <Text style={styles.ctrlLabel}>{isVideoEnabled ? 'Video On' : 'Video Off'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, isSpeakerOn && styles.ctrlBtnActive]}
                onPress={() => setIsSpeakerOn((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel="Toggle speaker"
              >
                <View style={{ marginBottom: 4 }}>
                  {isSpeakerOn ? <Volume2 size={22} color="#00C278" /> : <VolumeX size={22} color="#0F172A" />}
                </View>
                <Text style={styles.ctrlLabel}>{isSpeakerOn ? 'Speaker' : 'Earpiece'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={() => setInviteModalOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Invite colleague"
              >
                <View style={{ marginBottom: 4 }}>
                  <UserPlus size={22} color="#0F172A" />
                </View>
                <Text style={styles.ctrlLabel}>Add to Call</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hangupRow}>
              <TouchableOpacity
                style={styles.endCallBtn}
                onPress={handleHangupOrLeave}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={isGroupMeeting ? 'Leave meeting' : 'End call'}
              >
                <PhoneOff size={26} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>

              {canEndMeetingForAll && (
                <TouchableOpacity
                  style={styles.endAllBtn}
                  onPress={handleEndMeetingForAll}
                  accessibilityRole="button"
                  accessibilityLabel="End meeting for all"
                >
                  <Text style={styles.endCallText}>End For All</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* Add Colleague to Call Modal */}
      <Modal visible={inviteModalOpen} animationType="slide" transparent onRequestClose={() => setInviteModalOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setInviteModalOpen(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Call</Text>
              <TouchableOpacity onPress={() => setInviteModalOpen(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {contactsQuery.isLoading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {(contactsQuery.data || [])
                  .filter((c) => c.userId !== user?.id)
                  .map((c) => {
                    const initials = (c.name || 'U').substring(0, 2).toUpperCase();
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.inviteRow}
                        onPress={() => handleInviteColleague(c.userId, c.name)}
                      >
                        {c.avatar ? (
                          <Image
                            source={{ uri: c.avatar }}
                            style={styles.inviteAvatar}
                          />
                        ) : (
                          <View style={[styles.inviteAvatar, styles.inviteAvatarFallback]}>
                            <Text style={styles.inviteAvatarText}>{initials}</Text>
                          </View>
                        )}
                        <Text style={styles.inviteName}>{c.name}</Text>
                        <Text style={styles.inviteAction}>Add →</Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: 'center',
  },
  badgeText: {
    color: '#00A86B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  titleText: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  statusText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  peerMutedNote: {
    color: '#F59E0B',
    fontSize: 12,
    marginTop: 6,
  },
  webrtcNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  webrtcNoticeText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerPulse: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(0, 210, 135, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBig: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00D287',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  avatarBigImage: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  avatarBigText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  tileCard: {
    width: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tileInitials: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  tileName: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  removePeerBtn: {
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  removePeerText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsArea: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  ctrlBtn: {
    minWidth: 64,
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  ctrlBtnActive: {
    backgroundColor: '#E8F8F0',
  },
  ctrlIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  ctrlLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  hangupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  endAllBtn: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#991B1B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  incomingButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  answerCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#00D287',
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  declineCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeModalText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
  },
  inviteRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inviteAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  videoStage: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  peerVideoSurface: {
    width: '100%',
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPeerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 14,
  },
  pipVideoBox: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#00D287',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pipInnerCamera: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipAvatarImage: {
    width: '100%',
    height: '100%',
  },
  pipInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  pipMuteBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#EF4444',
    padding: 3,
    borderRadius: 6,
  },

  // Invite modal avatar styles
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  inviteAvatarFallback: {
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // 'No Response' screen styles
  noAnswerAvatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noAnswerAvatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  noAnswerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  noAnswerHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 6,
  },
  noAnswerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  noAnswerPhoneWrap: {
    marginVertical: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    gap: 8,
  },
  noAnswerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

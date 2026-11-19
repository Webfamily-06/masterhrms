import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ChevronDown,
  MoreVertical,
  Hash,
  SwitchCamera,
  Hand,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { createTenantQueryKey } from '../../../core/query/tenantQueryKeys';
import { useAuthStore } from '../../../store/authStore';
import { useCallStore } from '../../../store/callStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { ChatService } from '../../../core/services/chatService';
import { requestAppMediaPermissions } from '../../../core/services/permissionService';
import { LiveActivityService } from '../../../core/services/liveActivityService';
import { Config } from '../../../config/environment';

import { CallWaveformView } from '../../../components/calling/CallWaveformView';
import { CallKeypadModal } from '../../../components/calling/CallKeypadModal';
import { InCallOptionsBottomSheet } from '../../../components/calling/InCallOptionsBottomSheet';
import { CallPermissionModal } from '../../../components/calling/CallPermissionModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CallLifecycleState =
  | 'DIALING'
  | 'RINGING'
  | 'ACCEPTING'
  | 'CONNECTED'
  | 'BUSY'
  | 'DECLINED'
  | 'ENDED'
  | 'ERROR';

type NetworkQuality = 'connecting' | 'hd' | 'poor' | 'reconnecting' | 'failed';

interface MeetingPeer {
  userId: string;
  name: string;
  avatarUrl?: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHandRaised?: boolean;
}

function deduplicatePeers(peers: MeetingPeer[]): MeetingPeer[] {
  if (!Array.isArray(peers)) return [];
  const seen = new Set<string>();
  const deduped: MeetingPeer[] = [];
  for (const p of peers) {
    const key = String(p.userId || (p as any).id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }
  return deduped;
}

export const ChatCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch {
    // Fallback if rendered outside SafeAreaProvider
  }

  const user = useAuthStore((s) => s.user);
  const { activeRole } = usePermission();
  const setMinimized = useCallStore((s) => s.setMinimized);
  const setActiveCallInStore = useCallStore((s) => s.setActiveCall);
  const resetCallInStore = useCallStore((s) => s.resetCall);

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
    hasAccepted = false,
    initialStatus,
  } = route.params || {};

  const alreadyConnected = Boolean(hasAccepted || initialStatus === 'connected');

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
    return null;
  }, [receiverAvatar, callerAvatar]);

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
    return null;
  }, [user]);

  const [activeCallId, setActiveCallId] = useState<string | null>(initialCallId || null);
  const [callState, setCallState] = useState<CallLifecycleState>(
    isGroupMeeting || alreadyConnected ? 'CONNECTED' : isIncoming ? 'RINGING' : 'DIALING'
  );
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>(
    alreadyConnected ? 'hd' : 'connecting'
  );
  const [isAnswering, setIsAnswering] = useState(false);
  const [statusNote, setStatusNote] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);

  // In-call media toggles
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [peerMuted, setPeerMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isBackgroundBlur, setIsBackgroundBlur] = useState(false);

  // Modals
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [callTimedOut, setCallTimedOut] = useState(false);

  // Multiparty roster & invite modal
  const [participants, setParticipants] = useState<MeetingPeer[]>([]);
  const [creatorId, setCreatorId] = useState<string>('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const dedupedParticipants = useMemo(() => deduplicatePeers(participants), [participants]);

  const endedCleanupRef = useRef(false);
  const answeredRef = useRef(false);

  // Animated pulse for avatar ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (callState === 'DIALING' || callState === 'RINGING') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => {
        loop.stop();
      };
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [callState, pulseAnim]);

  // Request hardware media permissions when call screen opens
  useEffect(() => {
    const acquireHardware = async () => {
      const res = await requestAppMediaPermissions();
      if (!res.camera && (callType === 'video' || isVideoEnabled)) {
        setIsVideoEnabled(false);
        setPermissionModalOpen(true);
      }
      if (!res.microphone) {
        setIsMuted(true);
        setPermissionModalOpen(true);
      }
    };
    void acquireHardware();
  }, []);

  // 30-second ring timeout: if callee doesn't answer, show 'No Response' UI
  useEffect(() => {
    if (callState !== 'RINGING' && callState !== 'DIALING') return;
    const timer = setTimeout(() => {
      if (isIncoming) {
        if (activeCallId) ChatService.rejectCall(activeCallId, 'timeout').catch(() => {});
        navigation.goBack();
      } else {
        setCallTimedOut(true);
        setCallState('ENDED');
        setStatusNote('No answer');
        if (activeCallId) ChatService.cancelCall(activeCallId).catch(() => {});
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [callState, activeCallId, isIncoming, navigation]);

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
          deduplicatePeers(
            data.participants.map((p: any) => ({
              userId: String(p.userId || p.id),
              name: String(p.name || 'Participant'),
              avatarUrl: p.avatarUrl || p.avatar || p.image,
              isMuted: Boolean(p.isMuted),
              isVideoOff: Boolean(p.isVideoOff ?? p.isCameraOff),
              isHandRaised: Boolean(p.isHandRaised),
            }))
          )
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
            setNetworkQuality('hd');
            if (joinRes?.creatorId) setCreatorId(String(joinRes.creatorId));
            if (Array.isArray(joinRes?.participants)) {
              setParticipants(deduplicatePeers(joinRes.participants));
            } else {
              void refreshMeetingRoster(initialCallId);
            }
          }
          return;
        }

        if (alreadyConnected && initialCallId) {
          setActiveCallId(initialCallId);
          setCallState('CONNECTED');
          setNetworkQuality('hd');
          return;
        }

        if (isIncoming && initialCallId) {
          setActiveCallId(initialCallId);
          setCallState('RINGING');
          return;
        }

        if (receiverId) {
          setCallState('DIALING');
          const res = await ChatService.initiateCall(receiverId, callType, threadId);
          if (!mounted) return;
          setActiveCallId(res.callId);
          setCallState(res.status === 'connected' ? 'CONNECTED' : 'RINGING');
          if (res.status === 'connected') setNetworkQuality('hd');
        } else if (initialCallId) {
          const st = await ChatService.getCallStatus(initialCallId);
          if (!mounted) return;
          setActiveCallId(initialCallId);
          setCallState(st?.status === 'connected' ? 'CONNECTED' : 'RINGING');
          if (st?.status === 'connected') setNetworkQuality('hd');
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
    alreadyConnected,
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
          setNetworkQuality('hd');
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
      realtimeManager.subscribe('call:participant_joined', (p) => {
        if (p?.callId === activeCallId && p?.user) {
          const u = p.user;
          setParticipants((prev) => {
            const uid = String(u.userId || u.id);
            if (prev.some((x) => x.userId === uid)) return prev;
            return [
              ...prev,
              {
                userId: uid,
                name: String(u.name || 'Participant'),
                avatarUrl: u.avatarUrl || u.avatar,
                isMuted: Boolean(u.isMuted),
                isVideoOff: Boolean(u.isVideoOff),
                isHandRaised: Boolean(u.isHandRaised),
              },
            ];
          });
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

  // Connected duration counter + Live Activity update + 5s backend call heartbeat
  useEffect(() => {
    if (callState !== 'CONNECTED') return;

    // Start Live Activity on Dynamic Island / Android foreground notification
    void LiveActivityService.startLiveActivity({
      callId: activeCallId || 'call_live',
      callerName: isGroupMeeting ? groupName || receiverName : receiverName,
      callType,
      isGroup: isGroupMeeting,
      groupName,
    });

    const secInterval = setInterval(() => {
      setCallDuration((d) => {
        const next = d + 1;
        // Update Live Activity every 5 seconds
        if (next % 5 === 0) {
          void LiveActivityService.updateLiveActivity(isMuted, 'active', next);
        }
        return next;
      });
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
      void LiveActivityService.endLiveActivity();
    };
  }, [callState, isGroupMeeting, activeCallId, navigation, groupName, receiverName, callType, isMuted]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const toggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    void LiveActivityService.updateLiveActivity(next, 'active', callDuration);
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

  const handleMinimize = () => {
    setMinimized(true);
    setActiveCallInStore({
      callId: activeCallId || 'call_temp',
      callerId: user?.id || '',
      callerName: user?.profile?.fullName || 'Me',
      callerAvatar: selfAvatar,
      receiverId: receiverId || '',
      receiverName: isGroupMeeting ? groupName || receiverName : receiverName,
      receiverAvatar: displayAvatar,
      callType,
      threadId,
      groupId,
      groupName,
      isGroupMeeting,
      status: 'connected',
      durationSeconds: callDuration,
      isMuted,
      isVideoOff: !isVideoEnabled,
      isSpeakerOn,
      isMinimized: true,
    });
    navigation.goBack();
  };

  const handleAnswerIncoming = async () => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    if (!activeCallId || isAnswering) return;
    try {
      setIsAnswering(true);
      setCallState('ACCEPTING');
      setStatusNote('Connecting...');
      await ChatService.acceptCall(activeCallId);
      setCallState('CONNECTED');
      setNetworkQuality('hd');
      setStatusNote('');
    } catch (err: any) {
      setCallState('ERROR');
      setStatusNote(err?.message || 'Failed to connect call');
      setTimeout(() => navigation.goBack(), 1500);
    } finally {
      setIsAnswering(false);
    }
  };

  const handleHangupOrLeave = async () => {
    void LiveActivityService.endLiveActivity();
    resetCallInStore();

    if (!endedCleanupRef.current && activeCallId) {
      endedCleanupRef.current = true;
      try {
        if (isGroupMeeting) {
          await ChatService.leaveGroupMeeting(activeCallId);
        } else if (isIncoming && (callState === 'RINGING' || callState === 'ACCEPTING')) {
          await ChatService.rejectCall(activeCallId, 'declined_by_user');
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
    void LiveActivityService.endLiveActivity();
    resetCallInStore();
    endedCleanupRef.current = true;
    try {
      await ChatService.endGroupMeetingForAll(activeCallId);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to end meeting for everyone.');
    }
    navigation.goBack();
  };

  const handleInviteColleague = async (targetUserId: string, name: string, avatarUrl?: string) => {
    if (!activeCallId) return;
    try {
      realtimeManager.emit('call:invite_colleague', {
        callId: activeCallId,
        targetUserId,
      });

      if (isGroupMeeting) {
        await ChatService.inviteUsersToGroupMeeting(activeCallId, [targetUserId]);
      } else {
        await ChatService.inviteColleagueToCall(activeCallId, targetUserId);
      }
      setInviteModalOpen(false);
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === targetUserId)) return prev;
        return [
          ...prev,
          {
            userId: targetUserId,
            name,
            avatarUrl,
            isMuted: true,
            isVideoOff: true,
          },
        ];
      });
      Alert.alert('Invitation Sent', `Call invitation sent to ${name}.`);
    } catch (err: any) {
      Alert.alert('Invite Error', err?.message || 'Unable to invite colleague.');
    }
  };

  const canEndMeetingForAll =
    isGroupMeeting &&
    (creatorId === user?.id || activeRole === 'tenant_admin');

  // 'User Did Not Respond' screen shown after 30-second timeout
  if (callTimedOut) {
    const initials = (receiverName || 'U').substring(0, 2).toUpperCase();
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
            paddingTop: insets.top > 0 ? insets.top + 32 : 44,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32,
          },
        ]}
      >
        <View style={styles.noAnswerAvatarCircle}>
          <Text style={styles.noAnswerAvatarText}>{initials}</Text>
        </View>
        <Text style={styles.noAnswerName}>{receiverName}</Text>
        <Text style={styles.noAnswerHeading}>Didn't Respond</Text>
        <Text style={styles.noAnswerSub}>Call ended after 30 seconds</Text>
        <View style={styles.noAnswerPhoneWrap}>
          <PhoneOff size={38} color="#EF4444" />
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 32 }}>
          <TouchableOpacity
            style={[styles.noAnswerBtn, { backgroundColor: '#334155' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.noAnswerBtnText}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.noAnswerBtn, { backgroundColor: '#6366F1' }]}
            onPress={() => {
              setCallTimedOut(false);
              setCallState('DIALING');
              if (receiverId) {
                ChatService.initiateCall(receiverId, callType, threadId)
                  .then((r) => {
                    setActiveCallId(r.callId);
                    setCallState(r.status === 'connected' ? 'CONNECTED' : 'RINGING');
                  })
                  .catch(() => setCallState('ERROR'));
              }
            }}
            activeOpacity={0.8}
          >
            <Phone size={16} color="#FFFFFF" />
            <Text style={styles.noAnswerBtnText}>Call Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top > 0 ? insets.top + 12 : 36,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
        },
      ]}
    >
      {/* ── Top Header Navigation Bar ── */}
      <View style={styles.topBar}>
        {/* Minimize Button */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleMinimize}
          accessibilityLabel="Minimize call to Picture-in-Picture"
          activeOpacity={0.7}
        >
          <ChevronDown size={22} color="#CBD5E1" />
        </TouchableOpacity>

        {/* Center Title & Badge */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isGroupMeeting ? groupName || 'Group Meeting' : receiverName}
          </Text>

          {/* Network / Encryption State Badge */}
          <View style={styles.networkBadge}>
            <ShieldCheck size={11} color={networkQuality === 'poor' ? '#F59E0B' : '#10B981'} />
            <Text style={styles.networkBadgeText}>
              {callState === 'CONNECTED'
                ? `${networkQuality === 'poor' ? 'Weak Connection' : 'HD'} • ${formatDuration(callDuration)}`
                : callState === 'RINGING'
                ? isIncoming ? 'Incoming...' : 'Ringing...'
                : callState === 'DIALING'
                ? 'Calling...'
                : statusNote || callState}
            </Text>
          </View>
        </View>

        {/* More Options / Settings Button */}
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setMoreOptionsOpen(true)}
          accessibilityLabel="More in-call options"
          activeOpacity={0.7}
        >
          <MoreVertical size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      {/* ── Center Stage: Multiparty Grid, Video Stage, or Audio Call Stage ── */}
      {isGroupMeeting || participants.length > 0 ? (
        /* Multiparty Group Grid */
        <ScrollView contentContainerStyle={styles.gridWrap}>
          {participants.length === 0 ? (
            <View style={[styles.tileCard, styles.tileCardActiveSpeaker]}>
              {selfAvatar ? (
                <Image source={{ uri: selfAvatar }} style={styles.tileAvatarImage} />
              ) : (
                <View style={styles.tileInitialsBox}>
                  <Text style={styles.tileInitials}>
                    {(user?.profile?.fullName || 'ME').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.tileInfoRow}>
                <Text style={styles.tileName}>You (Host)</Text>
                {isMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} color="#10B981" />}
              </View>
            </View>
          ) : (
            dedupedParticipants.map((p: MeetingPeer) => {
              const pAvatar = p.avatarUrl
                ? (p.avatarUrl.startsWith('http')
                    ? p.avatarUrl
                    : `${Config.API_BASE_URL}${p.avatarUrl.startsWith('/') ? '' : '/'}${p.avatarUrl}`)
                : null;

              return (
                <View
                  key={p.userId}
                  style={[
                    styles.tileCard,
                    !p.isMuted && styles.tileCardActiveSpeaker,
                  ]}
                >
                  {pAvatar ? (
                    <Image source={{ uri: pAvatar }} style={styles.tileAvatarImage} />
                  ) : (
                    <View style={styles.tileInitialsBox}>
                      <Text style={styles.tileInitials}>
                        {(p.name || 'P').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.tileInfoRow}>
                    <Text style={styles.tileName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {p.isMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} color="#10B981" />}
                  </View>
                  {p.isHandRaised && (
                    <View style={styles.handBadge}>
                      <Hand size={11} color="#F59E0B" />
                    </View>
                  )}
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
              );
            })
          )}
        </ScrollView>
      ) : isVideoEnabled && callState === 'CONNECTED' ? (
        /* Video Call Stage */
        <View style={styles.videoStage}>
          {/* Main Remote Video Surface */}
          <View style={styles.remoteVideoContainer}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.videoAvatarFull} resizeMode="cover" />
            ) : (
              <View style={styles.videoInitialsFull}>
                <Text style={styles.videoInitialsText}>
                  {(receiverName || 'U').substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Top-Left Remote Name & Timer Badge */}
            <View style={styles.videoInfoBadge}>
              <Text style={styles.videoInfoName}>{receiverName}</Text>
              <Text style={styles.videoInfoTime}>• {formatDuration(callDuration)}</Text>
            </View>

            {/* Remote Mute Notice */}
            {peerMuted && (
              <View style={styles.peerMutedBadge}>
                <MicOff size={12} color="#EF4444" />
                <Text style={styles.peerMutedBadgeText}>Microphone muted</Text>
              </View>
            )}
          </View>

          {/* Local PiP Preview Box */}
          <View style={styles.pipVideoBox}>
            {selfAvatar ? (
              <Image source={{ uri: selfAvatar }} style={styles.pipAvatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.pipInitialsBox}>
                <Text style={styles.pipInitialsText}>
                  {(user?.profile?.fullName || 'ME').substring(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.pipFlipBtn}
              onPress={() => setIsFrontCamera((c) => !c)}
              accessibilityLabel="Flip camera"
            >
              <SwitchCamera size={13} color={isFrontCamera ? '#FFFFFF' : '#818CF8'} />
            </TouchableOpacity>
            {isMuted && (
              <View style={styles.pipMuteBadge}>
                <MicOff size={10} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      ) : (
        /* Audio Call Center Stage */
        <View style={styles.audioStage}>
          {/* Outer Pulse Waves */}
          <View style={styles.pulseContainer}>
            <Animated.View
              style={[
                styles.pulseWaveOuter,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.25],
                    outputRange: [0.35, 0],
                  }),
                },
              ]}
            />
            <View style={styles.pulseWaveInner} />

            {/* Main Center Avatar */}
            <View style={styles.audioAvatarCircle}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.audioAvatarImg} resizeMode="cover" />
              ) : (
                <View style={styles.audioInitialsCircle}>
                  <Text style={styles.audioInitialsText}>
                    {(receiverName || 'U').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Caller Details */}
          <Text style={styles.callerNameText}>{receiverName}</Text>
          <Text style={styles.callerSubText}>
            {callState === 'CONNECTED'
              ? 'High Definition Voice'
              : callState === 'RINGING'
              ? 'Ringing...'
              : 'Calling...'}
          </Text>

          {/* Animated Waveform Speaking Indicator */}
          <View style={styles.waveformWrap}>
            <CallWaveformView
              isActive={callState === 'CONNECTED' && !peerMuted}
              barCount={16}
              maxHeight={32}
            />
          </View>

          {/* Active Call Duration */}
          <Text style={styles.durationBigText}>
            {callState === 'CONNECTED' ? formatDuration(callDuration) : ' '}
          </Text>
        </View>
      )}

      {/* ── Bottom Call Controls Dock ── */}
      <View style={styles.controlsDock}>
        {isIncoming && callState === 'RINGING' ? (
          /* Incoming Accept & Decline Controls */
          <View style={styles.incomingControlsRow}>
            <TouchableOpacity
              style={[styles.circleBtn, styles.declineBtn]}
              onPress={handleHangupOrLeave}
              activeOpacity={0.85}
              accessibilityLabel="Decline call"
            >
              <PhoneOff size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.circleBtn, styles.answerBtn]}
              onPress={handleAnswerIncoming}
              disabled={isAnswering}
              activeOpacity={0.85}
              accessibilityLabel="Answer call"
            >
              {isAnswering ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Phone size={28} color="#FFFFFF" strokeWidth={2.4} />
              )}
            </TouchableOpacity>
          </View>
        ) : callState === 'DIALING' || callState === 'RINGING' ? (
          /* Outgoing Dialing: Single Red Cancel Button */
          <View style={styles.outgoingControlsRow}>
            <TouchableOpacity
              style={[styles.circleBtn, styles.endCallCircleBtn]}
              onPress={handleHangupOrLeave}
              activeOpacity={0.85}
              accessibilityLabel="Cancel call"
            >
              <PhoneOff size={28} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            <Text style={styles.controlLabel}>Cancel</Text>
          </View>
        ) : (
          /* Connected Active Call Controls Dock */
          <View style={styles.dockSurface}>
            <View style={styles.dockRow}>
              {/* 1. Mute Toggle */}
              <TouchableOpacity
                style={[styles.dockBtn, isMuted && styles.dockBtnActiveRed]}
                onPress={toggleMute}
                activeOpacity={0.75}
                accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff size={22} color="#EF4444" /> : <Mic size={22} color="#F8FAFC" />}
                <Text style={[styles.dockLabel, isMuted && { color: '#EF4444' }]}>
                  {isMuted ? 'Muted' : 'Mute'}
                </Text>
              </TouchableOpacity>

              {/* 2. Video Toggle */}
              <TouchableOpacity
                style={[styles.dockBtn, isVideoEnabled && styles.dockBtnActiveIndigo]}
                onPress={toggleVideo}
                activeOpacity={0.75}
                accessibilityLabel={isVideoEnabled ? 'Turn Video Off' : 'Turn Video On'}
              >
                {isVideoEnabled ? (
                  <Video size={22} color="#818CF8" />
                ) : (
                  <VideoOff size={22} color="#94A3B8" />
                )}
                <Text style={[styles.dockLabel, isVideoEnabled && { color: '#818CF8' }]}>
                  {isVideoEnabled ? 'Video On' : 'Video Off'}
                </Text>
              </TouchableOpacity>

              {/* 3. Speaker Toggle */}
              <TouchableOpacity
                style={[styles.dockBtn, isSpeakerOn && styles.dockBtnActiveIndigo]}
                onPress={() => setIsSpeakerOn((s) => !s)}
                activeOpacity={0.75}
                accessibilityLabel="Toggle Speaker"
              >
                {isSpeakerOn ? (
                  <Volume2 size={22} color="#818CF8" />
                ) : (
                  <VolumeX size={22} color="#94A3B8" />
                )}
                <Text style={[styles.dockLabel, isSpeakerOn && { color: '#818CF8' }]}>
                  {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                </Text>
              </TouchableOpacity>

              {/* 4. Keypad Toggle */}
              <TouchableOpacity
                style={styles.dockBtn}
                onPress={() => setKeypadOpen(true)}
                activeOpacity={0.75}
                accessibilityLabel="Open Keypad"
              >
                <Hash size={22} color="#F8FAFC" />
                <Text style={styles.dockLabel}>Keypad</Text>
              </TouchableOpacity>

              {/* 5. More Options */}
              <TouchableOpacity
                style={styles.dockBtn}
                onPress={() => setMoreOptionsOpen(true)}
                activeOpacity={0.75}
                accessibilityLabel="More options"
              >
                <MoreVertical size={22} color="#F8FAFC" />
                <Text style={styles.dockLabel}>More</Text>
              </TouchableOpacity>

              {/* 6. End Call */}
              <TouchableOpacity
                style={[styles.dockBtn, styles.endCallBtn]}
                onPress={handleHangupOrLeave}
                activeOpacity={0.85}
                accessibilityLabel={isGroupMeeting ? 'Leave meeting' : 'End call'}
              >
                <PhoneOff size={22} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={[styles.dockLabel, { color: '#FFFFFF', fontWeight: '700' }]}>
                  {isGroupMeeting ? 'Leave' : 'End'}
                </Text>
              </TouchableOpacity>
            </View>

            {canEndMeetingForAll && (
              <TouchableOpacity
                style={styles.endForAllBtn}
                onPress={handleEndMeetingForAll}
                activeOpacity={0.85}
              >
                <Text style={styles.endForAllText}>End Meeting for All Participants</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Keypad Modal ── */}
      <CallKeypadModal
        visible={keypadOpen}
        onClose={() => setKeypadOpen(false)}
        onSendDtmfTone={(digit) => {
          if (activeCallId) {
            realtimeManager.emit('call:dtmf', { callId: activeCallId, digit });
          }
        }}
      />

      {/* ── In-Call Options Bottom Sheet ── */}
      <InCallOptionsBottomSheet
        visible={moreOptionsOpen}
        onClose={() => setMoreOptionsOpen(false)}
        participantCount={participants.length + 1}
        onOpenParticipants={() => setInviteModalOpen(true)}
        onOpenInviteColleagues={() => setInviteModalOpen(true)}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={() => setIsScreenSharing((s) => !s)}
        isHandRaised={isHandRaised}
        onToggleRaiseHand={() => setIsHandRaised((h) => !h)}
        isBackgroundBlur={isBackgroundBlur}
        onToggleBackgroundBlur={() => setIsBackgroundBlur((b) => !b)}
        onOpenCallInfo={() => {
          Alert.alert(
            'Call Information',
            `Session ID: ${activeCallId || 'N/A'}\nMode: ${callType.toUpperCase()}\nSecurity: End-to-End Encrypted\nRelay: Free STUN Traversal\nMedia: Peer-to-Peer Mesh`
          );
        }}
      />

      {/* ── Hardware Permissions Modal ── */}
      <CallPermissionModal
        visible={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        onRequestPermissions={async () => {
          await requestAppMediaPermissions();
        }}
        missingPermissions={callType === 'video' ? ['microphone', 'camera'] : ['microphone']}
      />

      {/* ── Add Colleague Modal ── */}
      <Modal visible={inviteModalOpen} animationType="slide" transparent onRequestClose={() => setInviteModalOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setInviteModalOpen(false)}
        >
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Colleague to Call</Text>
              <TouchableOpacity onPress={() => setInviteModalOpen(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {contactsQuery.isLoading ? (
              <ActivityIndicator color="#6366F1" style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {(contactsQuery.data || [])
                  .filter((c) => c.userId !== user?.id)
                  .map((c) => {
                    let rawAvatar = c.avatar || (c as any).avatarUrl;
                    if (rawAvatar) {
                      let trimmed = rawAvatar.trim();
                      if (trimmed.includes('api.dicebear.com') && trimmed.includes('/svg?')) {
                        trimmed = trimmed.replace('/svg?', '/png?');
                      }
                      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                        rawAvatar = trimmed;
                      } else if (trimmed.startsWith('/')) {
                        rawAvatar = `${Config.API_BASE_URL}${trimmed}`;
                      } else if (trimmed.startsWith('uploads/')) {
                        rawAvatar = `${Config.API_BASE_URL}/${trimmed}`;
                      }
                    } else {
                      const seed = encodeURIComponent(c.name || c.userId || 'colleague');
                      rawAvatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=6366f1`;
                    }

                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.inviteRow}
                        onPress={() => handleInviteColleague(c.userId, c.name, rawAvatar)}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: rawAvatar }} style={styles.inviteAvatar} />
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.inviteName} numberOfLines={1}>
                            {c.name}
                          </Text>
                          {Boolean(c.department || c.designation) && (
                            <Text style={styles.inviteRoleText} numberOfLines={1}>
                              {[c.designation, c.department].filter(Boolean).join(' • ')}
                            </Text>
                          )}
                        </View>
                        <View style={styles.inviteAddBadge}>
                          <Text style={styles.inviteAction}>Invite +</Text>
                        </View>
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
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 220,
    textAlign: 'center',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  networkBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  audioStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pulseContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseWaveOuter: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },
  pulseWaveInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  audioAvatarCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: '#6366F1',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  audioAvatarImg: {
    width: '100%',
    height: '100%',
  },
  audioInitialsCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInitialsText: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '700',
  },
  callerNameText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  callerSubText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  waveformWrap: {
    marginVertical: 12,
  },
  durationBigText: {
    color: '#818CF8',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  videoStage: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoAvatarFull: {
    width: '100%',
    height: '100%',
  },
  videoInitialsFull: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInitialsText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  videoInfoBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  videoInfoName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  videoInfoTime: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  peerMutedBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  peerMutedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  pipVideoBox: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 96,
    height: 136,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#6366F1',
    overflow: 'hidden',
    elevation: 8,
  },
  pipAvatarImg: {
    width: '100%',
    height: '100%',
  },
  pipInitialsBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#312E81',
  },
  pipInitialsText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  pipFlipBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipMuteBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  tileCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    aspectRatio: 1.1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  tileCardActiveSpeaker: {
    borderColor: '#6366F1',
    borderWidth: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tileAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 8,
  },
  tileInitialsBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileInitials: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 90,
  },
  handBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    padding: 4,
    borderRadius: 8,
  },
  removePeerBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  removePeerText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dockSurface: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dockRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dockBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 48,
  },
  dockBtnActiveIndigo: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  dockBtnActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  dockLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  endCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  endForAllBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  endForAllText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  incomingControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
  },
  outgoingControlsRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  circleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  answerBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  declineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  endCallCircleBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  controlLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  noAnswerAvatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noAnswerAvatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  noAnswerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  noAnswerHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  noAnswerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 10,
  },
  noAnswerPhoneWrap: {
    marginVertical: 16,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noAnswerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    gap: 8,
  },
  noAnswerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  inviteRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  inviteRoleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  inviteAddBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inviteAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818CF8',
  },
});

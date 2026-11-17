import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { ChatService } from '../../../core/services/chatService';

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
    callType = 'audio',
    threadId,
    groupId,
    groupName,
    isGroupMeeting = false,
    isIncoming = false,
  } = route.params || {};

  const hasNativeWebRtc = typeof (globalThis as any).RTCPeerConnection === 'function';

  const [activeCallId, setActiveCallId] = useState<string | null>(initialCallId || null);
  const [callState, setCallState] = useState<CallLifecycleState>(
    isIncoming || isGroupMeeting ? 'CONNECTED' : 'DIALING'
  );
  const [statusNote, setStatusNote] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isOnHold, setIsOnHold] = useState(false);
  const [peerMuted, setPeerMuted] = useState(false);

  // Multiparty roster & invite modal
  const [participants, setParticipants] = useState<MeetingPeer[]>([]);
  const [creatorId, setCreatorId] = useState<string>('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const endedCleanupRef = useRef(false);

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
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
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

  const toggleHold = async () => {
    const next = !isOnHold;
    setIsOnHold(next);
    if (!activeCallId || isGroupMeeting) return;
    try {
      await ChatService.updateCallMediaState(activeCallId, 'call-hold', next);
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
      ? isOnHold
        ? `On Hold (${formatDuration(callDuration)})`
        : formatDuration(callDuration)
      : statusNote || callState;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.badgeText}>
          {isGroupMeeting
            ? `👥 MULTIPARTY ${callType.toUpperCase()} MEETING`
            : callType === 'video'
            ? '📹 SECURE VIDEO CALL'
            : '📞 SECURE VOICE CALL'}
        </Text>
        <Text style={styles.titleText} numberOfLines={2}>
          {isGroupMeeting ? groupName || receiverName : receiverName}
        </Text>
        <Text style={styles.statusText}>{statusHeading}</Text>

        {peerMuted && !isGroupMeeting && (
          <Text style={styles.peerMutedNote}>🔇 Peer microphone is muted</Text>
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
              <Text style={styles.tileName}>You {isMuted ? '🔇' : '🎙️'}</Text>
            </View>
          ) : (
            participants.map((p) => (
              <View key={p.userId} style={styles.tileCard}>
                <Text style={styles.tileInitials}>
                  {p.name.substring(0, 2).toUpperCase()}
                </Text>
                <Text style={styles.tileName} numberOfLines={1}>
                  {p.name} {p.isMuted ? '🔇' : '🎙️'}
                </Text>
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
      ) : (
        <View style={styles.centerStage}>
          <View style={styles.outerPulse}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>
                {receiverName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Call Controls */}
      <View style={styles.controlsArea}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
          >
            <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, isVideoEnabled && styles.ctrlBtnActive]}
            onPress={toggleVideo}
            accessibilityRole="button"
            accessibilityLabel="Toggle video"
          >
            <Text style={styles.ctrlIcon}>{isVideoEnabled ? '📹' : '🚫'}</Text>
            <Text style={styles.ctrlLabel}>{isVideoEnabled ? 'Video On' : 'Video Off'}</Text>
          </TouchableOpacity>

          {!isGroupMeeting && (
            <TouchableOpacity
              style={[styles.ctrlBtn, isOnHold && styles.ctrlBtnActive]}
              onPress={toggleHold}
              accessibilityRole="button"
              accessibilityLabel="Hold call"
            >
              <Text style={styles.ctrlIcon}>{isOnHold ? '▶️' : '⏸️'}</Text>
              <Text style={styles.ctrlLabel}>{isOnHold ? 'Resume' : 'Hold'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ctrlBtn}
            onPress={() => setInviteModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Invite colleague"
          >
            <Text style={styles.ctrlIcon}>➕</Text>
            <Text style={styles.ctrlLabel}>Add Peer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hangupRow}>
          <TouchableOpacity
            style={styles.endCallBtn}
            onPress={handleHangupOrLeave}
            accessibilityRole="button"
            accessibilityLabel={isGroupMeeting ? 'Leave meeting' : 'End call'}
          >
            <Text style={styles.endCallText}>
              {isGroupMeeting ? 'Leave Meeting' : 'End Call'}
            </Text>
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
      </View>

      {/* Add Colleague Modal */}
      <Modal visible={inviteModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Colleague to Call</Text>
              <TouchableOpacity onPress={() => setInviteModalOpen(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            {contactsQuery.isLoading ? (
              <ActivityIndicator color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {(contactsQuery.data || [])
                  .filter((c) => c.userId !== user?.id)
                  .map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.inviteRow}
                      onPress={() => handleInviteColleague(c.userId, c.name)}
                    >
                      <Text style={styles.inviteName}>{c.name}</Text>
                      <Text style={styles.inviteAction}>Invite →</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 38,
    paddingHorizontal: 20,
  },
  topSection: {
    alignItems: 'center',
  },
  badgeText: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusText: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '600',
  },
  peerMutedNote: {
    color: '#FBBF24',
    fontSize: 12,
    marginTop: 6,
  },
  webrtcNotice: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  webrtcNoticeText: {
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerPulse: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBig: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBigText: {
    color: '#FFFFFF',
    fontSize: 34,
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tileInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  tileName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  removePeerBtn: {
    marginTop: 8,
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  removePeerText: {
    color: '#FECACA',
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
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  ctrlBtnActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.45)',
  },
  ctrlIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  ctrlLabel: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  hangupRow: {
    flexDirection: 'row',
    gap: 12,
  },
  endCallBtn: {
    minHeight: 52,
    paddingHorizontal: 28,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
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
});

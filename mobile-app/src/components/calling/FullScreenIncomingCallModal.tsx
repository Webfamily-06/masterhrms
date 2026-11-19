import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Phone, Video, PhoneOff, MessageSquare, X, Send } from 'lucide-react-native';
import { Text } from '../common/Text';
import { useCallStore } from '../../store/callStore';
import { ChatService } from '../../core/services/chatService';
import { realtimeManager } from '../../core/realtime/realtimeManager';
import { useAuthStore } from '../../store/authStore';
import { navigationRef } from '../../app/navigation/navigationRef';

const QUICK_MESSAGES = [
  "Can't talk now. What's up?",
  "I'll call you right back.",
  'In a meeting, message me.',
  'On my way, give me 5 mins.',
];

export const FullScreenIncomingCallModal: React.FC = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const incomingCall = useCallStore((s) => s.incomingCall);
  const setIncomingCall = useCallStore((s) => s.setIncomingCall);

  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [customReply, setCustomReply] = useState('');

  // Pulse animation for avatar ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!incomingCall) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
      pulseAnim.setValue(1);
    };
  }, [incomingCall, pulseAnim]);

  // Subscribe to real-time incoming call signaling events
  useEffect(() => {
    const unsubIncoming = realtimeManager.subscribe('call:incoming', (payload: any) => {
      if (!payload) return;
      const callerId = payload.callerId || payload.fromUserId;
      if (callerId && currentUserId && String(callerId) === String(currentUserId)) {
        return; // ignore self-authored invites
      }

      setIncomingCall({
        callId: payload.callId,
        callerId,
        callerName: payload.callerName || payload.fromName || 'Colleague',
        callerAvatar: payload.callerAvatar || payload.callerAvatarUrl,
        callerPhone: payload.callerPhone,
        callerEmail: payload.callerEmail,
        callType: (payload.callType || payload.type || 'audio').toLowerCase() as 'audio' | 'video',
        threadId: payload.threadId,
        tenantId: payload.tenantId,
        isGroup: payload.isGroup,
        groupId: payload.groupId,
        groupName: payload.groupName,
      });
    });

    const unsubCancelled = realtimeManager.subscribe('call:cancelled', (payload: any) => {
      if (incomingCall && (!payload?.callId || payload.callId === incomingCall.callId)) {
        setIncomingCall(null);
        setShowMessageSheet(false);
      }
    });

    const unsubTimeout = realtimeManager.subscribe('call:timeout', (payload: any) => {
      if (incomingCall && (!payload?.callId || payload.callId === incomingCall.callId)) {
        setIncomingCall(null);
        setShowMessageSheet(false);
      }
    });

    const unsubEnded = realtimeManager.subscribe('call:ended', (payload: any) => {
      if (incomingCall && (!payload?.callId || payload.callId === incomingCall.callId)) {
        setIncomingCall(null);
        setShowMessageSheet(false);
      }
    });

    return () => {
      unsubIncoming();
      unsubCancelled();
      unsubTimeout();
      unsubEnded();
    };
  }, [currentUserId, incomingCall, setIncomingCall]);

  if (!incomingCall) {
    return null;
  }

  const handleAccept = async () => {
    const call = incomingCall;
    setIncomingCall(null);
    setShowMessageSheet(false);
    try {
      await ChatService.acceptCall(call.callId);
    } catch {
      // Non-fatal
    }

    if (navigationRef.isReady()) {
      navigationRef.navigate('ChatCall', {
        callId: call.callId,
        receiverId: call.callerId,
        receiverName: call.callerName,
        receiverAvatar: call.callerAvatar,
        callType: call.callType,
        threadId: call.threadId,
        groupId: call.groupId,
        groupName: call.groupName,
        isGroupMeeting: call.isGroup,
        isIncoming: true,
        hasAccepted: true,
        initialStatus: 'connected',
      });
    }
  };

  const handleDecline = async () => {
    const callId = incomingCall.callId;
    setIncomingCall(null);
    setShowMessageSheet(false);
    try {
      await ChatService.rejectCall(callId, 'declined');
    } catch {
      // Non-fatal
    }
  };

  const handleSendQuickMessage = async (text: string) => {
    const call = incomingCall;
    setIncomingCall(null);
    setShowMessageSheet(false);

    try {
      await ChatService.rejectCall(call.callId, 'busy');
      if (call.threadId && text.trim()) {
        await ChatService.sendMessage({ threadId: call.threadId, content: text.trim() });
      }
    } catch {
      // Non-fatal
    }

    if (call.threadId && navigationRef.isReady()) {
      navigationRef.navigate('ChatConversationDetail', {
        threadId: call.threadId,
        title: call.callerName,
        otherParticipantId: call.callerId,
      });
    }
  };

  let avatarUri = incomingCall.callerAvatar;
  if (avatarUri && avatarUri.includes('api.dicebear.com') && avatarUri.includes('/svg?')) {
    avatarUri = avatarUri.replace('/svg?', '/png?');
  }

  return (
    <Modal visible={!!incomingCall} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        {/* Ambient Glow */}
        <View style={styles.glowTop} />

        <View style={styles.topSection}>
          <View style={styles.securityBadge}>
            <Text style={styles.headerBadge}>
              MASTERHRMS • {incomingCall.callType === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
            </Text>
          </View>

          {/* Avatar with Animated Pulse Rings */}
          <View style={styles.avatarContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.25],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <View style={styles.avatarInner}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitials}>
                    {incomingCall.callerName.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.typeIconBadge}>
              {incomingCall.callType === 'video' ? (
                <Video size={18} color="#FFFFFF" />
              ) : (
                <Phone size={18} color="#FFFFFF" />
              )}
            </View>
          </View>

          <Text style={styles.callerName}>{incomingCall.callerName}</Text>
          <Text style={styles.callTypeSub}>
            Incoming {incomingCall.callType === 'video' ? 'video' : 'voice'} call...
          </Text>
          {incomingCall.groupName && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupNote}>Group: {incomingCall.groupName}</Text>
            </View>
          )}
        </View>

        {/* Bottom Section: Message, Decline & Accept Controls */}
        <View style={styles.bottomSection}>
          <View style={styles.actionRow}>
            {/* 1. Message Control */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.messageBtn]}
                onPress={() => setShowMessageSheet(true)}
                accessibilityRole="button"
                accessibilityLabel="Reply with message"
                activeOpacity={0.8}
              >
                <MessageSquare size={24} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Message</Text>
            </View>

            {/* 2. Decline Button */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={handleDecline}
                accessibilityRole="button"
                accessibilityLabel="Decline call"
                activeOpacity={0.8}
              >
                <PhoneOff size={28} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>

            {/* 3. Accept Button */}
            <View style={styles.actionCol}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={handleAccept}
                accessibilityRole="button"
                accessibilityLabel="Accept call"
                activeOpacity={0.8}
              >
                {incomingCall.callType === 'video' ? (
                  <Video size={28} color="#FFFFFF" strokeWidth={2.4} />
                ) : (
                  <Phone size={28} color="#FFFFFF" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          </View>
        </View>

        {/* Quick Message Bottom Sheet */}
        {showMessageSheet && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.messageSheetOverlay}
          >
            <View style={styles.messageSheetContainer}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Reply with Message</Text>
                <TouchableOpacity
                  onPress={() => setShowMessageSheet(false)}
                  style={styles.sheetCloseBtn}
                >
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.quickMessageList}>
                {QUICK_MESSAGES.map((msg, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickMsgItem}
                    onPress={() => handleSendQuickMessage(msg)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickMsgText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customReplyWrap}>
                <TextInput
                  style={styles.customReplyInput}
                  placeholder="Custom message..."
                  placeholderTextColor="#64748B"
                  value={customReply}
                  onChangeText={setCustomReply}
                />
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    !customReply.trim() && { opacity: 0.5 },
                  ]}
                  disabled={!customReply.trim()}
                  onPress={() => handleSendQuickMessage(customReply)}
                >
                  <Send size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
    position: 'relative',
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  securityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 36,
  },
  headerBadge: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  avatarInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 3,
    borderColor: '#6366F1',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    elevation: 8,
    shadowColor: '#6366F1',
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '700',
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: 2,
    right: 6,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366F1',
    borderWidth: 3,
    borderColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    color: '#F8FAFC',
    fontSize: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  callTypeSub: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  groupBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupNote: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  bottomSection: {
    marginBottom: 30,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  actionCol: {
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  messageBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  actionLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  messageSheetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  messageSheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickMessageList: {
    gap: 8,
    marginBottom: 14,
  },
  quickMsgItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickMsgText: {
    color: '#F8FAFC',
    fontSize: 14,
  },
  customReplyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customReplyInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

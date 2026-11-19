import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Mic, MicOff, Maximize2, PhoneOff } from 'lucide-react-native';
import { Text } from '../common/Text';
import { useCallStore } from '../../store/callStore';
import { ChatService } from '../../core/services/chatService';
import { navigationRef } from '../../app/navigation/navigationRef';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const FloatingMiniCallWidget: React.FC = () => {
  const activeCall = useCallStore((s) => s.activeCall);
  const isMinimized = activeCall?.isMinimized ?? false;
  const setMinimized = useCallStore((s) => s.setMinimized);
  const updateActiveCall = useCallStore((s) => s.updateActiveCall);
  const resetCall = useCallStore((s) => s.resetCall);

  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 210, y: 110 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  if (!activeCall || !isMinimized) {
    return null;
  }

  const peerName = activeCall.receiverName || activeCall.callerName || 'Colleague';
  const peerAvatar = activeCall.receiverAvatar || activeCall.callerAvatar;
  const peerId = activeCall.receiverId || activeCall.callerId;

  const handleMaximize = () => {
    setMinimized(false);
    if (navigationRef.isReady()) {
      navigationRef.navigate('ChatCall', {
        callId: activeCall.callId,
        receiverId: peerId,
        receiverName: peerName,
        receiverAvatar: peerAvatar,
        callType: activeCall.callType,
        threadId: activeCall.threadId,
        groupId: activeCall.groupId,
        groupName: activeCall.groupName,
        isGroupMeeting: activeCall.isGroupMeeting,
        hasAccepted: true,
        initialStatus: 'connected',
      });
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !activeCall.isMuted;
    updateActiveCall({ isMuted: nextMuted });
    ChatService.updateCallMediaState(activeCall.callId, 'audio-mute', nextMuted).catch(() => {});
  };

  const handleHangup = async () => {
    const callId = activeCall.callId;
    const dur = activeCall.durationSeconds || 0;
    resetCall();
    try {
      await ChatService.endCall(callId, dur);
    } catch {
      // Non-fatal
    }
  };

  let avatarUri = peerAvatar;
  if (avatarUri && avatarUri.includes('api.dicebear.com') && avatarUri.includes('/svg?')) {
    avatarUri = avatarUri.replace('/svg?', '/png?');
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Caller Info Left */}
      <TouchableOpacity
        style={styles.infoArea}
        onPress={handleMaximize}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Maximize call"
      >
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {peerName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.liveIndicator} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.nameText} numberOfLines={1}>
            {peerName}
          </Text>
          <Text style={styles.durationText}>
            {formatDuration(activeCall.durationSeconds)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Action Controls Right */}
      <View style={styles.controlsRow}>
        {/* Mute Toggle */}
        <TouchableOpacity
          style={[styles.miniBtn, activeCall.isMuted && styles.miniBtnMuted]}
          onPress={handleToggleMute}
          accessibilityRole="button"
          accessibilityLabel={activeCall.isMuted ? 'Unmute' : 'Mute'}
        >
          {activeCall.isMuted ? (
            <MicOff size={15} color="#EF4444" />
          ) : (
            <Mic size={15} color="#94A3B8" />
          )}
        </TouchableOpacity>

        {/* Maximize */}
        <TouchableOpacity
          style={styles.miniBtn}
          onPress={handleMaximize}
          accessibilityRole="button"
          accessibilityLabel="Maximize call"
        >
          <Maximize2 size={15} color="#818CF8" />
        </TouchableOpacity>

        {/* End Call */}
        <TouchableOpacity
          style={styles.hangupBtn}
          onPress={handleHangup}
          accessibilityRole="button"
          accessibilityLabel="End call"
        >
          <PhoneOff size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 204,
    height: 58,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    elevation: 10,
    shadowColor: '#6366F1',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 99999,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  liveIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  textWrap: {
    flex: 1,
  },
  nameText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  durationText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBtnMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  hangupBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

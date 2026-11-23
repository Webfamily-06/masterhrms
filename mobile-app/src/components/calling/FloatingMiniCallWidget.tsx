import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Mic,
  MicOff,
  Maximize2,
  PhoneOff,
  Timer,
  Flame,
  TrendingUp,
  Target,
  Download,
  Bell,
  ScanFace,
  Calendar,
  X,
  Minimize2,
  ArrowUpRight,
} from 'lucide-react-native';
import { Text } from '../common/Text';
import {
  useCallStore,
  DynamicIslandActivityType,
  DynamicIslandMode,
} from '../../store/callStore';
import { ChatService } from '../../core/services/chatService';
import { LiveActivityService } from '../../core/services/liveActivityService';
import { navigationRef } from '../../app/navigation/navigationRef';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getIslandAccent(type: DynamicIslandActivityType, custom?: string): string {
  if (custom) return custom;
  switch (type) {
    case 'ongoing_call':
    case 'group_call':
    case 'incoming_call':
      return '#10B981';
    case 'timer':
      return '#F59E0B';
    case 'daily_streak':
      return '#F97316';
    case 'finance_statistic':
      return '#22C55E';
    case 'goal_progress':
      return '#6366F1';
    case 'download':
      return '#38BDF8';
    case 'voice_recording':
      return '#EF4444';
    case 'face_id':
      return '#34D399';
    case 'plan':
      return '#A855F7';
    default:
      return '#60A5FA';
  }
}

function renderIslandIcon(type: DynamicIslandActivityType, color: string, size = 16) {
  switch (type) {
    case 'timer':
      return <Timer size={size} color={color} strokeWidth={2.2} />;
    case 'daily_streak':
      return <Flame size={size} color={color} strokeWidth={2.2} />;
    case 'finance_statistic':
      return <TrendingUp size={size} color={color} strokeWidth={2.2} />;
    case 'goal_progress':
      return <Target size={size} color={color} strokeWidth={2.2} />;
    case 'download':
      return <Download size={size} color={color} strokeWidth={2.2} />;
    case 'voice_recording':
      return <Mic size={size} color={color} strokeWidth={2.2} />;
    case 'face_id':
      return <ScanFace size={size} color={color} strokeWidth={2.2} />;
    case 'plan':
      return <Calendar size={size} color={color} strokeWidth={2.2} />;
    default:
      return <Bell size={size} color={color} strokeWidth={2.2} />;
  }
}

/**
 * Unified Dynamic Island & Minimized Call Overlay
 * Implements Minimal, Compact, and Expanded Dynamic Island states
 * matching mobile-app/Dynamic Iland/ mockups while preserving active call controls.
 */
export const FloatingMiniCallWidget: React.FC = () => {
  const activeCall = useCallStore((s) => s.activeCall);
  const isMinimized = activeCall?.isMinimized ?? false;
  const setMinimized = useCallStore((s) => s.setMinimized);
  const updateActiveCall = useCallStore((s) => s.updateActiveCall);
  const resetCall = useCallStore((s) => s.resetCall);

  const dynamicIsland = useCallStore((s) => s.dynamicIsland);
  const setDynamicIslandMode = useCallStore((s) => s.setDynamicIslandMode);
  const dismissDynamicIsland = useCallStore((s) => s.dismissDynamicIsland);

  const [callExpanded, setCallExpanded] = useState(false);
  const [liveTickSec, setLiveTickSec] = useState(0);

  // Live timer ticker for 'timer' / 'voice_recording' Dynamic Island states
  useEffect(() => {
    if (!dynamicIsland || (dynamicIsland.type !== 'timer' && dynamicIsland.type !== 'voice_recording')) {
      setLiveTickSec(0);
      return;
    }
    const id = setInterval(() => setLiveTickSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [dynamicIsland?.id, dynamicIsland?.type]);

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

  // ─── 1. Active Minimized Call takes top priority in Dynamic Island ─────────
  if (activeCall && isMinimized) {
    const peerName = activeCall.receiverName || activeCall.callerName || 'Colleague';
    const peerAvatar = activeCall.receiverAvatar || activeCall.callerAvatar;
    const peerId = activeCall.receiverId || activeCall.callerId;

    const handleMaximize = () => {
      setCallExpanded(false);
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
      setCallExpanded(false);
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
          callExpanded ? styles.callExpandedIsland : styles.container,
          !callExpanded && {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...(!callExpanded ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={styles.infoArea}
          onPress={() => setCallExpanded((prev) => !prev)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Toggle call Dynamic Island"
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

        <View style={styles.controlsRow}>
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

          <TouchableOpacity
            style={styles.miniBtn}
            onPress={handleMaximize}
            accessibilityRole="button"
            accessibilityLabel="Maximize call"
          >
            <Maximize2 size={15} color="#818CF8" />
          </TouchableOpacity>

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
  }

  // ─── 2. Dynamic Island Activity Pill (Minimal / Compact / Expanded) ────────
  if (!dynamicIsland) {
    return null;
  }

  const accent = getIslandAccent(dynamicIsland.type, dynamicIsland.accentColor);
  const progress = typeof dynamicIsland.progress === 'number'
    ? Math.max(0, Math.min(100, dynamicIsland.progress))
    : undefined;

  const displayMetric =
    dynamicIsland.type === 'timer' || dynamicIsland.type === 'voice_recording'
      ? dynamicIsland.metricValue || formatDuration(liveTickSec)
      : dynamicIsland.metricValue || (progress !== undefined ? `${progress}%` : 'Live');

  const cycleMode = (next: DynamicIslandMode) => {
    setDynamicIslandMode(next);
    void LiveActivityService.syncDynamicIsland({
      activityId: dynamicIsland.id,
      type: dynamicIsland.type,
      mode: next,
      title: dynamicIsland.title,
    });
  };

  const handleNavigateTarget = () => {
    const route = dynamicIsland.targetRoute;
    dismissDynamicIsland();
    if (route && navigationRef.isReady()) {
      (navigationRef as any).navigate(route);
    }
  };

  // Minimal Mode (Small top-notch circular pill)
  if (dynamicIsland.mode === 'minimal') {
    return (
      <View style={styles.islandWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.minimalPill}
          onPress={() => cycleMode('compact')}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Expand ${dynamicIsland.title}`}
        >
          {renderIslandIcon(dynamicIsland.type, accent, 15)}
          <View style={[styles.minimalDot, { backgroundColor: accent }]} />
        </TouchableOpacity>
      </View>
    );
  }

  // Compact Mode (Authentic Dynamic Island horizontal notch pill)
  if (dynamicIsland.mode === 'compact') {
    return (
      <View style={styles.islandWrapper} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.compactPill}
          onPress={() => cycleMode('expanded')}
          activeOpacity={0.92}
          accessibilityRole="button"
          accessibilityLabel={`Expand ${dynamicIsland.title} Dynamic Island`}
        >
          <View style={styles.compactLeft}>
            <View style={[styles.compactIconCircle, { backgroundColor: `${accent}24` }]}>
              {renderIslandIcon(dynamicIsland.type, accent, 14)}
            </View>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {dynamicIsland.title}
            </Text>
          </View>

          <View style={styles.compactRight}>
            <Text style={[styles.compactMetric, { color: accent }]} numberOfLines={1}>
              {displayMetric}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Expanded Mode (Rich interactive Dynamic Island card)
  return (
    <View style={styles.islandWrapper} pointerEvents="box-none">
      <View style={styles.expandedCard}>
        <View style={styles.expandedTopRow}>
          <View style={styles.expandedLeft}>
            <View style={[styles.expandedIconBox, { backgroundColor: `${accent}26` }]}>
              {renderIslandIcon(dynamicIsland.type, accent, 20)}
            </View>
            <View style={styles.expandedTextWrap}>
              <Text style={styles.expandedTitle} numberOfLines={1}>
                {dynamicIsland.title}
              </Text>
              {!!dynamicIsland.subtitle && (
                <Text style={styles.expandedSubtitle} numberOfLines={1}>
                  {dynamicIsland.subtitle}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.expandedValueBox}>
            <Text style={[styles.expandedMetric, { color: accent }]}>{displayMetric}</Text>
            {!!dynamicIsland.metricDelta && (
              <Text style={styles.expandedDelta}>{dynamicIsland.metricDelta}</Text>
            )}
          </View>
        </View>

        {progress !== undefined && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accent }]} />
          </View>
        )}

        <View style={styles.expandedActionsRow}>
          <TouchableOpacity
            style={styles.islandGhostBtn}
            onPress={() => cycleMode('minimal')}
            accessibilityRole="button"
            accessibilityLabel="Minimize Dynamic Island"
          >
            <Minimize2 size={13} color="#CBD5E1" />
            <Text style={styles.islandGhostBtnText}>Minimal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.islandGhostBtn}
            onPress={() => cycleMode('compact')}
            accessibilityRole="button"
            accessibilityLabel="Collapse to compact pill"
          >
            <Text style={styles.islandGhostBtnText}>Compact</Text>
          </TouchableOpacity>

          {!!dynamicIsland.targetRoute && (
            <TouchableOpacity
              style={[styles.islandPrimaryBtn, { backgroundColor: accent }]}
              onPress={handleNavigateTarget}
              accessibilityRole="button"
              accessibilityLabel="Open linked screen"
            >
              <Text style={styles.islandPrimaryBtnText}>Open</Text>
              <ArrowUpRight size={13} color="#0F172A" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.islandCloseBtn}
            onPress={dismissDynamicIsland}
            accessibilityRole="button"
            accessibilityLabel="Dismiss Dynamic Island"
          >
            <X size={14} color="#F8FAFC" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  islandWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  minimalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  minimalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: Math.min(SCREEN_WIDTH - 48, 286),
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  compactIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  compactRight: {
    paddingLeft: 6,
  },
  compactMetric: {
    fontSize: 12,
    fontWeight: '800',
  },
  expandedCard: {
    width: Math.min(SCREEN_WIDTH - 24, 368),
    backgroundColor: '#020617',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
    gap: 12,
  },
  expandedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  expandedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  expandedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedTextWrap: {
    flex: 1,
  },
  expandedTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  expandedSubtitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  expandedValueBox: {
    alignItems: 'flex-end',
  },
  expandedMetric: {
    fontSize: 15,
    fontWeight: '800',
  },
  expandedDelta: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  expandedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  islandGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  islandGhostBtnText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  islandPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  islandPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  islandCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callExpandedIsland: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 14,
    alignSelf: 'center',
    width: Math.min(SCREEN_WIDTH - 24, 360),
    height: 68,
    backgroundColor: '#020617',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#10B981',
    elevation: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    zIndex: 99999,
  },
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
    fontWeight: '700',
  },
  durationText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBtnMuted: {
    backgroundColor: '#450A0A',
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

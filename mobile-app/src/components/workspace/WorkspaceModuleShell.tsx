import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../common/Text';
import { Button } from '../common/Button';
import { OfflineBanner } from '../common/OfflineBanner';
import { PersonaSwitcher } from '../../modules/navigation/PersonaSwitcher';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { usePermission } from '../../hooks/usePermission';
import { realtimeManager, IncomingCallSignal } from '../../core/realtime/realtimeManager';
import { apiClient } from '../../core/api/apiClient';
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  BarChart2,
  ArrowLeft,
  AlertTriangle,
  FolderOpen,
  PhoneCall,
  PhoneOff,
  Phone,
  Video,
} from 'lucide-react-native';
import { AppBottomNav } from '../common/AppBottomNav';
import { Config } from '../../config/environment';

const logoSource = require('../../assets/images/logo.webp');

export type CollaborationModuleKey = 'chat' | 'calendar' | 'todo' | 'gantt';

interface ModuleNavItem {
  key: CollaborationModuleKey;
  label: string;
  route: 'ChatConversations' | 'CalendarMain' | 'TodoList' | 'GanttTimeline';
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  negativeOverridePerm?: string;
}

const COLLABORATION_MODULES: ModuleNavItem[] = [
  {
    key: 'chat',
    label: 'Chat',
    route: 'ChatConversations',
    icon: MessageSquare,
    negativeOverridePerm: '-!chat.view',
  },
  {
    key: 'calendar',
    label: 'Calendar',
    route: 'CalendarMain',
    icon: Calendar,
  },
  {
    key: 'todo',
    label: 'Todo',
    route: 'TodoList',
    icon: CheckSquare,
  },
  {
    key: 'gantt',
    label: 'Gantt',
    route: 'GanttTimeline',
    icon: BarChart2,
  },
];

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isSmallPhone = width < 375;
  const isTablet = width >= 768;
  const contentMaxWidth = isTablet ? 1040 : undefined;

  return {
    width,
    height,
    isSmallPhone,
    isTablet,
    contentMaxWidth,
  };
}

export interface WorkspaceModuleShellProps {
  activeModule: CollaborationModuleKey;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  hideModuleTabs?: boolean;
  rightActions?: React.ReactNode;
  subHeader?: React.ReactNode;
  children: React.ReactNode;
}

export const WorkspaceModuleShell: React.FC<WorkspaceModuleShellProps> = ({
  activeModule,
  title,
  subtitle,
  onBack,
  hideModuleTabs = false,
  rightActions,
  subHeader,
  children,
}) => {
  const navigation = useNavigation<any>();
  const { isSmallPhone, isTablet, contentMaxWidth } = useResponsiveLayout();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const { permissions } = usePermission();

  const [incomingCall, setIncomingCall] = useState<IncomingCallSignal | null>(null);
  const [answeringCall, setAnsweringCall] = useState(false);

  const incomingCallerAvatar = React.useMemo(() => {
    if (!incomingCall) return null;
    const raw = incomingCall.callerAvatar;
    if (raw) {
      let trimmed = raw.trim();
      if (trimmed.includes('api.dicebear.com') && trimmed.includes('/svg?')) {
        trimmed = trimmed.replace('/svg?', '/png?');
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      if (trimmed.startsWith('/')) return `${Config.API_BASE_URL}${trimmed}`;
      if (trimmed.startsWith('uploads/')) return `${Config.API_BASE_URL}/${trimmed}`;
    }
    const seed = encodeURIComponent(incomingCall.callerName || 'caller');
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=00d287`;
  }, [incomingCall]);

  const effectiveTenantId = currentTenant?.id || user?.profile?.tenantId || '';
  const workspaceTitle = currentTenant?.name || 'Workspace';

  // Connect authenticated, tenant-scoped realtime manager when session + tenant are active
  useEffect(() => {
    if (token && user?.id && effectiveTenantId) {
      realtimeManager.connect({
        token,
        userId: user.id,
        tenantId: effectiveTenantId,
      });
    }
  }, [token, user?.id, effectiveTenantId]);

  // Recover any pending incoming call & subscribe to live call signals
  const checkPendingCalls = useCallback(async () => {
    if (!token || !user?.id || !effectiveTenantId) return;
    try {
      const res = await apiClient.get('/api/calls/pending');
      const payload = res.data;
      if (payload?.hasPendingCall && payload?.data?.callId) {
        setIncomingCall({
          callId: payload.data.callId,
          callerId: payload.data.callerId,
          callerName: payload.data.callerName || 'Colleague',
          callerAvatar: payload.data.callerAvatar,
          callType: payload.data.callType === 'video' ? 'video' : 'audio',
          threadId: payload.data.threadId,
          isGroupCall: false,
          isAdditionalParticipant: Boolean(payload.data.isAdditionalParticipant),
        });
      } else if (payload?.hasPendingGroupCall && payload?.groupCallData?.callId) {
        setIncomingCall({
          callId: payload.groupCallData.callId,
          callerId: payload.groupCallData.callerId,
          callerName: payload.groupCallData.callerName || 'Team Member',
          callerAvatar: payload.groupCallData.callerAvatar,
          callType: payload.groupCallData.callType === 'video' ? 'video' : 'audio',
          groupId: payload.groupCallData.groupId,
          groupName: payload.groupCallData.groupName,
          isGroupCall: true,
        });
      }
    } catch {
      // Non-blocking check
    }
  }, [token, user?.id, effectiveTenantId]);

  useEffect(() => {
    void checkPendingCalls();
    const pollInterval = setInterval(() => {
      void checkPendingCalls();
    }, 3500);

    const unsubDirect = realtimeManager.subscribe('call:incoming', (data) => {
      if (!data?.callId || data?.callerId === user?.id) return;
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName || 'Colleague',
        callerAvatar: data.callerAvatar,
        callType: data.callType === 'video' ? 'video' : 'audio',
        threadId: data.threadId,
        isGroupCall: false,
        isAdditionalParticipant: Boolean(data.isAdditionalParticipant),
      });
    });

    const unsubInvited = realtimeManager.subscribe('call:participant_invited', (data) => {
      if (!data?.callId || data?.targetUserId !== user?.id) return;
      setIncomingCall({
        callId: data.callId,
        callerId: data.inviterId || data.callerId || '',
        callerName: data.inviterName || data.callerName || 'Colleague',
        callType: data.callType === 'video' ? 'video' : 'audio',
        isGroupCall: false,
        isAdditionalParticipant: true,
      });
    });

    const unsubGroup = realtimeManager.subscribe('group-call:incoming', (data) => {
      if (!data?.callId || data?.callerId === user?.id) return;
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName || 'Team Member',
        callType: data.callType === 'video' ? 'video' : 'audio',
        groupId: data.groupId,
        groupName: data.groupName || 'Group Meeting',
        isGroupCall: true,
      });
    });

    const clearIfMatches = (data: any) => {
      setIncomingCall((prev) => {
        if (!prev) return null;
        if (!data?.callId || data.callId === prev.callId) return null;
        return prev;
      });
    };

    const unsubCancelled = realtimeManager.subscribe('call:cancelled', clearIfMatches);
    const unsubEnded = realtimeManager.subscribe('call:ended', clearIfMatches);
    const unsubTimeout = realtimeManager.subscribe('call:timeout', clearIfMatches);
    const unsubElsewhere = realtimeManager.subscribe('call:answered_elsewhere', clearIfMatches);
    const unsubGrpEnded = realtimeManager.subscribe('group-call:ended', clearIfMatches);

    return () => {
      clearInterval(pollInterval);
      unsubDirect();
      unsubInvited();
      unsubGroup();
      unsubCancelled();
      unsubEnded();
      unsubTimeout();
      unsubElsewhere();
      unsubGrpEnded();
    };
  }, [checkPendingCalls, user?.id]);

  const handleAcceptIncoming = async () => {
    if (!incomingCall || answeringCall) return;
    const call = incomingCall;
    try {
      setAnsweringCall(true);
      if (call.isGroupCall) {
        await apiClient.post(`/api/chat/meetings/${call.callId}/join`, {
          groupId: call.groupId,
        });
      } else if (call.isAdditionalParticipant) {
        await apiClient.post(`/api/calls/${call.callId}/accept-invitation`, {});
      } else {
        await apiClient.post(`/api/calls/${call.callId}/accept`, {});
      }
      setIncomingCall(null);
      navigation.navigate('ChatCall', {
        callId: call.callId,
        receiverId: call.callerId,
        receiverName: call.isGroupCall ? call.groupName || call.callerName : call.callerName,
        receiverAvatar: call.callerAvatar || undefined,
        callType: call.callType,
        threadId: call.threadId,
        groupId: call.groupId,
        groupName: call.groupName,
        isGroupMeeting: Boolean(call.isGroupCall),
        isIncoming: true,
      });
    } catch {
      setIncomingCall(null);
    } finally {
      setAnsweringCall(false);
    }
  };

  const handleDeclineIncoming = async () => {
    if (!incomingCall) return;
    const call = incomingCall;
    setIncomingCall(null);
    try {
      if (!call.isGroupCall) {
        await apiClient.post(`/api/calls/${call.callId}/reject`, {
          reason: 'declined_by_user',
        });
      }
    } catch {
      // Ignore if already expired
    }
  };

  // Permission-aware visibility check (respects explicit negative overrides like -!chat.view)
  const visibleTabs = COLLABORATION_MODULES.filter((item) => {
    if (
      item.negativeOverridePerm &&
      permissions.some((p) => p.toLowerCase() === item.negativeOverridePerm)
    ) {
      return false;
    }
    return true;
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.root}>
      <OfflineBanner />

      {/* Top Branded Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.headerInner,
            isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>

            <Image source={logoSource} style={styles.brandLogo} resizeMode="contain" />

            <View style={styles.titleCol}>
              <Text
                style={[styles.headerTitle, isSmallPhone && styles.headerTitleCompact]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subtitle || workspaceTitle}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <PersonaSwitcher />
            {rightActions}
          </View>
        </View>
      </View>

      {/* Incoming Call Realtime Banner */}
      {incomingCall && (
        <View style={styles.incomingCallBanner} accessibilityRole="alert">
          <View style={styles.incomingCallInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <PhoneCall size={13} color="#FFFFFF" />
              <Text style={styles.incomingCallBadge}>
                {incomingCall.isGroupCall
                  ? `GROUP ${incomingCall.callType.toUpperCase()} MEETING`
                  : `INCOMING ${incomingCall.callType.toUpperCase()} CALL`}
              </Text>
            </View>
            <Text style={styles.incomingCallerName} numberOfLines={1}>
              {incomingCall.isGroupCall
                ? `${incomingCall.groupName || 'Group'} (${incomingCall.callerName})`
                : incomingCall.callerName}
            </Text>
          </View>
          <View style={styles.incomingCallActions}>
            <TouchableOpacity
              style={styles.declineCallBtn}
              onPress={handleDeclineIncoming}
              accessibilityRole="button"
              accessibilityLabel="Decline incoming call"
            >
              <Text style={styles.callBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptCallBtn}
              onPress={handleAcceptIncoming}
              disabled={answeringCall}
              accessibilityRole="button"
              accessibilityLabel="Accept incoming call"
            >
              {answeringCall ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.callBtnText}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fullscreen Light Incoming Call Modal (Matches 23_Light_Voice Call Ringing.png & 25_Light_Video Call Ringing.png) */}
      <Modal
        visible={Boolean(incomingCall)}
        animationType="slide"
        transparent
        onRequestClose={handleDeclineIncoming}
      >
        <View style={styles.incomingModalBackdrop}>
          <View style={styles.incomingModalContainer}>
            <View style={styles.incomingRingingPulseWrap}>
              <View style={styles.incomingRingingOuterRing}>
                <View style={styles.incomingRingingMidRing}>
                  {incomingCallerAvatar ? (
                    <Image
                      source={{ uri: incomingCallerAvatar }}
                      style={styles.incomingModalAvatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.incomingModalAvatarPlaceholder}>
                      <Text style={styles.incomingModalAvatarText}>
                        {(incomingCall?.callerName || 'C').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <Text style={styles.incomingModalName} numberOfLines={1}>
              {incomingCall?.isGroupCall
                ? incomingCall?.groupName || 'Group Meeting'
                : incomingCall?.callerName}
            </Text>
            <Text style={styles.incomingModalType}>
              {incomingCall?.isGroupCall
                ? `Group ${incomingCall?.callType === 'video' ? 'Video' : 'Voice'} Call Ringing...`
                : `Incoming ${incomingCall?.callType === 'video' ? 'Video' : 'Voice'} Call...`}
            </Text>

            <View style={styles.incomingModalControls}>
              <TouchableOpacity
                style={styles.incomingDeclineBtnRound}
                onPress={handleDeclineIncoming}
                accessibilityRole="button"
                accessibilityLabel="Decline call"
              >
                <PhoneOff size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.incomingAcceptBtnRound}
                onPress={handleAcceptIncoming}
                disabled={answeringCall}
                accessibilityRole="button"
                accessibilityLabel="Accept call"
              >
                {answeringCall ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : incomingCall?.callType === 'video' ? (
                  <Video size={28} color="#FFFFFF" />
                ) : (
                  <Phone size={28} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shared 4-Module Switcher Bar */}
      {!hideModuleTabs && visibleTabs.length > 1 && (
        <View style={styles.moduleBarOuter}>
          <View
            style={[
              styles.moduleBar,
              isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
            ]}
          >
            {visibleTabs.map((item) => {
              const isActive = item.key === activeModule;
              const IconComp = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.moduleTab, isActive && styles.moduleTabActive]}
                  onPress={() => {
                    if (!isActive) {
                      navigation.navigate(item.route);
                    }
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${item.label} module`}
                >
                  <IconComp
                    size={16}
                    color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
                    strokeWidth={2}
                  />
                  <Text style={[styles.moduleTabLabel, isActive && styles.moduleTabLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {subHeader}

      {/* Main Content Container (Responsive Phone + Tablet) */}
      <View
        style={[
          styles.body,
          isTablet && { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
      >
        {children}
      </View>

      {/* Pinned Bottom Navigation Footer */}
      <AppBottomNav activeRoute={COLLABORATION_MODULES.find((m) => m.key === activeModule)?.route} />
    </View>
  );
};

export const WorkspaceLoadingBlock: React.FC<{ message?: string }> = ({
  message = 'Loading workspace records...',
}) => (
  <View style={styles.stateContainer}>
    <ActivityIndicator size="large" color="#4F46E5" />
    <Text style={styles.stateSubtitle}>{message}</Text>
  </View>
);

export const WorkspaceErrorBlock: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to Load Data', message, onRetry }) => (
  <View style={styles.stateCard}>
    <AlertTriangle size={32} color="#EF4444" strokeWidth={2.2} style={{ marginBottom: 10 }} />
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateSubtitle}>{message}</Text>
    {onRetry && (
      <Button
        title="Retry"
        variant="primary"
        size="sm"
        onPress={onRetry}
        style={styles.stateActionBtn}
      />
    )}
  </View>
);

export const WorkspaceEmptyBlock: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon, title, description, actionLabel, onAction }) => (
  <View style={styles.stateCard}>
    {icon || <FolderOpen size={32} color="#64748B" strokeWidth={2} style={{ marginBottom: 10 }} />}
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateSubtitle}>{description}</Text>
    {actionLabel && onAction && (
      <Button
        title={actionLabel}
        variant="primary"
        size="sm"
        onPress={onAction}
        style={styles.stateActionBtn}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backBtnIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  brandLogo: {
    width: 28,
    height: 28,
    marginRight: 8,
  },
  titleCol: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  headerTitleCompact: {
    fontSize: 15,
  },
  headerSubtitle: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomingCallBanner: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incomingCallInfo: {
    flex: 1,
    marginRight: 10,
  },
  incomingCallBadge: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  incomingCallerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  incomingCallActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineCallBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptCallBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  moduleBarOuter: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  moduleBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  moduleTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 6,
    gap: 5,
  },
  moduleTabActive: {
    backgroundColor: '#1E1B4B',
  },
  moduleTabIcon: {
    fontSize: 13,
  },
  moduleTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  moduleTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  stateContainer: {
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 36,
    paddingHorizontal: 24,
    marginVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  stateIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 4,
  },
  stateActionBtn: {
    marginTop: 16,
    minHeight: 44,
  },
  incomingModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  incomingModalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  incomingRingingPulseWrap: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingRingingOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 210, 135, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingRingingMidRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(0, 210, 135, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingModalAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#00D287',
  },
  incomingModalAvatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingModalAvatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  incomingModalName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  incomingModalType: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32,
  },
  incomingModalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    width: '100%',
  },
  incomingDeclineBtnRound: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  incomingAcceptBtnRound: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00D287',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});

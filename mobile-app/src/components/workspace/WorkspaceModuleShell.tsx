import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../common/Text';
import { Button } from '../common/Button';
import { OfflineBanner } from '../common/OfflineBanner';
import { PersonaSwitcher } from '../../modules/navigation/PersonaSwitcher';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { usePermission } from '../../hooks/usePermission';
import { realtimeManager } from '../../core/realtime/realtimeManager';
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  BarChart2,
  ArrowLeft,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react-native';
import { AppBottomNav } from '../common/AppBottomNav';

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
  hideBottomNav?: boolean;
  backgroundColor?: string;
  headerBackgroundColor?: string;
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
  hideBottomNav = false,
  backgroundColor,
  headerBackgroundColor,
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
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch {
    // Fallback if rendered outside SafeAreaProvider
  }

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
    <View style={[styles.root, backgroundColor ? { backgroundColor } : null]}>
      <OfflineBanner />

      {/* Top Branded Header */}
      <View
        style={[
          styles.header,
          headerBackgroundColor ? { backgroundColor: headerBackgroundColor } : null,
          { paddingTop: insets.top > 0 ? insets.top + 8 : Platform.OS === 'ios' ? 50 : 24 },
        ]}
      >
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
      {!hideBottomNav && (
        <AppBottomNav activeRoute={COLLABORATION_MODULES.find((m) => m.key === activeModule)?.route} />
      )}
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
});

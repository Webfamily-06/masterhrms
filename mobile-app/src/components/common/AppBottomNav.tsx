import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CheckSquare,
  Grid,
  Users,
  ClipboardCheck,
  User,
  Settings,
  ShieldCheck,
  Building2,
  Activity,
} from 'lucide-react-native';
import { Text } from './Text';
import { useAuthStore } from '../../store/authStore';

export interface AppBottomNavProps {
  activeRoute?: string;
}

interface NavTabItem {
  key: string;
  label: string;
  route: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  badge?: number;
}

export const AppBottomNav: React.FC<AppBottomNavProps> = ({ activeRoute }) => {
  const navigation = useNavigation<any>();
  const activeRole = useAuthStore((s) => s.activeRole);

  const getTabsForRole = (): NavTabItem[] => {
    switch (activeRole as string | null) {
      case 'hr_admin':
        return [
          { key: 'HrAdminHome', label: 'Home', route: 'HrAdminHome', icon: LayoutDashboard },
          { key: 'ChatConversations', label: 'Chat', route: 'ChatConversations', icon: MessageSquare },
          { key: 'EmployeeDirectory', label: 'Employees', route: 'EmployeeDirectory', icon: Users },
          { key: 'PendingApprovals', label: 'Approvals', route: 'PendingApprovals', icon: ClipboardCheck },
          { key: 'CalendarMain', label: 'Calendar', route: 'CalendarMain', icon: Calendar },
          { key: 'Settings', label: 'Settings', route: 'Settings', icon: Settings },
        ];
      case 'manager':
        return [
          { key: 'ManagerHome', label: 'Home', route: 'ManagerHome', icon: LayoutDashboard },
          { key: 'ChatConversations', label: 'Chat', route: 'ChatConversations', icon: MessageSquare },
          { key: 'TeamApprovals', label: 'Team', route: 'TeamApprovals', icon: Users },
          { key: 'CalendarMain', label: 'Calendar', route: 'CalendarMain', icon: Calendar },
          { key: 'TodoList', label: 'Todo', route: 'TodoList', icon: CheckSquare },
          { key: 'Profile', label: 'Profile', route: 'Profile', icon: User },
        ];
      case 'tenant_admin':
        return [
          { key: 'TenantAdminHome', label: 'Home', route: 'TenantAdminHome', icon: LayoutDashboard },
          { key: 'ChatConversations', label: 'Chat', route: 'ChatConversations', icon: MessageSquare },
          { key: 'UserAccess', label: 'Users', route: 'UserAccess', icon: Users },
          { key: 'SecurityOverview', label: 'Security', route: 'SecurityOverview', icon: ShieldCheck },
          { key: 'WorkspaceSettings', label: 'Settings', route: 'WorkspaceSettings', icon: Settings },
        ];
      case 'super_admin':
        return [
          { key: 'SuperAdminHome', label: 'Home', route: 'SuperAdminHome', icon: LayoutDashboard },
          { key: 'PlatformTenants', label: 'Tenants', route: 'PlatformTenants', icon: Building2 },
          { key: 'SystemDiagnostics', label: 'Diagnostics', route: 'SystemDiagnostics', icon: Activity },
          { key: 'Settings', label: 'Settings', route: 'Settings', icon: Settings },
        ];
      case 'employee':
      default:
        return [
          { key: 'EmployeeHome', label: 'Home', route: 'EmployeeHome', icon: LayoutDashboard },
          { key: 'ChatConversations', label: 'Chat', route: 'ChatConversations', icon: MessageSquare },
          { key: 'CalendarMain', label: 'Calendar', route: 'CalendarMain', icon: Calendar },
          { key: 'TodoList', label: 'Todo', route: 'TodoList', icon: CheckSquare },
          { key: 'EmployeeServicesHub', label: 'Hub', route: 'EmployeeServicesHub', icon: Grid },
          { key: 'Profile', label: 'Profile', route: 'Profile', icon: User },
        ];
    }
  };

  const tabs = getTabsForRole();

  const handleTabPress = (route: string) => {
    try {
      navigation.navigate(route);
    } catch {
      // Fallback
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeRoute === tab.key || activeRoute === tab.route;
          const IconComponent = tab.icon;
          const color = isActive ? '#FF6B00' : '#64748B';

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => handleTabPress(tab.route)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconContainer}>
                <IconComponent
                  size={20}
                  color={color}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color, fontWeight: isActive ? '700' : '500' },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 99,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 76 : 62,
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    letterSpacing: -0.1,
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#FF6B00',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, Moon, Sun } from 'lucide-react-native';
import { Text } from './Text';
import { UserAvatar } from './UserAvatar';
import { PersonaSwitcher } from '../../modules/navigation/PersonaSwitcher';
import { useTenantStore } from '../../store/tenantStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../app/providers/ThemeProvider';

const logoSource = require('../../assets/images/logo.webp');

export interface AppTopBarProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  showNotifications?: boolean;
  showPersonaSwitcher?: boolean;
  showProfileAvatar?: boolean;
  showThemeToggle?: boolean;
  rightAction?: React.ReactNode;
}

export const AppTopBar: React.FC<AppTopBarProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showLogo = true,
  showNotifications = true,
  showPersonaSwitcher = true,
  showProfileAvatar = true,
  showThemeToggle = true,
  rightAction,
}) => {
  const navigation = useNavigation<any>();
  const currentTenant = useTenantStore((s) => s.currentTenant);
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useTheme();
  const effectiveSubtitle = subtitle || currentTenant?.name || 'MasterHRMS';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  return (
    <View
      style={[
        styles.container,
        theme.isDark && {
          backgroundColor: '#0F172A',
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          )}

          {showLogo && (
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          )}

          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {title || currentTenant?.name || 'MasterHRMS'}
            </Text>
            {Boolean(effectiveSubtitle && title) && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {effectiveSubtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {showPersonaSwitcher && <PersonaSwitcher />}

          {showThemeToggle && (
            <TouchableOpacity
              onPress={toggleTheme}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Toggle dark mode"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {theme.isDark ? (
                <Sun size={18} color="#FBBF24" strokeWidth={2.2} />
              ) : (
                <Moon size={18} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          )}

          {showNotifications && (
            <TouchableOpacity
              onPress={handleNotifications}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bell size={20} color="#FFFFFF" strokeWidth={2.2} />
              <View style={styles.unreadDot} />
            </TouchableOpacity>
          )}

          {showProfileAvatar && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <UserAvatar
                entity={user}
                size={36}
                borderWidth={1.5}
                borderColor="rgba(255, 255, 255, 0.45)"
              />
            </TouchableOpacity>
          )}

          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1B4B',
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 100,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1E1B4B',
  },
});

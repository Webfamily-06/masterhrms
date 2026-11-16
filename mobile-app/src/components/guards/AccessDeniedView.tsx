import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/Text';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';

const logoSource = require('../../assets/images/logo.webp');

interface AccessDeniedViewProps {
  reason?: 'NO_VALID_ROLE' | 'MISSING_PERMISSION' | 'MODULE_DISABLED' | string;
  detail?: string;
  requiredPermission?: string;
  onRetry?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  reason = 'MISSING_PERMISSION',
  detail,
  requiredPermission,
  onRetry,
}) => {
  const logout = useAuthStore((state) => state.logout);
  const activeRole = useAuthStore((state) => state.activeRole);
  const canonicalRoles = useAuthStore((state) => state.canonicalRoles);
  const navigation = useNavigation<any>();

  let title = 'Access Restricted';
  let message =
    detail ||
    'You do not have the required permissions to access this screen. Please contact your Organization Administrator.';

  if (reason === 'NO_VALID_ROLE') {
    title = 'No Active Workspace Role';
    message =
      'Your account is authenticated, but no valid organizational role has been assigned to your profile in this workspace. Please contact your Organization Administrator to configure your role.';
  } else if (reason === 'MODULE_DISABLED') {
    title = 'Module Not Subscribed';
    message =
      detail ||
      'This feature module is not included in your organization subscription plan. Please contact your Administrator to upgrade your workspace.';
  }

  return (
    <View style={styles.container}>
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      <View style={styles.card}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />

        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔒</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {requiredPermission ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Requires: {requiredPermission}</Text>
          </View>
        ) : null}

        {activeRole ? (
          <View style={styles.roleInfo}>
            <Text style={styles.roleText}>Current Active Persona: {activeRole.toUpperCase()}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {canonicalRoles.length > 1 && navigation.canGoBack?.() ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Return to Dashboard</Text>
            </TouchableOpacity>
          ) : null}

          {onRetry ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={onRetry} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Retry Authorization</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mintGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(187, 247, 208, 0.45)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logo: {
    width: 160,
    height: 38,
    marginBottom: 18,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#475569',
  },
  roleInfo: {
    marginBottom: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F766E',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

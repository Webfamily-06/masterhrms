import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { secureStorage } from '../../core/storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';
import { AuthService } from '../../core/auth/authService';
import { BiometricService } from '../../core/auth/biometricService';
import { requestAppMediaPermissions } from '../../core/services/permissionService';
import { PushNotificationService } from '../../core/services/pushNotificationService';
import { LoadingView } from '../../components/common/LoadingView';
import { Text } from '../../components/common/Text';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useTheme } from '../providers/ThemeProvider';
import { RootNavigator } from '../navigation/RootNavigator';

export const AppBootstrap: React.FC = () => {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const setLoading = useAuthStore((s) => s.setLoading);
  const setTenant = useTenantStore((s) => s.setTenant);

  const restoreSession = useCallback(async () => {
    try {
      await AuthService.refreshToken();
      await AuthService.getCurrentUser();
      setIsBiometricLocked(false);
      void PushNotificationService.registerForPushNotifications();
      PushNotificationService.initListeners();
    } catch {
      // If refresh fails due to revocation / expiration / server offline:
      await secureStorage.clear().catch(() => {});
      useAuthStore.getState().logout().catch(() => {});
      setIsBiometricLocked(false);
    }
  }, []);

  const triggerBiometricUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    setBiometricError(null);
    try {
      const success = await BiometricService.authenticateWithBiometrics(
        'Unlock your MasterHRMS workspace'
      );
      if (success) {
        await restoreSession();
      } else {
        setBiometricError('Biometric verification cancelled or not recognized.');
      }
    } catch {
      setBiometricError('An error occurred during biometric verification.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [restoreSession]);

  const handleSwitchAccount = async () => {
    await AuthService.logout();
    setIsBiometricLocked(false);
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        // Request mandatory Camera, Microphone, and Notification permissions on boot
        void requestAppMediaPermissions();

        // 1. Restore last-known tenant workspace slug / id
        const savedTenantSlug = await secureStorage.getItem(STORAGE_KEYS.TENANT_SLUG);
        const savedTenantId = await secureStorage.getItem(STORAGE_KEYS.TENANT_ID);

        if (savedTenantSlug && savedTenantId) {
          await setTenant({
            resolved: true,
            id: savedTenantId,
            name: savedTenantSlug.toUpperCase(),
            slug: savedTenantSlug,
          });
        }

        // 2. Check for active session tokens
        const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          const bioEnabled = await BiometricService.isBiometricsEnabled();
          if (bioEnabled) {
            setIsBiometricLocked(true);
            setIsReady(true);
            setLoading(false);
            // Prompt biometrics immediately on cold boot
            setTimeout(() => {
              triggerBiometricUnlock();
            }, 300);
            return;
          }

          // Biometrics not enabled: restore session directly
          await restoreSession();
        }
      } catch {
        // Graceful fallback to initial screen on cold boot errors without blocking on network
        await secureStorage.clear().catch(() => {});
        useAuthStore.getState().logout().catch(() => {});
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    }

    bootstrap();
  }, [setLoading, setTenant, restoreSession, triggerBiometricUnlock]);

  if (!isReady) {
    return <LoadingView message="Initializing MasterHRMS..." />;
  }

  // Biometric gate active: render local unlock barrier
  if (isBiometricLocked) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: theme.colors.background }]}>
        <Card elevated style={styles.lockCard}>
          <Text variant="h2" align="center" style={styles.title}>
            MasterHRMS
          </Text>
          <Text variant="body" color={theme.colors.textSecondary} align="center" style={styles.subtitle}>
            Workspace is locked for your security. Verify your biometrics to continue.
          </Text>

          {biometricError ? (
            <Text variant="bodySmall" color={theme.colors.danger} align="center" style={styles.errorText}>
              {biometricError}
            </Text>
          ) : null}

          <Button
            title="Unlock with Biometrics"
            onPress={triggerBiometricUnlock}
            loading={isAuthenticating}
            style={styles.unlockButton}
          />

          <TouchableOpacity onPress={handleSwitchAccount} style={styles.switchButton}>
            <Text variant="bodySmall" color={theme.colors.primary} align="center">
              Sign In with Password / Switch Account
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return <RootNavigator />;
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockCard: {
    width: '100%',
    padding: 28,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  errorText: {
    marginBottom: 16,
  },
  unlockButton: {
    marginBottom: 16,
  },
  switchButton: {
    paddingVertical: 10,
  },
});

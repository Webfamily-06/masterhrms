import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Platform } from 'react-native';
import { Fingerprint, ScanFace, Lock, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useTenantStore } from '../../store/tenantStore';
import { secureStorage } from '../../core/storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';
import { AuthService } from '../../core/auth/authService';
import { BiometricService } from '../../core/auth/biometricService';
import { LoadingView } from '../../components/common/LoadingView';
import { Text } from '../../components/common/Text';
import { Card } from '../../components/common/Card';
import { useTheme } from '../providers/ThemeProvider';
import { RootNavigator } from '../navigation/RootNavigator';
import { FloatingMiniCallWidget } from '../../components/calling/FloatingMiniCallWidget';
import { FullScreenIncomingCallModal } from '../../components/calling/FullScreenIncomingCallModal';

export const AppBootstrap: React.FC = () => {
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [activeScanMode, setActiveScanMode] = useState<'fingerprint' | 'face' | null>(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAppLocked = useAuthStore((s) => s.isAppLocked);
  const unlockApp = useAuthStore((s) => s.unlockApp);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setTenant = useTenantStore((s) => s.setTenant);

  const backgroundTimestampRef = useRef<number | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      await AuthService.refreshToken();
      await AuthService.getCurrentUser();
      setIsBiometricLocked(false);
      unlockApp();
      void PushNotificationServiceSafeInit();
    } catch {
      try {
        await AuthService.restoreBiometricSession();
        setIsBiometricLocked(false);
        unlockApp();
      } catch {
        await secureStorage.clear().catch(() => {});
        useAuthStore.getState().logout().catch(() => {});
        setIsBiometricLocked(false);
        unlockApp();
      }
    }
  }, [unlockApp]);

  const triggerBiometricUnlock = useCallback(
    async (mode: 'fingerprint' | 'face' | 'any' = 'any') => {
      if (isAuthenticating) return;
      setIsAuthenticating(true);
      setActiveScanMode(mode === 'any' ? null : mode);
      setBiometricError(null);

      try {
        const promptText =
          mode === 'face'
            ? 'Verify Face ID to unlock MasterHRMS'
            : mode === 'fingerprint'
            ? 'Touch fingerprint sensor to unlock MasterHRMS'
            : 'Unlock your MasterHRMS workspace';

        const result = await BiometricService.verifyHardwareBiometric(promptText, mode);
        if (result.success) {
          if (isAuthenticated) {
            setIsBiometricLocked(false);
            unlockApp();
          } else {
            await restoreSession();
          }
        } else {
          setBiometricError(result.error || 'Biometric verification cancelled or not recognized.');
        }
      } catch {
        setBiometricError('An error occurred during biometric verification.');
      } finally {
        setIsAuthenticating(false);
        setActiveScanMode(null);
      }
    },
    [isAuthenticating, isAuthenticated, restoreSession, unlockApp]
  );

  const handleSwitchAccount = async () => {
    unlockApp();
    setIsBiometricLocked(false);
    await AuthService.logout();
  };

  // Auto-lock when returning from background after > 15s if biometric unlock is enabled
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimestampRef.current) {
        const elapsed = Date.now() - backgroundTimestampRef.current;
        backgroundTimestampRef.current = null;
        if (elapsed > 15000 && useAuthStore.getState().isAuthenticated) {
          const bioEnabled = await BiometricService.isBiometricsEnabled();
          if (bioEnabled) {
            useAuthStore.getState().lockApp();
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Auto-prompt biometrics whenever manual or background lock engages
  useEffect(() => {
    if (isAppLocked && isReady) {
      const t = setTimeout(() => {
        void triggerBiometricUnlock('any');
      }, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isAppLocked, isReady]);

  useEffect(() => {
    async function bootstrap() {
      try {
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

        const refreshToken = await secureStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          const bioEnabled = await BiometricService.isBiometricsEnabled();
          if (bioEnabled) {
            setIsBiometricLocked(true);
            setIsReady(true);
            setLoading(false);
            setTimeout(() => {
              void triggerBiometricUnlock('any');
            }, 300);
            return;
          }

          await restoreSession();
        }
      } catch {
        await secureStorage.clear().catch(() => {});
        useAuthStore.getState().logout().catch(() => {});
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    }

    void bootstrap();
  }, [setLoading, setTenant, restoreSession]);

  if (!isReady) {
    return <LoadingView message="Initializing MasterHRMS..." />;
  }

  // Biometric gate active (cold boot OR on-demand / background lock)
  if (isBiometricLocked || isAppLocked) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: theme.colors.background }]}>
        <Card
          elevated
          style={[
            styles.lockCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <View
            style={[
              styles.shieldBadge,
              { backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF' },
            ]}
          >
            <ShieldCheck size={34} color="#4F46E5" strokeWidth={2.2} />
          </View>

          <Text variant="h2" align="center" style={[styles.title, { color: theme.colors.text }]}>
            Workspace Locked
          </Text>
          <Text
            variant="body"
            color={theme.colors.textSecondary}
            align="center"
            style={styles.subtitle}
          >
            Authenticate with Fingerprint or Face ID to unlock MasterHRMS.
          </Text>

          {biometricError ? (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
              ]}
            >
              <Text variant="bodySmall" color={theme.colors.danger} align="center">
                {biometricError}
              </Text>
            </View>
          ) : null}

          <View style={styles.biometricOptionsRow}>
            <TouchableOpacity
              style={[
                styles.bioOptionCard,
                {
                  backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: activeScanMode === 'fingerprint' ? '#4F46E5' : theme.colors.border,
                },
              ]}
              onPress={() => triggerBiometricUnlock('fingerprint')}
              disabled={isAuthenticating}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Unlock with Fingerprint"
            >
              <View style={[styles.bioIconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Fingerprint size={28} color="#4F46E5" strokeWidth={2} />
              </View>
              <Text style={[styles.bioOptionTitle, { color: theme.colors.text }]}>
                {Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint'}
              </Text>
              <Text style={[styles.bioOptionSub, { color: theme.colors.textSecondary }]}>
                {activeScanMode === 'fingerprint' ? 'Scanning...' : 'Tap to scan'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bioOptionCard,
                {
                  backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: activeScanMode === 'face' ? '#4F46E5' : theme.colors.border,
                },
              ]}
              onPress={() => triggerBiometricUnlock('face')}
              disabled={isAuthenticating}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Unlock with Face ID"
            >
              <View style={[styles.bioIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <ScanFace size={28} color="#059669" strokeWidth={2} />
              </View>
              <Text style={[styles.bioOptionTitle, { color: theme.colors.text }]}>
                Face ID
              </Text>
              <Text style={[styles.bioOptionSub, { color: theme.colors.textSecondary }]}>
                {activeScanMode === 'face' ? 'Scanning...' : 'Tap to scan'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryUnlockBtn}
            onPress={() => triggerBiometricUnlock('any')}
            disabled={isAuthenticating}
            activeOpacity={0.85}
          >
            <Lock size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryUnlockText}>
              {isAuthenticating ? 'Verifying Biometrics...' : 'Unlock Application'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSwitchAccount} style={styles.switchButton}>
            <Text variant="bodySmall" color={theme.colors.primary} align="center">
              Sign In with Password / Switch Account
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    );
  }

  return (
    <>
      <RootNavigator />
      <FloatingMiniCallWidget />
      <FullScreenIncomingCallModal />
    </>
  );
};

async function PushNotificationServiceSafeInit() {
  try {
    const { PushNotificationService } = require('../../core/services/pushNotificationService');
    void PushNotificationService.registerForPushNotifications();
    PushNotificationService.initListeners();
  } catch {
    // Non-fatal
  }
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  shieldBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    marginBottom: 6,
    fontWeight: '800',
  },
  subtitle: {
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  biometricOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  bioOptionCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  bioIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bioOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bioOptionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  primaryUnlockBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryUnlockText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    paddingVertical: 8,
  },
});

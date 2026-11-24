import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft, Fingerprint, CheckCircle2 } from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../../../core/auth/authService';
import { BiometricService } from '../../../core/auth/biometricService';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';

export const FingerprintAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unlockApp = useAuthStore((s) => s.unlockApp);

  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleFingerprintScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const bioCheck = await BiometricService.verifyHardwareBiometric(
        Platform.OS === 'ios'
          ? 'Touch ID Verification to unlock MasterHRMS'
          : 'Touch fingerprint sensor to unlock MasterHRMS',
        'fingerprint'
      );

      if (!bioCheck.success) {
        Alert.alert(
          'Fingerprint Verification Failed',
          bioCheck.error || 'Could not verify your fingerprint. Please try again or use your password.',
          [
            { text: 'Try Again', onPress: () => setScanning(false) },
            {
              text: 'Use Password',
              onPress: () => {
                setScanning(false);
                if (navigation.canGoBack()) navigation.goBack();
              },
            },
          ]
        );
        return;
      }

      if (isAuthenticated) {
        await BiometricService.setFingerprintEnabled(true);
        unlockApp();
        setVerified(true);
        Alert.alert('Fingerprint Verified', 'Fingerprint unlock is active and verified for your account.', [
          {
            text: 'Done',
            onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
            },
          },
        ]);
        return;
      }

      await AuthService.restoreBiometricSession();
      setVerified(true);
    } catch (err: any) {
      Alert.alert(
        'Fingerprint Login',
        err?.message ||
          'No saved biometric session found yet. Sign in once with your email and password to link Fingerprint unlock.',
        [
          {
            text: 'Go to Login',
            onPress: () => {
              if (navigation.canGoBack()) navigation.goBack();
            },
          },
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void handleFingerprintScan();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {Platform.OS === 'ios' ? 'Touch ID Unlock' : 'Fingerprint Unlock'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {verified ? 'Identity Verified' : 'Fingerprint Unlock'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Touch your device fingerprint sensor to quickly unlock your MasterHRMS workspace.
        </Text>

        {/* Fingerprint Sensor Visual */}
        <TouchableOpacity
          style={styles.scannerCircle}
          onPress={handleFingerprintScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan fingerprint"
        >
          <View
            style={[
              styles.scannerOuter,
              {
                backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.18)' : '#EEF2FF',
                borderColor: verified ? '#22C55E' : '#818CF8',
              },
            ]}
          >
            <View
              style={[
                styles.scannerInner,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: verified ? '#16A34A' : '#818CF8',
                },
              ]}
            >
              {scanning ? (
                <ActivityIndicator color="#4F46E5" size="large" />
              ) : verified ? (
                <CheckCircle2 size={52} color="#16A34A" strokeWidth={2} />
              ) : (
                <Fingerprint size={52} color="#4F46E5" strokeWidth={1.8} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.scanInstruction}>
          {scanning
            ? 'Scanning fingerprint sensor...'
            : verified
            ? 'Fingerprint verified!'
            : 'Tap sensor icon to scan fingerprint'}
        </Text>

        {/* Fallback buttons */}
        <View style={styles.fallbackContainer}>
          <TouchableOpacity
            style={[
              styles.fallbackBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => navigation.navigate('FaceIdAuth')}
          >
            <Text style={[styles.fallbackBtnText, { color: theme.colors.text }]}>
              Switch to Face ID Unlock
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.passwordBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Text style={[styles.passwordBtnText, { color: theme.colors.textSecondary }]}>
              {isAuthenticated ? 'Back to Settings' : 'Use Password Instead'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  scannerCircle: {
    marginBottom: 20,
  },
  scannerOuter: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  scanInstruction: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 44,
  },
  fallbackContainer: {
    width: '100%',
    alignItems: 'center',
  },
  fallbackBtn: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  fallbackBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  passwordBtn: {
    paddingVertical: 10,
  },
  passwordBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

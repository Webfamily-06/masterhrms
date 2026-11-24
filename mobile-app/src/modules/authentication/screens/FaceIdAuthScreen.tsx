import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, ScanFace, CheckCircle2 } from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../../../core/auth/authService';
import { BiometricService } from '../../../core/auth/biometricService';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';

export const FaceIdAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unlockApp = useAuthStore((s) => s.unlockApp);

  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleFaceScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const bioCheck = await BiometricService.verifyHardwareBiometric(
        'Face ID Verification to unlock MasterHRMS',
        'face'
      );

      if (!bioCheck.success) {
        Alert.alert(
          'Face ID Verification Failed',
          bioCheck.error || 'Could not verify Face ID. Please try again or use your password.',
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
        await BiometricService.setFaceIdEnabled(true);
        unlockApp();
        setVerified(true);
        Alert.alert('Face ID Verified', 'Face ID unlock is active and verified for your account.', [
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
        'Face ID Login',
        err?.message ||
          'No saved biometric session found yet. Sign in once with your email and password to link Face ID unlock.',
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
      void handleFaceScan();
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
        <Text style={styles.headerTitle}>Face ID Unlock</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {verified ? 'Face ID Verified' : 'Face ID Verification'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Position your face in front of the camera to unlock your MasterHRMS workspace.
        </Text>

        {/* Face ID Viewfinder Graphic */}
        <TouchableOpacity
          style={styles.viewfinder}
          onPress={handleFaceScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan face"
        >
          <View style={[styles.cornerTL, verified && { borderColor: '#16A34A' }]} />
          <View style={[styles.cornerTR, verified && { borderColor: '#16A34A' }]} />
          <View style={[styles.cornerBL, verified && { borderColor: '#16A34A' }]} />
          <View style={[styles.cornerBR, verified && { borderColor: '#16A34A' }]} />

          <View
            style={[
              styles.faceIconCircle,
              {
                backgroundColor: theme.isDark ? 'rgba(79, 70, 229, 0.2)' : '#EEF2FF',
              },
            ]}
          >
            {scanning ? (
              <ActivityIndicator color="#4F46E5" size="large" />
            ) : verified ? (
              <CheckCircle2 size={54} color="#16A34A" strokeWidth={2} />
            ) : (
              <ScanFace size={54} color="#4F46E5" strokeWidth={1.8} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.scanInstruction}>
          {scanning
            ? 'Analyzing biometric face geometry...'
            : verified
            ? 'Face ID verified!'
            : 'Tap frame to scan Face ID'}
        </Text>

        {/* Fallback buttons */}
        <View style={styles.fallbackContainer}>
          <TouchableOpacity
            style={[
              styles.fallbackBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
            onPress={() => navigation.navigate('FingerprintAuth')}
          >
            <Text style={[styles.fallbackBtnText, { color: theme.colors.text }]}>
              Switch to Fingerprint / Touch ID
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
  viewfinder: {
    width: 170,
    height: 170,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4F46E5',
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4F46E5',
    borderTopRightRadius: 12,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#4F46E5',
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4F46E5',
    borderBottomRightRadius: 12,
  },
  faceIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
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

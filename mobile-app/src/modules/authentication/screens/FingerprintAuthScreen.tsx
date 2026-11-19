import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, Fingerprint } from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../../../core/auth/authService';

export const FingerprintAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [scanning, setScanning] = useState(false);

  const handleFingerprintScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await AuthService.restoreBiometricSession();
      // Navigation to AppNavigator will be triggered automatically by RootNavigator via isAuthenticated in authStore
    } catch (err: any) {
      Alert.alert(
        'Touch ID Authentication Failed',
        err?.message || 'Could not verify biometric credentials. Please try again or use your password.',
        [
          { text: 'Try Again', onPress: () => setScanning(false) },
          {
            text: 'Use Password',
            onPress: () => {
              setScanning(false);
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#1E293B" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Touch ID</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Touch the fingerprint sensor to quickly unlock your MasterHRMS account.
        </Text>

        {/* Fingerprint Sensor Visual */}
        <TouchableOpacity
          style={styles.scannerCircle}
          onPress={handleFingerprintScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan fingerprint"
        >
          <View style={styles.scannerOuter}>
            <View style={styles.scannerInner}>
              {scanning ? (
                <ActivityIndicator color="#4F46E5" size="large" />
              ) : (
                <Fingerprint size={52} color="#4F46E5" strokeWidth={1.8} />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.scanInstruction}>
          {scanning ? 'Verifying biometric fingerprint...' : 'Touch sensor to verify identity'}
        </Text>

        {/* Fallback buttons */}
        <View style={styles.fallbackContainer}>
          <TouchableOpacity
            style={styles.fallbackBtn}
            onPress={() => navigation.navigate('FaceIdAuth')}
          >
            <Text style={styles.fallbackBtnText}>Switch to Face ID</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.passwordBtn}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.passwordBtnText}>Use Password Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
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
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  scannerCircle: {
    marginBottom: 20,
  },
  scannerOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fingerprintIcon: {
    fontSize: 48,
  },
  scanInstruction: {
    fontSize: 13,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 50,
  },
  fallbackContainer: {
    width: '100%',
    alignItems: 'center',
  },
  fallbackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  fallbackBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  passwordBtn: {
    paddingVertical: 10,
  },
  passwordBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});

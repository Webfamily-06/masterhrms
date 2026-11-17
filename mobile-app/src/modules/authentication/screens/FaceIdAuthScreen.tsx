import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, ScanFace } from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';

export const FaceIdAuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [scanning, setScanning] = useState(false);

  const handleFaceScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      Alert.alert(
        'Face ID Verified',
        'Facial recognition matched successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    }, 1400);
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
        <Text style={styles.headerTitle}>Face ID</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Face ID Verification</Text>
        <Text style={styles.subtitle}>
          Position your face within the frame to authenticate with MasterHRMS.
        </Text>

        {/* Face ID Viewfinder Graphic */}
        <TouchableOpacity
          style={styles.viewfinder}
          onPress={handleFaceScan}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="Scan face"
        >
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

          <View style={styles.faceIconCircle}>
            {scanning ? (
              <ActivityIndicator color="#4F46E5" size="large" />
            ) : (
              <ScanFace size={54} color="#4F46E5" strokeWidth={1.8} />
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.scanInstruction}>
          {scanning ? 'Analyzing biometric face geometry...' : 'Tap to scan your face'}
        </Text>

        {/* Fallback buttons */}
        <View style={styles.fallbackContainer}>
          <TouchableOpacity
            style={styles.fallbackBtn}
            onPress={() => navigation.navigate('FingerprintAuth')}
          >
            <Text style={styles.fallbackBtnText}>Switch to Fingerprint / Touch ID</Text>
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIcon: {
    fontSize: 54,
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

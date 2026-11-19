import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Camera, Mic, Settings, X, ShieldAlert, CheckCircle } from 'lucide-react-native';
import { Text } from '../common/Text';

interface CallPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermissions: () => Promise<void>;
  isPermanentlyDenied?: boolean;
  missingPermissions?: Array<'camera' | 'microphone'>;
}

export const CallPermissionModal: React.FC<CallPermissionModalProps> = ({
  visible,
  onClose,
  onRequestPermissions,
  isPermanentlyDenied = false,
  missingPermissions = ['microphone', 'camera'],
}) => {
  const handleAction = async () => {
    if (isPermanentlyDenied) {
      void Linking.openSettings();
      onClose();
    } else {
      await onRequestPermissions();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close modal">
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            {isPermanentlyDenied ? (
              <ShieldAlert size={36} color="#EF4444" />
            ) : (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Mic size={24} color="#6366F1" />
                <Camera size={24} color="#3B82F6" />
              </View>
            )}
          </View>

          <Text style={styles.title}>
            {isPermanentlyDenied ? 'Permissions Required' : 'Enable Camera & Microphone'}
          </Text>

          <Text style={styles.description}>
            {isPermanentlyDenied
              ? 'MasterHRMS needs permission to access your microphone and camera for audio and video calls. Please allow access in device settings.'
              : 'To join crystal-clear voice and video meetings with your team, MasterHRMS requires access to your microphone and camera.'}
          </Text>

          {/* List of permissions */}
          <View style={styles.permissionList}>
            {missingPermissions.includes('microphone') && (
              <View style={styles.permissionItem}>
                <View style={styles.itemIcon}>
                  <Mic size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Microphone Access</Text>
                  <Text style={styles.itemSubtitle}>Required for audio speech and speaking detection</Text>
                </View>
              </View>
            )}

            {missingPermissions.includes('camera') && (
              <View style={styles.permissionItem}>
                <View style={styles.itemIcon}>
                  <Camera size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Camera Access</Text>
                  <Text style={styles.itemSubtitle}>Required for video calling and screen preview</Text>
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              isPermanentlyDenied && { backgroundColor: '#EF4444' },
            ]}
            onPress={handleAction}
            activeOpacity={0.85}
          >
            {isPermanentlyDenied ? (
              <Settings size={18} color="#FFFFFF" />
            ) : (
              <CheckCircle size={18} color="#FFFFFF" />
            )}
            <Text style={styles.primaryBtnText}>
              {isPermanentlyDenied ? 'Open Device Settings' : 'Allow Camera & Mic'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionList: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});

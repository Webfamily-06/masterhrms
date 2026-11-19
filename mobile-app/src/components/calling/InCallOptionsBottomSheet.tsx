import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import {
  Users,
  UserPlus,
  MonitorUp,
  Hand,
  Sparkles,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { Text } from '../common/Text';

interface InCallOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  participantCount?: number;
  onOpenParticipants: () => void;
  onOpenInviteColleagues: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  isHandRaised?: boolean;
  onToggleRaiseHand?: () => void;
  isBackgroundBlur?: boolean;
  onToggleBackgroundBlur?: () => void;
  onOpenCallInfo?: () => void;
}

export const InCallOptionsBottomSheet: React.FC<InCallOptionsBottomSheetProps> = ({
  visible,
  onClose,
  participantCount = 1,
  onOpenParticipants,
  onOpenInviteColleagues,
  isScreenSharing = false,
  onToggleScreenShare,
  isHandRaised = false,
  onToggleRaiseHand,
  isBackgroundBlur = false,
  onToggleBackgroundBlur,
  onOpenCallInfo,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              <View style={styles.dragHandle} />

              <View style={styles.header}>
                <Text style={styles.title}>In-Call Controls</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close options">
                  <X size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsList}>
                {/* 1. View Participants */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onClose();
                    onOpenParticipants();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Users size={20} color="#818CF8" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Participants</Text>
                    <Text style={styles.optionDesc}>{participantCount} active on call</Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>

                {/* 2. Add / Invite Colleague */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onClose();
                    onOpenInviteColleagues();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <UserPlus size={20} color="#10B981" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Add Colleague</Text>
                    <Text style={styles.optionDesc}>Invite team member to this call</Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>

                {/* 3. Screen Sharing */}
                {onToggleScreenShare && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onToggleScreenShare();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isScreenSharing
                            ? 'rgba(59, 130, 246, 0.25)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <MonitorUp size={20} color={isScreenSharing ? '#3B82F6' : '#94A3B8'} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>
                        {isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                      </Text>
                      <Text style={styles.optionDesc}>
                        {isScreenSharing ? 'Currently sharing your screen' : 'Present documents or apps'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isScreenSharing && { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isScreenSharing && { color: '#60A5FA' },
                        ]}
                      >
                        {isScreenSharing ? 'Sharing' : 'Off'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* 4. Raise Hand */}
                {onToggleRaiseHand && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onToggleRaiseHand();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isHandRaised
                            ? 'rgba(245, 158, 11, 0.25)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      <Hand size={20} color={isHandRaised ? '#F59E0B' : '#94A3B8'} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>
                        {isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                      </Text>
                      <Text style={styles.optionDesc}>Notify speaker you have a question</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isHandRaised && { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isHandRaised && { color: '#FBBF24' },
                        ]}
                      >
                        {isHandRaised ? 'Raised' : 'Off'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* 5. Background Blur */}
                {onToggleBackgroundBlur && (
                  <View style={styles.optionRow}>
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Sparkles size={20} color="#C084FC" />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Background Blur</Text>
                      <Text style={styles.optionDesc}>Blur surrounding environment</Text>
                    </View>
                    <Switch
                      value={isBackgroundBlur}
                      onValueChange={onToggleBackgroundBlur}
                      trackColor={{ false: '#334155', true: '#6366F1' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                )}

                {/* 6. Call Information */}
                {onOpenCallInfo && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onClose();
                      onOpenCallInfo();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                      <ShieldCheck size={20} color="#60A5FA" />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Call Information & Security</Text>
                      <Text style={styles.optionDesc}>End-to-end encrypted • STUN relay</Text>
                    </View>
                    <ChevronRight size={18} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  optionDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
});

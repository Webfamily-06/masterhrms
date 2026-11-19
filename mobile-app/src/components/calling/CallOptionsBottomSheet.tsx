import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Phone, Video, Users, Calendar, X, ChevronRight } from 'lucide-react-native';
import { Text } from '../common/Text';

interface CallOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  targetUserName?: string;
  onSelectAudioCall: () => void;
  onSelectVideoCall: () => void;
  onSelectGroupCall: () => void;
  onSelectScheduleMeeting?: () => void;
}

export const CallOptionsBottomSheet: React.FC<CallOptionsBottomSheetProps> = ({
  visible,
  onClose,
  targetUserName = 'Colleague',
  onSelectAudioCall,
  onSelectVideoCall,
  onSelectGroupCall,
  onSelectScheduleMeeting,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Drag Handle Indicator */}
              <View style={styles.dragHandle} />

              {/* Title Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Start Call</Text>
                  <Text style={styles.subtitle}>With {targetUserName}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close call options">
                  <X size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {/* 1. Voice Call */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onClose();
                    onSelectAudioCall();
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Voice Call"
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Phone size={22} color="#3B82F6" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Voice Call</Text>
                    <Text style={styles.optionDesc}>High-definition enterprise audio</Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>

                {/* 2. Video Call */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onClose();
                    onSelectVideoCall();
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Video Call"
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Video size={22} color="#6366F1" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Video Call</Text>
                    <Text style={styles.optionDesc}>Face-to-face HD video meeting</Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>

                {/* 3. Group Call */}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    onClose();
                    onSelectGroupCall();
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Group Call"
                >
                  <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Users size={22} color="#10B981" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Group Call / Meeting</Text>
                    <Text style={styles.optionDesc}>Add multiple colleagues to call</Text>
                  </View>
                  <ChevronRight size={18} color="#64748B" />
                </TouchableOpacity>

                {/* 4. Schedule Meeting (if available) */}
                {onSelectScheduleMeeting && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => {
                      onClose();
                      onSelectScheduleMeeting();
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Schedule Meeting"
                  >
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Calendar size={22} color="#F59E0B" />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>Schedule for Later</Text>
                      <Text style={styles.optionDesc}>Add meeting to company calendar</Text>
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
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  optionDesc: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
});

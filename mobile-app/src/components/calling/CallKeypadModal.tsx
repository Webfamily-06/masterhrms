import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { X, Delete } from 'lucide-react-native';
import { Text } from '../common/Text';

interface CallKeypadModalProps {
  visible: boolean;
  onClose: () => void;
  onSendDtmfTone?: (digit: string) => void;
}

const KEYS = [
  { digit: '1', sub: '' },
  { digit: '2', sub: 'ABC' },
  { digit: '3', sub: 'DEF' },
  { digit: '4', sub: 'GHI' },
  { digit: '5', sub: 'JKL' },
  { digit: '6', sub: 'MNO' },
  { digit: '7', sub: 'PQRS' },
  { digit: '8', sub: 'TUV' },
  { digit: '9', sub: 'WXYZ' },
  { digit: '*', sub: '' },
  { digit: '0', sub: '+' },
  { digit: '#', sub: '' },
];

export const CallKeypadModal: React.FC<CallKeypadModalProps> = ({
  visible,
  onClose,
  onSendDtmfTone,
}) => {
  const [dialedDigits, setDialedDigits] = useState('');

  const handleKeyPress = (digit: string) => {
    setDialedDigits((prev) => prev + digit);
    onSendDtmfTone?.(digit);
  };

  const handleBackspace = () => {
    setDialedDigits((prev) => prev.slice(0, -1));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Touch-Tone Keypad</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close keypad">
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Digits Display */}
          <View style={styles.displayArea}>
            <Text style={styles.displayText} numberOfLines={1}>
              {dialedDigits || ' '}
            </Text>
            {dialedDigits.length > 0 && (
              <TouchableOpacity onPress={handleBackspace} style={styles.backspaceBtn}>
                <Delete size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Keypad Grid */}
          <View style={styles.grid}>
            {KEYS.map((k) => (
              <TouchableOpacity
                key={k.digit}
                style={styles.keyBtn}
                onPress={() => handleKeyPress(k.digit)}
                activeOpacity={0.65}
                accessibilityRole="button"
                accessibilityLabel={`Key ${k.digit} ${k.sub}`}
              >
                <Text style={styles.digitText}>{k.digit}</Text>
                {k.sub ? <Text style={styles.subText}>{k.sub}</Text> : <View style={{ height: 10 }} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Done Action */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Hide Keypad</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  displayArea: {
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    position: 'relative',
  },
  displayText: {
    color: '#6366F1',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 4,
  },
  backspaceBtn: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  keyBtn: {
    width: '30%',
    aspectRatio: 1.35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  digitText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '600',
  },
  subText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  doneBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#818CF8',
    fontSize: 15,
    fontWeight: '600',
  },
});

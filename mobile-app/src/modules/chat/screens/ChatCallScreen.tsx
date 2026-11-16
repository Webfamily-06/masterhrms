import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation, useRoute } from '@react-navigation/native';

export const ChatCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { receiverName = 'Colleague', callType = 'audio' } = route.params || {};

  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTED'>('RINGING');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    // Simulate connection after 2 seconds
    const ringTimer = setTimeout(() => {
      setCallState('CONNECTED');
    }, 2000);

    return () => clearTimeout(ringTimer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSec < 10 ? '0' : ''}${remainingSec}`;
  };

  const endCall = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topInfo}>
        <Text style={styles.callTypeBadge}>
          {callType === 'video' ? '📹 HD VIDEO CALL' : '📞 SECURE AUDIO CALL'}
        </Text>
        <Text style={styles.receiverName}>{receiverName}</Text>
        <Text style={styles.callStatus}>
          {callState === 'RINGING' ? 'Ringing...' : formatDuration(callDuration)}
        </Text>
      </View>

      {/* Avatar / Video Viewfinder */}
      <View style={styles.centerStage}>
        <View style={styles.pulseRingOuter}>
          <View style={styles.pulseRingInner}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {receiverName ? receiverName.substring(0, 2).toUpperCase() : 'CO'}
              </Text>
            </View>
          </View>
        </View>

        {callState === 'CONNECTED' && (
          <View style={styles.encryptionBadge}>
            <Text style={styles.encryptionText}>🔒 End-to-End Encrypted</Text>
          </View>
        )}
      </View>

      {/* Control Actions Row */}
      <View style={styles.controlsSection}>
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={() => setIsMuted(!isMuted)}
            accessibilityRole="button"
            accessibilityLabel="Mute microphone"
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {/* Toggle Video */}
          <TouchableOpacity
            style={[styles.controlBtn, isVideoEnabled && styles.controlBtnActive]}
            onPress={() => setIsVideoEnabled(!isVideoEnabled)}
            accessibilityRole="button"
            accessibilityLabel="Toggle camera"
          >
            <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '🚫'}</Text>
            <Text style={styles.controlLabel}>{isVideoEnabled ? 'Video On' : 'Video Off'}</Text>
          </TouchableOpacity>

          {/* Speakerphone */}
          <TouchableOpacity
            style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
            onPress={() => setIsSpeaker(!isSpeaker)}
            accessibilityRole="button"
            accessibilityLabel="Toggle speaker"
          >
            <Text style={styles.controlIcon}>🔊</Text>
            <Text style={styles.controlLabel}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
          </TouchableOpacity>
        </View>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallBtn}
          onPress={endCall}
          accessibilityRole="button"
          accessibilityLabel="End call"
        >
          <Text style={styles.endCallIcon}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  topInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  callTypeBadge: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  receiverName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  callStatus: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRingOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRingInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  encryptionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 24,
  },
  encryptionText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
  },
  controlsSection: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  controlBtn: {
    alignItems: 'center',
    width: 70,
  },
  controlBtnActive: {
    opacity: 0.8,
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  controlLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  endCallBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  endCallIcon: {
    fontSize: 28,
    transform: [{ rotate: '135deg' }],
  },
});

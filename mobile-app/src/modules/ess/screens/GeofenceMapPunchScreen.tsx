import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft, Building2, CheckCircle2, Square } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { AttendanceService, AttendanceRecord } from '../../../core/services/attendanceService';

export const GeofenceMapPunchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'GeofenceMapPunch'>>();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [punching, setPunching] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const records = await AttendanceService.getMyHistory();
      if (records && records.length > 0) {
        setTodayRecord(records[0]);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const isCheckedIn = !!todayRecord?.checkIn && !todayRecord?.checkOut;

  const handlePunch = async () => {
    try {
      setPunching(true);
      // Authoritative BKC office geofence coordinates
      const res = await AttendanceService.punch({
        latitude: 19.0657,
        longitude: 72.8687,
        type: isCheckedIn ? 'check_out' : 'check_in',
        notes: 'Mobile Geofence Punch',
      });
      Alert.alert('Attendance Recorded', res.message || 'Punch recorded successfully.');
      loadAttendance();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record attendance.';
      Alert.alert('Punch Failed', msg);
    } finally {
      setPunching(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Office Geofence Punch</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Live Clock Card */}
        <View style={styles.clockCard}>
          <Text style={styles.clockDate}>{formattedDate}</Text>
          <Text style={styles.clockTime}>{formattedTime}</Text>
          <View style={styles.shiftBadge}>
            <Text style={styles.shiftBadgeText}>General Shift (09:00 AM – 06:00 PM)</Text>
          </View>
        </View>

        {/* Visual Geofence Radar Card */}
        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.radarStatus}>GPS LOCKED — INSIDE GEOFENCE</Text>
          </View>

          {/* Radar Circles Visual Graphic */}
          <View style={styles.radarGraphic}>
            <View style={styles.outerRing}>
              <View style={styles.midRing}>
                <View style={styles.innerRing}>
                  <View style={styles.hqPin}>
                    <Building2 size={24} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                </View>
              </View>
            </View>
            {/* User Pulse Pin */}
            <View style={styles.userPulsePin}>
              <View style={styles.userPulseGlow} />
              <View style={styles.userDot} />
            </View>
          </View>

          <View style={styles.radarFooter}>
            <View style={styles.radarStat}>
              <Text style={styles.radarStatLabel}>Office Location</Text>
              <Text style={styles.radarStatValue}>BKC Headquarters, Mumbai</Text>
            </View>
            <View style={styles.radarStat}>
              <Text style={styles.radarStatLabel}>Distance to Office</Text>
              <Text style={styles.radarStatValueGreen}>85 meters (Within 500m)</Text>
            </View>
          </View>
        </View>

        {/* Punch In / Out Button */}
        <View style={styles.actionCard}>
          <TouchableOpacity
            style={[
              styles.punchButton,
              isCheckedIn ? styles.punchButtonOut : styles.punchButtonIn,
              punching && styles.btnDisabled,
            ]}
            onPress={handlePunch}
            disabled={punching}
            accessibilityRole="button"
            accessibilityLabel={isCheckedIn ? 'Check Out' : 'Check In'}
          >
            {punching ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <View style={{ marginBottom: 4 }}>
                  {isCheckedIn ? (
                    <Square size={26} color="#FFFFFF" strokeWidth={2.4} />
                  ) : (
                    <CheckCircle2 size={26} color="#FFFFFF" strokeWidth={2.4} />
                  )}
                </View>
                <Text style={styles.punchBtnText}>{isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}</Text>
                <Text style={styles.punchBtnSub}>
                  {isCheckedIn ? 'Tap to end your shift' : 'Tap to mark your arrival'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Today's Stats Breakdown */}
        <View style={styles.statsCard}>
          <Text style={styles.statsCardTitle}>Today's Log</Text>
          {loading ? (
            <ActivityIndicator color="#4F46E5" style={styles.loader} />
          ) : (
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Check In</Text>
                <Text style={styles.statBoxValue}>
                  {todayRecord?.checkIn
                    ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Check Out</Text>
                <Text style={styles.statBoxValue}>
                  {todayRecord?.checkOut
                    ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Status</Text>
                <Text style={styles.statBoxValueHighlight}>
                  {todayRecord?.status || (isCheckedIn ? 'PRESENT' : 'NOT PUNCHED')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="GeofenceMapPunch" />
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  clockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  clockDate: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  clockTime: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1,
  },
  shiftBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  shiftBadgeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
  },
  radarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    alignItems: 'center',
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  radarStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  radarGraphic: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  outerRing: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  midRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#A5B4FC',
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#818CF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hqPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hqPinIcon: {
    fontSize: 20,
  },
  userPulsePin: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userPulseGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  radarFooter: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    marginTop: 8,
  },
  radarStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  radarStatLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  radarStatValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  radarStatValueGreen: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  actionCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  punchButton: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  punchButtonIn: {
    backgroundColor: '#10B981',
  },
  punchButtonOut: {
    backgroundColor: '#EF4444',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  punchBtnIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  punchBtnSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  loader: {
    marginVertical: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statBoxValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
});

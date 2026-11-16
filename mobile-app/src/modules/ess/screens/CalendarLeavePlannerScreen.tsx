import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const CalendarLeavePlannerScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'CalendarLeavePlanner'>>();
  const [selectedDay, setSelectedDay] = useState<number>(16);

  // November 2026 dates (starts on Sunday Nov 1)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  // Sample status mapping
  const getDayStatus = (day: number) => {
    // Weekends (Sundays: 1, 8, 15, 22, 29; Saturdays: 7, 14, 21, 28)
    const dayOfWeek = (day - 1) % 7;
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'WEEKEND';
    if (day === 12 || day === 27) return 'HOLIDAY';
    if (day === 5 || day === 6) return 'LEAVE';
    if (day <= 16) return 'PRESENT';
    return 'FUTURE';
  };

  const selectedStatus = getDayStatus(selectedDay);

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
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar & Leave Planner</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('LeaveDetail')}
          style={styles.applyBtn}
          accessibilityRole="button"
          accessibilityLabel="Apply leave"
        >
          <Text style={styles.applyBtnText}>+ Leave</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Month Selector */}
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.arrowBtn}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>November 2026</Text>
          <TouchableOpacity style={styles.arrowBtn}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {/* Day of Week Headers */}
          <View style={styles.weekRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
              <Text key={index} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysInMonth.map((day) => {
              const status = getDayStatus(day);
              const isSelected = selectedDay === day;
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}`}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                    {day}
                  </Text>
                  <View style={styles.dotsRow}>
                    {status === 'PRESENT' && <View style={[styles.dot, styles.dotGreen]} />}
                    {status === 'LEAVE' && <View style={[styles.dot, styles.dotYellow]} />}
                    {status === 'HOLIDAY' && <View style={[styles.dot, styles.dotBlue]} />}
                    {status === 'WEEKEND' && <View style={[styles.dot, styles.dotGray]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotGreen]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotYellow]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotBlue]} />
              <Text style={styles.legendText}>Holiday</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotGray]} />
              <Text style={styles.legendText}>Weekend</Text>
            </View>
          </View>
        </View>

        {/* Selected Day Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>
            Status for Nov {selectedDay}, 2026
          </Text>
          <View style={styles.statusDetailRow}>
            <Text style={styles.statusDetailLabel}>Attendance State:</Text>
            <View
              style={[
                styles.statusBadge,
                selectedStatus === 'PRESENT'
                  ? styles.badgeGreen
                  : selectedStatus === 'LEAVE'
                  ? styles.badgeYellow
                  : selectedStatus === 'HOLIDAY'
                  ? styles.badgeBlue
                  : styles.badgeGray,
              ]}
            >
              <Text style={styles.statusBadgeText}>{selectedStatus}</Text>
            </View>
          </View>
          {selectedStatus === 'PRESENT' && (
            <Text style={styles.statusNote}>Punched in at 09:14 AM • On Duty 8h 30m</Text>
          )}
          {selectedStatus === 'HOLIDAY' && (
            <Text style={styles.statusNote}>Public Holiday: Festival of Lights / Observance</Text>
          )}
          {selectedStatus === 'LEAVE' && (
            <Text style={styles.statusNote}>Casual Leave approved by Manager</Text>
          )}
        </View>

        {/* Monthly Summary Statistics */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Month At A Glance</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumGreen}>21</Text>
              <Text style={styles.summaryLabel}>Working Days</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumBlue}>2</Text>
              <Text style={styles.summaryLabel}>Holidays</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumYellow}>2</Text>
              <Text style={styles.summaryLabel}>Leaves Taken</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumPurple}>16</Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  applyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  arrowBtn: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
    color: '#1E1B4B',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    width: 38,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayNumberSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 1,
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotYellow: {
    backgroundColor: '#F59E0B',
  },
  dotBlue: {
    backgroundColor: '#3B82F6',
  },
  dotGray: {
    backgroundColor: '#CBD5E1',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statusCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  statusDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusDetailLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  badgeYellow: {
    backgroundColor: '#FEF3C7',
  },
  badgeBlue: {
    backgroundColor: '#DBEAFE',
  },
  badgeGray: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumGreen: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  summaryNumBlue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3B82F6',
  },
  summaryNumYellow: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F59E0B',
  },
  summaryNumPurple: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});

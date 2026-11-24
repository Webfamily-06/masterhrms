import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft } from 'lucide-react-native';
import { AppBottomNav, UserAvatar } from '../../../components/common';
import { ManagerService, TeamMember } from '../../../core/services/managerService';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export const TeamAttendanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await ManagerService.getTeamMembers();
      setTeam(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const getDesignationName = (desig: any) => {
    if (!desig) return 'Team Member';
    if (typeof desig === 'string') return desig;
    return desig.name || 'Team Member';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.colors.surfaceSecondary }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Team Attendance Status
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={[styles.subHeading, { color: theme.colors.textSecondary }]}>
            Direct Reports ({team.length})
          </Text>

          {team.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                No direct reports assigned to your team.
              </Text>
            </View>
          ) : (
            team.map((member) => (
              <View
                key={member.id}
                style={[
                  styles.memberCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.memberRow}>
                  <UserAvatar
                    entity={member}
                    name={`${member.firstName || ''} ${member.lastName || ''}`.trim()}
                    email={member.email}
                    size={46}
                    borderWidth={1.5}
                    borderColor={theme.colors.border}
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: theme.colors.text }]}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text style={[styles.memberRole, { color: theme.colors.textSecondary }]}>
                      {getDesignationName(member.designation)} • {member.employeeCode}
                    </Text>
                    <Text style={[styles.memberContact, { color: theme.colors.textMuted }]}>
                      {member.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      member.todayStatus === 'ABSENT'
                        ? styles.pillAbsent
                        : styles.pillPresent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: member.todayStatus === 'ABSENT' ? '#DC2626' : '#15803D' },
                      ]}
                    >
                      {member.todayStatus || 'PRESENT'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      <AppBottomNav activeRoute="ManagerHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholder: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  memberCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
  },
  memberRole: {
    fontSize: 12,
    marginTop: 2,
  },
  memberContact: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillPresent: {
    backgroundColor: '#DCFCE7',
  },
  pillAbsent: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

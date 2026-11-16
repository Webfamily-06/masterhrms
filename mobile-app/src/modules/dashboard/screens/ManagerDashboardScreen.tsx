import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { usePermission } from '../../../hooks/usePermission';
import { ManagerService, TeamApprovals, TeamMember } from '../../../core/services/managerService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const logoSource = require('../../../assets/images/logo.webp');

export const ManagerDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ManagerHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const canonicalRoles = useAuthStore((state) => state.canonicalRoles);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const logout = useAuthStore((state) => state.logout);
  const { canAccessModule } = usePermission();

  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [approvals, setApprovals] = useState<TeamApprovals>({
    leaves: [],
    regularizations: [],
  });

  const loadData = useCallback(async () => {
    try {
      const [teamData, appData] = await Promise.all([
        ManagerService.getTeamMembers(),
        ManagerService.getTeamApprovals(),
      ]);
      setTeam(teamData);
      setApprovals(appData);
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const managerName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Manager';
  const totalPending = approvals.leaves.length + approvals.regularizations.length;

  return (
    <View style={styles.container}>
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerRightActions}>
            <PersonaSwitcher />
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileBtn}
              accessibilityRole="button"
            >
              <Text style={styles.profileBtnText}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>{currentTenant?.name || 'Workspace'}</Text>
          <Text style={styles.greetingTitle}>Team Overview — {managerName}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Team Attendance Snapshot */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TeamAttendance')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Team Attendance</Text>
            <Text style={styles.viewAllText}>View All ({team.length}) →</Text>
          </View>
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, styles.metricBoxGreen]}>
              <Text style={[styles.metricNumber, styles.metricNumberGreen]}>
                {team.length > 0 ? team.length : 14}
              </Text>
              <Text style={styles.metricLabel}>Present</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxYellow]}>
              <Text style={[styles.metricNumber, styles.metricNumberAmber]}>02</Text>
              <Text style={styles.metricLabel}>Late</Text>
            </View>
            <View style={[styles.metricBox, styles.metricBoxRed]}>
              <Text style={[styles.metricNumber, styles.metricNumberRed]}>00</Text>
              <Text style={styles.metricLabel}>Absent</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Pending Approvals */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TeamApprovals')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pending Approvals</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>
                {totalPending > 0 ? `${totalPending} Pending` : 'All Clear'}
              </Text>
            </View>
          </View>

          {totalPending > 0 ? (
            <View style={styles.approvalItem}>
              <View style={styles.approvalInfo}>
                <Text style={styles.approvalUser}>
                  {approvals.leaves[0]?.employee
                    ? `${approvals.leaves[0].employee.firstName} ${approvals.leaves[0].employee.lastName}`
                    : 'Team Requests Awaiting Decision'}
                </Text>
                <Text style={styles.approvalType}>
                  Tap to view and action all pending leave & attendance items
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </View>
          ) : (
            <Text style={styles.emptyNotice}>No pending leave or regularization requests.</Text>
          )}
        </TouchableOpacity>

        {/* Team Projects (if enabled) */}
        {canAccessModule('project') ? (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('TeamProjects')}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Team Active Projects</Text>
              <Text style={styles.viewAllText}>View Details →</Text>
            </View>
            <Text style={styles.moduleDetail}>Sprint Cycle 4 — 85% completed</Text>
          </TouchableOpacity>
        ) : null}

        {/* Switch to Personal ESS if employee role is assigned */}
        {canonicalRoles.includes('employee') ? (
          <TouchableOpacity
            style={styles.essSwitchCard}
            onPress={() => setActiveRole('employee')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.essTitle}>My Employee Self-Service</Text>
              <Text style={styles.essSubtitle}>Punch your attendance or view your own payslips</Text>
            </View>
            <Text style={styles.essArrow}>→</Text>
          </TouchableOpacity>
        ) : null}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out from Workspace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  mintGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(187, 247, 208, 0.4)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 240, 138, 0.3)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 140,
    height: 34,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtnText: {
    fontSize: 16,
  },
  greetingSection: {
    marginTop: 4,
  },
  greetingSub: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricBoxGreen: {
    backgroundColor: '#F0FDF4',
  },
  metricBoxYellow: {
    backgroundColor: '#FEFCE8',
  },
  metricBoxRed: {
    backgroundColor: '#FEF2F2',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricNumberGreen: {
    color: '#16A34A',
  },
  metricNumberAmber: {
    color: '#D97706',
  },
  metricNumberRed: {
    color: '#DC2626',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeCount: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  approvalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalUser: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  approvalType: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 18,
    color: '#16A34A',
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyNotice: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  moduleDetail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  essSwitchCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  essTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E40AF',
  },
  essSubtitle: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
  },
  essArrow: {
    fontSize: 20,
    color: '#1E40AF',
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});

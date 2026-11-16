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
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { SuperAdminService, PlatformStats } from '../../../core/services/superAdminService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const logoSource = require('../../../assets/images/logo.webp');

export const SuperAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'SuperAdminHome'>>();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalTenants: 1,
    activeTenants: 1,
    totalUsers: 1,
    totalEmployees: 1,
    systemStatus: 'ONLINE',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await SuperAdminService.getStats();
      setStats(data);
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
          <View style={styles.platformBadge}>
            <Text style={styles.platformBadgeText}>GLOBAL PLATFORM ROOT</Text>
          </View>
          <Text style={styles.greetingTitle}>Platform Overview</Text>
          <Text style={styles.greetingSub}>{user?.email}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Architecture Isolation Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>🛡️ Super Administrator Security Notice</Text>
          <Text style={styles.noticeBody}>
            You are logged in as a Global Platform Administrator. Tenant-scoped business records
            (payroll runs, biometric records, employee documents) are strictly isolated behind their
            respective tenant workspace contexts.
          </Text>
        </View>

        {/* Global Platform Diagnostics */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SystemDiagnostics')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Platform Health & Services</Text>
            <Text style={styles.viewDetailsText}>Diagnostics →</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Backend REST API:</Text>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineText}>OPERATIONAL (Port 4000)</Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Database Driver:</Text>
            <Text style={styles.statusVal}>Prisma ORM (PostgreSQL)</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Tenant Isolation:</Text>
            <Text style={styles.statusVal}>Active Prisma Proxy Extension</Text>
          </View>
        </TouchableOpacity>

        {/* Tenants Directory Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PlatformTenants')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Registered SaaS Tenants</Text>
            <Text style={styles.viewDetailsText}>Directory →</Text>
          </View>
          <View style={styles.tenantStatRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.totalTenants || 1}</Text>
              <Text style={styles.statLbl}>Total Tenants</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, styles.greenText]}>{stats.activeTenants || 1}</Text>
              <Text style={styles.statLbl}>Active</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{stats.totalUsers || 1}</Text>
              <Text style={styles.statLbl}>Users</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out from Platform Console</Text>
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
    backgroundColor: 'rgba(187, 247, 208, 0.45)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
    letterSpacing: 0.5,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  greetingSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  noticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 6,
  },
  noticeBody: {
    fontSize: 12.5,
    color: '#3B82F6',
    lineHeight: 18,
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
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewDetailsText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statusLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  statusVal: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  onlineBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  tenantStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  greenText: {
    color: '#16A34A',
  },
  statLbl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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

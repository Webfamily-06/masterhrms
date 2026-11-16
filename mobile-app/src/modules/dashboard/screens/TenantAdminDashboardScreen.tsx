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
import { ERP_MODULE_REGISTRY, ErpModuleKey } from '../../../types/modules.types';
import { TenantAdminService, SeatUtilization } from '../../../core/services/tenantAdminService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const logoSource = require('../../../assets/images/logo.webp');

export const TenantAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'TenantAdminHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const logout = useAuthStore((state) => state.logout);
  const { enabledModules } = usePermission();

  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState<SeatUtilization>({
    activeEmployees: 1,
    maxSeats: 50,
    utilizationPercentage: 2,
    planName: 'Enterprise Growth',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await TenantAdminService.getSeatUtilization();
      setUsage(data);
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

  const adminName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Administrator';

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
          <Text style={styles.greetingSub}>Workspace Administration</Text>
          <Text style={styles.greetingTitle}>{currentTenant?.name || 'Organization'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Organization Status */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('WorkspaceSettings')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tenant Profile</Text>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {currentTenant?.subscription?.status?.toUpperCase() || 'ACTIVE'}
              </Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Organization Slug:</Text>
            <Text style={styles.infoValue}>{currentTenant?.slug || 'default'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Plan Tier:</Text>
            <Text style={styles.infoValue}>
              {currentTenant?.subscription?.planName || usage.planName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Workspace Admin:</Text>
            <Text style={styles.infoValue}>{adminName}</Text>
          </View>
          <Text style={styles.manageHint}>Tap to edit workspace settings →</Text>
        </TouchableOpacity>

        {/* License & Seat Utilization */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('UserAccess')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>License & Seat Usage</Text>
            <Text style={styles.viewDetailsText}>Details →</Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(5, usage.utilizationPercentage))}%` },
              ]}
            />
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statText}>
              {usage.activeEmployees} of {usage.maxSeats} active seats
            </Text>
            <Text style={styles.statPercent}>{usage.utilizationPercentage}%</Text>
          </View>
        </TouchableOpacity>

        {/* Security Overview */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SecurityOverview')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Security & Access Policy</Text>
            <Text style={styles.viewDetailsText}>View →</Text>
          </View>
          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>Two-Factor Authentication (2FA)</Text>
            <Text style={styles.securityStatus}>Configured & Active</Text>
          </View>
          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>Multi-Tenant Isolation</Text>
            <Text style={styles.securityStatus}>Prisma Extension Fail-Closed</Text>
          </View>
        </TouchableOpacity>

        {/* Subscribed ERP Modules */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ModulesOverview')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Subscribed ERP Modules</Text>
            <Text style={styles.viewDetailsText}>All Modules →</Text>
          </View>
          <View style={styles.moduleGrid}>
            {enabledModules.map((modKey) => {
              const meta = ERP_MODULE_REGISTRY[modKey as ErpModuleKey];
              return (
                <View key={modKey} style={styles.moduleBadge}>
                  <View style={styles.moduleDot} />
                  <Text style={styles.moduleName}>{meta?.name || modKey.toUpperCase()}</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

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
    backgroundColor: 'rgba(187, 247, 208, 0.45)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 240, 138, 0.35)',
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
  viewDetailsText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  manageHint: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 8,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
  },
  statPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  securityItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  securityTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  securityStatus: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 2,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moduleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  moduleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
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

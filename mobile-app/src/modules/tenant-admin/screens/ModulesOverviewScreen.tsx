import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { usePermission } from '../../../hooks/usePermission';
import { useNavigation } from '@react-navigation/native';

export const ModulesOverviewScreen: React.FC = () => {
  const navigation = useNavigation();
  const { enabledModules: permissionModules } = usePermission();

  const enabledModules =
    permissionModules.length > 0
      ? permissionModules
      : ['hrm', 'project', 'support', 'analytics'];

  const allKnownModules = [
    { key: 'hrm', name: 'Human Resource Management', desc: 'Core ESS, Attendance, Leaves, and Directory', core: true },
    { key: 'payroll', name: 'Payroll & Compensation', desc: 'Salary structures, runs, and payslips', core: true },
    { key: 'project', name: 'Project & Task Tracking', desc: 'Sprint cycles, boards, and milestones', core: false },
    { key: 'support', name: 'Helpdesk & Support', desc: 'Internal ticketing and issue escalations', core: false },
    { key: 'analytics', name: 'Workforce Analytics', desc: 'Headcount metrics and telemetry reports', core: false },
    { key: 'crm', name: 'Customer Relationship Mgmt', desc: 'Client leads, contacts, and opportunities', core: false },
    { key: 'finance', name: 'Financial Accounting', desc: 'General ledger, expense management, invoices', core: false },
    { key: 'inventory', name: 'Inventory & Warehousing', desc: 'Stock allocation and equipment registers', core: false },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ERP Subscribed Modules</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subHeading}>
          Workspace Subscriptions ({enabledModules.length} Active)
        </Text>

        {allKnownModules.map((mod) => {
          const isEnabled = enabledModules.includes(mod.key) || mod.core;
          return (
            <View key={mod.key} style={styles.moduleCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.modName}>{mod.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isEnabled ? styles.badgeActive : styles.badgeInactive,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isEnabled ? (mod.core ? 'CORE' : 'ACTIVE') : 'INACTIVE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.modDesc}>{mod.desc}</Text>
            </View>
          );
        })}
      </ScrollView>
      <AppBottomNav activeRoute="TenantAdminHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholder: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  modDesc: {
    fontSize: 12.5,
    color: '#64748B',
  },
});

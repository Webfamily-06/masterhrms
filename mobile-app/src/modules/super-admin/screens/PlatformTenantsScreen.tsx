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
import { AppBottomNav } from '../../../components/common';
import { SuperAdminService, PlatformTenant } from '../../../core/services/superAdminService';
import { useNavigation } from '@react-navigation/native';

export const PlatformTenantsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await SuperAdminService.getTenants();
      setTenants(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Global Tenants Directory</Text>
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
          <Text style={styles.subHeading}>Registered SaaS Tenants ({tenants.length})</Text>

          {tenants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No platform tenants discovered.</Text>
            </View>
          ) : (
            tenants.map((t) => (
              <View key={t.id} style={styles.tenantCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.tenantName}>{t.name}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      t.status === 'ACTIVE' ? styles.pillActive : styles.pillSuspended,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{t.status || 'ACTIVE'}</Text>
                  </View>
                </View>
                <Text style={styles.slugText}>Slug: {t.slug}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.planText}>Plan: {t.planName || 'Enterprise Growth'}</Text>
                  <Text style={styles.dateText}>
                    Created: {new Date(t.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      <AppBottomNav activeRoute="SuperAdminHome" />
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
    color: '#475569',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  tenantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillActive: {
    backgroundColor: '#DCFCE7',
  },
  pillSuspended: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  slugText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  planText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

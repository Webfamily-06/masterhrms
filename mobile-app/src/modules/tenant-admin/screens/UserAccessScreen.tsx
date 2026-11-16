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
import { TenantAdminService, SeatUtilization } from '../../../core/services/tenantAdminService';
import { useNavigation } from '@react-navigation/native';

export const UserAccessScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState<SeatUtilization>({
    activeEmployees: 0,
    maxSeats: 50,
    utilizationPercentage: 0,
    planName: 'Enterprise Growth',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await TenantAdminService.getSeatUtilization();
      setUsage(data);
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Access & License</Text>
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
          {/* License Utilization Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>License Utilization</Text>
            <Text style={styles.planName}>{usage.planName}</Text>

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
                {usage.activeEmployees} of {usage.maxSeats} Seats Used
              </Text>
              <Text style={styles.statPercent}>{usage.utilizationPercentage}%</Text>
            </View>
          </View>

          {/* Access Policy Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Access Governance</Text>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Default Role Assignment</Text>
              <Text style={styles.policyValue}>Employee (ESS)</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Invitation Mode</Text>
              <Text style={styles.policyValue}>Admin Only</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Concurrent Sessions</Text>
              <Text style={styles.policyValue}>Single Mobile Device</Text>
            </View>
          </View>
        </ScrollView>
      )}
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
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  planName: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 14,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statText: {
    fontSize: 12.5,
    color: '#64748B',
  },
  statPercent: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  policyLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  policyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

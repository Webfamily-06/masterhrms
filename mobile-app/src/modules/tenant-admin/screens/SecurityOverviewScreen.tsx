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
import { TenantAdminService, SecurityPolicy } from '../../../core/services/tenantAdminService';
import { useNavigation } from '@react-navigation/native';

export const SecurityOverviewScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [policy, setPolicy] = useState<SecurityPolicy>({
    mfaRequired: false,
    mfaEnforcementLevel: 'OPTIONAL',
    sessionTimeoutMinutes: 60,
    passwordMinLength: 8,
    ipWhitelistEnabled: false,
  });

  const loadData = useCallback(async () => {
    try {
      const data = await TenantAdminService.getSecurityPolicy();
      setPolicy(data);
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
        <Text style={styles.headerTitle}>Security & 2FA Governance</Text>
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
          {/* 2FA Status Card */}
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>
                  {policy.mfaRequired ? 'ENFORCED' : 'OPTIONAL'}
                </Text>
              </View>
            </View>
            <Text style={styles.cardSub}>
              Enforcement Level: {policy.mfaEnforcementLevel || 'REQUIRED_ADMINS'}
            </Text>
            <Text style={styles.policyDesc}>
              Requires employees and administrators to provide an encrypted time-based OTP or email code on login.
            </Text>
          </View>

          {/* Session & Password Rules */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Session Security</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inactivity Auto-Logout</Text>
              <Text style={styles.infoValue}>{policy.sessionTimeoutMinutes || 60} Minutes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Biometric Unlock (Touch/Face ID)</Text>
              <Text style={styles.infoValue}>Supported</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Minimum Password Length</Text>
              <Text style={styles.infoValue}>{policy.passwordMinLength || 8} Characters</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IP Perimeter Guard</Text>
              <Text style={styles.infoValue}>
                {policy.ipWhitelistEnabled ? 'Active' : 'Disabled'}
              </Text>
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  cardSub: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 4,
  },
  policyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
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
});

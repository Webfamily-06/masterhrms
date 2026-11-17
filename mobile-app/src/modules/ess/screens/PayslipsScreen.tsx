import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Filter,
  Check,
  FileText,
  Gift,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import {
  PayrollService,
  PayslipItem,
} from '../../../core/services/payrollService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const PayslipsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Payslips'>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await PayrollService.getMyPayslips();
      setPayslips(data || []);
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const latestSlip = payslips[0] || null;
  const historyList = payslips;

  const handleSelectSlip = (slip: PayslipItem) => {
    navigation.navigate('SalarySlipDetail', {
      month: monthNames[(slip.month || 1) - 1] || 'Current',
      year: slip.year || new Date().getFullYear(),
      gross: slip.grossSalary || 0,
      net: slip.netSalary || 0,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payslips</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Filter', 'Filter payslips by year or payment status.')}
          style={styles.filterBtn}
          accessibilityRole="button"
          accessibilityLabel="Filter"
        >
          <Filter size={20} color="#2563EB" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Latest Pay Period Gradient Hero Card (Matches 64. Payslip – Home.png) */}
          <View style={styles.heroCard}>
            <Text style={styles.heroSub}>Latest Pay Period</Text>
            <Text style={styles.heroPeriod}>
              {latestSlip
                ? `${monthNames[(latestSlip.month || 1) - 1]} 1 - ${monthNames[(latestSlip.month || 1) - 1]} 28, ${latestSlip.year || new Date().getFullYear()}`
                : 'No Recent Pay Period'}
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmount}>
                ${Number(latestSlip?.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>

              <View style={styles.heroPaidPill}>
                <Check size={12} color="#2563EB" strokeWidth={3} style={{ marginRight: 4 }} />
                <Text style={styles.heroPaidText}>
                  {latestSlip?.status || 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* HISTORY Section */}
          <Text style={styles.sectionHeading}>HISTORY</Text>

          <View style={styles.historyList}>
            {historyList.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>No historical payslips found.</Text>
              </View>
            ) : (
              historyList.map((item) => {
              const mName = monthNames[(item.month || 1) - 1] || 'Month';
              const isBonus = (item as any).isBonus;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  onPress={() => handleSelectSlip(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.historyIconCircle, isBonus ? { backgroundColor: '#FEF3C7' } : { backgroundColor: '#EFF6FF' }]}>
                    {isBonus ? (
                      <Gift size={22} color="#D97706" />
                    ) : (
                      <FileText size={22} color="#2563EB" />
                    )}
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.historyTitle}>
                      {isBonus ? 'Annual Bonus' : `${mName} ${item.year}`}
                    </Text>
                    <Text style={styles.historySub}>
                      Paid on {item.paymentDate || `${mName} 01, ${item.year}`}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyAmount}>
                      ${Number(item.netSalary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={styles.historyPaidBadge}>
                      <Text style={styles.historyPaidBadgeText}>{item.status || 'Paid'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </View>
        </ScrollView>
      )}

      {/* Persistent Bottom Nav */}
      <AppBottomNav activeRoute="EmployeeHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Hero Card (Matches 64. Payslip – Home.png) */
  heroCard: {
    backgroundColor: '#2563EB',
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  heroSub: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '600',
  },
  heroPeriod: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginVertical: 16,
  },
  heroAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  heroPaidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPaidText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  /* History */
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  historyList: {
    marginHorizontal: 16,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyPaidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  historyPaidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
});

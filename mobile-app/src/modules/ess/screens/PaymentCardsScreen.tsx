import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  TrendingUp,
  PieChart,
  Wallet,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { useAuthStore } from '../../../store/authStore';
import { useCallStore } from '../../../store/callStore';
import { EmployeeService } from '../../../core/services/employeeService';

type WidgetSizeTab = 'all' | 'small' | 'medium' | 'large';
type WidgetPeriod = 'month' | 'quarter' | 'year';

export const PaymentCardsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'PaymentCards'>>();
  const user = useAuthStore((state) => state.user);
  const showDynamicIsland = useCallStore((s) => s.showDynamicIsland);
  const employeeName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Employee';

  const [widgetSize, setWidgetSize] = useState<WidgetSizeTab>('all');
  const [period, setPeriod] = useState<WidgetPeriod>('month');
  const [liveWidgetData, setLiveWidgetData] = useState<{
    netPay: string;
    delta: string;
    taxSaved: string;
    reimbursements: string;
    loanEmi: string;
    bars: number[];
    labels: string[];
    utilization: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    EmployeeService.getFinanceWidgets(period)
      .then((res) => {
        if (active && res) setLiveWidgetData(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [period]);

  const fallbackWidgetData = {
    month: {
      netPay: '₹85,000',
      delta: '+4.2%',
      taxSaved: '₹18,400',
      reimbursements: '₹6,250',
      loanEmi: '₹4,500',
      bars: [62, 74, 68, 85, 79, 92],
      labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
      utilization: 74,
    },
    quarter: {
      netPay: '₹2,55,000',
      delta: '+6.1%',
      taxSaved: '₹55,200',
      reimbursements: '₹14,800',
      loanEmi: '₹13,500',
      bars: [70, 76, 82, 88, 84, 95],
      labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Bonus', 'Net'],
      utilization: 81,
    },
    year: {
      netPay: '₹10,20,000',
      delta: '+11.4%',
      taxSaved: '₹1,84,000',
      reimbursements: '₹42,600',
      loanEmi: '₹54,000',
      bars: [58, 66, 72, 80, 88, 96],
      labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
      utilization: 88,
    },
  }[period];
  const widgetData = liveWidgetData || fallbackWidgetData;

  const handlePinFinanceToIsland = () => {
    showDynamicIsland({
      type: 'finance_statistic',
      title: 'Finance Statistic',
      subtitle: `${period.toUpperCase()} Net Pay • Verified`,
      metricValue: widgetData.netPay,
      metricDelta: widgetData.delta,
      progress: widgetData.utilization,
      mode: 'expanded',
      targetRoute: 'PaymentCards',
    });
  };

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
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cards & Banking</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Payslips')}
          style={styles.payslipsBtn}
          accessibilityRole="button"
          accessibilityLabel="View payslips"
        >
          <Text style={styles.payslipsBtnText}>Payslips</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Finance Widgets Suite (Matches Widget/Finance/Small, Medium, Large) */}
        <View style={styles.widgetSuiteSection}>
          <View style={styles.widgetHeaderRow}>
            <View>
              <Text style={styles.widgetSuiteTitle}>Finance Widgets</Text>
              <Text style={styles.widgetSuiteSub}>Small • Medium • Large Live Cards</Text>
            </View>
            <TouchableOpacity
              style={styles.islandTriggerPill}
              onPress={handlePinFinanceToIsland}
              accessibilityRole="button"
              accessibilityLabel="Pin Finance Statistic to Dynamic Island"
            >
              <Sparkles size={13} color="#34D399" />
              <Text style={styles.islandTriggerText}>Dynamic Island</Text>
            </TouchableOpacity>
          </View>

          {/* Size & Period Controls */}
          <View style={styles.widgetFilterRow}>
            <View style={styles.sizeSegmentWrap}>
              {(['all', 'small', 'medium', 'large'] as const).map((sz) => (
                <TouchableOpacity
                  key={sz}
                  style={[styles.sizeChip, widgetSize === sz && styles.sizeChipActive]}
                  onPress={() => setWidgetSize(sz)}
                >
                  <Text style={[styles.sizeChipText, widgetSize === sz && styles.sizeChipTextActive]}>
                    {sz === 'all' ? 'All' : sz.charAt(0).toUpperCase() + sz.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.periodWrap}>
              {(['month', 'quarter', 'year'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodChip, period === p && styles.periodChipActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                    {p === 'month' ? '1M' : p === 'quarter' ? '1Q' : '1Y'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SMALL WIDGETS (2x2 Grid) */}
          {(widgetSize === 'all' || widgetSize === 'small') && (
            <View style={styles.smallWidgetGrid}>
              <View style={[styles.smallWidgetCard, { backgroundColor: '#0F172A' }]}>
                <View style={styles.smallWidgetTop}>
                  <Wallet size={16} color="#34D399" />
                  <Text style={styles.smallWidgetDeltaPos}>{widgetData.delta}</Text>
                </View>
                <Text style={styles.smallWidgetValueDark}>{widgetData.netPay}</Text>
                <Text style={styles.smallWidgetLabelDark}>Net Disbursed</Text>
              </View>

              <View style={styles.smallWidgetCard}>
                <View style={styles.smallWidgetTop}>
                  <ShieldCheck size={16} color="#2563EB" />
                  <Text style={styles.smallWidgetTagBlue}>80C</Text>
                </View>
                <Text style={styles.smallWidgetValue}>{widgetData.taxSaved}</Text>
                <Text style={styles.smallWidgetLabel}>Tax Saved</Text>
              </View>

              <View style={styles.smallWidgetCard}>
                <View style={styles.smallWidgetTop}>
                  <TrendingUp size={16} color="#F59E0B" />
                  <Text style={styles.smallWidgetTagAmber}>Claims</Text>
                </View>
                <Text style={styles.smallWidgetValue}>{widgetData.reimbursements}</Text>
                <Text style={styles.smallWidgetLabel}>Reimbursements</Text>
              </View>

              <View style={styles.smallWidgetCard}>
                <View style={styles.smallWidgetTop}>
                  <PieChart size={16} color="#8B5CF6" />
                  <Text style={styles.smallWidgetTagPurple}>Active</Text>
                </View>
                <Text style={styles.smallWidgetValue}>{widgetData.loanEmi}</Text>
                <Text style={styles.smallWidgetLabel}>Loan / Advance EMI</Text>
              </View>
            </View>
          )}

          {/* MEDIUM WIDGET (Cashflow Spark-Bar Card) */}
          {(widgetSize === 'all' || widgetSize === 'medium') && (
            <View style={styles.mediumWidgetCard}>
              <View style={styles.mediumWidgetHeader}>
                <View>
                  <Text style={styles.mediumWidgetTitle}>Earnings & Cashflow Trend</Text>
                  <Text style={styles.mediumWidgetSub}>Allowance utilization: {widgetData.utilization}%</Text>
                </View>
                <View style={styles.mediumBadge}>
                  <Text style={styles.mediumBadgeText}>{widgetData.delta} vs prior</Text>
                </View>
              </View>
              <View style={styles.sparkBarRow}>
                {widgetData.bars.map((h, i) => (
                  <View key={widgetData.labels[i]} style={styles.sparkBarCol}>
                    <View style={styles.sparkBarTrack}>
                      <View
                        style={[
                          styles.sparkBarFill,
                          {
                            height: `${h}%`,
                            backgroundColor: i === widgetData.bars.length - 1 ? '#4F46E5' : '#A5B4FC',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.sparkBarLabel}>{widgetData.labels[i]}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* LARGE WIDGET (Comprehensive Breakdown Card) */}
          {(widgetSize === 'all' || widgetSize === 'large') && (
            <View style={styles.largeWidgetCard}>
              <View style={styles.largeWidgetTop}>
                <View>
                  <Text style={styles.largeWidgetKicker}>COMPENSATION BREAKDOWN</Text>
                  <Text style={styles.largeWidgetAmount}>{widgetData.netPay}</Text>
                </View>
                <View style={styles.largePill}>
                  <Text style={styles.largePillText}>ON SCHEDULE</Text>
                </View>
              </View>
              <View style={styles.segmentedBar}>
                <View style={[styles.segPart, { flex: 55, backgroundColor: '#4F46E5' }]} />
                <View style={[styles.segPart, { flex: 25, backgroundColor: '#10B981' }]} />
                <View style={[styles.segPart, { flex: 12, backgroundColor: '#F59E0B' }]} />
                <View style={[styles.segPart, { flex: 8, backgroundColor: '#EF4444' }]} />
              </View>
              <View style={styles.legendGrid}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4F46E5' }]} />
                  <Text style={styles.legendText}>Basic (55%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Allowances (25%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Reimbursements (12%)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Tax & PF (8%)</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Visual Corporate Card */}
        <View style={styles.cardWidget}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardType}>MASTERHRMS CORPORATE</Text>
            <CreditCard size={22} color="#FFFFFF" strokeWidth={2} />
          </View>

          {/* Chip */}
          <View style={styles.cardChip}>
            <View style={styles.chipInner} />
          </View>

          <Text style={styles.cardNumber}>••••  ••••  ••••  4289</Text>

          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardHolder}>{employeeName.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardExpiry}>12/28</Text>
            </View>
          </View>
        </View>

        {/* Bank Account Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Salary Account Details</Text>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bank Name</Text>
            <Text style={styles.infoValue}>HDFC Bank Limited</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Number</Text>
            <Text style={styles.infoValue}>•••• •••• 5678</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IFSC Code</Text>
            <Text style={styles.infoValue}>HDFC0001234</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Type</Text>
            <Text style={styles.infoValue}>Corporate Salary Savings</Text>
          </View>
        </View>

        {/* Statutory Identifiers */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Statutory & Tax IDs</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Permanent Account (PAN)</Text>
            <Text style={styles.infoValueMasked}>ABCDE****F</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provident Fund (UAN)</Text>
            <Text style={styles.infoValueMasked}>100987654321</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ESI Insurance ID</Text>
            <Text style={styles.infoValueMasked}>31001234560001</Text>
          </View>
        </View>

        {/* Recent Salary Disbursed */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Disbursements</Text>

          <View style={styles.payoutItem}>
            <View style={styles.payoutIconBox}>
              <DollarSign size={18} color="#059669" strokeWidth={2.4} />
            </View>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutMonth}>October 2026 Salary</Text>
              <Text style={styles.payoutDate}>Disbursed Oct 31, 2026</Text>
            </View>
            <View style={styles.payoutAmountBox}>
              <Text style={styles.payoutAmount}>₹85,000</Text>
              <Text style={styles.payoutStatus}>PAID</Text>
            </View>
          </View>

          <View style={styles.payoutItem}>
            <View style={styles.payoutIconBox}>
              <DollarSign size={18} color="#059669" strokeWidth={2.4} />
            </View>
            <View style={styles.payoutInfo}>
              <Text style={styles.payoutMonth}>September 2026 Salary</Text>
              <Text style={styles.payoutDate}>Disbursed Sep 30, 2026</Text>
            </View>
            <View style={styles.payoutAmountBox}>
              <Text style={styles.payoutAmount}>₹85,000</Text>
              <Text style={styles.payoutStatus}>PAID</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="PaymentCards" />
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
  payslipsBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payslipsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardWidget: {
    backgroundColor: '#312E81',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardLogo: {
    fontSize: 24,
  },
  cardChip: {
    width: 44,
    height: 32,
    backgroundColor: '#FBBF24',
    borderRadius: 6,
    marginVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 34,
    height: 22,
    borderWidth: 1,
    borderColor: '#B45309',
    borderRadius: 3,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardHolder: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cardExpiry: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  infoValueMasked: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
    fontFamily: 'monospace',
  },
  payoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  payoutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payoutIcon: {
    fontSize: 20,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutMonth: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  payoutDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  payoutAmountBox: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
  },
  payoutStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  widgetSuiteSection: {
    marginBottom: 20,
    gap: 12,
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetSuiteTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  widgetSuiteSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  islandTriggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#020617',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  islandTriggerText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  widgetFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sizeSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  sizeChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sizeChipActive: {
    backgroundColor: '#FFFFFF',
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sizeChipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  periodWrap: {
    flexDirection: 'row',
    gap: 4,
  },
  periodChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  periodChipTextActive: {
    color: '#FFFFFF',
  },
  smallWidgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  smallWidgetCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  smallWidgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallWidgetDeltaPos: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  smallWidgetTagBlue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallWidgetTagAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallWidgetTagPurple: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6D28D9',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallWidgetValueDark: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  smallWidgetLabelDark: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  smallWidgetValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  smallWidgetLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  mediumWidgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  mediumWidgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediumWidgetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  mediumWidgetSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  mediumBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mediumBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  sparkBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 82,
    gap: 8,
  },
  sparkBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  sparkBarTrack: {
    width: '100%',
    height: 62,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sparkBarFill: {
    width: '100%',
    borderRadius: 8,
  },
  sparkBarLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  largeWidgetCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  largeWidgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  largeWidgetKicker: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  largeWidgetAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  largePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  largePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    gap: 2,
  },
  segPart: {
    height: '100%',
    borderRadius: 3,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '46%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },
});

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gift,
  Building2,
  MinusCircle,
  Info,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProps } from '../../../types/navigation.types';
import { PayrollService, PayslipDetail, PayslipItem } from '../../../core/services/payrollService';

interface LineItem {
  title: string;
  subtitle?: string;
  amount: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SalarySlipDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps<'SalarySlipDetail'>>();

  const routeParams = (route.params as any) || {};
  const initialMonth = routeParams.month || MONTHS[new Date().getMonth()];
  const initialYear = Number(routeParams.year) || new Date().getFullYear();

  const [currentMonth, setCurrentMonth] = useState<string>(initialMonth);
  const [currentYear, setCurrentYear] = useState<number>(initialYear);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [payslip, setPayslip] = useState<PayslipDetail | null>(null);

  // Breakdown Sheet Modal
  const [breakdownModalType, setBreakdownModalType] = useState<
    'basic' | 'allowances' | 'tax' | 'other' | null
  >(null);

  const fetchPayslipData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. If explicit ID provided in route params, fetch detail directly
      const paramId = routeParams.id || routeParams.payslipId;
      if (paramId) {
        const detail = await PayrollService.getPayslipDetail(paramId);
        if (detail) {
          setPayslip(detail);
          if (detail.periodMonth && detail.periodMonth >= 1 && detail.periodMonth <= 12) {
            setCurrentMonth(MONTHS[detail.periodMonth - 1]);
          }
          if (detail.periodYear) {
            setCurrentYear(detail.periodYear);
          }
          return;
        }
      }

      // 2. Otherwise search employee payslips for selected month & year
      const monthNumber = MONTHS.indexOf(currentMonth) + 1;
      const allPayslips = await PayrollService.getMyPayslips();

      const matched = allPayslips.find((p: PayslipItem) => {
        const pMonth = p.periodMonth || p.month;
        const pYear = p.periodYear || p.year;
        return pMonth === monthNumber && pYear === currentYear;
      });

      if (matched && matched.id) {
        const fullDetail = await PayrollService.getPayslipDetail(matched.id);
        setPayslip(fullDetail || (matched as any));
      } else {
        setPayslip(null);
      }
    } catch (err: any) {
      console.warn('[SalarySlipDetail] Failed to fetch payslip:', err?.message);
      setPayslip(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear, routeParams.id, routeParams.payslipId]);

  useEffect(() => {
    fetchPayslipData();
  }, [fetchPayslipData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayslipData();
  };

  const handlePrevMonth = () => {
    const idx = MONTHS.indexOf(currentMonth);
    if (idx > 0) {
      setCurrentMonth(MONTHS[idx - 1]);
    } else {
      setCurrentMonth(MONTHS[11]);
      setCurrentYear((y) => y - 1);
    }
  };

  const handleNextMonth = () => {
    const idx = MONTHS.indexOf(currentMonth);
    if (idx < 11) {
      setCurrentMonth(MONTHS[idx + 1]);
    } else {
      setCurrentMonth(MONTHS[0]);
      setCurrentYear((y) => y + 1);
    }
  };

  // Extract real numbers from payslip
  const grossAmount = Number(payslip?.grossSalary || 0);
  const netAmount = Number(payslip?.netSalary || 0);
  const totalDeductions = Number(payslip?.totalDeductions || payslip?.deductions || 0);

  // Compute breakdown line items from server response breakdown
  const { basicItems, allowanceItems, taxItems, otherItems, basicSalary, allowances, taxInsurance, otherDeductions } = useMemo(() => {
    const bItems: LineItem[] = [];
    const aItems: LineItem[] = [];
    const tItems: LineItem[] = [];
    const oItems: LineItem[] = [];

    const breakdown = payslip?.breakdown;
    if (breakdown && typeof breakdown === 'object') {
      // Process earnings
      if (breakdown.earnings) {
        if (Array.isArray(breakdown.earnings)) {
          breakdown.earnings.forEach((e: any) => {
            const name = e.name || e.component || 'Earning';
            const amt = Number(e.amount || 0);
            if (name.toLowerCase().includes('basic')) {
              bItems.push({ title: name, subtitle: 'Monthly fixed pay', amount: amt });
            } else {
              aItems.push({ title: name, subtitle: e.type || 'Allowance', amount: amt });
            }
          });
        } else if (typeof breakdown.earnings === 'object') {
          Object.entries(breakdown.earnings).forEach(([key, val]) => {
            const amt = Number(val || 0);
            const title = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (str) => str.toUpperCase())
              .trim();
            if (key.toLowerCase().includes('basic')) {
              bItems.push({ title, subtitle: 'Monthly fixed pay', amount: amt });
            } else {
              aItems.push({ title, subtitle: 'Tax exempted / taxable allowance', amount: amt });
            }
          });
        }
      }

      // Process deductions
      if (breakdown.deductions) {
        if (Array.isArray(breakdown.deductions)) {
          breakdown.deductions.forEach((d: any) => {
            const name = d.name || d.component || 'Deduction';
            const amt = Number(d.amount || 0);
            const lower = name.toLowerCase();
            if (lower.includes('tax') || lower.includes('pf') || lower.includes('provident') || lower.includes('esi') || lower.includes('tds')) {
              tItems.push({ title: name, subtitle: 'Statutory deduction', amount: amt });
            } else {
              oItems.push({ title: name, subtitle: d.type || 'Other deduction', amount: amt });
            }
          });
        } else if (typeof breakdown.deductions === 'object') {
          Object.entries(breakdown.deductions).forEach(([key, val]) => {
            const amt = Number(val || 0);
            const title = key
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (str) => str.toUpperCase())
              .trim();
            const lower = key.toLowerCase();
            if (lower.includes('tax') || lower.includes('pf') || lower.includes('esi') || lower.includes('tds') || lower.includes('epf')) {
              tItems.push({ title, subtitle: 'Statutory deduction', amount: amt });
            } else {
              oItems.push({ title, subtitle: 'Other deduction', amount: amt });
            }
          });
        }
      }
    }

    // Calculate aggregated sums
    const bSum = bItems.reduce((acc, i) => acc + i.amount, 0);
    const aSum = aItems.reduce((acc, i) => acc + i.amount, 0);
    const tSum = tItems.reduce((acc, i) => acc + i.amount, 0);
    const oSum = oItems.reduce((acc, i) => acc + i.amount, 0);

    return {
      basicItems: bItems,
      allowanceItems: aItems,
      taxItems: tItems,
      otherItems: oItems,
      basicSalary: bSum > 0 ? bSum : grossAmount,
      allowances: aSum,
      taxInsurance: tSum > 0 ? tSum : totalDeductions,
      otherDeductions: oSum,
    };
  }, [payslip, grossAmount, totalDeductions]);

  const activeModalItems = useMemo(() => {
    switch (breakdownModalType) {
      case 'basic':
        return { title: 'Basic Salary & Overtime', items: basicItems, total: basicSalary };
      case 'allowances':
        return { title: 'Allowances Breakdown', items: allowanceItems, total: allowances };
      case 'tax':
        return { title: 'Tax & Statutory Insurance', items: taxItems, total: taxInsurance };
      case 'other':
        return { title: 'Other Deductions', items: otherItems, total: otherDeductions };
      default:
        return null;
    }
  }, [breakdownModalType, basicItems, allowanceItems, taxItems, otherItems, basicSalary, allowances, taxInsurance, otherDeductions]);

  return (
    <View style={styles.container}>
      {/* Header with Back and Month Navigation (< February 2026 >) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.arrowBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={styles.arrowBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerMonthTitle}>{currentMonth} {currentYear}</Text>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={styles.arrowBtn}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <ChevronRight size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Fetching verified payslip details...</Text>
          </View>
        ) : !payslip ? (
          <View style={styles.emptyPayslipCard}>
            <AlertCircle size={44} color="#94A3B8" strokeWidth={1.6} />
            <Text style={styles.emptyPayslipTitle}>No Payslip Available</Text>
            <Text style={styles.emptyPayslipSubtitle}>
              No verified payroll statement has been published for {currentMonth} {currentYear}. Payslips become available after the monthly payroll cycle is finalized by HR.
            </Text>
          </View>
        ) : (
          <>
            {/* Top Net Salary Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.netSalaryLabel}>Net Salary</Text>
              <Text style={styles.netSalaryAmount}>
                ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>

              <View style={styles.splitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.splitLabel}>Gross Salary</Text>
                  <Text style={styles.splitGrossVal}>
                    ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={styles.splitLabel}>Total Deductions</Text>
                  <Text style={styles.splitDeductVal}>
                    -₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* EARNINGS Section */}
            <Text style={styles.sectionHeaderLabel}>EARNINGS</Text>
            <View style={styles.sectionBox}>
              {/* Basic Salary */}
              <TouchableOpacity
                style={styles.sectionRowItem}
                onPress={() => setBreakdownModalType('basic')}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionRowIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <FileText size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowItemTitle}>Basic Salary</Text>
                  <Text style={styles.rowItemSub}>Monthly fixed pay</Text>
                </View>
                <Text style={styles.rowItemAmount}>
                  ₹{basicSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              {/* Allowances */}
              <TouchableOpacity
                style={styles.sectionRowItem}
                onPress={() => setBreakdownModalType('allowances')}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionRowIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Gift size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowItemTitle}>Allowances</Text>
                  <Text style={styles.rowItemSub}>Transport, Meal, HRA, etc.</Text>
                </View>
                <Text style={styles.rowItemAmount}>
                  ₹{allowances.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* DEDUCTIONS Section */}
            <Text style={styles.sectionHeaderLabel}>DEDUCTIONS</Text>
            <View style={styles.sectionBox}>
              {/* Tax & Insurance */}
              <TouchableOpacity
                style={styles.sectionRowItem}
                onPress={() => setBreakdownModalType('tax')}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionRowIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Building2 size={20} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowItemTitle}>Tax & Statutory</Text>
                  <Text style={styles.rowItemSub}>PF, ESI, Professional Tax, TDS</Text>
                </View>
                <Text style={[styles.rowItemAmount, { color: '#EF4444' }]}>
                  -₹{taxInsurance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              {/* Other Deductions */}
              <TouchableOpacity
                style={styles.sectionRowItem}
                onPress={() => setBreakdownModalType('other')}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionRowIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <MinusCircle size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.rowItemTitle}>Other Deductions</Text>
                  <Text style={styles.rowItemSub}>Unpaid leave (LOP), Loan recovery</Text>
                </View>
                <Text style={[styles.rowItemAmount, { color: '#EF4444' }]}>
                  -₹{otherDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            {/* Bank Deposit Info Card */}
            <View style={styles.bankInfoCard}>
              <Info size={18} color="#2563EB" style={{ marginRight: 10, marginTop: 2 }} />
              <Text style={styles.bankInfoText}>
                Salary disbursement processed via Direct Bank Transfer according to payroll cycle schedule.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Line Item Breakdown Bottom Sheet Modal */}
      <Modal
        visible={Boolean(breakdownModalType)}
        animationType="slide"
        transparent
        onRequestClose={() => setBreakdownModalType(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBreakdownModalType(null)}
        >
          <View style={styles.breakdownSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandleBar} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>{activeModalItems?.title || 'Breakdown'}</Text>
              <TouchableOpacity onPress={() => setBreakdownModalType(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeModalItems?.items && activeModalItems.items.length > 0 ? (
                activeModalItems.items.map((item, idx) => (
                  <View key={idx} style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#F1F5F9' }]}>
                      {breakdownModalType === 'basic' ? (
                        <FileText size={18} color="#2563EB" />
                      ) : breakdownModalType === 'allowances' ? (
                        <Gift size={18} color="#D97706" />
                      ) : breakdownModalType === 'tax' ? (
                        <Building2 size={18} color="#4F46E5" />
                      ) : (
                        <MinusCircle size={18} color="#EF4444" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>{item.title}</Text>
                      {item.subtitle ? <Text style={styles.sheetItemSub}>{item.subtitle}</Text> : null}
                    </View>
                    <Text
                      style={[
                        styles.sheetItemVal,
                        (breakdownModalType === 'tax' || breakdownModalType === 'other') && { color: '#EF4444' },
                      ]}
                    >
                      {breakdownModalType === 'tax' || breakdownModalType === 'other' ? '-' : ''}₹
                      {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ color: '#64748B', fontSize: 14 }}>
                    No specific sub-items registered in this category. Total: ₹
                    {(activeModalItems?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              <View style={styles.sheetTotalRow}>
                <Text style={styles.sheetTotalLabel}>Total {breakdownModalType?.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.sheetTotalVal,
                    (breakdownModalType === 'tax' || breakdownModalType === 'other') && { color: '#EF4444' },
                  ]}
                >
                  {breakdownModalType === 'tax' || breakdownModalType === 'other' ? '-' : ''}₹
                  {(activeModalItems?.total || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 12,
  },
  centerContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyPayslipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyPayslipTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 14,
  },
  emptyPayslipSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  netSalaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  netSalaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  splitRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  splitLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  splitGrossVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  splitDeductVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  sectionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  sectionRowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rowItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  bankInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  bankInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  breakdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sheetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sheetItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetItemVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    paddingBottom: 16,
  },
  sheetTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
});

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
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
  Clock,
  Award,
  Car,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProps } from '../../../types/navigation.types';

export const SalarySlipDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps<'SalarySlipDetail'>>();

  const { month = 'February', year = 2026 } = route.params || {};

  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear] = useState(year);

  // Breakdown Sheet Modal (Matches 67, 68, 69, 70)
  const [breakdownModalType, setBreakdownModalType] = useState<
    'basic' | 'allowances' | 'tax' | 'other' | null
  >(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    const idx = months.indexOf(currentMonth);
    if (idx > 0) setCurrentMonth(months[idx - 1]);
    else setCurrentMonth(months[11]);
  };

  const handleNextMonth = () => {
    const idx = months.indexOf(currentMonth);
    if (idx < 11) setCurrentMonth(months[idx + 1]);
    else setCurrentMonth(months[0]);
  };

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Net Salary Summary Card (Matches 66. Payslip - Detail.png) */}
        <View style={styles.summaryCard}>
          <Text style={styles.netSalaryLabel}>Net Salary</Text>
          <Text style={styles.netSalaryAmount}>$4,250.00</Text>

          <View style={styles.splitRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.splitLabel}>Gross Salary</Text>
              <Text style={styles.splitGrossVal}>$4,250.00</Text>
            </View>

            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={styles.splitLabel}>Total Deductions</Text>
              <Text style={styles.splitDeductVal}>-$1,550.00</Text>
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
            <Text style={styles.rowItemAmount}>$3,500.00</Text>
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
              <Text style={styles.rowItemSub}>Transport, Meal, etc.</Text>
            </View>
            <Text style={styles.rowItemAmount}>$2,300.00</Text>
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
              <Text style={styles.rowItemTitle}>Tax & Insurance</Text>
              <Text style={styles.rowItemSub}>Income tax, social security</Text>
            </View>
            <Text style={[styles.rowItemAmount, { color: '#EF4444' }]}>-$1,250.00</Text>
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
              <Text style={styles.rowItemSub}>Unpaid leave, loan repayment</Text>
            </View>
            <Text style={[styles.rowItemAmount, { color: '#EF4444' }]}>-$300.00</Text>
            <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Bank Deposit Info Card */}
        <View style={styles.bankInfoCard}>
          <Info size={18} color="#2563EB" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={styles.bankInfoText}>
            Your salary was transferred to your Bank of America account ending in ****4582 on {currentMonth} 28, {currentYear}.
          </Text>
        </View>
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Line Item Breakdown Bottom Sheet Modal (Matches 67, 68, 69, 70)   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={Boolean(breakdownModalType)} animationType="slide" transparent onRequestClose={() => setBreakdownModalType(null)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBreakdownModalType(null)}
        >
          <View style={styles.breakdownSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandleBar} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>
                {breakdownModalType === 'basic'
                  ? 'Basic Salary'
                  : breakdownModalType === 'allowances'
                  ? 'Allowances'
                  : breakdownModalType === 'tax'
                  ? 'Tax & Insurance'
                  : 'Other Deductions'}
              </Text>
              <TouchableOpacity onPress={() => setBreakdownModalType(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {breakdownModalType === 'basic' ? (
                /* 67. Payslip - Basic Salary.png */
                <>
                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <FileText size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Basic Salary</Text>
                      <Text style={styles.sheetItemSub}>Monthly fixed rate</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$3,500.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Clock size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Overtime</Text>
                      <Text style={styles.sheetItemSub}>Monthly fixed rate</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$450.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Award size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Position Allowance</Text>
                      <Text style={styles.sheetItemSub}>Monthly fixed rate</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$500.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <Car size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Transport</Text>
                      <Text style={styles.sheetItemSub}>Fixed allowance</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$150.00</Text>
                  </View>

                  <View style={styles.sheetTotalRow}>
                    <Text style={styles.sheetTotalLabel}>Total Gross Salary</Text>
                    <Text style={styles.sheetTotalVal}>$4,600.00</Text>
                  </View>
                </>
              ) : breakdownModalType === 'allowances' ? (
                /* 68. Payslip - Allowances.png */
                <>
                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Gift size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Housing Allowance (HRA)</Text>
                      <Text style={styles.sheetItemSub}>Monthly tax exempted</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$1,200.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Car size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Travel & Conveyance</Text>
                      <Text style={styles.sheetItemSub}>Company commuter pass</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$600.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#FEF3C7' }]}>
                      <Award size={18} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Medical & Wellness</Text>
                      <Text style={styles.sheetItemSub}>Monthly health reimbursement</Text>
                    </View>
                    <Text style={styles.sheetItemVal}>$500.00</Text>
                  </View>

                  <View style={styles.sheetTotalRow}>
                    <Text style={styles.sheetTotalLabel}>Total Allowances</Text>
                    <Text style={styles.sheetTotalVal}>$2,300.00</Text>
                  </View>
                </>
              ) : breakdownModalType === 'tax' ? (
                /* 69. Payslip - Tax & Insurance.png */
                <>
                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Building2 size={18} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Provident Fund (PF)</Text>
                      <Text style={styles.sheetItemSub}>Statutory retirement</Text>
                    </View>
                    <Text style={[styles.sheetItemVal, { color: '#EF4444' }]}>-$600.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Building2 size={18} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Federal & State Tax (TDS)</Text>
                      <Text style={styles.sheetItemSub}>Withholding tax</Text>
                    </View>
                    <Text style={[styles.sheetItemVal, { color: '#EF4444' }]}>-$450.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#EEF2FF' }]}>
                      <Building2 size={18} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Health Insurance (ESIC)</Text>
                      <Text style={styles.sheetItemSub}>Employee premium</Text>
                    </View>
                    <Text style={[styles.sheetItemVal, { color: '#EF4444' }]}>-$200.00</Text>
                  </View>

                  <View style={styles.sheetTotalRow}>
                    <Text style={styles.sheetTotalLabel}>Total Tax & Insurance</Text>
                    <Text style={[styles.sheetTotalVal, { color: '#EF4444' }]}>-$1,250.00</Text>
                  </View>
                </>
              ) : (
                /* 70. Payslip - Other Deductions.png */
                <>
                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <MinusCircle size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Salary Advance EMI</Text>
                      <Text style={styles.sheetItemSub}>Loan repayment #3 of 6</Text>
                    </View>
                    <Text style={[styles.sheetItemVal, { color: '#EF4444' }]}>-$200.00</Text>
                  </View>

                  <View style={styles.sheetRow}>
                    <View style={[styles.sheetIconCircle, { backgroundColor: '#FEE2E2' }]}>
                      <MinusCircle size={18} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetItemTitle}>Unpaid Leave (LOP)</Text>
                      <Text style={styles.sheetItemSub}>1 day loss of pay</Text>
                    </View>
                    <Text style={[styles.sheetItemVal, { color: '#EF4444' }]}>-$100.00</Text>
                  </View>

                  <View style={styles.sheetTotalRow}>
                    <Text style={styles.sheetTotalLabel}>Total Other Deductions</Text>
                    <Text style={[styles.sheetTotalVal, { color: '#EF4444' }]}>-$300.00</Text>
                  </View>
                </>
              )}
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
  arrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMonthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Summary Card (Matches 66. Payslip - Detail.png) */
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  netSalaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  netSalaryAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  splitLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  splitGrossVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  splitDeductVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 2,
  },

  /* Section Box */
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  sectionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionRowIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rowItemTitle: {
    fontSize: 15,
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
    marginHorizontal: 16,
  },

  /* Bank Info Card */
  bankInfoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bankInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1D4ED8',
    lineHeight: 18,
  },

  /* Breakdown Sheet (Matches 67, 68, 69, 70) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  breakdownSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '75%',
  },
  sheetHandleBar: {
    width: 40,
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
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    width: 38,
    height: 38,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  sheetTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetTotalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
});

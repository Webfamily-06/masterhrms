import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const SalaryAdvanceLoanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'SalaryAdvanceLoan'>>();
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [tenureMonths, setTenureMonths] = useState<number>(6);

  const monthlyEmi = Math.round(selectedAmount / tenureMonths);

  const handleApply = () => {
    Alert.alert(
      'Confirm Loan Application',
      `Submit advance request for ₹${selectedAmount.toLocaleString()} over ${tenureMonths} months (EMI: ₹${monthlyEmi.toLocaleString()}/mo)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Application Submitted', 'Your salary advance request has been routed to HR for verification.');
          },
        },
      ]
    );
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
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary Advance & Loans</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Limit Eligibility Card */}
        <View style={styles.limitCard}>
          <Text style={styles.limitSubtitle}>APPROVED ELIGIBILITY LIMIT</Text>
          <Text style={styles.limitAmount}>₹1,50,000</Text>
          <Text style={styles.limitDesc}>Based on 3x Monthly Net Take-Home Salary</Text>

          <View style={styles.benefitRow}>
            <View style={styles.benefitBadge}>
              <Text style={styles.benefitText}>0% Interest</Text>
            </View>
            <View style={styles.benefitBadge}>
              <Text style={styles.benefitText}>Direct Payroll EMI</Text>
            </View>
            <View style={styles.benefitBadge}>
              <Text style={styles.benefitText}>Zero Collateral</Text>
            </View>
          </View>
        </View>

        {/* Loan Calculator */}
        <View style={styles.calcCard}>
          <Text style={styles.cardTitle}>Calculate Advance</Text>

          <Text style={styles.label}>Select Amount</Text>
          <View style={styles.amountsRow}>
            {[25000, 50000, 75000, 100000].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amtPill,
                  selectedAmount === amt && styles.amtPillActive,
                ]}
                onPress={() => setSelectedAmount(amt)}
              >
                <Text
                  style={[
                    styles.amtPillText,
                    selectedAmount === amt && styles.amtPillTextActive,
                  ]}
                >
                  ₹{(amt / 1000)}k
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Repayment Tenure</Text>
          <View style={styles.tenureRow}>
            {[3, 6, 9, 12].map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.tenurePill,
                  tenureMonths === m && styles.tenurePillActive,
                ]}
                onPress={() => setTenureMonths(m)}
              >
                <Text
                  style={[
                    styles.tenurePillText,
                    tenureMonths === m && styles.tenurePillTextActive,
                  ]}
                >
                  {m} Months
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Deduction</Text>
              <Text style={styles.summaryValHighlight}>₹{monthlyEmi.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Repayable</Text>
              <Text style={styles.summaryVal}>₹{selectedAmount.toLocaleString()}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply for Salary Advance</Text>
          </TouchableOpacity>
        </View>

        {/* Existing Active Loans */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>Active Loan Account</Text>

          <View style={styles.loanItem}>
            <View style={styles.loanIconBox}>
              <Text style={styles.loanIcon}>🏦</Text>
            </View>
            <View style={styles.loanInfo}>
              <Text style={styles.loanTitle}>Emergency Festival Advance</Text>
              <Text style={styles.loanSub}>Deduction: ₹5,000/mo • 2 of 5 paid</Text>
            </View>
            <View style={styles.loanRight}>
              <Text style={styles.loanBalance}>₹15,000</Text>
              <Text style={styles.loanStatus}>ACTIVE</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  limitCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  limitSubtitle: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  limitAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 6,
  },
  limitDesc: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  benefitBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  benefitText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '600',
  },
  calcCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    marginTop: 6,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amtPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
  },
  amtPillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  amtPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  amtPillTextActive: {
    color: '#FFFFFF',
  },
  tenureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tenurePill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
  },
  tenurePillActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  tenurePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tenurePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#CBD5E1',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryValHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  applyBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loanItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loanIcon: {
    fontSize: 22,
  },
  loanInfo: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  loanSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  loanRight: {
    alignItems: 'flex-end',
  },
  loanBalance: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  loanStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
});

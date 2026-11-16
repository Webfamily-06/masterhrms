import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProps } from '../../../types/navigation.types';
import { useAuthStore } from '../../../store/authStore';

export const SalarySlipDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps<'SalarySlipDetail'>>();
  const user = useAuthStore((s) => s.user);

  const { month = 'October', year = 2026, gross = 65000, net = 54200 } = route.params || {};

  const basicPay = Math.round(gross * 0.5);
  const hra = Math.round(gross * 0.25);
  const conveyance = 2500;
  const specialAllowance = gross - basicPay - hra - conveyance;

  const pfDeduction = Math.round(basicPay * 0.12);
  const profTax = 200;
  const tds = Math.max(0, gross - net - pfDeduction - profTax);
  const totalDeductions = gross - net;

  const handleDownload = () => {
    Alert.alert(
      'Download Payslip',
      `Payslip_${month}_${year}.pdf has been saved to your device Downloads folder.`,
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `MasterHRMS Payslip Summary for ${month} ${year}: Net Pay ₹${net.toLocaleString()}, Gross ₹${gross.toLocaleString()}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{month} {year} Payslip</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>↗️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Net Pay Card */}
        <View style={styles.netPayCard}>
          <Text style={styles.netPayLabel}>NET TAKE-HOME PAY</Text>
          <Text style={styles.netPayAmount}>₹{net.toLocaleString()}</Text>
          <View style={styles.payStatusBadge}>
            <Text style={styles.payStatusText}>✓ Credited to Bank Account</Text>
          </View>
        </View>

        {/* Employee Info Strip */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employee Name</Text>
            <Text style={styles.infoVal}>{user?.profile?.fullName || 'Employee'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pay Period</Text>
            <Text style={styles.infoVal}>01 {month} - 31 {month} {year}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Mode</Text>
            <Text style={styles.infoVal}>Direct Bank Deposit</Text>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionHeader}>Earnings Breakdown</Text>
        <View style={styles.breakdownCard}>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Basic Salary</Text>
            <Text style={styles.itemAmount}>₹{basicPay.toLocaleString()}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>House Rent Allowance (HRA)</Text>
            <Text style={styles.itemAmount}>₹{hra.toLocaleString()}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Conveyance Allowance</Text>
            <Text style={styles.itemAmount}>₹{conveyance.toLocaleString()}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Special Allowance</Text>
            <Text style={styles.itemAmount}>₹{specialAllowance.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalTitle}>Total Gross Earnings</Text>
            <Text style={styles.totalGreen}>₹{gross.toLocaleString()}</Text>
          </View>
        </View>

        {/* Deductions Breakdown */}
        <Text style={styles.sectionHeader}>Deductions Breakdown</Text>
        <View style={styles.breakdownCard}>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Provident Fund (EPF)</Text>
            <Text style={styles.itemAmountDeduct}>-₹{pfDeduction.toLocaleString()}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Professional Tax (PT)</Text>
            <Text style={styles.itemAmountDeduct}>-₹{profTax.toLocaleString()}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={styles.itemTitle}>Tax Deducted at Source (TDS)</Text>
            <Text style={styles.itemAmountDeduct}>-₹{tds.toLocaleString()}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalTitle}>Total Deductions</Text>
            <Text style={styles.totalRed}>-₹{totalDeductions.toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.85}>
          <Text style={styles.downloadBtnText}>📄 Download Official PDF</Text>
        </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  netPayCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  netPayLabel: {
    fontSize: 12,
    color: '#A5B4FC',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 6,
  },
  netPayAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  payStatusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  payStatusText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemTitle: {
    fontSize: 14,
    color: '#475569',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemAmountDeduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  totalRed: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
  downloadBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

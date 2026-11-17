import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft, CreditCard, DollarSign } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { useAuthStore } from '../../../store/authStore';

export const PaymentCardsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'PaymentCards'>>();
  const user = useAuthStore((state) => state.user);
  const employeeName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Employee';

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
});

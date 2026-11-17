import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  ChevronDown,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const SalaryAdvanceLoanScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'SalaryAdvanceLoan'>>();

  const [loanAmount, setLoanAmount] = useState('50,000');
  const [loanType, setLoanType] = useState('Personal / Medical Emergency');
  const [loanTypeDropdownOpen, setLoanTypeDropdownOpen] = useState(false);

  const [paymentPeriod, setPaymentPeriod] = useState('6 Months');
  const [paymentPeriodDropdownOpen, setPaymentPeriodDropdownOpen] = useState(false);

  const [reason, setReason] = useState('');

  const loanTypeOptions = [
    'Personal / Medical Emergency',
    'Salary Advance',
    'Education Assistance',
    'Home Relocation Advance',
  ];

  const paymentPeriodOptions = [
    '3 Months',
    '6 Months',
    '9 Months',
    '12 Months',
  ];

  const handleSubmit = () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please briefly explain why you need the loan.');
      return;
    }

    Alert.alert(
      'Application Submitted',
      `Your loan application for ₹${loanAmount} (${paymentPeriod}) has been routed to HR for verification.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backCircleBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Application</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Form Card (Matches 37_Loan Application.png) */}
        <View style={styles.mainCard}>
          {/* Loan Amount Input */}
          <TextInput
            style={styles.textInputBox}
            value={loanAmount}
            onChangeText={setLoanAmount}
            placeholder="Loan amount"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          {/* Loan Type Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setLoanTypeDropdownOpen(!loanTypeDropdownOpen);
              setPaymentPeriodDropdownOpen(false);
            }}
          >
            <Text style={styles.dropdownText}>{loanType}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>

          {loanTypeDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {loanTypeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setLoanType(opt);
                    setLoanTypeDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuItemText, opt === loanType && { color: '#2563EB', fontWeight: '700' }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Payment Period Dropdown */}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setPaymentPeriodDropdownOpen(!paymentPeriodDropdownOpen);
              setLoanTypeDropdownOpen(false);
            }}
          >
            <Text style={styles.dropdownText}>{paymentPeriod}</Text>
            <ChevronDown size={18} color="#64748B" />
          </TouchableOpacity>

          {paymentPeriodDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {paymentPeriodOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownMenuItem}
                  onPress={() => {
                    setPaymentPeriod(opt);
                    setPaymentPeriodDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownMenuItemText, opt === paymentPeriod && { color: '#2563EB', fontWeight: '700' }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Reason Textarea */}
          <TextInput
            style={styles.textAreaBox}
            value={reason}
            onChangeText={setReason}
            placeholder="Briefly explain why do you need the loan"
            placeholderTextColor="#94A3B8"
            multiline
          />
        </View>

        {/* Bottom Double Actions: Cancel | Submit */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.whiteBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.whiteBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blueBtn}
            onPress={handleSubmit}
          >
            <Text style={styles.blueBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Bottom Nav */}
      <AppBottomNav activeRoute="EmployeeHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2FE', // Sky blue backdrop
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
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Main Card (Matches 37_Loan Application.png) */
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  textInputBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  dropdownText: {
    fontSize: 14,
    color: '#0F172A',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownMenuItemText: {
    fontSize: 13,
    color: '#475569',
  },
  textAreaBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 120,
    textAlignVertical: 'top',
  },

  /* Bottom Buttons */
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
  },
  whiteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  blueBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

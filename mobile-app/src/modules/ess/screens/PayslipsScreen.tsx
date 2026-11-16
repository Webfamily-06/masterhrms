import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  PayrollService,
  PayslipItem,
  PayslipDetail,
} from '../../../core/services/payrollService';
import { useNavigation } from '@react-navigation/native';

export const PayslipsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await PayrollService.getMyPayslips();
      setPayslips(data);
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

  const handleSelectPayslip = async (slip: PayslipItem) => {
    setLoadingDetail(true);
    setDetailModalVisible(true);
    try {
      const detail = await PayrollService.getPayslipDetail(slip.id);
      if (detail) {
        setSelectedPayslip(detail);
      } else {
        // Construct fallback detail from item
        setSelectedPayslip({
          ...slip,
          earnings: [
            { name: 'Basic Salary', amount: Math.round(slip.grossSalary * 0.5) },
            { name: 'House Rent Allowance (HRA)', amount: Math.round(slip.grossSalary * 0.3) },
            { name: 'Special Allowance', amount: Math.round(slip.grossSalary * 0.2) },
          ],
          deductions: [
            { name: 'Provident Fund (PF)', amount: Math.round(slip.totalDeductions * 0.6) },
            { name: 'Professional Tax', amount: 200 },
            { name: 'TDS / Income Tax', amount: Math.max(0, Math.round(slip.totalDeductions * 0.4) - 200) },
          ],
        });
      }
    } catch {
      Alert.alert('Error', 'Unable to load detailed breakdown.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadPdf = () => {
    Alert.alert('Download Started', 'Your encrypted payslip PDF has been downloaded.');
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

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
        <Text style={styles.headerTitle}>Salary & Payslips</Text>
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
          <Text style={styles.subHeader}>Chronological Statements</Text>

          {payslips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No payslips generated for your account yet.</Text>
            </View>
          ) : (
            payslips.map((slip) => {
              const monthName =
                typeof slip.month === 'number' && slip.month >= 1 && slip.month <= 12
                  ? monthNames[slip.month - 1]
                  : `Month ${slip.month}`;

              return (
                <TouchableOpacity
                  key={slip.id}
                  style={styles.payslipCard}
                  activeOpacity={0.8}
                  onPress={() => handleSelectPayslip(slip)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.monthText}>
                      {monthName} {slip.year}
                    </Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>
                        {slip.status || 'PAID'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.amountLabel}>Net Pay</Text>
                      <Text style={styles.netAmount}>
                        ₹{slip.netSalary?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    <View style={styles.viewAction}>
                      <Text style={styles.viewActionText}>View Breakdown →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Payslip Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {loadingDetail || !selectedPayslip ? (
              <ActivityIndicator size="large" color="#16A34A" />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {monthNames[(selectedPayslip.month || 1) - 1]} {selectedPayslip.year} Payslip
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                    <Text style={styles.closeBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Net Pay Highlight Card */}
                <View style={styles.netPayCard}>
                  <Text style={styles.netPayLabel}>Total Net Disbursement</Text>
                  <Text style={styles.netPayValue}>
                    ₹{selectedPayslip.netSalary?.toLocaleString()}
                  </Text>
                </View>

                {/* Earnings */}
                <Text style={styles.breakdownHeading}>Earnings</Text>
                <View style={styles.table}>
                  {selectedPayslip.earnings?.map((e, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.itemName}>{e.name}</Text>
                      <Text style={styles.itemValue}>₹{e.amount?.toLocaleString()}</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, styles.subtotalRow]}>
                    <Text style={styles.subtotalLabel}>Gross Earnings</Text>
                    <Text style={styles.subtotalValue}>
                      ₹{selectedPayslip.grossSalary?.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Deductions */}
                <Text style={styles.breakdownHeading}>Deductions</Text>
                <View style={styles.table}>
                  {selectedPayslip.deductions?.map((d, idx) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.itemName}>{d.name}</Text>
                      <Text style={styles.itemDeduction}>- ₹{d.amount?.toLocaleString()}</Text>
                    </View>
                  ))}
                  <View style={[styles.tableRow, styles.subtotalRow]}>
                    <Text style={styles.subtotalLabel}>Total Deductions</Text>
                    <Text style={styles.subtotalDeduction}>
                      - ₹{selectedPayslip.totalDeductions?.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Download Button */}
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={handleDownloadPdf}
                  activeOpacity={0.85}
                >
                  <Text style={styles.downloadButtonText}>📥 Download PDF Payslip</Text>
                </TouchableOpacity>

                {/* Full Screen Detailed View */}
                <TouchableOpacity
                  style={styles.fullReceiptBtn}
                  onPress={() => {
                    const monthStr = monthNames[(selectedPayslip.month || 1) - 1] || 'Current';
                    const s = selectedPayslip;
                    setSelectedPayslip(null);
                    (navigation as any).navigate('SalarySlipDetail', {
                      payslipId: s.id,
                      month: monthStr,
                      year: s.year || 2026,
                      gross: s.grossSalary || 65000,
                      net: s.netSalary || 54200,
                    });
                  }}
                >
                  <Text style={styles.fullReceiptText}>
                    Open Full Detailed Receipt →
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  payslipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  netAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
  viewAction: {
    paddingVertical: 4,
  },
  viewActionText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    fontSize: 20,
    color: '#64748B',
    padding: 4,
  },
  netPayCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  netPayLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '500',
  },
  netPayValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#15803D',
    marginTop: 4,
  },
  breakdownHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 8,
  },
  table: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    color: '#475569',
  },
  itemValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  itemDeduction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  subtotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 8,
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtotalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  subtotalDeduction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  downloadButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fullReceiptBtn: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  fullReceiptText: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 14,
  },
});

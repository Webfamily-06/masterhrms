import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

interface ExpenseItem {
  id: string;
  category: 'TRAVEL' | 'MEALS' | 'OFFICE' | 'TELECOM';
  title: string;
  date: string;
  amount: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export const ExpenseClaimsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ExpenseClaims'>>();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TRAVEL' | 'MEALS' | 'OFFICE' | 'TELECOM'>('ALL');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'TRAVEL' | 'MEALS' | 'OFFICE' | 'TELECOM'>('TRAVEL');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: 'exp-1',
      category: 'TRAVEL',
      title: 'Flight Ticket to Delhi Client Site',
      date: 'Nov 10, 2026',
      amount: 6400,
      status: 'APPROVED',
    },
    {
      id: 'exp-2',
      category: 'MEALS',
      title: 'Client Lunch & Team Sync',
      date: 'Nov 08, 2026',
      amount: 2800,
      status: 'APPROVED',
    },
    {
      id: 'exp-3',
      category: 'TELECOM',
      title: 'Monthly Broadband Reimbursement',
      date: 'Nov 02, 2026',
      amount: 1250,
      status: 'PENDING',
    },
    {
      id: 'exp-4',
      category: 'TRAVEL',
      title: 'Cab to Terminal 2 Airport',
      date: 'Nov 01, 2026',
      amount: 2000,
      status: 'PENDING',
    },
  ]);

  const filteredExpenses = expenses.filter((e) =>
    activeFilter === 'ALL' ? true : e.category === activeFilter
  );

  const handleSubmitClaim = () => {
    if (!title.trim() || !amount.trim()) {
      Alert.alert('Required Fields', 'Please enter a title and claim amount.');
      return;
    }
    const newClaim: ExpenseItem = {
      id: `exp-${Date.now()}`,
      category,
      title: title.trim(),
      date: 'Nov 16, 2026',
      amount: parseFloat(amount) || 0,
      status: 'PENDING',
    };
    setExpenses([newClaim, ...expenses]);
    setTitle('');
    setAmount('');
    setModalVisible(false);
    Alert.alert('Claim Submitted', 'Your expense claim has been routed to your Manager for review.');
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'TRAVEL': return '✈️';
      case 'MEALS': return '🍔';
      case 'OFFICE': return '📎';
      case 'TELECOM': return '📱';
      default: return '🧾';
    }
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
        <Text style={styles.headerTitle}>Expense Claims</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="New claim"
        >
          <Text style={styles.addBtnText}>+ Claim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stat Overview Cards */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Claimed</Text>
            <Text style={styles.statValue}>₹12,450</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={styles.statValueGreen}>₹9,200</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValueYellow}>₹3,250</Text>
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'TRAVEL', 'MEALS', 'OFFICE', 'TELECOM'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Claims List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Recent Claims ({filteredExpenses.length})</Text>

          {filteredExpenses.map((item) => (
            <View key={item.id} style={styles.claimCard}>
              <View style={styles.claimIconBox}>
                <Text style={styles.claimIcon}>{getCategoryIcon(item.category)}</Text>
              </View>

              <View style={styles.claimDetails}>
                <Text style={styles.claimTitle}>{item.title}</Text>
                <Text style={styles.claimSub}>
                  {item.category} • {item.date}
                </Text>
              </View>

              <View style={styles.claimRight}>
                <Text style={styles.claimAmount}>₹{item.amount.toLocaleString()}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'APPROVED' ? styles.statusPillGreen : styles.statusPillYellow,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === 'APPROVED' ? styles.textGreen : styles.textYellow,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* New Claim Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Expense Claim</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryPicker}>
              {(['TRAVEL', 'MEALS', 'OFFICE', 'TELECOM'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catBtn,
                    category === cat && styles.catBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catBtnText,
                      category === cat && styles.catBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Expense Title / Description</Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Flight to Mumbai"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 2500"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitClaim}>
              <Text style={styles.submitBtnText}>Submit Reimbursement Claim</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statValueGreen: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  statValueYellow: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F59E0B',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  claimCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  claimIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  claimIcon: {
    fontSize: 22,
  },
  claimDetails: {
    flex: 1,
  },
  claimTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  claimSub: {
    fontSize: 11,
    color: '#64748B',
  },
  claimRight: {
    alignItems: 'flex-end',
  },
  claimAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillGreen: {
    backgroundColor: '#D1FAE5',
  },
  statusPillYellow: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textGreen: {
    color: '#065F46',
  },
  textYellow: {
    color: '#B45309',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  catBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginHorizontal: 2,
  },
  catBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  catBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

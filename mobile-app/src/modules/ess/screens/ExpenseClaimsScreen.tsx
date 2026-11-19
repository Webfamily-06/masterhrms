import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Plane,
  Utensils,
  Briefcase,
  Smartphone,
  Receipt,
  X,
  Plus,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import {
  ExpenseService,
  ExpenseClaim,
  ExpenseCategory,
} from '../../../core/services/expenseService';
import { EmployeeService } from '../../../core/services/employeeService';
import { useAuthStore } from '../../../store/authStore';

export const ExpenseClaimsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ExpenseClaims'>>();
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [modalVisible, setModalVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [claimsData, catsData, profileData] = await Promise.all([
        ExpenseService.getMyClaims(),
        ExpenseService.getCategories(),
        EmployeeService.getMyProfile(),
      ]);

      setClaims(claimsData);
      setCategories(catsData);

      const resolvedEmpId = profileData?.id || (user as any)?.employeeId || user?.id || '';
      setEmployeeId(resolvedEmpId);

      if (catsData.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(catsData[0].id);
      }
    } catch (err: any) {
      console.warn('[ExpenseClaims] Error loading data:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedCategoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Dynamically compute real totals
  const { totalClaimed, approvedAmount, pendingAmount } = useMemo(() => {
    let total = 0;
    let approved = 0;
    let pending = 0;

    for (const c of claims) {
      const val = Number(c.amount || 0);
      total += val;
      const st = (c.status || '').toLowerCase();
      if (st === 'approved' || st === 'reimbursed') {
        approved += val;
      } else if (st === 'pending') {
        pending += val;
      }
    }

    return {
      totalClaimed: total,
      approvedAmount: approved,
      pendingAmount: pending,
    };
  }, [claims]);

  // Dynamic filter options based on server categories
  const filterOptions = useMemo(() => {
    const list = ['ALL'];
    categories.forEach((cat) => {
      const name = cat.name.toUpperCase();
      if (!list.includes(name)) list.push(name);
    });
    // Ensure common presets if categories are still loading
    ['TRAVEL', 'MEALS', 'OFFICE', 'TELECOM'].forEach((f) => {
      if (!list.includes(f)) list.push(f);
    });
    return list;
  }, [categories]);

  const filteredClaims = useMemo(() => {
    if (activeFilter === 'ALL') return claims;
    return claims.filter((c) => {
      const catName = c.category?.name?.toUpperCase() || '';
      return catName.includes(activeFilter) || (c.category?.code?.toUpperCase() || '').includes(activeFilter);
    });
  }, [claims, activeFilter]);

  const handleSubmitClaim = async () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter an expense title or merchant name.');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense claim amount.');
      return;
    }

    // Resolve category ID
    let catId = selectedCategoryId;
    if (!catId && categories.length > 0) {
      catId = categories[0].id;
    }

    if (!catId) {
      Alert.alert('Category Required', 'Please select a valid expense category.');
      return;
    }

    // Resolve employee ID
    let finalEmpId = employeeId;
    if (!finalEmpId) {
      try {
        const emp = await EmployeeService.getMyProfile();
        if (emp?.id) {
          finalEmpId = emp.id;
          setEmployeeId(emp.id);
        }
      } catch {}
    }

    if (!finalEmpId) {
      finalEmpId = user?.id || '';
    }

    setSubmitting(true);
    try {
      await ExpenseService.submitClaim({
        employeeId: finalEmpId,
        categoryId: catId,
        title: title.trim(),
        amount: parsedAmount,
        merchant: merchant.trim() || title.trim(),
        expenseDate: new Date().toISOString().split('T')[0],
        description: description.trim() || undefined,
      });

      Alert.alert(
        'Claim Submitted',
        'Your expense claim has been successfully submitted and routed for review.',
        [{ text: 'OK' }]
      );

      setTitle('');
      setMerchant('');
      setAmount('');
      setDescription('');
      setModalVisible(false);

      // Refresh claims list
      await loadData();
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Unable to submit expense claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCategoryIcon = (categoryName?: string) => {
    const cat = (categoryName || '').toUpperCase();
    if (cat.includes('TRAVEL') || cat.includes('FLIGHT') || cat.includes('CAB')) {
      return <Plane size={18} color="#2563EB" strokeWidth={2.2} />;
    }
    if (cat.includes('MEAL') || cat.includes('FOOD') || cat.includes('DINNER')) {
      return <Utensils size={18} color="#EA580C" strokeWidth={2.2} />;
    }
    if (cat.includes('OFFICE') || cat.includes('STATIONERY') || cat.includes('SUPPLIES')) {
      return <Briefcase size={18} color="#7C3AED" strokeWidth={2.2} />;
    }
    if (cat.includes('TELECOM') || cat.includes('PHONE') || cat.includes('INTERNET')) {
      return <Smartphone size={18} color="#059669" strokeWidth={2.2} />;
    }
    return <Receipt size={18} color="#4F46E5" strokeWidth={2.2} />;
  };

  const formatDisplayDate = (d?: string) => {
    if (!d) return 'Recent';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
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
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Claims</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="New claim"
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Claim</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />}
      >
        {/* Stat Overview Cards (Verified Real Values) */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Claimed</Text>
            <Text style={styles.statValue}>₹{totalClaimed.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={styles.statValueGreen}>₹{approvedAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValueYellow}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filterOptions.map((cat) => (
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
          <Text style={styles.sectionTitle}>
            Recent Claims ({filteredClaims.length})
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Loading expense claims...</Text>
            </View>
          ) : filteredClaims.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Receipt size={40} color="#94A3B8" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No expense claims</Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'ALL'
                  ? 'You have not submitted any reimbursement claims yet.'
                  : `No claims found under the ${activeFilter} category.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.emptyActionText}>+ Submit First Claim</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredClaims.map((item) => {
              const statusUpper = (item.status || 'PENDING').toUpperCase();
              const isApproved = statusUpper === 'APPROVED' || statusUpper === 'REIMBURSED';
              const isRejected = statusUpper === 'REJECTED';

              return (
                <View key={item.id} style={styles.claimCard}>
                  <View style={styles.claimIconBox}>
                    {renderCategoryIcon(item.category?.name)}
                  </View>

                  <View style={styles.claimDetails}>
                    <Text style={styles.claimTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.claimSub}>
                      {item.category?.name || 'General'} • {formatDisplayDate(item.expenseDate || item.createdAt)}
                    </Text>
                    {item.claimCode ? (
                      <Text style={styles.claimCodeText}>{item.claimCode}</Text>
                    ) : null}
                  </View>

                  <View style={styles.claimRight}>
                    <Text style={styles.claimAmount}>
                      ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        isApproved
                          ? styles.statusPillGreen
                          : isRejected
                          ? styles.statusPillRed
                          : styles.statusPillYellow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isApproved
                            ? styles.textGreen
                            : isRejected
                            ? styles.textRed
                            : styles.textYellow,
                        ]}
                      >
                        {statusUpper}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Claim Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Expense Claim</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={submitting}
              >
                <X size={20} color="#64748B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryPicker}>
                {categories.length > 0
                  ? categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catBtn,
                          selectedCategoryId === cat.id && styles.catBtnActive,
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text
                          style={[
                            styles.catBtnText,
                            selectedCategoryId === cat.id && styles.catBtnTextActive,
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  : (['Travel', 'Meals', 'Office Supplies', 'Telecom'].map((name, i) => (
                      <View key={i} style={styles.catBtn}>
                        <Text style={styles.catBtnText}>{name}</Text>
                      </View>
                    )))}
              </View>

              <Text style={styles.fieldLabel}>Expense Title / Description *</Text>
              <TextInput
                style={styles.modalInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Flight to Delhi Client Site"
                placeholderTextColor="#94A3B8"
                editable={!submitting}
              />

              <Text style={styles.fieldLabel}>Merchant / Vendor Name</Text>
              <TextInput
                style={styles.modalInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Indigo Airlines, Starbucks"
                placeholderTextColor="#94A3B8"
                editable={!submitting}
              />

              <Text style={styles.fieldLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 4500"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
                editable={!submitting}
              />

              <Text style={styles.fieldLabel}>Notes / Purpose (Optional)</Text>
              <TextInput
                style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief justification for this expense claim..."
                placeholderTextColor="#94A3B8"
                multiline
                editable={!submitting}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmitClaim}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Reimbursement Claim</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="ExpenseClaims" />
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statValueGreen: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  statValueYellow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyActionBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  claimCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  claimIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 12,
    color: '#64748B',
  },
  claimCodeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  claimRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  claimAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGreen: {
    backgroundColor: '#DEF7EC',
  },
  statusPillYellow: {
    backgroundColor: '#FEF3C7',
  },
  statusPillRed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: {
    color: '#059669',
  },
  textYellow: {
    color: '#D97706',
  },
  textRed: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  catBtnActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

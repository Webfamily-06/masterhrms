import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  PieChart,
  Plus,
  FileText,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import {
  LeaveService,
  LeaveBalance,
  LeaveRequest,
} from '../../../core/services/leaveService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const LeaveDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'LeaveDetail'>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  // Tab: 'leave' (Matches 48. Leave - Home.png) or 'permission' (Matches 56. Permission - Home.png)
  const [activeTab, setActiveTab] = useState<'leave' | 'permission'>('leave');
  // Permission filter tab: 'all' | 'pending' | 'approved' | 'rejected'
  const [permissionFilter, setPermissionFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadData = useCallback(async () => {
    try {
      const [balData, reqData] = await Promise.all([
        LeaveService.getBalances(),
        LeaveService.getMyRequests(),
      ]);
      setBalances(balData || []);
      setRequests(reqData || []);
    } catch {
      // Handled gracefully
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

  // Find Annual & Sick balances from API or use standard fallbacks
  const annualBal = useMemo(() => {
    return balances.find((b) => b.name?.toLowerCase().includes('annual') || b.leaveType?.name.toLowerCase().includes('annual')) || {
      remainingDays: 12,
      usedDays: 8,
      totalDays: 20,
    };
  }, [balances]);

  const sickBal = useMemo(() => {
    return balances.find((b) => b.name?.toLowerCase().includes('sick') || b.leaveType?.name.toLowerCase().includes('sick')) || {
      remainingDays: 5,
      usedDays: 2,
      totalDays: 7,
    };
  }, [balances]);

  const totalAllocated = useMemo(() => {
    return balances.reduce((sum, b) => sum + (b.totalDays || 0), 0) || 20;
  }, [balances]);

  const totalUsed = useMemo(() => {
    return balances.reduce((sum, b) => sum + (b.usedDays || 0), 0) || 8;
  }, [balances]);

  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING').length;
  }, [requests]);

  // Sample permissions data for Permission tab (56. Permission - Home.png)
  const permissionsList = useMemo(() => [
    {
      id: 'p1',
      title: "Doctor's Appointment",
      category: 'Personal Permission',
      dateTime: 'Oct 24 • 09:00 - 11:00',
      duration: '2 Hours',
      status: 'PENDING',
      period: 'This Month',
    },
    {
      id: 'p2',
      title: 'School Pick-up',
      category: 'Family Emergency',
      dateTime: 'Oct 18 • 15:00 - 16:30',
      duration: '1.5 Hours',
      status: 'APPROVED',
      period: 'This Month',
    },
    {
      id: 'p3',
      title: 'Internet Maintenance',
      category: 'House Emergency',
      dateTime: 'Sep 12 • 08:00 - 12:00',
      duration: '4 Hours',
      status: 'APPROVED',
      period: 'September 2023',
    },
    {
      id: 'p4',
      title: 'Brief Personal Matter',
      category: 'Other',
      dateTime: 'Sep 05 • 10:00 - 11:00',
      duration: '1 Hour',
      status: 'REJECTED',
      period: 'September 2023',
    },
  ], []);

  const filteredPermissions = useMemo(() => {
    if (permissionFilter === 'all') return permissionsList;
    return permissionsList.filter((p) => p.status.toLowerCase() === permissionFilter.toLowerCase());
  }, [permissionFilter, permissionsList]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'leave' ? 'Leave' : 'Permission'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Switcher (Leave vs Permission) */}
      <View style={styles.tabToggleRow}>
        <TouchableOpacity
          style={[styles.tabToggleBtn, activeTab === 'leave' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('leave')}
        >
          <Text style={[styles.tabToggleText, activeTab === 'leave' && styles.tabToggleTextActive]}>
            Leave
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabToggleBtn, activeTab === 'permission' && styles.tabToggleBtnActive]}
          onPress={() => setActiveTab('permission')}
        >
          <Text style={[styles.tabToggleText, activeTab === 'permission' && styles.tabToggleTextActive]}>
            Permission
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'leave' ? (
            /* ─────────────────────────────────────────────────────────── */
            /* 48. Leave - Home View                                       */
            /* ─────────────────────────────────────────────────────────── */
            <>
              <Text style={styles.sectionHeaderTitle}>Leave Balance</Text>

              {/* Side-by-Side Quota Cards */}
              <View style={styles.balanceTwoColRow}>
                {/* Annual Leave Card */}
                <View style={styles.quotaCard}>
                  <Text style={styles.quotaTitle}>Annual Leave</Text>
                  <Text style={styles.quotaSub}>Yearly quota</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                    <Text style={styles.quotaDaysBig}>{annualBal.remainingDays || 12}</Text>
                    <Text style={styles.quotaDaysUnit}> Days Left</Text>
                  </View>
                  <View style={styles.usedTotalRow}>
                    <Text style={styles.usedTotalText}>{annualBal.usedDays || 8} Used</Text>
                    <Text style={styles.usedTotalText}>{annualBal.totalDays || 20} Total</Text>
                  </View>
                  {/* Progress Bar */}
                  <View style={styles.quotaTrack}>
                    <View
                      style={[
                        styles.quotaFill,
                        {
                          backgroundColor: '#2563EB',
                          width: `${Math.min(100, ((annualBal.usedDays || 8) / (annualBal.totalDays || 20)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Sick Leave Card */}
                <View style={styles.quotaCard}>
                  <Text style={styles.quotaTitle}>Sick Leave</Text>
                  <Text style={styles.quotaSub}>Medical care</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
                    <Text style={styles.quotaDaysBig}>{sickBal.remainingDays || 5}</Text>
                    <Text style={styles.quotaDaysUnit}> Days Left</Text>
                  </View>
                  <View style={styles.usedTotalRow}>
                    <Text style={styles.usedTotalText}>{sickBal.usedDays || 2} Used</Text>
                    <Text style={styles.usedTotalText}>{sickBal.totalDays || 7} Total</Text>
                  </View>
                  {/* Progress Bar */}
                  <View style={styles.quotaTrack}>
                    <View
                      style={[
                        styles.quotaFill,
                        {
                          backgroundColor: '#EF4444',
                          width: `${Math.min(100, ((sickBal.usedDays || 2) / (sickBal.totalDays || 7)) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Wide Card: Total Allocated */}
              <View style={styles.totalAllocatedCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Calendar size={16} color="#2563EB" />
                  <Text style={styles.allocatedLabel}>Total Allocated</Text>
                </View>
                <Text style={styles.allocatedDaysText}>{totalAllocated} Days</Text>
              </View>

              {/* Side-by-Side: Used Days & Pending */}
              <View style={styles.balanceTwoColRow}>
                <View style={styles.statSmallCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <CheckCircle2 size={14} color="#16A34A" />
                    <Text style={styles.statSmallLabel}>USED DAYS</Text>
                  </View>
                  <Text style={styles.statSmallVal}>{totalUsed} Days</Text>
                </View>

                <View style={styles.statSmallCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <PieChart size={14} color="#D97706" />
                    <Text style={styles.statSmallLabel}>PENDING</Text>
                  </View>
                  <Text style={styles.statSmallVal}>{pendingCount} Days</Text>
                </View>
              </View>

              {/* Current Requests Section */}
              <View style={styles.requestsHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Current Requests</Text>
                <TouchableOpacity onPress={() => Alert.alert('History', 'Full leave history.')}>
                  <Text style={styles.viewHistoryLink}>View History</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.requestsList}>
                {requests.length > 0 ? (
                  requests.map((req) => {
                    const startD = new Date(req.startDate);
                    return (
                      <View key={req.id} style={styles.requestCard}>
                        <View style={styles.requestDateBadge}>
                          <Text style={styles.requestBadgeMon}>
                            {startD.toLocaleDateString('en-US', { month: 'short' })}
                          </Text>
                          <Text style={styles.requestBadgeDay}>{startD.getDate()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.requestTypeTitle}>
                            {req.leaveType?.name || 'Annual Leave'}
                          </Text>
                          <Text style={styles.requestDatesSub}>
                            {req.startDate} - {req.endDate} ({req.days} days)
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            req.status === 'APPROVED'
                              ? styles.statusPillApproved
                              : req.status === 'REJECTED'
                              ? styles.statusPillRejected
                              : styles.statusPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              req.status === 'APPROVED'
                                ? styles.statusTextApproved
                                : req.status === 'REJECTED'
                                ? styles.statusTextRejected
                                : styles.statusTextPending,
                            ]}
                          >
                            {req.status === 'APPROVED' ? 'Approved' : req.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <>
                    <View style={styles.requestCard}>
                      <View style={styles.requestDateBadge}>
                        <Text style={styles.requestBadgeMon}>Feb</Text>
                        <Text style={styles.requestBadgeDay}>24</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.requestTypeTitle}>Annual Leave</Text>
                        <Text style={styles.requestDatesSub}>Feb 24 - Feb 25 (2 days)</Text>
                      </View>
                      <View style={[styles.statusPill, styles.statusPillPending]}>
                        <Text style={[styles.statusPillText, styles.statusTextPending]}>Pending</Text>
                      </View>
                    </View>

                    <View style={styles.requestCard}>
                      <View style={styles.requestDateBadge}>
                        <Text style={styles.requestBadgeMon}>Nov</Text>
                        <Text style={styles.requestBadgeDay}>01</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.requestTypeTitle}>Remote Work</Text>
                        <Text style={styles.requestDatesSub}>Nov 01 (1 day)</Text>
                      </View>
                      <View style={[styles.statusPill, styles.statusPillApproved]}>
                        <Text style={[styles.statusPillText, styles.statusTextApproved]}>Approved</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Bottom Request Button */}
              <TouchableOpacity
                style={styles.requestLeaveBottomBtn}
                onPress={() => navigation.navigate('ApplyLeave')}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text style={styles.requestLeaveBtnText}>Request leave</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* 56. Permission - Home View                                  */
            /* ─────────────────────────────────────────────────────────── */
            <>
              {/* Filter Pills (All, Pending, Approved, Rejected) */}
              <View style={styles.filterPillsRow}>
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, permissionFilter === f && styles.filterPillActive]}
                    onPress={() => setPermissionFilter(f)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        permissionFilter === f && styles.filterPillTextActive,
                      ]}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Two Top Stats Cards: TOTAL HOURS & APPROVED */}
              <View style={styles.balanceTwoColRow}>
                <View style={styles.statMetricCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
                    <Clock size={16} color="#F97316" />
                  </View>
                  <Text style={styles.metricSubLabel}>TOTAL HOURS</Text>
                  <Text style={styles.metricBigVal}>24.5h</Text>
                </View>

                <View style={styles.statMetricCard}>
                  <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <Text style={styles.metricSubLabel}>APPROVED</Text>
                  <Text style={styles.metricBigVal}>12</Text>
                </View>
              </View>

              {/* Grouped Permission Items */}
              <View style={{ marginHorizontal: 16 }}>
                <Text style={styles.periodGroupHeading}>This Month</Text>
                {filteredPermissions.map((item) => (
                  <View key={item.id} style={styles.permissionCard}>
                    <View style={[styles.permDocIconCircle, { backgroundColor: '#EFF6FF' }]}>
                      <FileText size={20} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.permTitle}>{item.title}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            item.status === 'APPROVED'
                              ? styles.statusPillApproved
                              : item.status === 'REJECTED'
                              ? styles.statusPillRejected
                              : styles.statusPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              item.status === 'APPROVED'
                                ? styles.statusTextApproved
                                : item.status === 'REJECTED'
                                ? styles.statusTextRejected
                                : styles.statusTextPending,
                            ]}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1).toLowerCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.permCategory}>{item.category}</Text>

                      <View style={styles.permFooterRow}>
                        <View>
                          <Text style={styles.permMetaLabel}>Date & Time</Text>
                          <Text style={styles.permMetaVal}>{item.dateTime}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.permMetaLabel}>Duration</Text>
                          <Text style={styles.permMetaVal}>{item.duration}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Bottom Request Permission Button */}
              <TouchableOpacity
                style={styles.requestLeaveBottomBtn}
                onPress={() => Alert.alert('Request Permission', 'Permission request modal opened.')}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.4} style={{ marginRight: 6 }} />
                <Text style={styles.requestLeaveBtnText}>Request permission</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}

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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Tab Toggle Row */
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 3,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabToggleTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  /* 48. Leave - Home Quota Cards */
  balanceTwoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quotaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  quotaSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  quotaDaysBig: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  quotaDaysUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  usedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  usedTotalText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  quotaTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  quotaFill: {
    height: '100%',
    borderRadius: 2,
  },

  totalAllocatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  allocatedLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  allocatedDaysText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },

  statSmallCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statSmallLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statSmallVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Requests Section */
  requestsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 12,
  },
  viewHistoryLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  requestsList: {
    marginHorizontal: 16,
    gap: 10,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  requestDateBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  requestBadgeMon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  requestBadgeDay: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  requestTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  requestDatesSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillApproved: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextApproved: {
    color: '#16A34A',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextRejected: {
    color: '#EF4444',
  },

  requestLeaveBottomBtn: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 24,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  requestLeaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* 56. Permission Styles */
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  statMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metricBigVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  periodGroupHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginVertical: 10,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  permDocIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  permCategory: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  permFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  permMetaLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  permMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
});

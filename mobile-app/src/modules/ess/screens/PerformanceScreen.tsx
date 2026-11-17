import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  TrendingUp,
  User,
  Star,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import {
  EmployeeService,
  PerformanceReview,
  PerformanceGoal,
} from '../../../core/services/employeeService';
import { useNavigation } from '@react-navigation/native';

export const PerformanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'kpis' | 'feedback'>('overview');

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);

  // Selected KPI Detail Modal State (Matches KPI – Detail.png)
  const [selectedKpi, setSelectedKpi] = useState<any | null>(null);

  // Selected Feedback Detail Modal State (Matches Feedback – Detail.png)
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [revData, goalData] = await Promise.all([
        EmployeeService.getMyPerformanceReviews(),
        EmployeeService.getMyGoals(),
      ]);
      setReviews(revData || []);
      setGoals(goalData || []);
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

  // Dynamic KPIs derived from backend performance goals
  const kpisList = useMemo(() => {
    if (goals.length > 0) {
      return goals.map((g, idx) => {
        const kr = g.keyResults?.[0];
        const targetVal = kr ? `${kr.targetValue}${kr.unit || '%'}` : '100%';
        const currentVal = kr ? `${kr.currentValue}${kr.unit || '%'}` : '0%';
        const pct =
          kr && kr.targetValue > 0
            ? Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100))
            : 0;
        const status = pct >= 100 ? 'COMPLETED' : pct >= 50 ? 'ON TRACK' : 'IN PROGRESS';
        const color = pct >= 100 ? '#16A34A' : pct >= 50 ? '#2563EB' : '#F59E0B';
        return {
          id: g.id || `kpi-${idx}`,
          title: g.title,
          desc: g.description || 'Employee strategic objective and key results.',
          status,
          weight: `${Math.round(100 / Math.max(1, goals.length))}%`,
          target: targetVal,
          current: currentVal,
          pct,
          color,
          managerNote: 'Quarterly review progress recorded.',
          history:
            kr?.checkins?.map((c) => ({
              achievement: `${c.value} Achievement`,
              date: new Date(c.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
              updatedBy: 'System',
            })) || [],
        };
      });
    }
    return [];
  }, [goals]);

  // Dynamic Feedback derived from backend performance reviews
  const feedbacksList = useMemo(() => {
    if (reviews.length > 0) {
      return reviews.map((r, idx) => {
        const revName = r.reviewerName || 'Supervisor';
        const avatar = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(
          revName
        )}&backgroundColor=00d287`;
        return {
          id: r.id || `fb-${idx}`,
          name: revName,
          title: r.reviewType || 'Performance Evaluation',
          role: r.reviewType?.toLowerCase().includes('peer') ? 'Peer' : 'Manager',
          date: new Date(r.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          submittedDate: `Submitted ${new Date(r.createdAt).toLocaleDateString('en-US')}`,
          quote: r.feedbackText?.substring(0, 100) || 'Performance review submitted.',
          fullText: r.feedbackText || 'Comprehensive performance review assessment.',
          category: r.reviewType || 'General Review',
          rating: r.ratingScore ? `${r.ratingScore} / 5` : 'Pending',
          status: r.status || 'Acknowledged',
          accentColor: '#16A34A',
          avatar,
        };
      });
    }
    return [];
  }, [reviews]);

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
          {activeTab === 'overview'
            ? 'Performance Overview'
            : activeTab === 'kpis'
            ? 'KPIs (Q1 2026)'
            : 'Feedback'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs Switcher: Overview | KPIs | Feedback */}
      <View style={styles.tabToggleRow}>
        {(['overview', 'kpis', 'feedback'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabToggleBtn, activeTab === tab && styles.tabToggleBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabToggleText, activeTab === tab && styles.tabToggleTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
          {activeTab === 'overview' ? (
            /* ─────────────────────────────────────────────────────────── */
            /* Performance – Overview View                                 */
            /* ─────────────────────────────────────────────────────────── */
            <>
              {/* Overall Score Blue Gradient Hero Card */}
              <View style={styles.heroCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.heroSub}>OVERALL SCORE</Text>
                  <View style={styles.heroPeriodPill}>
                    <Text style={styles.heroPeriodPillText}>Q1 2026</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <Text style={styles.heroScoreNum}>88</Text>
                  <View style={styles.heroExcellentBadge}>
                    <View style={styles.greenMiniDot} />
                    <Text style={styles.heroExcellentText}>Excellent</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 }}>
                  <Text style={styles.reviewCompLabel}>Review Completion</Text>
                  <Text style={styles.reviewCompVal}>90%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: '90%' }]} />
                </View>
              </View>

              {/* KPI Progress Card */}
              <Text style={styles.sectionHeaderLabel}>KPI Progress</Text>
              <View style={styles.kpiProgressCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={styles.kpiProgressRing}>
                    <Text style={styles.kpiProgressRingText}>75%</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.kpiStatLabel}>Total KPIs</Text>
                      <Text style={styles.kpiStatVal}>12</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.kpiStatLabel}>Completed</Text>
                      <Text style={[styles.kpiStatVal, { color: '#2563EB' }]}>9</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.outlineBlueBtn}
                  onPress={() => setActiveTab('kpis')}
                >
                  <Text style={styles.outlineBlueBtnText}>View All KPIs →</Text>
                </TouchableOpacity>
              </View>

              {/* Feedback Highlight Section */}
              <View style={styles.feedbacksHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>Feedback Highlight</Text>
                <TouchableOpacity onPress={() => setActiveTab('feedback')}>
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.feedbacksList}>
                {feedbacksList.slice(0, 2).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.feedbackCard}
                    onPress={() => setSelectedFeedback(item)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Image source={{ uri: item.avatar }} style={styles.fbAvatar} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.fbName}>{item.name}</Text>
                        <Text style={styles.fbTitle}>{item.title}</Text>
                      </View>
                      <Text style={styles.fbTime}>{item.date}</Text>
                    </View>
                    <Text style={styles.fbQuote} numberOfLines={3}>
                      "{item.quote}"
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : activeTab === 'kpis' ? (
            /* ─────────────────────────────────────────────────────────── */
            /* KPI – List View (Matches KPI – List.png)                     */
            /* ─────────────────────────────────────────────────────────── */
            <>
              {/* Top Stats 3-Col Card */}
              <View style={styles.kpiStatsCard}>
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Total</Text>
                  <Text style={styles.kpiColVal}>{kpisList.length}</Text>
                </View>
                <View style={styles.kpiStatColDivider} />
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Completed</Text>
                  <Text style={[styles.kpiColVal, { color: '#16A34A' }]}>
                    {kpisList.filter((k) => k.status === 'COMPLETED').length}
                  </Text>
                </View>
                <View style={styles.kpiStatColDivider} />
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Rate</Text>
                  <Text style={[styles.kpiColVal, { color: '#2563EB' }]}>
                    {kpisList.length > 0
                      ? `${Math.round(
                          (kpisList.filter((k) => k.status === 'COMPLETED').length /
                            kpisList.length) *
                            100
                        )}%`
                      : '0%'}
                  </Text>
                </View>
              </View>

              {/* KPI Cards List */}
              <View style={styles.kpisListContainer}>
                {kpisList.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ color: '#64748B', fontSize: 14 }}>No KPIs or goals found for this cycle.</Text>
                  </View>
                ) : (
                  kpisList.map((kpi) => (
                  <TouchableOpacity
                    key={kpi.id}
                    style={styles.kpiItemCard}
                    onPress={() => setSelectedKpi(kpi)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View
                        style={[
                          styles.kpiStatusPill,
                          kpi.status === 'COMPLETED'
                            ? styles.statusGreen
                            : kpi.status === 'ON TRACK'
                            ? styles.statusBlue
                            : styles.statusOrange,
                        ]}
                      >
                        <View
                          style={[
                            styles.kpiStatusDot,
                            { backgroundColor: kpi.color },
                          ]}
                        />
                        <Text
                          style={[
                            styles.kpiStatusPillText,
                            { color: kpi.color },
                          ]}
                        >
                          {kpi.status}
                        </Text>
                      </View>
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightBadgeText}>{kpi.weight}</Text>
                      </View>
                    </View>

                    <Text style={styles.kpiCardTitle}>{kpi.title}</Text>
                    <Text style={styles.kpiCardDesc} numberOfLines={2}>{kpi.desc}</Text>

                    <View style={styles.targetCurrentRow}>
                      <Text style={styles.targetCurrentText}>Target: {kpi.target}</Text>
                      <Text style={[styles.targetCurrentText, { fontWeight: '700', color: '#0F172A' }]}>
                        Current: {kpi.current}
                      </Text>
                    </View>

                    <View style={styles.kpiTrack}>
                      <View
                        style={[
                          styles.kpiFill,
                          { width: `${kpi.pct}%`, backgroundColor: kpi.color },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* Feedback – List View (Matches Feedback – List.png)          */
            /* ─────────────────────────────────────────────────────────── */
            <>
              <Text style={styles.cycleTitle}>Performance Reviews & Feedback</Text>

              {/* Stats Card: Total | Manager | Peer */}
              <View style={styles.kpiStatsCard}>
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Total</Text>
                  <Text style={styles.kpiColVal}>{feedbacksList.length}</Text>
                </View>
                <View style={styles.kpiStatColDivider} />
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Manager</Text>
                  <Text style={[styles.kpiColVal, { color: '#16A34A' }]}>
                    {feedbacksList.filter((f) => f.role === 'Manager').length}
                  </Text>
                </View>
                <View style={styles.kpiStatColDivider} />
                <View style={styles.kpiStatCol}>
                  <Text style={styles.kpiColLabel}>Peer</Text>
                  <Text style={[styles.kpiColVal, { color: '#2563EB' }]}>
                    {feedbacksList.filter((f) => f.role !== 'Manager').length}
                  </Text>
                </View>
              </View>

              <View style={styles.feedbacksListContainer}>
                {feedbacksList.length === 0 ? (
                  <View style={{ padding: 32, alignItems: 'center' }}>
                    <Text style={{ color: '#64748B', fontSize: 14 }}>No feedback or review records found.</Text>
                  </View>
                ) : (
                  feedbacksList.map((fb) => (
                  <TouchableOpacity
                    key={fb.id}
                    style={[styles.feedbackDetailedCard, { borderLeftColor: fb.accentColor }]}
                    onPress={() => setSelectedFeedback(fb)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Image source={{ uri: fb.avatar }} style={styles.fbAvatar} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.fbName}>{fb.name}</Text>
                        <Text style={styles.fbTitle}>{fb.title}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.rolePill, fb.role === 'Manager' ? styles.roleManager : styles.rolePeer]}>
                          <Text style={[styles.rolePillText, fb.role === 'Manager' ? { color: '#2563EB' } : { color: '#D97706' }]}>
                            {fb.role}
                          </Text>
                        </View>
                        <Text style={styles.fbTimeSmall}>{fb.date}</Text>
                      </View>
                    </View>

                    <Text style={styles.fbQuote} numberOfLines={2}>
                      {fb.quote}
                    </Text>

                    <View style={styles.fbCardFooterRow}>
                      <View style={[styles.statusBadgeSmall, fb.status === 'Action Required' ? { backgroundColor: '#FFFBEB' } : { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.statusBadgeSmallText, fb.status === 'Action Required' ? { color: '#D97706' } : { color: '#16A34A' }]}>
                          {fb.status === 'Action Required' ? '• Action Required' : '✔ Acknowledged'}
                        </Text>
                      </View>
                      <Text style={styles.readFullText}>Read Full →</Text>
                    </View>
                  </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* KPI Detail Modal (Matches KPI – Detail.png)                        */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={Boolean(selectedKpi)} animationType="slide" transparent onRequestClose={() => setSelectedKpi(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandleBar} />
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setSelectedKpi(null)} style={styles.backBtn}>
                <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.modalSheetTitle}>KPI Detail</Text>
              <TouchableOpacity onPress={() => setSelectedKpi(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedKpi && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Header Card */}
                <View style={styles.kpiDetailHeroCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={[styles.kpiStatusPill, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.kpiStatusPillText, { color: '#16A34A' }]}>
                          • {selectedKpi.status}
                        </Text>
                      </View>
                      <View style={[styles.kpiStatusPill, { backgroundColor: '#F1F5F9' }]}>
                        <Text style={[styles.kpiStatusPillText, { color: '#64748B' }]}>
                          • METRIC
                        </Text>
                      </View>
                    </View>
                    <View style={styles.weightBadge}>
                      <Text style={styles.weightBadgeText}>{selectedKpi.weight}</Text>
                    </View>
                  </View>

                  <Text style={styles.kpiDetailTitle}>{selectedKpi.title}</Text>
                  <Text style={styles.kpiDetailDesc}>{selectedKpi.desc}</Text>
                </View>

                {/* Target & Achievement Card */}
                <Text style={styles.sheetSectionHeading}>Target & Achievement</Text>
                <View style={styles.kpiDetailHeroCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View>
                      <Text style={styles.targetLabel}>Target</Text>
                      <Text style={styles.targetValBig}>{selectedKpi.target}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.targetLabel}>Current Achievement</Text>
                      <Text style={[styles.targetValBig, { color: '#16A34A' }]}>{selectedKpi.current}</Text>
                    </View>
                  </View>

                  <View style={styles.kpiTrack}>
                    <View style={[styles.kpiFill, { width: `${selectedKpi.pct}%`, backgroundColor: '#16A34A' }]} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={styles.rangeSubText}>0%</Text>
                    <Text style={styles.rangeSubText}>100%+</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
                    <Clock size={13} color="#64748B" />
                    <Text style={styles.lastUpdatedText}>Last Updated: Mar 15, 2026</Text>
                  </View>
                </View>

                {/* Performance Insight Card */}
                <Text style={styles.sheetSectionHeading}>Performance Insight</Text>
                <View style={styles.kpiInsightCard}>
                  <Text style={styles.insightNoteLabel}>Manager Note</Text>
                  <Text style={styles.insightNoteText}>"{selectedKpi.managerNote}"</Text>
                </View>

                {/* Progress History */}
                <Text style={styles.sheetSectionHeading}>Progress History</Text>
                <View style={styles.kpiDetailHeroCard}>
                  {selectedKpi.history?.map((h: any, i: number) => (
                    <View key={i} style={[styles.historyRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10, marginTop: 10 }]}>
                      <View style={[styles.historyIconCircle, { backgroundColor: '#DCFCE7' }]}>
                        <TrendingUp size={16} color="#16A34A" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.historyAchieveText}>{h.achievement}</Text>
                        <Text style={styles.historyUpdatedBy}>Updated by {h.updatedBy}</Text>
                      </View>
                      <Text style={styles.historyDate}>{h.date}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* Feedback Detail Modal (Matches Feedback – Detail.png)              */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={Boolean(selectedFeedback)} animationType="slide" transparent onRequestClose={() => setSelectedFeedback(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandleBar} />
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setSelectedFeedback(null)} style={styles.backBtn}>
                <ArrowLeft size={20} color="#0F172A" strokeWidth={2.4} />
              </TouchableOpacity>
              <Text style={styles.modalSheetTitle}>Feedback</Text>
              <TouchableOpacity onPress={() => setSelectedFeedback(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.cycleTitle}>Performance Cycle Q1 2026</Text>

                {/* Top Reviewer Card */}
                <View style={styles.reviewerHeaderCard}>
                  <Image source={{ uri: selectedFeedback.avatar }} style={styles.reviewerAvatarLarge} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.reviewerNameBig}>{selectedFeedback.name}</Text>
                      <View style={styles.roleManager}>
                        <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '700' }}>{selectedFeedback.role}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewerTitleBig}>{selectedFeedback.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.submittedDateText}>{selectedFeedback.submittedDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Detailed Feedback Card */}
                <View style={styles.kpiDetailHeroCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View>
                      <Text style={styles.metaCategoryLabel}>Category</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <User size={16} color="#2563EB" />
                        <Text style={styles.categoryNameText}>{selectedFeedback.category}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaCategoryLabel}>Rating</Text>
                      <View style={styles.ratingBadge}>
                        <Star size={12} color="#D97706" fill="#D97706" style={{ marginRight: 4 }} />
                        <Text style={styles.ratingText}>{selectedFeedback.rating}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.detailFeedbackHeading}>Detailed Feedback</Text>
                  <Text style={styles.detailFeedbackBody}>{selectedFeedback.fullText}</Text>
                </View>

                {/* Acknowledgement Card & Button */}
                <View style={styles.pendingAckCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <AlertCircle size={20} color="#D97706" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingAckTitle}>Pending Acknowledgement</Text>
                      <Text style={styles.pendingAckSub}>Please review and acknowledge this feedback.</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.modalPrimaryActionBtn}
                    onPress={() => {
                      setSelectedFeedback(null);
                    }}
                  >
                    <Text style={styles.modalPrimaryActionBtnText}>Acknowledge Feedback</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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

  /* Overall Score Hero Card (Performance – Overview.png) */
  heroCard: {
    backgroundColor: '#1D4ED8',
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  heroSub: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroPeriodPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroPeriodPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroScoreNum: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    marginRight: 14,
  },
  heroExcellentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  greenMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  heroExcellentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  reviewCompLabel: {
    fontSize: 12,
    color: '#E0E7FF',
  },
  reviewCompVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },

  /* KPI Progress Card */
  sectionHeaderLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  kpiProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
  },
  kpiProgressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiProgressRingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiStatLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  kpiStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  outlineBlueBtn: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBlueBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Feedback Highlight */
  feedbacksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  feedbacksList: {
    marginHorizontal: 16,
    gap: 12,
  },
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  fbAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  fbName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  fbTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  fbTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  fbQuote: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  /* KPI List Styles (Matches KPI – List.png) */
  kpiStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  kpiColLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  kpiColVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiStatColDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },
  kpisListContainer: {
    marginHorizontal: 16,
    gap: 12,
  },
  kpiItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusBlue: {
    backgroundColor: '#EFF6FF',
  },
  statusOrange: {
    backgroundColor: '#FEF3C7',
  },
  kpiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  kpiStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weightBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  kpiCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  kpiCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  targetCurrentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  targetCurrentText: {
    fontSize: 12,
    color: '#64748B',
  },
  kpiTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  kpiFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Feedback List Styles (Matches Feedback – List.png) */
  cycleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  feedbacksListContainer: {
    marginHorizontal: 16,
    gap: 12,
  },
  feedbackDetailedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleManager: {
    backgroundColor: '#EFF6FF',
  },
  rolePeer: {
    backgroundColor: '#FEF3C7',
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fbTimeSmall: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  fbCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 10,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  readFullText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Modals */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiDetailHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  kpiDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  kpiDetailDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  sheetSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  targetLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  targetValBig: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  rangeSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#64748B',
  },
  kpiInsightCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  insightNoteLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  insightNoteText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyAchieveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyUpdatedBy: {
    fontSize: 11,
    color: '#64748B',
  },
  historyDate: {
    fontSize: 12,
    color: '#94A3B8',
  },

  /* Reviewer Feedback Modal Styles */
  reviewerHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  reviewerNameBig: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewerTitleBig: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  submittedDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  metaCategoryLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  categoryNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  detailFeedbackHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 8,
  },
  detailFeedbackBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  pendingAckCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  pendingAckTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingAckSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  modalPrimaryActionBtn: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

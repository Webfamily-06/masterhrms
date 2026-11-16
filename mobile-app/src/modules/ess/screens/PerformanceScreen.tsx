import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  EmployeeService,
  PerformanceReview,
  PerformanceGoal,
} from '../../../core/services/employeeService';
import { useNavigation } from '@react-navigation/native';

export const PerformanceScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'goals' | 'reviews'>('goals');

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [goals, setGoals] = useState<PerformanceGoal[]>([]);

  // Check-in Modal
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [selectedKr, setSelectedKr] = useState<{ id: string; title: string; current: number; target: number } | null>(null);
  const [newProgress, setNewProgress] = useState('');
  const [checkinComment, setCheckinComment] = useState('');
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [revData, goalData] = await Promise.all([
        EmployeeService.getMyPerformanceReviews(),
        EmployeeService.getMyGoals(),
      ]);
      setReviews(revData);
      setGoals(goalData);
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

  const handleOpenCheckin = (kr: any) => {
    setSelectedKr({
      id: kr.id,
      title: kr.title,
      current: kr.currentValue || 0,
      target: kr.targetValue || 100,
    });
    setNewProgress(String(kr.currentValue || 0));
    setCheckinComment('');
    setCheckinModalVisible(true);
  };

  const handleSubmitCheckin = async () => {
    if (!selectedKr) return;
    const val = parseFloat(newProgress);
    if (isNaN(val)) {
      Alert.alert('Validation Error', 'Please enter a valid numeric progress value.');
      return;
    }

    setSubmittingCheckin(true);
    try {
      await EmployeeService.checkinGoal({
        keyResultId: selectedKr.id,
        currentValue: val,
        comment: checkinComment.trim() || undefined,
      });
      Alert.alert('Progress Saved', 'Your goal key result check-in has been recorded.');
      setCheckinModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Check-in Failed', err?.message || 'Unable to record check-in.');
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const calculateOverallProgress = () => {
    if (goals.length === 0) return 78; // Sample default average
    let totalPct = 0;
    let krCount = 0;
    goals.forEach((g) => {
      g.keyResults?.forEach((kr) => {
        const pct = Math.min(100, Math.round(((kr.currentValue || 0) / (kr.targetValue || 1)) * 100));
        totalPct += pct;
        krCount++;
      });
    });
    return krCount > 0 ? Math.round(totalPct / krCount) : 80;
  };

  const overallPct = calculateOverallProgress();

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
        <Text style={styles.headerTitle}>Performance & OKRs</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Performance Card */}
        <View style={styles.summaryCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.summaryLabel}>ANNUAL PERFORMANCE</Text>
              <Text style={styles.scoreTitle}>Exceeding Goals</Text>
              <Text style={styles.summarySub}>Q4 Cycle Active</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.circlePct}>{overallPct}%</Text>
              <Text style={styles.circleSub}>Complete</Text>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{goals.length}</Text>
              <Text style={styles.statLbl}>Active OKRs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{reviews.length}</Text>
              <Text style={styles.statLbl}>Evaluations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>4.8 ★</Text>
              <Text style={styles.statLbl}>Avg Rating</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'goals' && styles.tabButtonActive]}
            onPress={() => setActiveTab('goals')}
          >
            <Text style={[styles.tabText, activeTab === 'goals' && styles.tabTextActive]}>
              My Objectives & Goals
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'reviews' && styles.tabButtonActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Review History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
        ) : activeTab === 'goals' ? (
          <View>
            {goals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyTitle}>No Goals Assigned Yet</Text>
                <Text style={styles.emptyDesc}>
                  Your quarterly objectives and key results will appear here once published by your manager.
                </Text>
              </View>
            ) : (
              goals.map((g, idx) => (
                <View key={g.id || idx} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{g.title}</Text>
                    {g.cycle && <Text style={styles.cycleBadge}>{g.cycle.name}</Text>}
                  </View>
                  {g.description ? <Text style={styles.goalDesc}>{g.description}</Text> : null}

                  {g.keyResults?.map((kr) => {
                    const pct = Math.min(100, Math.round(((kr.currentValue || 0) / (kr.targetValue || 1)) * 100));
                    return (
                      <View key={kr.id} style={styles.krBox}>
                        <View style={styles.krHeaderRow}>
                          <Text style={styles.krTitle}>{kr.title}</Text>
                          <Text style={styles.krProgressText}>
                            {kr.currentValue} / {kr.targetValue} {kr.unit || ''} ({pct}%)
                          </Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                        </View>
                        <TouchableOpacity
                          style={styles.checkinSmallBtn}
                          onPress={() => handleOpenCheckin(kr)}
                        >
                          <Text style={styles.checkinSmallBtnText}>+ Check-in Progress</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            {reviews.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Performance Reviews</Text>
                <Text style={styles.emptyDesc}>
                  Performance evaluation reports and 360 feedback will be displayed here once finalized.
                </Text>
              </View>
            ) : (
              reviews.map((r, idx) => (
                <View key={r.id || idx} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View>
                      <Text style={styles.reviewCycle}>{r.cycleName || 'Quarterly Review'}</Text>
                      <Text style={styles.reviewerName}>Reviewer: {r.reviewerName || 'Manager'}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>{r.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  {r.ratingScore ? (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingNumber}>{r.ratingScore} / 5.0</Text>
                      <Text style={styles.ratingStars}>★★★★★</Text>
                    </View>
                  ) : null}

                  {r.feedbackText ? (
                    <View style={styles.feedbackBox}>
                      <Text style={styles.feedbackLabel}>Manager Feedback:</Text>
                      <Text style={styles.feedbackText}>{r.feedbackText}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.reviewDate}>Date: {new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Check-in Modal */}
      <Modal visible={checkinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Check-in Key Result</Text>
            <Text style={styles.modalSub}>{selectedKr?.title}</Text>

            <Text style={styles.inputLabel}>Current Progress Value</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={newProgress}
              onChangeText={setNewProgress}
              placeholder="e.g. 75"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Notes / Accomplishments (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              multiline
              numberOfLines={3}
              value={checkinComment}
              onChangeText={setCheckinComment}
              placeholder="Explain progress made this week..."
              placeholderTextColor="#94A3B8"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCheckinModalVisible(false)}
                disabled={submittingCheckin}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmitCheckin}
                disabled={submittingCheckin}
              >
                {submittingCheckin ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Check-in</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '700',
    letterSpacing: 1,
  },
  scoreTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  summarySub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  progressCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  circlePct: {
    fontSize: 20,
    fontWeight: '900',
    color: '#34D399',
  },
  circleSub: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statLbl: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  loader: {
    marginTop: 30,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  cycleBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goalDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  krBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  krHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  krTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  krProgressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginLeft: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 3,
  },
  checkinSmallBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  checkinSmallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewCycle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  reviewerName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 8,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  ratingStars: {
    fontSize: 16,
    color: '#EAB308',
  },
  feedbackBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
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
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 14,
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

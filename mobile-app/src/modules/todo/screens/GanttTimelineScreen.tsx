import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { TodoService, TodoItem } from '../../../core/services/todoService';

export const GanttTimelineScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scaleDays, setScaleDays] = useState<14 | 28>(14);
  const [windowOffsetWeeks, setWindowOffsetWeeks] = useState(0);

  // Selected task detail
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await TodoService.getTodos();
      setTodos(data);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Compute timeline dates (base: Nov 16, 2026 + offset)
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const base = new Date(2026, 10, 16);
    base.setDate(base.getDate() - 2 + windowOffsetWeeks * 7);

    for (let i = 0; i < scaleDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [scaleDays, windowOffsetWeeks]);

  const handlePrev = () => setWindowOffsetWeeks((w) => w - 1);
  const handleNext = () => setWindowOffsetWeeks((w) => w + 1);
  const handleToday = () => setWindowOffsetWeeks(0);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const CELL_WIDTH = 44;

  const handleToggleComplete = async (task: TodoItem) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const nextProg = nextStatus === 'COMPLETED' ? 100 : 0;
    try {
      await TodoService.updateTodo(task.id, {
        status: nextStatus,
        progress: nextProg,
      });
      setSelectedTask(null);
      loadTodos();
    } catch {
      Alert.alert('Error', 'Failed to update task.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gantt Timeline</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('TodoList')}
          style={styles.switchListBtn}
          accessibilityRole="button"
          accessibilityLabel="Switch to list view"
        >
          <Text style={styles.switchListText}>≡ List</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline Controls */}
      <View style={styles.controlsBar}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToday} style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.navBtn}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 14 Days vs 28 Days scale */}
        <View style={styles.scaleTabs}>
          <TouchableOpacity
            style={[styles.scaleTab, scaleDays === 14 && styles.scaleTabActive]}
            onPress={() => setScaleDays(14)}
          >
            <Text style={[styles.scaleTabText, scaleDays === 14 && styles.scaleTabTextActive]}>
              14 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scaleTab, scaleDays === 28 && styles.scaleTabActive]}
            onPress={() => setScaleDays(28)}
          >
            <Text style={[styles.scaleTabText, scaleDays === 28 && styles.scaleTabTextActive]}>
              28 Days
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#4F46E5" style={styles.loader} />
      ) : (
        <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.ganttContainer}>
            {/* Left Pinned Task Column */}
            <View style={styles.pinnedColumn}>
              <View style={styles.pinnedHeader}>
                <Text style={styles.pinnedHeaderText}>Task Items ({todos.length})</Text>
              </View>

              {todos.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.taskLabelRow}
                  onPress={() => setSelectedTask(t)}
                >
                  <View
                    style={[
                      styles.prioDot,
                      { backgroundColor: getPriorityColor(t.priority) },
                    ]}
                  />
                  <Text style={styles.taskLabelText} numberOfLines={1}>
                    {t.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Right Horizontally Scrollable Timeline Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Date Header Row */}
                <View style={styles.datesHeaderRow}>
                  {timelineDates.map((d, index) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday =
                      d.getDate() === 16 && d.getMonth() === 10 && d.getFullYear() === 2026;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.dateCell,
                          { width: CELL_WIDTH },
                          isWeekend && styles.weekendCell,
                          isToday && styles.todayHeaderCell,
                        ]}
                      >
                        <Text style={[styles.dateDayText, isToday && styles.todayText]}>
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}
                        </Text>
                        <Text style={[styles.dateNumText, isToday && styles.todayText]}>
                          {d.getDate()}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Timeline Grid Rows & Bars */}
                {todos.map((t, rowIdx) => {
                  const barColor = getPriorityColor(t.priority);
                  return (
                    <View key={rowIdx} style={styles.gridRow}>
                      {/* Grid background cells with weekend shading */}
                      {timelineDates.map((d, colIdx) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <View
                            key={colIdx}
                            style={[
                              styles.gridCell,
                              { width: CELL_WIDTH },
                              isWeekend && styles.weekendCell,
                            ]}
                          />
                        );
                      })}

                      {/* Visual Task Bar overlay */}
                      <TouchableOpacity
                        style={[
                          styles.taskBar,
                          {
                            left: 2 * CELL_WIDTH,
                            width: Math.max(CELL_WIDTH * 2, CELL_WIDTH * (rowIdx + 2)),
                            backgroundColor: barColor,
                          },
                        ]}
                        onPress={() => setSelectedTask(t)}
                      >
                        <Text style={styles.taskBarText} numberOfLines={1}>
                          {t.title} ({t.progress}%)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Task Action Modal */}
      <Modal visible={!!selectedTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedTask.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedTask(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Priority:</Text>
                  <Text
                    style={[
                      styles.metaVal,
                      { color: getPriorityColor(selectedTask.priority) },
                    ]}
                  >
                    {selectedTask.priority}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Progress:</Text>
                  <Text style={styles.metaVal}>{selectedTask.progress}%</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Status:</Text>
                  <Text style={styles.metaVal}>{selectedTask.status}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.completeBtn,
                    selectedTask.status === 'COMPLETED'
                      ? styles.completeBtnUndo
                      : styles.completeBtnDone,
                  ]}
                  onPress={() => handleToggleComplete(selectedTask)}
                >
                  <Text style={styles.completeBtnText}>
                    {selectedTask.status === 'COMPLETED'
                      ? 'Mark as Incomplete'
                      : 'Mark Task as Completed ✓'}
                  </Text>
                </TouchableOpacity>
              </>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 16,
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
  switchListBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  switchListText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlsBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBtn: {
    padding: 6,
  },
  navBtnText: {
    fontSize: 22,
    color: '#1E1B4B',
    fontWeight: 'bold',
  },
  todayBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  todayText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  scaleTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 2,
  },
  scaleTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scaleTabActive: {
    backgroundColor: '#FFFFFF',
  },
  scaleTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scaleTabTextActive: {
    color: '#1E1B4B',
    fontWeight: '700',
  },
  loader: {
    marginTop: 40,
  },
  mainScroll: {
    flex: 1,
  },
  ganttContainer: {
    flexDirection: 'row',
  },
  pinnedColumn: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    zIndex: 10,
  },
  pinnedHeader: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  pinnedHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  taskLabelRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  prioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  taskLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  datesHeaderRow: {
    flexDirection: 'row',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dateCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  weekendCell: {
    backgroundColor: '#F1F5F9',
  },
  todayHeaderCell: {
    backgroundColor: '#EEF2FF',
  },
  dateDayText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  dateNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  gridRow: {
    flexDirection: 'row',
    height: 44,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  gridCell: {
    height: 44,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  taskBar: {
    position: 'absolute',
    top: 8,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  taskBarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  completeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  completeBtnDone: {
    backgroundColor: '#10B981',
  },
  completeBtnUndo: {
    backgroundColor: '#64748B',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

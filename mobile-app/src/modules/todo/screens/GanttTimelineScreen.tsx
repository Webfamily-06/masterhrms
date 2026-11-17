import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import { Search } from 'lucide-react-native';
import {
  WorkspaceModuleShell,
  WorkspaceLoadingBlock,
  WorkspaceErrorBlock,
  WorkspaceEmptyBlock,
  useResponsiveLayout,
} from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../app/providers/QueryProvider';
import { useAuthStore } from '../../../store/authStore';
import { usePermission } from '../../../hooks/usePermission';
import {
  TodoService,
  TodoItem,
  DEFAULT_TODO_CATEGORIES,
} from '../../../core/services/todoService';
import {
  TodoTaskInspectorSheet,
  TodoTaskFormModal,
  TodoCategoryManagerModal,
  getTodoPriorityColor,
  isTodoOverdue,
} from '../components/TodoSharedModals';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function parseLocalYmd(ymd: string): Date {
  const parts = ymd.slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  return startOfLocalDay(new Date());
}

export const GanttTimelineScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { isTablet } = useResponsiveLayout();
  const user = useAuthStore((s) => s.user);
  const { hasAnyPermission, activeRole } = usePermission();

  const isAdminPersona =
    activeRole !== 'employee' &&
    (hasAnyPermission(['hrm.dashboard.view', 'hrm.manage', '*']) ||
      activeRole === 'hr_admin' ||
      activeRole === 'tenant_admin');

  const [scaleDays, setScaleDays] = useState<14 | 28>(14);
  const [windowOffsetWeeks, setWindowOffsetWeeks] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Shared Modals
  const [selectedTask, setSelectedTask] = useState<TodoItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const cellWidth = isTablet ? 52 : 44;
  const pinnedWidth = isTablet ? 210 : 148;

  // Queries
  const todosQuery = useQuery({
    queryKey: createTenantQueryKey(['todos', 'list', isAdminPersona ? 'all' : 'own']),
    queryFn: () => TodoService.getTodos({ scope: isAdminPersona ? 'all' : 'own' }),
  });

  const categoriesQuery = useQuery({
    queryKey: createTenantQueryKey(['todos', 'categories']),
    queryFn: () => TodoService.getCategories(),
  });

  const assigneesQuery = useQuery({
    queryKey: createTenantQueryKey(['todos', 'assignees']),
    queryFn: () => TodoService.getAssignees(),
    enabled: formVisible,
  });

  const todos = useMemo(() => todosQuery.data || [], [todosQuery.data]);
  const categories = categoriesQuery.data || DEFAULT_TODO_CATEGORIES;

  // Deep-link taskId support (e.g. from Calendar "View in Gantt")
  useEffect(() => {
    const deepTaskId = route.params?.taskId;
    if (deepTaskId && todos.length > 0 && !selectedTask) {
      const found = todos.find((t) => t.id === deepTaskId);
      if (found) setSelectedTask(found);
    }
  }, [route.params?.taskId, todos, selectedTask]);

  useEffect(() => {
    if (selectedTask) {
      const fresh = todos.find((t) => t.id === selectedTask.id);
      if (fresh) setSelectedTask(fresh);
    }
  }, [todos, selectedTask]);

  const invalidateTodoAndCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['todos']) });
    void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
  };

  // Real timeline date array (starts at today - 2 days + offset * 7 days, matching UnifiedTodoApp)
  const todayStart = useMemo(() => startOfLocalDay(new Date()), []);

  const timelineDates = useMemo(() => {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - 2 + windowOffsetWeeks * 7);
    return Array.from({ length: scaleDays }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return d;
    });
  }, [todayStart, scaleDays, windowOffsetWeeks]);

  const filteredTodos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos.filter((t) => {
      if (statusFilter === 'pending' && t.completed) return false;
      if (statusFilter === 'completed' && !t.completed) return false;
      if (q) {
        return (
          t.title.toLowerCase().includes(q) ||
          t.assignees.some((a) => a.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [todos, statusFilter, search]);

  const windowStartMs = timelineDates[0].getTime();
  const windowEndMs = timelineDates[timelineDates.length - 1].getTime() + DAY_MS;

  const rangeLabel = `${timelineDates[0].toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })} – ${timelineDates[timelineDates.length - 1].toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <WorkspaceModuleShell
      activeModule="gantt"
      title="Gantt Timeline"
      subtitle={rangeLabel}
      rightActions={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.listSwitchBtn}
            onPress={() => navigation.navigate('TodoList')}
            accessibilityRole="button"
            accessibilityLabel="Switch to task list"
          >
            <Text style={styles.listSwitchText}>≡ List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              setEditingTodo(null);
              setFormVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Create task"
          >
            <Text style={styles.createBtnText}>+ Task</Text>
          </TouchableOpacity>
        </View>
      }
      subHeader={
        <View style={styles.controlsBar}>
          {/* Search + Status Row */}
          <View style={styles.topFilterRow}>
            <View style={styles.searchBox}>
              <Search size={14} color="#94A3B8" strokeWidth={2.2} style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Filter timeline tasks..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {(['all', 'pending', 'completed'] as const).map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.statusChip, statusFilter === st && styles.statusChipActive]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    statusFilter === st && styles.statusChipTextActive,
                  ]}
                >
                  {st === 'all' ? 'All' : st === 'pending' ? 'Open' : 'Done'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Navigation (Previous / Today / Next) + 14d / 28d Scale */}
          <View style={styles.navScaleRow}>
            <View style={styles.navBtns}>
              <TouchableOpacity
                onPress={() => setWindowOffsetWeeks((w) => w - 1)}
                style={styles.navArrowBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
              >
                <Text style={styles.navArrowText}>‹ Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWindowOffsetWeeks(0)}
                style={styles.todayBtn}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setWindowOffsetWeeks((w) => w + 1)}
                style={styles.navArrowBtn}
                accessibilityRole="button"
                accessibilityLabel="Next week"
              >
                <Text style={styles.navArrowText}>Next ›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.scaleToggle}>
              {([14, 28] as const).map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.scalePill, scaleDays === days && styles.scalePillActive]}
                  onPress={() => setScaleDays(days)}
                >
                  <Text
                    style={[
                      styles.scalePillText,
                      scaleDays === days && styles.scalePillTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      }
    >
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={todosQuery.isRefetching}
            onRefresh={() => {
              void todosQuery.refetch();
            }}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {todosQuery.isLoading ? (
          <WorkspaceLoadingBlock message="Loading Gantt timeline..." />
        ) : todosQuery.isError ? (
          <WorkspaceErrorBlock
            message={(todosQuery.error as any)?.message || 'Failed to load timeline tasks.'}
            onRetry={() => {
              void todosQuery.refetch();
            }}
          />
        ) : filteredTodos.length === 0 ? (
          <WorkspaceEmptyBlock
            title="No Tasks Found"
            description="Create a task with start and due dates to visualize it on the Gantt timeline."
            actionLabel="Create Task"
            onAction={() => {
              setEditingTodo(null);
              setFormVisible(true);
            }}
          />
        ) : (
          <View style={styles.matrixCard}>
            {/* Left Pinned Task Column */}
            <View style={[styles.pinnedCol, { width: pinnedWidth }]}>
              <View style={styles.pinnedHeader}>
                <Text style={styles.pinnedHeaderText}>
                  Task & Assignees ({filteredTodos.length})
                </Text>
              </View>

              {filteredTodos.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.pinnedRow}
                  onPress={() => setSelectedTask(task)}
                  accessibilityRole="button"
                  accessibilityLabel={`Inspect ${task.title}`}
                >
                  <View
                    style={[
                      styles.priorityDot,
                      { backgroundColor: getTodoPriorityColor(task.priority) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pinnedTaskTitle,
                        task.completed && styles.completedStrike,
                      ]}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                    <Text style={styles.pinnedMetaText} numberOfLines={1}>
                      {task.progress}%
                      {task.assignees.length > 0
                        ? ` • ${task.assignees.map((a) => a.name.split(' ')[0]).join(', ')}`
                        : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Right Horizontally Scrollable Date Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Date Header Row */}
                <View style={styles.dateHeaderRow}>
                  {timelineDates.map((d, idx) => {
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const isToday = d.getTime() === todayStart.getTime();
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.dateHeaderCell,
                          { width: cellWidth },
                          isWeekend && styles.weekendCell,
                          isToday && styles.todayHeaderCell,
                        ]}
                      >
                        <Text style={[styles.dayOfWeekText, isToday && styles.todayAccentText]}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()].slice(
                            0,
                            2
                          )}
                        </Text>
                        <Text style={[styles.dayNumText, isToday && styles.todayAccentText]}>
                          {d.getDate()}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Task Rows with Proportional Priority/Status Bars */}
                {filteredTodos.map((task) => {
                  const sMs = parseLocalYmd(task.startDate).getTime();
                  const eMs = Math.max(sMs + DAY_MS, parseLocalYmd(task.dueDate).getTime() + DAY_MS);

                  const overlapsWindow = eMs > windowStartMs && sMs < windowEndMs;
                  const clampedStart = Math.max(windowStartMs, sMs);
                  const clampedEnd = Math.min(windowEndMs, eMs);

                  const offsetDays = (clampedStart - windowStartMs) / DAY_MS;
                  const spanDays = Math.max(0.6, (clampedEnd - clampedStart) / DAY_MS);

                  const barLeft = offsetDays * cellWidth + 2;
                  const barWidth = Math.max(26, spanDays * cellWidth - 4);

                  const overdue = isTodoOverdue(task);
                  const barBaseColor = task.completed
                    ? '#10B981'
                    : overdue
                    ? '#EF4444'
                    : getTodoPriorityColor(task.priority);

                  return (
                    <View key={task.id} style={styles.gridRow}>
                      {timelineDates.map((d, idx) => {
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday = d.getTime() === todayStart.getTime();
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.gridCell,
                              { width: cellWidth },
                              isWeekend && styles.weekendCell,
                            ]}
                          >
                            {isToday && <View style={styles.todayVerticalLine} />}
                          </View>
                        );
                      })}

                      {overlapsWindow && (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => setSelectedTask(task)}
                          style={[
                            styles.ganttBar,
                            {
                              left: barLeft,
                              width: barWidth,
                              backgroundColor: `${barBaseColor}28`,
                              borderColor: barBaseColor,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.ganttBarFill,
                              {
                                width: `${task.progress}%`,
                                backgroundColor: `${barBaseColor}55`,
                              },
                            ]}
                          />
                          <Text
                            style={[styles.ganttBarLabel, { color: '#0F172A' }]}
                            numberOfLines={1}
                          >
                            {task.title} ({task.progress}%)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Shared Task Detail Inspector Sheet */}
      <TodoTaskInspectorSheet
        todo={selectedTask}
        categories={categories}
        currentUserId={user?.id || ''}
        isAdminPersona={isAdminPersona}
        onClose={() => setSelectedTask(null)}
        onEditPress={(t) => {
          setSelectedTask(null);
          setEditingTodo(t);
          setFormVisible(true);
        }}
        onOpenCalendar={(dueDate) =>
          navigation.navigate('CalendarMain', { focusDate: dueDate })
        }
        onMutated={(updated) => {
          if (updated === null) {
            setSelectedTask(null);
          } else if (updated) {
            setSelectedTask(updated);
          }
          invalidateTodoAndCalendar();
        }}
      />

      {/* Shared Create / Reschedule Modal */}
      <TodoTaskFormModal
        visible={formVisible}
        editingTodo={editingTodo}
        categories={categories}
        assignees={assigneesQuery.data || []}
        onClose={() => {
          setFormVisible(false);
          setEditingTodo(null);
        }}
        onOpenCategories={() => {
          setFormVisible(false);
          setCategoryModalVisible(true);
        }}
        onSaved={invalidateTodoAndCalendar}
      />

      {/* Shared Category Manager Modal */}
      <TodoCategoryManagerModal
        visible={categoryModalVisible}
        categories={categories}
        onClose={() => setCategoryModalVisible(false)}
        onChanged={() => {
          void queryClient.invalidateQueries({
            queryKey: createTenantQueryKey(['todos', 'categories']),
          });
          invalidateTodoAndCalendar();
        }}
      />
    </WorkspaceModuleShell>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listSwitchBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
  },
  listSwitchText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  createBtn: {
    minHeight: 36,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  controlsBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
  },
  statusChip: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
  },
  statusChipActive: {
    backgroundColor: '#1E1B4B',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navArrowBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  navArrowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  todayBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
  },
  todayBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  scaleToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    padding: 2,
  },
  scalePill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 7,
    justifyContent: 'center',
  },
  scalePillActive: {
    backgroundColor: '#FFFFFF',
  },
  scalePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scalePillTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  matrixCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pinnedCol: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1.5,
    borderRightColor: '#CBD5E1',
    zIndex: 5,
  },
  pinnedHeader: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pinnedHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  pinnedRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  pinnedTaskTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  completedStrike: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  pinnedMetaText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateHeaderCell: {
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
  dayOfWeekText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  todayAccentText: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    height: 52,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  gridCell: {
    height: 52,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    alignItems: 'center',
  },
  todayVerticalLine: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(79, 70, 229, 0.35)',
  },
  ganttBar: {
    position: 'absolute',
    top: 10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  ganttBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  ganttBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

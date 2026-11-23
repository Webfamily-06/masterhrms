import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text } from '../../../components/common/Text';
import {
  Tag,
  BarChart2,
  Search,
  Star,
  Check,
  Calendar,
  CheckSquare,
  MessageSquare,
  SlidersHorizontal,
  Share2,
  MoreHorizontal,
  User,
  Users,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useCallStore } from '../../../store/callStore';
import {
  WorkspaceModuleShell,
  WorkspaceLoadingBlock,
  WorkspaceErrorBlock,
  WorkspaceEmptyBlock,
} from '../../../components/workspace/WorkspaceModuleShell';
import { createTenantQueryKey } from '../../../core/query/tenantQueryKeys';
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

type TodoSortKey = 'created' | 'due' | 'priority' | 'progress';

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const TodoListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { hasAnyPermission, activeRole } = usePermission();

  const isAdminPersona =
    activeRole !== 'employee' &&
    (hasAnyPermission(['hrm.dashboard.view', 'hrm.manage', '*']) ||
      activeRole === 'hr_admin' ||
      activeRole === 'tenant_admin');

  // Filter & Sort state
  const [search, setSearch] = useState('');
  const [taskScope, setTaskScope] = useState<'all' | 'personal' | 'team'>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [starredOnly, setStarredOnly] = useState(false);
  const [sortBy, setSortBy] = useState<TodoSortKey>('created');

  // Modals & Drawers
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [createChooserVisible, setCreateChooserVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [actionTodo, setActionTodo] = useState<TodoItem | null>(null);
  const [shareTodo, setShareTodo] = useState<TodoItem | null>(null);
  const [shareEmail, setShareEmail] = useState('');

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

  // Sync selectedTodo when query data refreshes or deep-linked via route.params?.taskId
  useEffect(() => {
    const deepTaskId = route.params?.taskId;
    if (deepTaskId && todos.length > 0 && !selectedTodo) {
      const found = todos.find((t) => t.id === deepTaskId);
      if (found) setSelectedTodo(found);
    }
  }, [route.params?.taskId, todos, selectedTodo]);

  useEffect(() => {
    if (selectedTodo) {
      const fresh = todos.find((t) => t.id === selectedTodo.id);
      if (fresh) setSelectedTodo(fresh);
    }
  }, [todos, selectedTodo]);

  const invalidateTodoAndCalendar = () => {
    void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['todos']) });
    void queryClient.invalidateQueries({ queryKey: createTenantQueryKey(['calendar']) });
  };

  // KPI Overview Metrics (matches UnifiedTodoApp)
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const urgent = todos.filter(
      (t) => !t.completed && (t.priority === 'urgent' || t.priority === 'high')
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, pending, completed, urgent, rate };
  }, [todos]);

  // Filtered & Sorted Tasks
  const filteredTodos = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = todos.filter((t) => {
      if (taskScope === 'personal' && t.assignees.length > 1) return false;
      if (taskScope === 'team' && t.assignees.length <= 1) return false;
      if (statusTab === 'pending' && t.completed) return false;
      if (statusTab === 'completed' && !t.completed) return false;
      if (starredOnly && !t.starred) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && t.tag.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (q) {
        const assigneeMatch = t.assignees.some((a) => a.name.toLowerCase().includes(q));
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          assigneeMatch
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'due') {
        return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
      }
      if (sortBy === 'priority') {
        return (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0);
      }
      if (sortBy === 'progress') {
        return b.progress - a.progress;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [todos, taskScope, statusTab, starredOnly, priorityFilter, categoryFilter, search, sortBy]);

  const handleToggleComplete = async (item: TodoItem) => {
    try {
      const next = !item.completed;
      await TodoService.updateTodo(item.id, {
        completed: next,
        progress: next ? 100 : 0,
      });
      invalidateTodoAndCalendar();
    } catch (err: any) {
      Alert.alert('Update Error', err?.message || 'Unable to update task completion.');
    }
  };

  const handleToggleStar = async (item: TodoItem) => {
    try {
      await TodoService.updateTodo(item.id, { starred: !item.starred });
      invalidateTodoAndCalendar();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update favorite status.');
    }
  };

  const hasActiveFilter =
    Boolean(search.trim()) ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    starredOnly;

  return (
    <WorkspaceModuleShell
      activeModule="todo"
      title="Todo & Deliverables"
      rightActions={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.catBtn}
            onPress={() => setCategoryModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Manage task categories"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Tag size={12} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 4 }} />
              <Text style={styles.catBtnText}>Tags</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ganttSwitchBtn}
            onPress={() => navigation.navigate('GanttTimeline')}
            accessibilityRole="button"
            accessibilityLabel="Switch to Gantt timeline"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <BarChart2 size={12} color="#FFFFFF" strokeWidth={2.2} style={{ marginRight: 4 }} />
              <Text style={styles.catBtnText}>Gantt</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setCreateChooserVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Create task"
          >
            <Text style={styles.createBtnText}>+ Task</Text>
          </TouchableOpacity>
        </View>
      }
      subHeader={
        <View style={styles.toolbar}>
          {/* Personal vs Team Task Scope Switcher (Matches task/Tasks Screen - Personal / Team Task.png) */}
          <View style={styles.scopeTabsRow}>
            {(
              [
                { k: 'all', label: 'All Tasks' },
                { k: 'personal', label: 'Personal Task' },
                { k: 'team', label: 'Team Task' },
              ] as const
            ).map((sc) => (
              <TouchableOpacity
                key={sc.k}
                style={[styles.scopeTabBtn, taskScope === sc.k && styles.scopeTabBtnActive]}
                onPress={() => setTaskScope(sc.k)}
              >
                <Text style={[styles.scopeTabText, taskScope === sc.k && styles.scopeTabTextActive]}>
                  {sc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search + Starred + Filter Sheet + Sort Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search size={15} color="#94A3B8" strokeWidth={2.2} style={{ marginLeft: 8, marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search tasks, descriptions, assignees..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <TouchableOpacity
              style={[styles.iconFilterBtn, filterSheetVisible && styles.iconFilterBtnActive]}
              onPress={() => setFilterSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open task filters"
            >
              <SlidersHorizontal size={15} color="#4F46E5" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconFilterBtn, starredOnly && styles.iconFilterBtnActive]}
              onPress={() => setStarredOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Filter starred tasks"
            >
              <Star
                size={16}
                color={starredOnly ? '#F59E0B' : '#94A3B8'}
                fill={starredOnly ? '#F59E0B' : 'transparent'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortBtn}
              onPress={() =>
                setSortBy((s) =>
                  s === 'created'
                    ? 'due'
                    : s === 'due'
                    ? 'priority'
                    : s === 'priority'
                    ? 'progress'
                    : 'created'
                )
              }
            >
              <Text style={styles.sortBtnText}>⇅ {sortBy.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* Status Segmented Tabs with Live Counts */}
          <View style={styles.statusTabs}>
            {(
              [
                { k: 'all', label: `All (${stats.total})` },
                { k: 'pending', label: `Pending (${stats.pending})` },
                { k: 'completed', label: `Done (${stats.completed})` },
              ] as const
            ).map((t) => (
              <TouchableOpacity
                key={t.k}
                style={[styles.statusTab, statusTab === t.k && styles.statusTabActive]}
                onPress={() => setStatusTab(t.k)}
              >
                <Text
                  style={[
                    styles.statusTabText,
                    statusTab === t.k && styles.statusTabTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority & Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <TouchableOpacity
                key={`prio-${p}`}
                style={[styles.chip, priorityFilter === p && styles.chipActive]}
                onPress={() => setPriorityFilter(p)}
              >
                <Text style={[styles.chipText, priorityFilter === p && styles.chipTextActive]}>
                  {p === 'all' ? 'All Priority' : p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
            {categories.map((cat) => {
              const active = categoryFilter.toLowerCase() === cat.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={`cat-${cat.id}`}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryFilter(active ? 'all' : cat.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    #{cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {hasActiveFilter && (
              <TouchableOpacity
                style={styles.resetChip}
                onPress={() => {
                  setSearch('');
                  setPriorityFilter('all');
                  setCategoryFilter('all');
                  setStarredOnly(false);
                }}
              >
                <Text style={styles.resetChipText}>Reset</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* 4 KPI Overview Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{stats.total}</Text>
            <Text style={styles.kpiLbl}>Deliverables</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#4F46E5' }]}>{stats.pending}</Text>
            <Text style={styles.kpiLbl}>Pending</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#10B981' }]}>{stats.completed}</Text>
            <Text style={styles.kpiLbl}>Done ({stats.rate}%)</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#DC2626' }]}>{stats.urgent}</Text>
            <Text style={styles.kpiLbl}>High / Urgent</Text>
          </View>
        </View>

        {todosQuery.isLoading ? (
          <WorkspaceLoadingBlock message="Loading authorized workspace tasks..." />
        ) : todosQuery.isError ? (
          <WorkspaceErrorBlock
            message={(todosQuery.error as any)?.message || 'Failed to load workspace tasks.'}
            onRetry={() => {
              void todosQuery.refetch();
            }}
          />
        ) : filteredTodos.length === 0 ? (
          <WorkspaceEmptyBlock
            title="No Tasks Match Criteria"
            description="Adjust your search or filters, or create a new deliverable."
            actionLabel="Create Task"
            onAction={() => {
              setEditingTodo(null);
              setFormVisible(true);
            }}
          />
        ) : (
          filteredTodos.map((item) => {
            const overdue = isTodoOverdue(item);
            const cat = categories.find((c) => c.id.toLowerCase() === item.tag.toLowerCase());
            const doneSubs = item.checklist.filter((c) => c.done).length;
            const accentColor = item.completed
              ? '#10B981'
              : overdue
              ? '#EF4444'
              : '#4F46E5';

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskCard, item.completed && styles.taskCardCompleted]}
                onPress={() => setSelectedTodo(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

                <View style={styles.cardInner}>
                  <View style={styles.cardTopRow}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        item.completed && styles.checkboxChecked,
                      ]}
                      onPress={() => handleToggleComplete(item)}
                    >
                      {item.completed && <Check size={14} color="#FFFFFF" strokeWidth={2.6} />}
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.taskTitle,
                        item.completed && styles.taskTitleDone,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleToggleStar(item)}
                      style={{ paddingHorizontal: 4 }}
                    >
                      <Star
                        size={16}
                        color={item.starred ? '#F59E0B' : '#94A3B8'}
                        fill={item.starred ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </View>

                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaBadgesRow}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: `${getTodoPriorityColor(item.priority)}16` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: getTodoPriorityColor(item.priority) },
                        ]}
                      >
                        {item.priority.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: `${cat?.color || '#4F46E5'}16` },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: cat?.color || '#4F46E5' }]}>
                        {cat?.name || item.tag}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Calendar size={11} color={overdue ? '#DC2626' : '#64748B'} strokeWidth={2} style={{ marginRight: 3 }} />
                      <Text style={[styles.metaSmall, overdue && { color: '#DC2626' }]}>
                        {item.dueDate}
                        {overdue ? ' (Overdue)' : ''}
                      </Text>
                    </View>

                    {item.checklist.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <CheckSquare size={11} color="#64748B" strokeWidth={2} style={{ marginRight: 3 }} />
                        <Text style={styles.metaSmall}>
                          {doneSubs}/{item.checklist.length}
                        </Text>
                      </View>
                    )}

                    {item.comments.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MessageSquare size={11} color="#64748B" strokeWidth={2} style={{ marginRight: 3 }} />
                        <Text style={styles.metaSmall}>{item.comments.length}</Text>
                      </View>
                    )}
                  </View>

                  {/* Assignees + Progress Bar Footer */}
                  <View style={styles.cardFooterRow}>
                    <View style={styles.avatarStack}>
                      {item.assignees.slice(0, 3).map((a) => (
                        <View key={a.id} style={styles.miniAvatar}>
                          <Text style={styles.miniAvatarText}>
                            {a.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                      {item.assignees.length > 3 && (
                        <Text style={styles.metaSmall}>+{item.assignees.length - 3}</Text>
                      )}
                    </View>

                    <View style={styles.progressMiniWrap}>
                      <View style={styles.progressMiniTrack}>
                        <View
                          style={[
                            styles.progressMiniFill,
                            {
                              width: `${item.progress}%`,
                              backgroundColor: item.completed ? '#10B981' : '#4F46E5',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressMiniLabel}>{item.progress}%</Text>
                      <TouchableOpacity
                        style={styles.cardMoreTrigger}
                        onPress={() => setActionTodo(item)}
                        accessibilityRole="button"
                        accessibilityLabel="Task options"
                      >
                        <MoreHorizontal size={15} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Shared Task Detail Drawer */}
      <TodoTaskInspectorSheet
        todo={selectedTodo}
        categories={categories}
        currentUserId={user?.id || ''}
        isAdminPersona={isAdminPersona}
        onClose={() => setSelectedTodo(null)}
        onEditPress={(t) => {
          setSelectedTodo(null);
          setEditingTodo(t);
          setFormVisible(true);
        }}
        onOpenCalendar={(dueDate) =>
          navigation.navigate('CalendarMain', { focusDate: dueDate })
        }
        onMutated={(updated) => {
          if (updated === null) {
            setSelectedTodo(null);
          } else if (updated) {
            setSelectedTodo(updated);
          }
          invalidateTodoAndCalendar();
        }}
      />

      {/* Shared Create / Edit Task Modal */}
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

      {/* Create New Chooser Sheet (Matches task/Homepage - Create New.png) */}
      <Modal
        visible={createChooserVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateChooserVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setCreateChooserVisible(false)}
        >
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Create New</Text>
              <TouchableOpacity onPress={() => setCreateChooserVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                setCreateChooserVisible(false);
                setTaskScope('personal');
                setEditingTodo(null);
                setFormVisible(true);
              }}
            >
              <User size={18} color="#4F46E5" />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Personal Task</Text>
                <Text style={styles.sheetOptionSub}>Private deliverable tracked in your personal list</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                setCreateChooserVisible(false);
                setTaskScope('team');
                setEditingTodo(null);
                setFormVisible(true);
              }}
            >
              <Users size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Team Task</Text>
                <Text style={styles.sheetOptionSub}>Assign teammates, subtasks & shared progress</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Open Filter Bottom Sheet (Matches task/Tasks Screen - Team Task - Open Filter.png) */}
      <Modal
        visible={filterSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setFilterSheetVisible(false)}
        >
          <View style={styles.sheetCard} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setFilterSheetVisible(false)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetLabel}>Workspace Scope</Text>
            <View style={styles.sheetChipRow}>
              {(['all', 'personal', 'team'] as const).map((sc) => (
                <TouchableOpacity
                  key={sc}
                  style={[styles.sheetChip, taskScope === sc && styles.sheetChipActive]}
                  onPress={() => setTaskScope(sc)}
                >
                  <Text style={[styles.sheetChipText, taskScope === sc && styles.sheetChipTextActive]}>
                    {sc.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sheetLabel}>Priority</Text>
            <View style={styles.sheetChipRow}>
              {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.sheetChip, priorityFilter === p && styles.sheetChipActive]}
                  onPress={() => setPriorityFilter(p)}
                >
                  <Text style={[styles.sheetChipText, priorityFilter === p && styles.sheetChipTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.sheetPrimaryBtn}
              onPress={() => setFilterSheetVisible(false)}
            >
              <Text style={styles.sheetPrimaryBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Task Options Action Sheet (Matches task/Task View - Option.png & Open Action.png) */}
      <Modal
        visible={!!actionTodo}
        animationType="fade"
        transparent
        onRequestClose={() => setActionTodo(null)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setActionTodo(null)}
        >
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {actionTodo?.title}
            </Text>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                const target = actionTodo;
                setActionTodo(null);
                if (target) {
                  setEditingTodo(target);
                  setFormVisible(true);
                }
              }}
            >
              <CheckSquare size={17} color="#4F46E5" />
              <Text style={styles.sheetOptionTitle}>Edit Task Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                const target = actionTodo;
                setActionTodo(null);
                if (target) setShareTodo(target);
              }}
            >
              <Share2 size={17} color="#0EA5E9" />
              <Text style={styles.sheetOptionTitle}>Share Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                const target = actionTodo;
                setActionTodo(null);
                if (target) {
                  useCallStore.getState().showDynamicIsland({
                    type: 'goal_progress',
                    title: target.title,
                    subtitle: `${target.priority.toUpperCase()} Priority • ${target.progress}%`,
                    metricValue: `${target.progress}%`,
                    progress: target.progress,
                    mode: 'expanded',
                    targetRoute: 'TodoList',
                  });
                }
              }}
            >
              <Sparkles size={17} color="#F59E0B" />
              <Text style={styles.sheetOptionTitle}>Pin Progress to Dynamic Island</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Task Share Modal (Matches task/Task View - Share.png) */}
      <Modal
        visible={!!shareTodo}
        animationType="slide"
        transparent
        onRequestClose={() => setShareTodo(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Share Task</Text>
              <TouchableOpacity onPress={() => setShareTodo(null)}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetOptionSub} numberOfLines={2}>
              Invite teammates to collaborate on "{shareTodo?.title}".
            </Text>
            <TextInput
              style={styles.shareInput}
              placeholder="Enter teammate email or @username..."
              placeholderTextColor="#94A3B8"
              value={shareEmail}
              onChangeText={setShareEmail}
            />
            <TouchableOpacity
              style={styles.sheetPrimaryBtn}
              onPress={async () => {
                if (!shareTodo) return;
                try {
                  const res = await TodoService.shareTodo(shareTodo.id, {
                    recipientEmail: shareEmail.trim() || undefined,
                  });
                  Alert.alert('Task Shared', `Shared with ${res.sharedWith} (${res.shareLink})`);
                  invalidateTodoAndCalendar();
                } catch (err: any) {
                  Alert.alert('Share Error', err?.message || 'Unable to share task.');
                } finally {
                  setShareEmail('');
                  setShareTodo(null);
                }
              }}
            >
              <Text style={styles.sheetPrimaryBtnText}>Send Invite / Copy Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </WorkspaceModuleShell>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catBtn: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
  },
  ganttSwitchBtn: {
    minHeight: 36,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
  },
  catBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
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
  toolbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  iconFilterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconFilterBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  sortBtn: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  statusTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  statusTab: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTabActive: {
    backgroundColor: '#FFFFFF',
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  chipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 5,
  },
  chipActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  resetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    width: '23%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  kpiLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  taskCardCompleted: {
    opacity: 0.72,
  },
  accentBar: {
    width: 5,
  },
  cardInner: {
    flex: 1,
    padding: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  taskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaSmall: {
    fontSize: 11,
    color: '#64748B',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
  },
  progressMiniWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressMiniTrack: {
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressMiniFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMiniLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  scopeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
    marginBottom: 8,
  },
  scopeTabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  scopeTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  scopeTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  scopeTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  cardMoreTrigger: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    marginLeft: 4,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sheetOptionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  sheetChipActive: {
    backgroundColor: '#4F46E5',
  },
  sheetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  sheetChipTextActive: {
    color: '#FFFFFF',
  },
  sheetPrimaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  sheetPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
  },
});

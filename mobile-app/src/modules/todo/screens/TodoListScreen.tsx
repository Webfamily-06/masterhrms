import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import {
  TodoService,
  TodoItem,
  TodoAssignee,
} from '../../../core/services/todoService';

export const TodoListScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Detail Modal
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('2026-11-20');
  const [assignees, setAssignees] = useState<TodoAssignee[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const loadTodos = useCallback(async () => {
    try {
      setLoading(true);
      const [todoList, assList] = await Promise.all([
        TodoService.getTodos({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
          search: search.trim() || undefined,
        }),
        TodoService.getAssignees(),
      ]);
      setTodos(todoList);
      setAssignees(assList);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleToggleTaskStatus = async (item: TodoItem) => {
    const nextStatus = item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const nextProgress = nextStatus === 'COMPLETED' ? 100 : 0;
    try {
      await TodoService.updateTodo(item.id, {
        status: nextStatus,
        progress: nextProgress,
      });
      loadTodos();
    } catch {
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  const handleAddChecklist = async () => {
    if (!selectedTodo || !newChecklistText.trim()) return;
    try {
      const added = await TodoService.addChecklistItem(selectedTodo.id, newChecklistText.trim());
      if (added) {
        setSelectedTodo({
          ...selectedTodo,
          checklist: [...(selectedTodo.checklist || []), added],
        });
        setNewChecklistText('');
        loadTodos();
      }
    } catch {
      Alert.alert('Error', 'Failed to add checklist item.');
    }
  };

  const handleToggleChecklist = async (itemId: string, currentCompleted: boolean) => {
    if (!selectedTodo) return;
    try {
      await TodoService.updateChecklistItem(selectedTodo.id, itemId, !currentCompleted);
      const updatedList = (selectedTodo.checklist || []).map((c) =>
        c.id === itemId ? { ...c, completed: !currentCompleted } : c
      );
      setSelectedTodo({ ...selectedTodo, checklist: updatedList });
      loadTodos();
    } catch {
      Alert.alert('Error', 'Failed to update checklist.');
    }
  };

  const handleAddComment = async () => {
    if (!selectedTodo || !newCommentText.trim()) return;
    try {
      const added = await TodoService.addComment(selectedTodo.id, newCommentText.trim());
      if (added) {
        setSelectedTodo({
          ...selectedTodo,
          comments: [...(selectedTodo.comments || []), added],
        });
        setNewCommentText('');
      }
    } catch {
      Alert.alert('Error', 'Failed to post comment.');
    }
  };

  const handleCreateTodo = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }
    try {
      setCreating(true);
      await TodoService.createTodo({
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        dueDate: newDueDate,
        startDate: '2026-11-16',
        status: 'PENDING',
        progress: 0,
      });
      setCreateModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      loadTodos();
      Alert.alert('Task Created', 'Work item scheduled successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MEDIUM': return '#3B82F6';
      default: return '#10B981';
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
        <Text style={styles.headerTitle}>Tasks & Action Items</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('GanttTimeline')}
            style={styles.ganttBtn}
            accessibilityRole="button"
            accessibilityLabel="Gantt timeline"
          >
            <Text style={styles.ganttBtnText}>📊 Gantt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCreateModalVisible(true)}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="New task"
          >
            <Text style={styles.addBtnText}>+ Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks, action items, tags..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.statusTabs}>
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.statusTab, statusFilter === tab && styles.statusTabActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === tab && styles.statusTabTextActive,
              ]}
            >
              {tab.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Priority Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.priorityFilterScroll}
      >
        {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityChip, priorityFilter === p && styles.priorityChipActive]}
            onPress={() => setPriorityFilter(p)}
          >
            <Text
              style={[
                styles.priorityChipText,
                priorityFilter === p && styles.priorityChipTextActive,
              ]}
            >
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tasks List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color="#4F46E5" style={styles.loader} />
        ) : todos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySubtitle}>
              Create a new task to assign work items, checklists, and track milestones.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.emptyBtnText}>Create New Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todos.map((item) => {
            const isDone = item.status === 'COMPLETED';
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskCard, isDone && styles.taskCardDone]}
                onPress={() => setSelectedTodo(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <TouchableOpacity
                  style={[styles.checkbox, isDone && styles.checkboxChecked]}
                  onPress={() => handleToggleTaskStatus(item)}
                >
                  {isDone && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}

                  <View style={styles.taskMetaRow}>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: `${getPriorityColor(item.priority)}15` },
                      ]}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: getPriorityColor(item.priority) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityText,
                          { color: getPriorityColor(item.priority) },
                        ]}
                      >
                        {item.priority}
                      </Text>
                    </View>

                    {item.dueDate ? (
                      <Text style={styles.dueDateText}>📅 Due: {item.dueDate}</Text>
                    ) : null}

                    {item.checklist && item.checklist.length > 0 ? (
                      <Text style={styles.checklistCount}>
                        ☑️ {item.checklist.filter((c) => c.completed).length}/
                        {item.checklist.length}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.taskRight}>
                  <Text style={styles.progressText}>{item.progress}%</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Task Detail Modal */}
      <Modal visible={!!selectedTodo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTodo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedTodo.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedTodo(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedTodo.description ? (
                    <Text style={styles.detailDesc}>{selectedTodo.description}</Text>
                  ) : null}

                  <View style={styles.detailMetaGrid}>
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>Status</Text>
                      <Text style={styles.detailMetaVal}>{selectedTodo.status}</Text>
                    </View>
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>Priority</Text>
                      <Text
                        style={[
                          styles.detailMetaVal,
                          { color: getPriorityColor(selectedTodo.priority) },
                        ]}
                      >
                        {selectedTodo.priority}
                      </Text>
                    </View>
                    <View style={styles.detailMetaItem}>
                      <Text style={styles.detailMetaLabel}>Due Date</Text>
                      <Text style={styles.detailMetaVal}>{selectedTodo.dueDate || 'None'}</Text>
                    </View>
                  </View>

                  {/* Checklist Subtasks */}
                  <Text style={styles.sectionHeader}>Checklist Subtasks</Text>
                  {(selectedTodo.checklist || []).map((chk) => (
                    <TouchableOpacity
                      key={chk.id}
                      style={styles.checkRow}
                      onPress={() => handleToggleChecklist(chk.id, chk.completed)}
                    >
                      <View
                        style={[
                          styles.subCheckbox,
                          chk.completed && styles.subCheckboxChecked,
                        ]}
                      >
                        {chk.completed && <Text style={styles.checkIcon}>✓</Text>}
                      </View>
                      <Text
                        style={[
                          styles.checkText,
                          chk.completed && styles.checkTextDone,
                        ]}
                      >
                        {chk.text}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.addChecklistRow}>
                    <TextInput
                      style={styles.addChecklistInput}
                      placeholder="Add subtask item..."
                      placeholderTextColor="#94A3B8"
                      value={newChecklistText}
                      onChangeText={setNewChecklistText}
                    />
                    <TouchableOpacity
                      style={styles.addChecklistBtn}
                      onPress={handleAddChecklist}
                    >
                      <Text style={styles.addChecklistBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Comments Stream */}
                  <Text style={styles.sectionHeader}>Discussion & Comments</Text>
                  {(selectedTodo.comments || []).map((comm) => (
                    <View key={comm.id} style={styles.commentItem}>
                      <Text style={styles.commentAuthor}>{comm.userName}</Text>
                      <Text style={styles.commentText}>{comm.text}</Text>
                    </View>
                  ))}

                  <View style={styles.addCommentRow}>
                    <TextInput
                      style={styles.addCommentInput}
                      placeholder="Add a remark or update..."
                      placeholderTextColor="#94A3B8"
                      value={newCommentText}
                      onChangeText={setNewCommentText}
                    />
                    <TouchableOpacity style={styles.addCommentBtn} onPress={handleAddComment}>
                      <Text style={styles.addCommentBtnText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Task Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Action Item</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Task Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Prepare Monthly Tax Filing"
                placeholderTextColor="#94A3B8"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Details, deliverable scope or acceptance criteria"
                placeholderTextColor="#94A3B8"
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />

              <Text style={styles.fieldLabel}>Priority</Text>
              <View style={styles.prioRow}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.prioPill,
                      newPriority === p && styles.prioPillActive,
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.prioPillText,
                        newPriority === p && styles.prioPillTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Due Date</Text>
              <TextInput
                style={styles.modalInput}
                value={newDueDate}
                onChangeText={setNewDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
              />

              {assignees.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Assign Team Members</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.assigneesScroll}
                  >
                    {assignees.map((a) => {
                      const isSelected = selectedAssigneeIds.includes(a.id);
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.assigneeChip, isSelected && styles.assigneeChipActive]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedAssigneeIds((prev) => prev.filter((id) => id !== a.id));
                            } else {
                              setSelectedAssigneeIds((prev) => [...prev, a.id]);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.assigneeChipText,
                              isSelected && styles.assigneeChipTextActive,
                            ]}
                          >
                            {a.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateTodo}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Task</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ganttBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  ganttBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  statusTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  statusTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusTabActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  taskCardDone: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  taskDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dueDateText: {
    fontSize: 11,
    color: '#64748B',
  },
  checklistCount: {
    fontSize: 11,
    color: '#64748B',
  },
  taskRight: {
    marginLeft: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
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
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 12,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  detailDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  detailMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  detailMetaItem: {
    flex: 1,
  },
  detailMetaLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  detailMetaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  subCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkText: {
    fontSize: 13,
    color: '#334155',
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  addChecklistInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginRight: 8,
  },
  addChecklistBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addChecklistBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  commentItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: '#334155',
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginRight: 8,
  },
  addCommentBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addCommentBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  prioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  prioPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  prioPillActive: {
    backgroundColor: '#4F46E5',
  },
  prioPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  prioPillTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  priorityFilterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  priorityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  assigneesScroll: {
    gap: 8,
    marginBottom: 14,
  },
  assigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  assigneeChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  assigneeChipTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
});

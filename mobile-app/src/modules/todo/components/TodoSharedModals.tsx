import React, { useState, useEffect, useMemo } from 'react';
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
import {
  TodoItem,
  TodoCategory,
  TodoAssignee,
  TodoPriority,
  TodoUpsertPayload,
  TodoService,
} from '../../../core/services/todoService';

const COLOR_SWATCHES = [
  '#4F46E5',
  '#0EA5E9',
  '#8B5CF6',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#EF4444',
  '#14B8A6',
];

export function getTodoPriorityColor(priority: TodoPriority | string): string {
  switch (String(priority).toLowerCase()) {
    case 'urgent':
      return '#DC2626';
    case 'high':
      return '#EA580C';
    case 'medium':
      return '#4F46E5';
    default:
      return '#10B981';
  }
}

export function isTodoOverdue(todo: TodoItem): boolean {
  if (todo.completed || !todo.dueDate) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(today.getDate()).padStart(2, '0')}`;
  return todo.dueDate < todayStr;
}

// ─────────────────────────────────────────────────────────────
// 1. TASK DETAIL INSPECTOR BOTTOM SHEET / DRAWER
// ─────────────────────────────────────────────────────────────
export interface TodoTaskInspectorSheetProps {
  todo: TodoItem | null;
  categories: TodoCategory[];
  currentUserId: string;
  isAdminPersona: boolean;
  onClose: () => void;
  onEditPress: (todo: TodoItem) => void;
  onOpenCalendar?: (dueDate: string) => void;
  onMutated: (updatedTodo?: TodoItem | null) => void;
}

export const TodoTaskInspectorSheet: React.FC<TodoTaskInspectorSheetProps> = ({
  todo,
  categories,
  currentUserId,
  isAdminPersona,
  onClose,
  onEditPress,
  onOpenCalendar,
  onMutated,
}) => {
  const [activeTab, setActiveTab] = useState<'checklist' | 'comments' | 'activity'>('checklist');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActiveTab('checklist');
    setSubtaskInput('');
    setCommentInput('');
  }, [todo?.id]);

  if (!todo) return null;

  // Backend authorization parity: owner or admin can edit metadata / delete; assignees can update progress, checklist & comments
  const canEditMetadata = Boolean(
    todo.isCreator || todo.userId === currentUserId || isAdminPersona
  );
  const canDelete = canEditMetadata;
  const overdue = isTodoOverdue(todo);
  const catObj = categories.find((c) => c.id.toLowerCase() === todo.tag.toLowerCase());

  const handleToggleComplete = async () => {
    try {
      setBusy(true);
      const nextCompleted = !todo.completed;
      const updated = await TodoService.updateTodo(todo.id, {
        completed: nextCompleted,
        progress: nextCompleted ? 100 : 0,
      });
      onMutated(updated);
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Unable to update task completion.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStar = async () => {
    try {
      const updated = await TodoService.updateTodo(todo.id, {
        starred: !todo.starred,
      });
      onMutated(updated);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to update favorite status.');
    }
  };

  const handleAddSubtask = async () => {
    const text = subtaskInput.trim();
    if (!text || busy) return;
    try {
      setBusy(true);
      const res = await TodoService.addChecklistItem(todo.id, text);
      setSubtaskInput('');
      onMutated({
        ...todo,
        checklist: res.checklist,
        progress: res.progress ?? todo.progress,
      });
    } catch (err: any) {
      Alert.alert('Subtask Error', err?.message || 'Unable to add checklist item.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSubtask = async (itemId: string, currentDone: boolean) => {
    try {
      const res = await TodoService.toggleChecklistItem(todo.id, itemId, !currentDone);
      onMutated({
        ...todo,
        checklist: res.checklist,
        progress: res.progress,
        completed: res.completed,
      });
    } catch (err: any) {
      Alert.alert('Subtask Error', err?.message || 'Unable to toggle subtask.');
    }
  };

  const handleDeleteSubtask = async (itemId: string) => {
    try {
      const res = await TodoService.deleteChecklistItem(todo.id, itemId);
      onMutated({
        ...todo,
        checklist: res.checklist,
        progress: res.progress,
      });
    } catch (err: any) {
      Alert.alert('Subtask Error', err?.message || 'Unable to remove subtask.');
    }
  };

  const handlePostComment = async () => {
    const text = commentInput.trim();
    if (!text || busy) return;
    try {
      setBusy(true);
      const added = await TodoService.addComment(todo.id, text);
      setCommentInput('');
      onMutated({
        ...todo,
        comments: [...todo.comments, added],
      });
    } catch (err: any) {
      Alert.alert('Comment Error', err?.message || 'Unable to post comment.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTask = () => {
    Alert.alert(
      'Delete Task',
      `Delete "${todo.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await TodoService.deleteTodo(todo.id);
              onMutated(null);
              onClose();
            } catch (err: any) {
              Alert.alert('Delete Denied', err?.message || 'You are not authorized to delete this task.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={!!todo} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: '90%' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.taskIdBadge}>#{todo.id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.sheetTitle}>{todo.title}</Text>
            </View>
            <TouchableOpacity onPress={handleToggleStar} style={styles.starBtn}>
              <Text style={{ fontSize: 20 }}>{todo.starred ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Complete + Edit Action Strip */}
            <View style={styles.topActionRow}>
              <TouchableOpacity
                style={[
                  styles.completeToggleBtn,
                  todo.completed && styles.completeToggleBtnDone,
                ]}
                onPress={handleToggleComplete}
                disabled={busy}
              >
                <Text style={styles.completeToggleText}>
                  {todo.completed ? '✓ Completed' : 'Mark Completed'}
                </Text>
              </TouchableOpacity>

              {canEditMetadata && (
                <TouchableOpacity
                  style={styles.editActionBtn}
                  onPress={() => onEditPress(todo)}
                >
                  <Text style={styles.editActionText}>✏️ Edit / Reschedule</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Metadata Badges */}
            <View style={styles.badgesWrap}>
              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: `${getTodoPriorityColor(todo.priority)}18` },
                ]}
              >
                <Text
                  style={[
                    styles.metaPillText,
                    { color: getTodoPriorityColor(todo.priority) },
                  ]}
                >
                  {todo.priority.toUpperCase()}
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  { backgroundColor: `${catObj?.color || '#4F46E5'}18` },
                ]}
              >
                <Text
                  style={[styles.metaPillText, { color: catObj?.color || '#4F46E5' }]}
                >
                  {catObj?.name || todo.tag}
                </Text>
              </View>

              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>Start: {todo.startDate}</Text>
              </View>

              <View style={[styles.metaPill, overdue && { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.metaPillText, overdue && { color: '#DC2626' }]}>
                  Due: {todo.dueDate}
                  {overdue ? ' (Overdue)' : ''}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.sectionLabel}>Task Progress</Text>
                <Text style={styles.progressPct}>{todo.progress}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${todo.progress}%`,
                      backgroundColor: todo.completed ? '#10B981' : '#4F46E5',
                    },
                  ]}
                />
              </View>
            </View>

            {/* Assignees */}
            {todo.assignees.length > 0 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>
                  Assigned Team Members ({todo.assignees.length})
                </Text>
                <View style={styles.assigneesChipsWrap}>
                  {todo.assignees.map((a) => (
                    <View key={a.id} style={styles.assigneeChip}>
                      <Text style={styles.assigneeChipText}>{a.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            {todo.description ? (
              <View style={styles.descCard}>
                <Text style={styles.descText}>{todo.description}</Text>
              </View>
            ) : null}

            {/* 3 Sub-Tabs: Checklist | Comments | Activity */}
            <View style={styles.subTabsRow}>
              {(
                [
                  { k: 'checklist', label: `Checklist (${todo.checklist.length})` },
                  { k: 'comments', label: `Comments (${todo.comments.length})` },
                  { k: 'activity', label: 'Activity' },
                ] as const
              ).map((t) => (
                <TouchableOpacity
                  key={t.k}
                  style={[styles.subTab, activeTab === t.k && styles.subTabActive]}
                  onPress={() => setActiveTab(t.k)}
                >
                  <Text
                    style={[
                      styles.subTabText,
                      activeTab === t.k && styles.subTabTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'checklist' && (
              <View style={styles.tabBody}>
                {todo.checklist.length === 0 ? (
                  <Text style={styles.emptySubText}>
                    No subtasks added yet. Break this deliverable into steps.
                  </Text>
                ) : (
                  todo.checklist.map((chk) => (
                    <View key={chk.id} style={styles.checklistRow}>
                      <TouchableOpacity
                        style={styles.checklistTouch}
                        onPress={() => handleToggleSubtask(chk.id, chk.done)}
                      >
                        <Text style={{ fontSize: 16, marginRight: 8 }}>
                          {chk.done ? '☑️' : '⬜'}
                        </Text>
                        <Text
                          style={[
                            styles.checklistLabel,
                            chk.done && styles.checklistLabelDone,
                          ]}
                        >
                          {chk.text}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteSubtask(chk.id)}
                        style={styles.removeSubBtn}
                      >
                        <Text style={{ color: '#DC2626', fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <View style={styles.inlineInputRow}>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="Add subtask..."
                    placeholderTextColor="#94A3B8"
                    value={subtaskInput}
                    onChangeText={setSubtaskInput}
                  />
                  <TouchableOpacity
                    style={styles.inlineSendBtn}
                    onPress={handleAddSubtask}
                    disabled={!subtaskInput.trim() || busy}
                  >
                    <Text style={styles.inlineSendText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'comments' && (
              <View style={styles.tabBody}>
                {todo.comments.length === 0 ? (
                  <Text style={styles.emptySubText}>
                    No comments yet. Leave a status note or update.
                  </Text>
                ) : (
                  todo.comments.map((cm) => (
                    <View key={cm.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>{cm.author}</Text>
                        <Text style={styles.commentTime}>
                          {new Date(cm.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.commentBody}>{cm.text}</Text>
                    </View>
                  ))
                )}

                <View style={styles.inlineInputRow}>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="Write a comment..."
                    placeholderTextColor="#94A3B8"
                    value={commentInput}
                    onChangeText={setCommentInput}
                  />
                  <TouchableOpacity
                    style={styles.inlineSendBtn}
                    onPress={handlePostComment}
                    disabled={!commentInput.trim() || busy}
                  >
                    <Text style={styles.inlineSendText}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activeTab === 'activity' && (
              <View style={styles.tabBody}>
                {todo.activity.length === 0 ? (
                  <Text style={styles.emptySubText}>No activity recorded yet.</Text>
                ) : (
                  todo.activity.map((act) => (
                    <View key={act.id} style={styles.activityRow}>
                      <Text style={styles.commentBody}>• {act.text}</Text>
                      <Text style={styles.commentTime}>
                        {new Date(act.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Footer Sync & Delete */}
            <View style={styles.footerRow}>
              {onOpenCalendar && (
                <TouchableOpacity
                  style={styles.calendarSyncBtn}
                  onPress={() => {
                    const d = todo.dueDate;
                    onClose();
                    onOpenCalendar(d);
                  }}
                >
                  <Text style={styles.calendarSyncText}>🗓️ View in Calendar</Text>
                </TouchableOpacity>
              )}

              {canDelete && (
                <TouchableOpacity style={styles.deleteTaskBtn} onPress={handleDeleteTask}>
                  <Text style={styles.deleteTaskText}>🗑️ Delete Task</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// 2. CREATE / EDIT / RESCHEDULE TASK MODAL
// ─────────────────────────────────────────────────────────────
export interface TodoTaskFormModalProps {
  visible: boolean;
  editingTodo: TodoItem | null;
  categories: TodoCategory[];
  assignees: TodoAssignee[];
  onClose: () => void;
  onOpenCategories: () => void;
  onSaved: () => void;
}

export const TodoTaskFormModal: React.FC<TodoTaskFormModalProps> = ({
  visible,
  editingTodo,
  categories,
  assignees,
  onClose,
  onOpenCategories,
  onSaved,
}) => {
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const defaultDueStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [tag, setTag] = useState('internal');
  const [startDate, setStartDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueStr);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingTodo) {
      setTitle(editingTodo.title);
      setDescription(editingTodo.description || '');
      setPriority(editingTodo.priority);
      setTag(editingTodo.tag || 'internal');
      setStartDate(editingTodo.startDate || todayStr);
      setDueDate(editingTodo.dueDate || defaultDueStr);
      setSelectedAssigneeIds(editingTodo.assignees.map((a) => a.id));
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setTag(categories[0]?.id || 'internal');
      setStartDate(todayStr);
      setDueDate(defaultDueStr);
      setSelectedAssigneeIds([]);
    }
    setAssigneeSearch('');
  }, [editingTodo, visible, categories, todayStr, defaultDueStr]);

  const filteredAssignees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assignees;
    return assignees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.department || '').toLowerCase().includes(q) ||
        (a.role || '').toLowerCase().includes(q)
    );
  }, [assignees, assigneeSearch]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Task title is required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Validation', 'Enter Start Date and Due Date in YYYY-MM-DD format.');
      return;
    }
    if (dueDate < startDate) {
      Alert.alert('Validation', 'Due Date must be on or after Start Date.');
      return;
    }

    const payload: TodoUpsertPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      tag,
      startDate,
      dueDate,
      assignees: selectedAssigneeIds,
      progress: editingTodo ? editingTodo.progress : 0,
      starred: editingTodo ? editingTodo.starred : false,
    };

    try {
      setSaving(true);
      if (editingTodo) {
        await TodoService.updateTodo(editingTodo.id, payload);
      } else {
        await TodoService.createTodo(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Unable to save task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: '92%' }]}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>
              {editingTodo ? 'Edit / Reschedule Task' : 'Create New Task'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Finalize Monthly Statutory Audit"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 72 }]}
              placeholder="Scope, deliverables or notes..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.prioRow}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                const active = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.prioPill, active && styles.prioPillActive]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.prioPillText, active && { color: '#FFFFFF' }]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.labelWithLinkRow}>
              <Text style={styles.sectionLabel}>Category Tag</Text>
              <TouchableOpacity onPress={onOpenCategories}>
                <Text style={styles.manageLink}>Manage Categories</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
            >
              {categories.map((c) => {
                const active = tag.toLowerCase() === c.id.toLowerCase();
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, active && styles.prioPillActive]}
                    onPress={() => setTag(c.id)}
                  >
                    <Text style={[styles.prioPillText, active && { color: '#FFFFFF' }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.twoCols}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Start Date (Gantt)</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Due Date</Text>
                <TextInput
                  style={styles.input}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Multi-Assignee Directory Selector */}
            <View style={styles.labelWithLinkRow}>
              <Text style={styles.sectionLabel}>
                Assignees ({selectedAssigneeIds.length})
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedAssigneeIds((prev) =>
                      Array.from(new Set([...prev, ...filteredAssignees.map((a) => a.id)]))
                    )
                  }
                >
                  <Text style={styles.manageLink}>Select All</Text>
                </TouchableOpacity>
                {selectedAssigneeIds.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedAssigneeIds([])}>
                    <Text style={[styles.manageLink, { color: '#DC2626' }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Search workspace members..."
              placeholderTextColor="#94A3B8"
              value={assigneeSearch}
              onChangeText={setAssigneeSearch}
            />

            <ScrollView style={{ maxHeight: 170, marginBottom: 12 }} nestedScrollEnabled>
              {filteredAssignees.map((a) => {
                const selected = selectedAssigneeIds.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.assigneeRow, selected && styles.assigneeRowActive]}
                    onPress={() =>
                      setSelectedAssigneeIds((prev) =>
                        prev.includes(a.id)
                          ? prev.filter((id) => id !== a.id)
                          : [...prev, a.id]
                      )
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assigneeName}>{a.name}</Text>
                      <Text style={styles.commentTime}>
                        {a.department || a.role || a.email}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15 }}>{selected ? '☑️' : '⬜'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.submitBtn}
              disabled={saving}
              onPress={handleSave}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingTodo ? 'Save Changes' : 'Create Task'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────
// 3. CATEGORY MANAGER MODAL
// ─────────────────────────────────────────────────────────────
export interface TodoCategoryManagerModalProps {
  visible: boolean;
  categories: TodoCategory[];
  onClose: () => void;
  onChanged: () => void;
}

export const TodoCategoryManagerModal: React.FC<TodoCategoryManagerModalProps> = ({
  visible,
  categories,
  onClose,
  onChanged,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [editing, setEditing] = useState<TodoCategory | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    try {
      setSaving(true);
      if (editing) {
        await TodoService.updateCategory(editing.id, { name: name.trim(), color });
      } else {
        await TodoService.createCategory({ name: name.trim(), color });
      }
      setName('');
      setEditing(null);
      onChanged();
    } catch (err: any) {
      Alert.alert('Category Error', err?.message || 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: TodoCategory) => {
    try {
      await TodoService.deleteCategory(cat.id);
      onChanged();
    } catch (err: any) {
      Alert.alert('Delete Category Error', err?.message || 'Unable to delete category.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: '85%' }]}>
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>Manage Task Categories</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder={editing ? 'Rename category...' : 'New category name...'}
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.swatchesRow}>
            {COLOR_SWATCHES.map((hex) => (
              <TouchableOpacity
                key={hex}
                style={[
                  styles.swatch,
                  { backgroundColor: hex },
                  color === hex && styles.swatchActive,
                ]}
                onPress={() => setColor(hex)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.submitBtn}
            disabled={!name.trim() || saving}
            onPress={handleSave}
          >
            <Text style={styles.submitBtnText}>
              {editing ? 'Update Category' : '+ Add Category'}
            </Text>
          </TouchableOpacity>

          <ScrollView style={{ marginTop: 14, maxHeight: 240 }}>
            {categories.map((cat) => (
              <View key={cat.id} style={styles.checklistRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: cat.color,
                    }}
                  />
                  <Text style={styles.assigneeName}>{cat.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditing(cat);
                      setName(cat.name);
                      setColor(cat.color);
                    }}
                  >
                    <Text style={styles.manageLink}>Edit</Text>
                  </TouchableOpacity>
                  {cat.id.toLowerCase() !== 'internal' && (
                    <TouchableOpacity onPress={() => handleDelete(cat)}>
                      <Text style={[styles.manageLink, { color: '#DC2626' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskIdBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  starBtn: {
    padding: 6,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  completeToggleBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeToggleBtnDone: {
    backgroundColor: '#10B981',
  },
  completeToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  editActionBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActionText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  assigneesChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  assigneeChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  assigneeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  descCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  subTab: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  tabBody: {
    marginBottom: 14,
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748B',
    paddingVertical: 10,
  },
  checklistRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 4,
  },
  checklistTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checklistLabel: {
    fontSize: 13,
    color: '#0F172A',
    flex: 1,
  },
  checklistLabelDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  removeSubBtn: {
    padding: 6,
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  inlineInput: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  inlineSendBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineSendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  commentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  commentTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentBody: {
    fontSize: 13,
    color: '#1E293B',
  },
  activityRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  calendarSyncBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarSyncText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteTaskBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTaskText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  prioRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  prioPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prioPillActive: {
    backgroundColor: '#1E1B4B',
  },
  prioPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  labelWithLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 4,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 8,
  },
  assigneeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  assigneeRowActive: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  assigneeName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  submitBtn: {
    minHeight: 46,
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#0F172A',
  },
});

import { apiClient } from '../api/apiClient';
import { resolveSafeBackendUrl } from '../storage/attachmentHelper';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TodoCategory {
  id: string;
  name: string;
  color: string;
  bg?: string;
}

export interface TodoAssignee {
  id: string;
  userId?: string;
  name: string;
  email: string;
  type?: 'employee' | 'user' | string;
  role?: string;
  department?: string;
  avatar?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoComment {
  id: string;
  authorId?: string;
  author: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

export interface TodoActivityEntry {
  id: string;
  text: string;
  timestamp: string;
}

export interface TodoItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  priority: TodoPriority;
  tag: string;
  progress: number;
  startDate: string;
  dueDate: string;
  starred: boolean;
  assigneeId?: string | null;
  assignedTo?: string | null;
  assignees: TodoAssignee[];
  checklist: ChecklistItem[];
  comments: TodoComment[];
  activity: TodoActivityEntry[];
  isCreator: boolean;
  isAssignee: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TodoUpsertPayload {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TodoPriority;
  tag?: string;
  startDate?: string;
  dueDate?: string;
  progress?: number;
  starred?: boolean;
  assignees?: string[];
  assigneeId?: string | null;
  assignedTo?: string | null;
  checklist?: ChecklistItem[];
}

export const DEFAULT_TODO_CATEGORIES: TodoCategory[] = [
  { id: 'internal', name: 'Internal', color: '#4F46E5' },
  { id: 'projects', name: 'Projects', color: '#0EA5E9' },
  { id: 'meetings', name: 'Meetings', color: '#8B5CF6' },
  { id: 'reminder', name: 'Reminder', color: '#F59E0B' },
  { id: 'research', name: 'Research', color: '#10B981' },
  { id: 'operations', name: 'Operations', color: '#EC4899' },
];

function toYmdSafe(val?: string | null, fallbackOffsetDays = 0): string {
  if (val && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }
  if (val) {
    const parsed = new Date(val);
    if (!Number.isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  const base = new Date();
  base.setDate(base.getDate() + fallbackOffsetDays);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeTodoItem(raw: any): TodoItem {
  const rawPriority = String(raw?.priority || 'medium').toLowerCase();
  const priority: TodoPriority =
    rawPriority === 'urgent' ||
    rawPriority === 'high' ||
    rawPriority === 'low'
      ? rawPriority
      : 'medium';

  const completed =
    typeof raw?.completed === 'boolean'
      ? raw.completed
      : String(raw?.status || '').toUpperCase() === 'COMPLETED';

  const checklist: ChecklistItem[] = Array.isArray(raw?.checklist)
    ? raw.checklist.map((item: any, idx: number) => ({
        id: String(item?.id || `chk_${idx}`),
        text: String(item?.text || ''),
        done: Boolean(item?.done ?? item?.completed),
      }))
    : [];

  const comments: TodoComment[] = Array.isArray(raw?.comments)
    ? raw.comments.map((c: any, idx: number) => ({
        id: String(c?.id || `comm_${idx}`),
        authorId: c?.authorId || c?.userId,
        author: String(c?.author || c?.userName || 'Team Member'),
        avatar: resolveSafeBackendUrl(c?.avatar || c?.userAvatar) || undefined,
        text: String(c?.text || ''),
        createdAt: c?.createdAt || new Date().toISOString(),
      }))
    : [];

  const activity: TodoActivityEntry[] = Array.isArray(raw?.activity)
    ? raw.activity.map((a: any, idx: number) => ({
        id: String(a?.id || `act_${idx}`),
        text: String(a?.text || ''),
        timestamp: a?.timestamp || a?.createdAt || new Date().toISOString(),
      }))
    : [];

  const assignees: TodoAssignee[] = Array.isArray(raw?.assignees)
    ? raw.assignees.map((a: any) => ({
        id: String(a?.id || a?.userId || ''),
        userId: a?.userId ? String(a.userId) : undefined,
        name: String(a?.name || a?.email || 'Member'),
        email: String(a?.email || ''),
        type: a?.type,
        role: a?.role,
        department: a?.department,
        avatar: resolveSafeBackendUrl(a?.avatar || a?.avatarUrl) || undefined,
      }))
    : raw?.assignee?.id
    ? [
        {
          id: String(raw.assignee.id),
          name: String(raw.assignee.name || 'Member'),
          email: String(raw.assignee.email || ''),
          type: raw.assignee.type,
          avatar: resolveSafeBackendUrl(raw.assignee.avatar) || undefined,
        },
      ]
    : [];

  const createdAt = raw?.createdAt || new Date().toISOString();
  const startDate = toYmdSafe(raw?.startDate || createdAt, 0);
  const dueDate = toYmdSafe(raw?.dueDate, 5);

  const computedProgress =
    typeof raw?.progress === 'number'
      ? Math.max(0, Math.min(100, Math.round(raw.progress)))
      : completed
      ? 100
      : checklist.length > 0
      ? Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100)
      : 0;

  return {
    id: String(raw?.id || ''),
    userId: String(raw?.userId || raw?.creatorId || ''),
    title: String(raw?.title || 'Untitled Task'),
    description: String(raw?.description || ''),
    completed,
    priority,
    tag: String(raw?.tag || raw?.categoryId || 'internal'),
    progress: computedProgress,
    startDate,
    dueDate,
    starred: Boolean(raw?.starred),
    assigneeId: raw?.assigneeId || null,
    assignedTo: raw?.assignedTo || null,
    assignees,
    checklist,
    comments,
    activity,
    isCreator: Boolean(raw?.isCreator),
    isAssignee: Boolean(raw?.isAssignee),
    createdAt,
    updatedAt: raw?.updatedAt || createdAt,
  };
}

export class TodoService {
  // ── Categories ──────────────────────────────────────────────
  public static async getCategories(): Promise<TodoCategory[]> {
    try {
      const res = await apiClient.get('/api/todos/categories');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.categories)
        ? res.data.categories
        : Array.isArray(res.data)
        ? res.data
        : [];
      if (list.length === 0) return DEFAULT_TODO_CATEGORIES;
      return list.map((c: any) => ({
        id: String(c?.id || c?.name || 'internal'),
        name: String(c?.name || 'Internal'),
        color: String(c?.color || '#4F46E5'),
        bg: c?.bg,
      }));
    } catch {
      return DEFAULT_TODO_CATEGORIES;
    }
  }

  public static async createCategory(payload: {
    name: string;
    color: string;
  }): Promise<TodoCategory> {
    const res = await apiClient.post('/api/todos/categories', payload);
    const c = res.data?.data || res.data;
    return {
      id: String(c?.id || payload.name.toLowerCase()),
      name: String(c?.name || payload.name),
      color: String(c?.color || payload.color),
    };
  }

  public static async updateCategory(
    id: string,
    payload: { name?: string; color?: string }
  ): Promise<TodoCategory> {
    const res = await apiClient.put(`/api/todos/categories/${encodeURIComponent(id)}`, payload);
    const c = res.data?.data || res.data;
    return {
      id: String(c?.id || id),
      name: String(c?.name || payload.name || ''),
      color: String(c?.color || payload.color || '#4F46E5'),
    };
  }

  public static async deleteCategory(id: string): Promise<boolean> {
    await apiClient.delete(`/api/todos/categories/${encodeURIComponent(id)}`);
    return true;
  }

  // ── Eligible Tenant Assignees ───────────────────────────────
  public static async getAssignees(): Promise<TodoAssignee[]> {
    const res = await apiClient.get('/api/todos/assignees');
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.assignees)
      ? res.data.assignees
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map((a: any) => ({
      id: String(a?.id || a?.userId || ''),
      userId: a?.userId ? String(a.userId) : undefined,
      name: String(a?.name || a?.email || 'Member'),
      email: String(a?.email || ''),
      type: a?.type,
      role: a?.role,
      department: a?.department,
      avatar: resolveSafeBackendUrl(a?.avatar || a?.avatarUrl) || undefined,
    }));
  }

  // ── Tasks CRUD ──────────────────────────────────────────────
  public static async getTodos(params?: {
    scope?: 'all' | 'own';
  }): Promise<TodoItem[]> {
    const res = await apiClient.get('/api/todos', {
      params: params?.scope === 'all' ? { scope: 'all' } : undefined,
    });
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data?.todos)
      ? res.data.todos
      : Array.isArray(res.data)
      ? res.data
      : [];
    return list.map(normalizeTodoItem);
  }

  public static async createTodo(payload: TodoUpsertPayload): Promise<TodoItem> {
    const assigneeIds = payload.assignees || [];
    const body = {
      ...payload,
      assignees: assigneeIds,
      assigneeId: assigneeIds[0] || null,
      assignedTo: assigneeIds[0] || null,
    };
    const res = await apiClient.post('/api/todos', body);
    return normalizeTodoItem(res.data?.data || res.data?.todo || res.data);
  }

  public static async updateTodo(id: string, payload: TodoUpsertPayload): Promise<TodoItem> {
    const body: any = { ...payload };
    if (Array.isArray(payload.assignees)) {
      body.assigneeId = payload.assignees[0] || null;
      body.assignedTo = payload.assignees[0] || null;
    }
    const res = await apiClient.put(`/api/todos/${encodeURIComponent(id)}`, body);
    return normalizeTodoItem(res.data?.data || res.data?.todo || res.data);
  }

  public static async deleteTodo(id: string): Promise<boolean> {
    await apiClient.delete(`/api/todos/${encodeURIComponent(id)}`);
    return true;
  }

  // ── Checklist Subtasks & Comments ───────────────────────────
  public static async addChecklistItem(
    todoId: string,
    text: string
  ): Promise<{ checklist: ChecklistItem[]; progress?: number }> {
    const res = await apiClient.post(`/api/todos/${encodeURIComponent(todoId)}/checklist`, {
      text,
    });
    const data = res.data?.data || res.data;
    const rawList = Array.isArray(data?.checklist) ? data.checklist : [];
    return {
      checklist: rawList.map((c: any, idx: number) => ({
        id: String(c?.id || `chk_${idx}`),
        text: String(c?.text || ''),
        done: Boolean(c?.done ?? c?.completed),
      })),
      progress: typeof data?.progress === 'number' ? data.progress : undefined,
    };
  }

  public static async toggleChecklistItem(
    todoId: string,
    itemId: string,
    done: boolean
  ): Promise<{ checklist: ChecklistItem[]; progress: number; completed: boolean }> {
    const res = await apiClient.patch(
      `/api/todos/${encodeURIComponent(todoId)}/checklist/${encodeURIComponent(itemId)}`,
      { done }
    );
    const data = res.data?.data || res.data;
    const rawList = Array.isArray(data?.checklist) ? data.checklist : [];
    return {
      checklist: rawList.map((c: any, idx: number) => ({
        id: String(c?.id || `chk_${idx}`),
        text: String(c?.text || ''),
        done: Boolean(c?.done ?? c?.completed),
      })),
      progress: Number(data?.progress ?? 0),
      completed: Boolean(data?.completed),
    };
  }

  public static async deleteChecklistItem(
    todoId: string,
    itemId: string
  ): Promise<{ checklist: ChecklistItem[]; progress: number }> {
    const res = await apiClient.delete(
      `/api/todos/${encodeURIComponent(todoId)}/checklist/${encodeURIComponent(itemId)}`
    );
    const data = res.data?.data || res.data;
    const rawList = Array.isArray(data?.checklist) ? data.checklist : [];
    return {
      checklist: rawList.map((c: any, idx: number) => ({
        id: String(c?.id || `chk_${idx}`),
        text: String(c?.text || ''),
        done: Boolean(c?.done ?? c?.completed),
      })),
      progress: Number(data?.progress ?? 0),
    };
  }

  public static async addComment(todoId: string, text: string): Promise<TodoComment> {
    const res = await apiClient.post(`/api/todos/${encodeURIComponent(todoId)}/comments`, {
      text,
    });
    const c = res.data?.data || res.data?.comment || res.data;
    return {
      id: String(c?.id || `comm_${Date.now()}`),
      authorId: c?.authorId || c?.userId,
      author: String(c?.author || c?.userName || 'Team Member'),
      text: String(c?.text || text),
      createdAt: c?.createdAt || new Date().toISOString(),
    };
  }
}

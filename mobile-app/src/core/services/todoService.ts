import { apiClient } from '../api/apiClient';

export interface TodoCategory {
  id: string;
  name: string;
  color: string;
}

export interface TodoAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  progress: number;
  startDate?: string;
  dueDate?: string;
  starred?: boolean;
  categoryId?: string;
  category?: TodoCategory;
  assignees?: TodoAssignee[];
  checklist?: ChecklistItem[];
  comments?: TodoComment[];
  creatorId: string;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export class TodoService {
  public static async getCategories(): Promise<TodoCategory[]> {
    try {
      const res = await apiClient.get('/api/todos/categories');
      return res.data?.categories || res.data || [];
    } catch {
      return [];
    }
  }

  public static async getAssignees(): Promise<TodoAssignee[]> {
    try {
      const res = await apiClient.get('/api/todos/assignees');
      return res.data?.assignees || res.data || [];
    } catch {
      return [];
    }
  }

  public static async getTodos(params?: {
    status?: string;
    priority?: string;
    search?: string;
    sortBy?: string;
  }): Promise<TodoItem[]> {
    try {
      const res = await apiClient.get('/api/todos', { params });
      return res.data?.todos || res.data || [];
    } catch {
      return [];
    }
  }

  public static async createTodo(payload: Partial<TodoItem>): Promise<TodoItem | null> {
    const res = await apiClient.post('/api/todos', payload);
    return res.data?.todo || res.data;
  }

  public static async updateTodo(id: string, payload: Partial<TodoItem>): Promise<TodoItem | null> {
    const res = await apiClient.put(`/api/todos/${id}`, payload);
    return res.data?.todo || res.data;
  }

  public static async deleteTodo(id: string): Promise<boolean> {
    await apiClient.delete(`/api/todos/${id}`);
    return true;
  }

  public static async addChecklistItem(todoId: string, text: string): Promise<ChecklistItem | null> {
    const res = await apiClient.post(`/api/todos/${todoId}/checklist`, { text });
    return res.data?.item || res.data;
  }

  public static async updateChecklistItem(
    todoId: string,
    itemId: string,
    completed: boolean
  ): Promise<ChecklistItem | null> {
    const res = await apiClient.patch(`/api/todos/${todoId}/checklist/${itemId}`, { completed });
    return res.data?.item || res.data;
  }

  public static async deleteChecklistItem(todoId: string, itemId: string): Promise<boolean> {
    await apiClient.delete(`/api/todos/${todoId}/checklist/${itemId}`);
    return true;
  }

  public static async addComment(todoId: string, text: string): Promise<TodoComment | null> {
    const res = await apiClient.post(`/api/todos/${todoId}/comments`, { text });
    return res.data?.comment || res.data;
  }
}

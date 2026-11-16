import { apiClient } from '../api/apiClient';

export interface LeaveBalance {
  id?: string;
  leaveTypeId: string;
  leaveType?: {
    id: string;
    name: string;
    code: string;
    color?: string;
  };
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  allocated?: number;
  used?: number;
  available?: number;
  name?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description?: string;
  maxDaysPerYear?: number;
  color?: string;
  isPaid?: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId?: string;
  leaveTypeId: string;
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  managerComment?: string | null;
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

export interface ApplyLeavePayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  halfDay?: boolean;
}

export class LeaveService {
  /**
   * Fetch current user's leave balances
   */
  static async getBalances(): Promise<LeaveBalance[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/leave-balance');
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.balances)) return data.balances;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    } catch {
      // Fallback to /api/leave/balances
      try {
        const fallback = await apiClient.get<any>('/api/leave/balances');
        if (Array.isArray(fallback.data)) return fallback.data;
        if (fallback.data && Array.isArray(fallback.data.data)) return fallback.data.data;
        return [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Fetch available leave types
   */
  static async getLeaveTypes(): Promise<LeaveType[]> {
    try {
      const response = await apiClient.get<any>('/api/leave/types');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch user's submitted leave requests
   */
  static async getMyRequests(): Promise<LeaveRequest[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/leaves');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      try {
        const fallback = await apiClient.get<any>('/api/leave/requests');
        if (Array.isArray(fallback.data)) return fallback.data;
        if (fallback.data && Array.isArray(fallback.data.data)) return fallback.data.data;
        return [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Apply for leave
   */
  static async applyLeave(payload: ApplyLeavePayload): Promise<LeaveRequest> {
    try {
      const response = await apiClient.post<LeaveRequest>('/api/v1/me/leaves', payload);
      return response.data;
    } catch {
      // Fallback to /api/leave/requests
      const fallback = await apiClient.post<LeaveRequest>('/api/leave/requests', payload);
      return fallback.data;
    }
  }

  /**
   * Cancel an existing pending leave request
   */
  static async cancelLeave(id: string): Promise<boolean> {
    try {
      await apiClient.post(`/api/leave/requests/${id}/cancel`);
      return true;
    } catch {
      await apiClient.put(`/api/leave/requests/${id}/cancel`);
      return true;
    }
  }
}

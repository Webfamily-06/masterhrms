import { apiClient } from '../api/apiClient';

export interface PunchPayload {
  type: 'check_in' | 'check_out';
  latitude?: number;
  longitude?: number;
  notes?: string;
  deviceId?: string;
  employeeId?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'ON_LEAVE' | string;
  notes?: string | null;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
}

export interface GeoFenceResult {
  valid: boolean;
  distanceMeters: number;
}

export interface PunchResponse {
  success: boolean;
  attendance: AttendanceRecord;
  geoFence?: GeoFenceResult;
  message?: string;
}

export interface RegularizationRequest {
  id: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
}

export interface DashboardSummaryResponse {
  todayAttendance?: AttendanceRecord | null;
  shift?: {
    name: string;
    startTime: string;
    endTime: string;
  };
  workedHoursToday?: number;
  leaveBalances?: Record<string, number>;
  pendingTasks?: number;
}

export class AttendanceService {
  /**
   * Get employee dashboard summary (today's punch, shift, leave balances)
   */
  static async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    try {
      const response = await apiClient.get<DashboardSummaryResponse>('/api/v1/me/dashboard');
      return response.data;
    } catch {
      // Graceful fallback to null or empty summary
      return {};
    }
  }

  /**
   * Perform geo-fenced Punch In or Punch Out
   */
  static async punch(payload: PunchPayload): Promise<PunchResponse> {
    const response = await apiClient.post<PunchResponse>('/api/attendance/punch', payload);
    return response.data;
  }

  /**
   * Fetch attendance history records for current user
   */
  static async getMyHistory(params?: {
    month?: string;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<any>('/api/attendance', { params });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  }

  /**
   * Submit attendance regularization request
   */
  static async submitRegularization(payload: {
    date: string;
    checkIn?: string;
    checkOut?: string;
    reason: string;
  }): Promise<RegularizationRequest> {
    const response = await apiClient.post<RegularizationRequest>(
      '/api/v1/me/regularizations',
      payload
    );
    return response.data;
  }

  /**
   * Fetch user's regularization requests
   */
  static async getRegularizations(): Promise<RegularizationRequest[]> {
    const response = await apiClient.get<any>('/api/v1/me/regularizations');
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  }

  /**
   * Withdraw a submitted regularization request
   */
  static async withdrawRegularization(id: string): Promise<boolean> {
    await apiClient.post(`/api/v1/me/regularizations/${id}/withdraw`);
    return true;
  }
}

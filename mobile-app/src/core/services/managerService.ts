import { apiClient } from '../api/apiClient';
import { AttendanceRecord } from './attendanceService';
import { LeaveRequest } from './leaveService';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  phone?: string | null;
  designation?: string | { name: string };
  department?: string | { name: string };
  avatarUrl?: string | null;
  todayStatus?: string;
}

export interface TeamApprovals {
  leaves: LeaveRequest[];
  regularizations: Array<{
    id: string;
    employeeId: string;
    employee?: {
      firstName: string;
      lastName: string;
      employeeCode: string;
    };
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
  }>;
  profileChanges?: any[];
}

export class ManagerService {
  /**
   * Fetch manager's direct team members
   */
  static async getTeamMembers(): Promise<TeamMember[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/team');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.team)) return response.data.team;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch pending approval requests from team members
   */
  static async getTeamApprovals(): Promise<TeamApprovals> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/team/approvals');
      const data = response.data || {};
      return {
        leaves: Array.isArray(data.leaves) ? data.leaves : [],
        regularizations: Array.isArray(data.regularizations) ? data.regularizations : [],
        profileChanges: Array.isArray(data.profileChanges) ? data.profileChanges : [],
      };
    } catch {
      return { leaves: [], regularizations: [], profileChanges: [] };
    }
  }

  /**
   * Action a team member's leave request (APPROVED / REJECTED)
   */
  static async actionLeave(
    id: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<any> {
    const response = await apiClient.post(`/api/v1/me/team/leaves/${id}/action`, {
      action,
      comments: notes,
    });
    return response.data;
  }

  /**
   * Action a team member's regularization request (APPROVED / REJECTED)
   */
  static async actionRegularization(
    id: string,
    action: 'APPROVED' | 'REJECTED',
    notes?: string
  ): Promise<any> {
    const response = await apiClient.post(
      `/api/v1/me/team/regularizations/${id}/action`,
      {
        action,
        comments: notes,
      }
    );
    return response.data;
  }

  /**
   * Fetch team attendance status
   */
  static async getTeamAttendance(date?: string): Promise<AttendanceRecord[]> {
    try {
      const response = await apiClient.get<any>('/api/attendance', {
        params: { date },
      });
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      return [];
    }
  }
}

import { apiClient } from '../api/apiClient';
import { AttendanceRecord } from './attendanceService';
import { LeaveRequest } from './leaveService';

export interface EmployeeSummary {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE' | string;
  designation?: { name: string } | string | null;
  department?: { name: string } | string | null;
  joiningDate?: string;
  avatarUrl?: string | null;
}

export interface Department {
  id: string;
  name: string;
  code?: string;
  description?: string;
  _count?: {
    employees?: number;
  };
}

export interface DailyAttendanceReport {
  totalEmployees: number;
  present: number;
  absent: number;
  onLeave: number;
  lateArrivals: number;
  halfDays: number;
}

export interface PayrollRun {
  id: string;
  title?: string;
  month: number;
  year: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  employeeCount: number;
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED' | string;
  createdAt: string;
}

export class HrService {
  /**
   * Fetch live HRM dashboard metrics from /api/v1/dashboard/hrm
   */
  static async getHrmDashboardData(): Promise<any> {
    try {
      const response = await apiClient.get<any>('/api/v1/dashboard/hrm');
      return response.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch company employee directory
   */
  static async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<EmployeeSummary[]> {
    const normalizeList = (rawList: any[]): EmployeeSummary[] =>
      rawList.map((emp: any) => ({
        ...emp,
        avatarUrl:
          emp.avatarUrl ||
          emp.profilePhotoUrl ||
          emp.photoUrl ||
          emp.avatar ||
          emp.user?.profile?.avatarUrl ||
          null,
      }));

    try {
      const response = await apiClient.get<any>('/api/employees', { params });
      if (Array.isArray(response.data)) return normalizeList(response.data);
      if (response.data && Array.isArray(response.data.data)) return normalizeList(response.data.data);
      if (response.data && Array.isArray(response.data.employees)) return normalizeList(response.data.employees);
    } catch {
      // Fallback to ESS colleague directory (/api/v1/me/employees) for non-HR employee roles
    }

    try {
      const essResp = await apiClient.get<any>('/api/v1/me/employees', { params });
      if (Array.isArray(essResp.data)) return normalizeList(essResp.data);
      if (essResp.data && Array.isArray(essResp.data.data)) return normalizeList(essResp.data.data);
      if (essResp.data && Array.isArray(essResp.data.employees)) return normalizeList(essResp.data.employees);
    } catch {
      // Handled
    }

    return [];
  }

  /**
   * Fetch organization departments
   */
  static async getDepartments(): Promise<Department[]> {
    try {
      const response = await apiClient.get<any>('/api/employees/departments');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.departments)) return response.data.departments;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch organization attendance records
   */
  static async getOrgAttendance(params?: {
    date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AttendanceRecord[]> {
    try {
      const response = await apiClient.get<any>('/api/attendance', { params });
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch daily attendance statistical summary
   */
  static async getDailyAttendanceReport(date?: string): Promise<DailyAttendanceReport> {
    try {
      const response = await apiClient.get<DailyAttendanceReport>('/api/attendance/daily-report', {
        params: { date },
      });
      return (
        response.data || {
          totalEmployees: 0,
          present: 0,
          absent: 0,
          onLeave: 0,
          lateArrivals: 0,
          halfDays: 0,
        }
      );
    } catch {
      return {
        totalEmployees: 0,
        present: 0,
        absent: 0,
        onLeave: 0,
        lateArrivals: 0,
        halfDays: 0,
      };
    }
  }

  /**
   * Fetch tenant-wide leave requests queue
   */
  static async getAllLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    try {
      const response = await apiClient.get<any>('/api/leave/requests', {
        params: { status },
      });
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Approve or reject a leave request
   */
  static async updateLeaveStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<any> {
    const response = await apiClient.patch(`/api/leave/requests/${id}/status`, {
      status,
      remarks: reason,
    });
    return response.data;
  }

  /**
   * Fetch payroll execution runs
   */
  static async getPayrollRuns(): Promise<PayrollRun[]> {
    try {
      const response = await apiClient.get<any>('/api/payroll/runs');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      if (response.data && Array.isArray(response.data.runs)) return response.data.runs;
      return [];
    } catch {
      return [];
    }
  }
}

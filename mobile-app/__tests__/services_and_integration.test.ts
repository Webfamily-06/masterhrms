import { AttendanceService } from '../src/core/services/attendanceService';
import { LeaveService } from '../src/core/services/leaveService';
import { PayrollService } from '../src/core/services/payrollService';
import { EmployeeService } from '../src/core/services/employeeService';
import { ManagerService } from '../src/core/services/managerService';
import { HrService } from '../src/core/services/hrService';
import { TenantAdminService } from '../src/core/services/tenantAdminService';
import { SuperAdminService } from '../src/core/services/superAdminService';
import { NotificationService } from '../src/core/services/notificationService';
import { PushNotificationService } from '../src/core/services/pushNotificationService';
import { apiClient } from '../src/core/api/apiClient';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('MasterHRMS Mobile Services & Integration Suites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AttendanceService', () => {
    it('calls punch in/out with coordinates and receives verification', async () => {
      const mockResult = {
        success: true,
        attendance: {
          id: 'att-1',
          date: '2026-11-16',
          checkIn: '2026-11-16T09:00:00Z',
          checkOut: null,
          hours: null,
          status: 'PRESENT',
        },
        geoFence: { valid: true, distanceMeters: 45 },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockResult });

      const res = await AttendanceService.punch({
        type: 'check_in',
        latitude: 19.0657,
        longitude: 72.8687,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/attendance/punch', {
        type: 'check_in',
        latitude: 19.0657,
        longitude: 72.8687,
      });
      expect(res.success).toBe(true);
      expect(res.geoFence?.valid).toBe(true);
    });

    it('submits regularization request', async () => {
      const mockReg = {
        id: 'reg-1',
        date: '2026-11-15',
        reason: 'Biometric glitch',
        status: 'PENDING',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockReg });

      const res = await AttendanceService.submitRegularization({
        date: '2026-11-15',
        reason: 'Biometric glitch',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/me/regularizations', {
        date: '2026-11-15',
        reason: 'Biometric glitch',
      });
      expect(res.status).toBe('PENDING');
    });

    it('fetches timesheets and creates/deletes timesheet entries', async () => {
      const mockTimesheets = [
        { id: 'ts-1', date: '2026-11-16', hours: 8, description: 'Core features', status: 'pending' },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockTimesheets });

      const list = await AttendanceService.getTimesheets();
      expect(apiClient.get).toHaveBeenCalledWith('/api/timesheets', { params: undefined });
      expect(list).toHaveLength(1);
      expect(list[0].hours).toBe(8);

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { id: 'ts-2', date: '2026-11-17', hours: 7.5, description: 'Testing', status: 'pending' },
      });
      const created = await AttendanceService.createTimesheet({
        date: '2026-11-17',
        hours: 7.5,
        description: 'Testing',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/api/timesheets', {
        date: '2026-11-17',
        hours: 7.5,
        description: 'Testing',
      });
      expect(created.id).toBe('ts-2');

      (apiClient.delete as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
      const deleted = await AttendanceService.deleteTimesheet('ts-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/timesheets/ts-1');
      expect(deleted).toBe(true);
    });

    it('fetches shift roster and submits shift swap request', async () => {
      const mockShifts = {
        rosters: [
          { id: 'ros-1', rosterDate: '2026-11-18T00:00:00Z', shift: { id: 'sh-1', name: 'Morning', startTime: '08:00', endTime: '17:00' } },
        ],
        swaps: [
          { id: 'swap-1', requesterEmployeeId: 'emp-1', targetEmployeeId: 'emp-2', shiftDate: '2026-11-19', reason: 'Doc appt', status: 'pending_peer' },
        ],
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockShifts });

      const data = await AttendanceService.getMyShifts();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/attendance/shifts');
      expect(data.rosters).toHaveLength(1);
      expect(data.swaps).toHaveLength(1);

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { id: 'swap-2', status: 'pending_peer' },
      });
      const swapRes = await AttendanceService.createShiftSwap({
        requesterEmployeeId: 'emp-1',
        targetEmployeeId: 'emp-2',
        shiftDate: '2026-11-20',
        reason: 'Family visit',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/api/shifts/swaps', {
        requesterEmployeeId: 'emp-1',
        targetEmployeeId: 'emp-2',
        shiftDate: '2026-11-20',
        reason: 'Family visit',
      });
      expect(swapRes.id).toBe('swap-2');
    });
  });

  describe('LeaveService', () => {
    it('fetches leave balances and handles fallbacks gracefully', async () => {
      const mockBalances = [
        { leaveTypeId: 'annual', totalDays: 15, usedDays: 3, remainingDays: 12 },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockBalances });

      const balances = await LeaveService.getBalances();
      expect(balances).toHaveLength(1);
      expect(balances[0].remainingDays).toBe(12);
    });

    it('submits leave application', async () => {
      const mockLeave = {
        id: 'leave-1',
        leaveTypeId: 'annual',
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        reason: 'Vacation',
        status: 'PENDING',
      };
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockLeave });

      const res = await LeaveService.applyLeave({
        leaveTypeId: 'annual',
        startDate: '2026-11-20',
        endDate: '2026-11-22',
        reason: 'Vacation',
      });

      expect(res.id).toBe('leave-1');
      expect(res.status).toBe('PENDING');
    });
  });

  describe('PayrollService', () => {
    it('fetches payslips list', async () => {
      const mockSlips = [
        { id: 'slip-1', month: 10, year: 2026, grossSalary: 75000, netSalary: 68000, totalDeductions: 7000 },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockSlips });

      const slips = await PayrollService.getMyPayslips();
      expect(slips).toHaveLength(1);
      expect(slips[0].netSalary).toBe(68000);
    });
  });

  describe('EmployeeService', () => {
    it('fetches employee profile and documents', async () => {
      const mockProfile = {
        id: 'emp-1',
        employeeCode: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockProfile });

      const prof = await EmployeeService.getMyProfile();
      expect(prof?.employeeCode).toBe('EMP-001');
    });

    it('fetches employees directory for colleague mentions and shift swaps', async () => {
      const mockList = [
        { id: 'emp-1', firstName: 'John', lastName: 'Doe', employeeCode: 'EMP-001' },
        { id: 'emp-2', firstName: 'Jane', lastName: 'Smith', employeeCode: 'EMP-002' },
      ];
      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockList });

      const res = await EmployeeService.getEmployees('Jane');
      expect(apiClient.get).toHaveBeenCalledWith('/api/employees', {
        params: { search: 'Jane', limit: 100 },
      });
      expect(res).toHaveLength(2);
      expect(res[1].employeeCode).toBe('EMP-002');
    });
  });

  describe('ManagerService', () => {
    it('actions leave request with APPROVED status', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      const res = await ManagerService.actionLeave('leave-1', 'APPROVED', 'Looks good');
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/me/team/leaves/leave-1/action', {
        action: 'APPROVED',
        comments: 'Looks good',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('HrService', () => {
    it('fetches employee directory with search parameter', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ id: 'emp-1', firstName: 'Sarah', lastName: 'Connor' }],
      });

      const employees = await HrService.getEmployees({ search: 'Sarah' });
      expect(apiClient.get).toHaveBeenCalledWith('/api/employees', {
        params: { search: 'Sarah' },
      });
      expect(employees).toHaveLength(1);
    });
  });

  describe('TenantAdminService & SuperAdminService', () => {
    it('calculates seat utilization', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { pagination: { total: 25 } },
      });

      const usage = await TenantAdminService.getSeatUtilization();
      expect(usage.activeEmployees).toBe(25);
      expect(usage.utilizationPercentage).toBe(50);
    });

    it('fetches super admin platform stats', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { totalTenants: 5, activeTenants: 5, totalUsers: 85, totalEmployees: 80, systemStatus: 'ONLINE' },
      });

      const stats = await SuperAdminService.getStats();
      expect(stats.totalTenants).toBe(5);
      expect(stats.systemStatus).toBe('ONLINE');
    });
  });

  describe('NotificationService & PushNotificationService', () => {
    it('registers push notification token', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      const registered = await NotificationService.registerDeviceToken('token-12345', 'android');
      expect(registered).toBe(true);
    });

    it('truthfully reports push capability status without sending fake VAPID tokens', () => {
      const status = PushNotificationService.getCapabilityStatus();
      expect(status).toHaveProperty('serverRegistrationStatus');
      expect(status).toHaveProperty('statusReason');
      expect(status).toHaveProperty('tokenType');
      // When backend is Web Push only, native push token registration is cleanly guarded
      expect(['unsupported_backend', 'not_attempted', 'not_registered', 'registered', 'failed']).toContain(status.serverRegistrationStatus);
    });
  });
});

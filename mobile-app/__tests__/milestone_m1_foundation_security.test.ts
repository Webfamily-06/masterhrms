import { NotificationService } from '../src/core/services/notificationService';
import { AuthService } from '../src/core/auth/authService';
import { EmployeeService } from '../src/core/services/employeeService';
import { apiClient } from '../src/core/api/apiClient';
import { secureStorage } from '../src/core/storage/secureStorage';
import { useAuthStore } from '../src/store/authStore';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/core/storage/secureStorage', () => ({
  secureStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('Milestone M1 — Foundation & Security Verification Suites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GAP-006: Notification Contract Reconciliation', () => {
    it('fetches notifications via GET /api/v1/me/notifications and returns list', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          title: 'Leave Approved',
          message: 'Your leave application was approved by manager',
          read: false,
          createdAt: '2026-11-18T10:00:00Z',
          type: 'APPROVAL',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { notifications: mockNotifications, total: 1, unreadCount: 1 },
      });

      const res = await NotificationService.getNotifications();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/notifications');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('notif-1');
    });

    it('marks single notification as read via POST /api/v1/shared/notifications/:id/read', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      const ok = await NotificationService.markAsRead('notif-100');
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/shared/notifications/notif-100/read');
      expect(ok).toBe(true);
    });

    it('marks all notifications as read via POST /api/v1/shared/notifications/read-all', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      const ok = await NotificationService.markAllAsRead();
      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/shared/notifications/read-all');
      expect(ok).toBe(true);
    });

    it('subscribes push token via POST /api/notifications/push/subscribe', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

      const ok = await NotificationService.registerDeviceToken('fcm-token-xyz', 'android');
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/notifications/push/subscribe',
        expect.objectContaining({
          endpoint: 'fcm-token-xyz',
          platform: 'android',
        })
      );
      expect(ok).toBe(true);
    });
  });

  describe('GAP-013: Biometric Session Restoration', () => {
    it('restores session when valid refresh token and sessionId exist', async () => {
      (secureStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('refresh_token')) return Promise.resolve('valid-refresh-token');
        if (key.includes('session_id')) return Promise.resolve('sess-12345');
        return Promise.resolve(null);
      });

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          token: 'jwt-access-token-999',
          refreshToken: 'rotated-refresh-token-000',
          sessionId: 'sess-12345',
        },
      });

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'user-1',
          email: 'employee@karajo.app',
          roles: ['employee'],
          profile: { tenantId: 'tenant-1', fullName: 'John Doe' },
        },
      });

      const res = await AuthService.restoreBiometricSession();
      expect(res.success).toBe(true);
      expect(res.user.email).toBe('employee@karajo.app');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('rejects biometric restoration if no saved refresh token exists', async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.restoreBiometricSession()).rejects.toThrow(
        /No saved biometric session found/
      );
    });

    it('enforces GAP-012: rejects Super Administrator accounts on biometric restore', async () => {
      (secureStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key.includes('refresh_token')) return Promise.resolve('super-admin-refresh');
        if (key.includes('session_id')) return Promise.resolve('sess-super');
        return Promise.resolve(null);
      });

      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          token: 'jwt-super-token',
          refreshToken: 'rot-super-token',
          sessionId: 'sess-super',
        },
      });

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          id: 'user-super',
          email: 'admin@karajo.app',
          roles: ['super_admin'],
          profile: { tenantId: 'tenant-root', fullName: 'Super Admin' },
        },
      });

      await expect(AuthService.restoreBiometricSession()).rejects.toThrow(
        /Access denied\. Super Administrator accounts cannot log in to the mobile application/
      );
    });
  });

  describe('GAP-015: Profile Approval & Direct Edit Boundaries', () => {
    it('unwraps profile correctly from GET /api/v1/me/profile data structure', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'emp-42',
            firstName: 'Sarah',
            lastName: 'Miller',
            phone: '+91 98765 43210',
            gender: 'Female',
          },
        },
      });

      const profile = await EmployeeService.getMyProfile();
      expect(profile).not.toBeNull();
      expect(profile?.firstName).toBe('Sarah');
      expect(profile?.phone).toBe('+91 98765 43210');
      expect(profile?.gender).toBe('Female');
    });

    it('submits statutory/sensitive profile changes to POST /api/v1/me/profile/change-requests', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Request submitted for HR approval' },
      });

      const res = await EmployeeService.submitProfileChangeRequest({
        category: 'BANKING',
        fieldKey: 'bankAccountNumber',
        newValue: '987654321000',
        reason: 'Switched salary account to HDFC Bank',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/me/profile/change-requests', {
        category: 'BANKING',
        fieldKey: 'bankAccountNumber',
        newValue: '987654321000',
        reason: 'Switched salary account to HDFC Bank',
      });
      expect(res.success).toBe(true);
    });
  });
});

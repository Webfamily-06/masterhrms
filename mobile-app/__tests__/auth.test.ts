import { AuthService } from '../src/core/auth/authService';
import { BiometricService } from '../src/core/auth/biometricService';
import { apiClient } from '../src/core/api/apiClient';
import { ApiError } from '../src/core/api/apiErrors';
import { useAuthStore } from '../src/store/authStore';
import { useTenantStore } from '../src/store/tenantStore';
import { secureStorage } from '../src/core/storage/secureStorage';
import { queryClient } from '../src/app/providers/QueryProvider';
import { STORAGE_KEYS } from '../src/config/constants';
import * as Keychain from 'react-native-keychain';

// Mock apiClient methods
jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

describe('Phase 2: Authentication & Multi-Tenant Engine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      token: null,
      user: null,
      roles: [],
      permissions: [],
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
      isMfaPending: false,
      mfaChallenge: null,
    });
    useTenantStore.setState({
      currentTenant: null,
      isResolved: false,
      isLoading: false,
      error: null,
    });
  });

  describe('1. Full Credential Login', () => {
    it('handles direct login when 2FA is disabled and attaches Turnstile bot token when provided', async () => {
      const mockSuccessResponse = {
        data: {
          token: 'jwt_access_token_123',
          refreshToken: 'jwt_refresh_token_456',
          sessionId: 'session_uuid_789',
          user: {
            id: 'user_1',
            email: 'admin@acme.com',
            roles: ['admin'],
          },
          roles: ['admin'],
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockSuccessResponse);

      const result = await AuthService.login({
        email: 'admin@acme.com',
        password: 'Password123!',
        turnstileToken: 'cf_turnstile_test_token_abc',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        {
          email: 'admin@acme.com',
          password: 'Password123!',
          turnstileToken: 'cf_turnstile_test_token_abc',
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-turnstile-token': 'cf_turnstile_test_token_abc',
          }),
        })
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('jwt_access_token_123');
      expect(state.sessionId).toBe('session_uuid_789');
      expect(state.roles).toContain('admin');
      expect(result).toHaveProperty('token');
    });

    it('strictly throws an error and denies login when user has super_admin role', async () => {
      const mockSuperAdminResponse = {
        data: {
          token: 'jwt_super_token',
          refreshToken: 'jwt_super_refresh',
          sessionId: 'session_super_123',
          user: {
            id: 'super_1',
            email: 'admin@masterhrms.com',
            roles: ['super_admin'],
          },
          roles: ['super_admin'],
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockSuperAdminResponse);

      await expect(
        AuthService.login({
          email: 'admin@masterhrms.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(/Super Administrator accounts cannot log in to the mobile application/);

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('handles 2FA challenge response when 2FA is enabled', async () => {
      const mock2FaResponse = {
        data: {
          requires2FA: true,
          isSetup: false,
          mfaToken: 'mfa_temp_token_abc',
          email: 'employee@acme.com',
          maskedEmail: 'e***@acme.com',
          twoFactorMethod: 'EMAIL_OTP',
          emailSent: true,
          message: 'Code sent to email',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mock2FaResponse);

      const result = await AuthService.login({
        email: 'employee@acme.com',
        password: 'Password123!',
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isMfaPending).toBe(true);
      expect(state.mfaChallenge?.mfaToken).toBe('mfa_temp_token_abc');
      expect(result).toHaveProperty('requires2FA', true);
    });

    it('throws normalized ApiError on invalid credentials (401)', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Invalid email or password.' },
        },
      };

      (apiClient.post as jest.Mock).mockRejectedValueOnce(axiosError);

      await expect(
        AuthService.login({
          email: 'wrong@acme.com',
          password: 'WrongPassword',
        })
      ).rejects.toThrow('Invalid email or password.');
    });
  });

  describe('2. 2FA Verification and Resend Cooldown', () => {
    it('verifies 6-digit OTP and establishes authenticated session', async () => {
      const mockVerifyResponse = {
        data: {
          token: 'jwt_verified_access_token',
          refreshToken: 'jwt_verified_refresh_token',
          sessionId: 'session_uuid_verified',
          user: {
            id: 'user_employee',
            email: 'employee@acme.com',
            roles: ['employee'],
          },
          roles: ['employee'],
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockVerifyResponse);

      const result = await AuthService.verify2Fa('mfa_temp_token_abc', '123456');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/2fa/verify-login',
        { mfaToken: 'mfa_temp_token_abc', code: '123456' },
        expect.anything()
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isMfaPending).toBe(false);
      expect(state.token).toBe('jwt_verified_access_token');
      expect(result.token).toBe('jwt_verified_access_token');
    });

    it('enforces 30s resend cooldown', async () => {
      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({
          data: { success: true, message: 'New code sent' },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: {
            status: 429,
            data: { error: 'Please wait 30 seconds before requesting a new code.' },
          },
        });

      // First resend succeeds
      const first = await AuthService.resend2Fa('mfa_temp_token_abc');
      expect(first.success).toBe(true);

      // Second immediate resend rejected with 429 cooldown
      await expect(AuthService.resend2Fa('mfa_temp_token_abc')).rejects.toThrow(
        'Please wait 30 seconds before requesting a new code.'
      );
    });

    it('maps expired OTP or invalid OTP correctly', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Invalid or expired verification code.' },
        },
      };

      (apiClient.post as jest.Mock).mockRejectedValueOnce(axiosError);

      await expect(
        AuthService.verify2Fa('mfa_temp_token_abc', '000000')
      ).rejects.toThrow('Invalid or expired verification code.');
    });
  });

  describe('3. Token Refresh and Rotation', () => {
    it('rotates access and refresh tokens successfully', async () => {
      jest.spyOn(secureStorage, 'getItem').mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return 'existing_refresh_token';
        if (key === STORAGE_KEYS.SESSION_ID) return 'existing_session_id';
        return null;
      });

      const setItemSpy = jest.spyOn(secureStorage, 'setItem').mockResolvedValue(true);

      const mockRefreshResponse = {
        data: {
          token: 'rotated_access_token',
          refreshToken: 'rotated_refresh_token',
          sessionId: 'existing_session_id',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce(mockRefreshResponse);

      const result = await AuthService.refreshToken();

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/refresh',
        {
          refreshToken: 'existing_refresh_token',
          sessionId: 'existing_session_id',
        },
        expect.anything()
      );

      expect(result.token).toBe('rotated_access_token');
      expect(useAuthStore.getState().token).toBe('rotated_access_token');
      expect(setItemSpy).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        'rotated_refresh_token'
      );
    });

    it('fails closed and purges session on refresh failure / reuse detection', async () => {
      jest.spyOn(secureStorage, 'getItem').mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return 'expired_refresh_token';
        if (key === STORAGE_KEYS.SESSION_ID) return 'existing_session_id';
        return null;
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Session expired or refresh token invalid.' },
        },
      };

      (apiClient.post as jest.Mock).mockRejectedValueOnce(axiosError);

      await expect(AuthService.refreshToken()).rejects.toThrow(
        'Session expired or refresh token invalid.'
      );
    });
  });

  describe('4. Biometric Unlock Service', () => {
    it('detects biometric support from hardware', async () => {
      const support = await BiometricService.isBiometricsSupported();
      expect(support.supported).toBe(true);
      expect(support.biometryType).toBe('FaceID');
    });

    it('authenticates successfully when biometrics match', async () => {
      jest.spyOn(secureStorage, 'getItem').mockResolvedValue('true');
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
        service: 'masterhrms_biometric_gate',
        username: 'biometric_user',
        password: 'valid_session_key',
      });

      const result = await BiometricService.authenticateWithBiometrics();
      expect(result).toBe(true);
    });

    it('returns false when user cancels biometric prompt or biometric fails', async () => {
      jest.spyOn(secureStorage, 'getItem').mockResolvedValue('true');
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(null);

      const result = await BiometricService.authenticateWithBiometrics();
      expect(result).toBe(false);
    });

    it('returns false if biometric toggle is disabled', async () => {
      jest.spyOn(secureStorage, 'getItem').mockResolvedValue('false');

      const result = await BiometricService.authenticateWithBiometrics();
      expect(result).toBe(false);
      expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
    });
  });

  describe('5. Profile Hydration & Canonical Roles (/me)', () => {
    it('retrieves user profile and canonical roles/permissions', async () => {
      const mockProfileResponse = {
        data: {
          id: 'user_uuid_100',
          email: 'hr_manager@acme.com',
          profile: {
            id: 'prof_1',
            fullName: 'Jane Doe',
            tenantId: 'tenant-acme-corp',
          },
          roles: ['hr_admin', 'employee'],
          permissions: ['attendance.view', 'attendance.punch', 'payroll.manage'],
          twoFactorEnabled: true,
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce(mockProfileResponse);

      const user = await AuthService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/auth/me');
      expect(user.id).toBe('user_uuid_100');

      const state = useAuthStore.getState();
      expect(state.user?.email).toBe('hr_manager@acme.com');
      expect(state.roles).toContain('hr_admin');
      expect(state.roles).toContain('employee');
      expect(state.permissions).toContain('payroll.manage');
    });
  });

  describe('6. Forgot & Reset Password Flow', () => {
    it('submits forgot-password request with normalized email', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Reset instructions dispatched' },
      });

      const response = await AuthService.forgotPassword('  User@Acme.COM ');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/forgot-password',
        { email: 'user@acme.com' },
        expect.anything()
      );
      expect(response.success).toBe(true);
    });

    it('submits reset-password with verification code and new password', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Password updated successfully' },
      });

      const response = await AuthService.resetPassword({
        email: 'user@acme.com',
        code: '654321',
        newPassword: 'BrandNewSecurePassword123!',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/reset-password',
        {
          email: 'user@acme.com',
          code: '654321',
          newPassword: 'BrandNewSecurePassword123!',
        },
        expect.anything()
      );
      expect(response.success).toBe(true);
    });

    it('submits reset-password with 64-character token from email link and new password', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, message: 'Password updated successfully' },
      });

      const rawHexToken = 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef';
      const response = await AuthService.resetPassword({
        email: 'user@acme.com',
        token: rawHexToken,
        newPassword: 'BrandNewSecurePassword123!',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/reset-password',
        {
          email: 'user@acme.com',
          token: rawHexToken,
          newPassword: 'BrandNewSecurePassword123!',
        },
        expect.anything()
      );
      expect(response.success).toBe(true);
    });
  });

  describe('7. Secure Logout and Cache Cleanup', () => {
    it('revokes server session, clears secure storage, wipes query cache and resets state', async () => {
      useAuthStore.setState({
        token: 'active_token',
        sessionId: 'active_session_id',
        isAuthenticated: true,
        roles: ['employee'],
      });

      const queryClearSpy = jest.spyOn(queryClient, 'clear');
      const secureClearSpy = jest.spyOn(secureStorage, 'clear');
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      await AuthService.logout();

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/auth/logout',
        { sessionId: 'active_session_id' }
      );
      expect(secureClearSpy).toHaveBeenCalled();
      expect(queryClearSpy).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.sessionId).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.user).toBeNull();
    });
  });

  describe('8. API Error Normalization', () => {
    it('normalizes 401, 403, and network errors into standard ApiError objects', () => {
      const err401 = ApiError.fromAxiosError({
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Your session has expired.' },
        },
      });
      expect(err401.status).toBe(401);
      expect(err401.isUnauthorized).toBe(true);
      expect(err401.message).toBe('Your session has expired.');

      const err403 = ApiError.fromAxiosError({
        isAxiosError: true,
        response: {
          status: 403,
          data: { error: 'Cross-tenant access forbidden.', code: 'HOST_TENANT_MISMATCH' },
        },
      });
      expect(err403.status).toBe(403);
      expect(err403.isForbidden).toBe(true);
      expect(err403.isTenantMismatch).toBe(true);

      const netErr = ApiError.fromAxiosError({
        isAxiosError: true,
        request: {},
        message: 'Network Error',
      });
      expect(netErr.isNetworkError).toBe(true);
    });
  });
});

import { apiClient } from '../api/apiClient';

export interface TenantSettings {
  companyName?: string;
  supportEmail?: string;
  supportPhone?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: string;
}

export interface SecurityPolicy {
  mfaRequired: boolean;
  mfaEnforcementLevel: 'OFF' | 'OPTIONAL' | 'REQUIRED_ALL' | 'REQUIRED_ADMINS';
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  ipWhitelistEnabled: boolean;
}

export interface SeatUtilization {
  activeEmployees: number;
  maxSeats: number;
  utilizationPercentage: number;
  planName: string;
}

export class TenantAdminService {
  /**
   * Fetch tenant general or group settings
   */
  static async getSettings(group = 'general'): Promise<TenantSettings> {
    try {
      const response = await apiClient.get<any>(`/api/v1/settings/tenant/${group}`);
      return response.data || {};
    } catch {
      return {};
    }
  }

  /**
   * Update tenant configuration settings
   */
  static async updateSettings(group: string, data: Record<string, any>): Promise<any> {
    const response = await apiClient.put(`/api/v1/settings/tenant/${group}`, data);
    return response.data;
  }

  /**
   * Fetch tenant security & 2FA policy
   */
  static async getSecurityPolicy(): Promise<SecurityPolicy> {
    try {
      const response = await apiClient.get<any>('/api/v1/settings/tenant/security');
      return (
        response.data || {
          mfaRequired: false,
          mfaEnforcementLevel: 'OPTIONAL',
          sessionTimeoutMinutes: 60,
          passwordMinLength: 8,
          ipWhitelistEnabled: false,
        }
      );
    } catch {
      return {
        mfaRequired: false,
        mfaEnforcementLevel: 'OPTIONAL',
        sessionTimeoutMinutes: 60,
        passwordMinLength: 8,
        ipWhitelistEnabled: false,
      };
    }
  }

  /**
   * Calculate seat utilization
   */
  static async getSeatUtilization(): Promise<SeatUtilization> {
    try {
      const response = await apiClient.get<any>('/api/employees', {
        params: { limit: 1 },
      });
      const total =
        response.data?.pagination?.total ||
        (Array.isArray(response.data) ? response.data.length : 1);
      return {
        activeEmployees: total,
        maxSeats: 50,
        utilizationPercentage: Math.min(100, Math.round((total / 50) * 100)),
        planName: 'Enterprise Growth',
      };
    } catch {
      return {
        activeEmployees: 1,
        maxSeats: 50,
        utilizationPercentage: 2,
        planName: 'Standard Plan',
      };
    }
  }
}

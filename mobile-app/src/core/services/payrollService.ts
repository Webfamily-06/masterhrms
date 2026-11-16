import { apiClient } from '../api/apiClient';

export interface PayslipItem {
  id: string;
  month: number;
  year: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  status: 'DRAFT' | 'PROCESSED' | 'PAID' | string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  paymentDate?: string;
  pdfUrl?: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation?: string;
  };
}

export interface PayslipDetail extends PayslipItem {
  earnings: Array<{
    name: string;
    amount: number;
    type?: string;
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    type?: string;
  }>;
  taxDeductions?: number;
  pfDeduction?: number;
  esiDeduction?: number;
  daysWorked?: number;
  lopDays?: number;
}

export class PayrollService {
  /**
   * Fetch payslips list for current employee
   */
  static async getMyPayslips(): Promise<PayslipItem[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/payslips');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      if (response.data && Array.isArray(response.data.payslips)) return response.data.payslips;
      return [];
    } catch {
      try {
        const fallback = await apiClient.get<any>('/api/payroll/payslips');
        if (Array.isArray(fallback.data)) return fallback.data;
        if (fallback.data && Array.isArray(fallback.data.data)) return fallback.data.data;
        return [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Fetch specific payslip breakdown detail
   */
  static async getPayslipDetail(id: string): Promise<PayslipDetail | null> {
    try {
      const response = await apiClient.get<any>(`/api/v1/me/payslips/${id}`);
      return response.data;
    } catch {
      try {
        const fallback = await apiClient.get<any>(`/api/payroll/payslips/${id}`);
        return fallback.data;
      } catch {
        return null;
      }
    }
  }
}

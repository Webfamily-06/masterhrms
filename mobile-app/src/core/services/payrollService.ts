import { apiClient } from '../api/apiClient';

export interface PayslipItem {
  id: string;
  periodMonth?: number;
  periodYear?: number;
  month?: number;
  year?: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions?: number;
  deductions?: number;
  status?: 'DRAFT' | 'PROCESSED' | 'PAID' | string;
  payPeriodStart?: string;
  payPeriodEnd?: string;
  paymentDate?: string;
  pdfUrl?: string;
  breakdown?: any;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    designation?: string;
  };
}

export interface PayslipDetail extends PayslipItem {
  earnings?: Array<{
    name: string;
    amount: number;
    type?: string;
  }>;
  deductionsList?: Array<{
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

export interface EmployeeLoan {
  id: string;
  loanType: string;
  principal: number | string;
  tenureMonths: number;
  monthlyEmi: number | string;
  disbursedAmount: number | string;
  outstandingBalance: number | string;
  status: string;
  deductionStartMonth: string;
  reason?: string;
  createdAt: string;
}

export interface LoanRequestPayload {
  principal: number;
  tenureMonths: number;
  deductionStartMonth: string;
  reason?: string;
  loanType?: string;
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
      return response.data?.payslip || response.data?.data || response.data;
    } catch {
      try {
        const fallback = await apiClient.get<any>(`/api/payroll/payslips/${id}`);
        return fallback.data?.payslip || fallback.data?.data || fallback.data;
      } catch {
        return null;
      }
    }
  }

  /**
   * Submit an employee salary advance or loan request.
   * Calls POST /api/v1/me/payroll/loans/request
   */
  static async requestSalaryAdvance(payload: LoanRequestPayload): Promise<EmployeeLoan> {
    const response = await apiClient.post<any>('/api/v1/me/payroll/loans/request', payload);
    return response.data?.loan || response.data;
  }

  /**
   * Fetch loans and EMI schedule for current employee.
   * Calls GET /api/v1/me/payroll/reimbursements-loans
   */
  static async getMyLoans(): Promise<EmployeeLoan[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/payroll/reimbursements-loans');
      if (response.data && Array.isArray(response.data.loans)) {
        return response.data.loans;
      }
      return [];
    } catch {
      return [];
    }
  }
}

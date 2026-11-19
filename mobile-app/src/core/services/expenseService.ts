import { apiClient } from '../api/apiClient';

export interface ExpenseCategory {
  id: string;
  name: string;
  code: string;
  monthlyLimit?: number | null;
  requiresReceipt?: boolean;
  icon?: string;
}

export interface ExpenseClaim {
  id: string;
  claimCode: string;
  title: string;
  amount: number | string;
  expenseDate: string;
  merchant: string;
  description?: string | null;
  receiptUrl?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed' | string;
  reimbursementMethod?: string | null;
  payrollMonth?: string | null;
  approverNotes?: string | null;
  createdAt: string;
  category?: ExpenseCategory;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateExpenseClaimPayload {
  employeeId: string;
  categoryId: string;
  title: string;
  amount: number;
  merchant: string;
  expenseDate?: string;
  description?: string;
  receiptUrl?: string;
  receiptName?: string;
}

export class ExpenseService {
  /**
   * Fetch list of expense claims for current employee / tenant.
   * Calls GET /api/expenses/claims
   */
  static async getMyClaims(params?: {
    status?: string;
    categoryId?: string;
    search?: string;
  }): Promise<ExpenseClaim[]> {
    try {
      const response = await apiClient.get<any>('/api/expenses/claims', {
        params: {
          status: params?.status && params.status !== 'ALL' ? params.status.toLowerCase() : undefined,
          categoryId: params?.categoryId && params.categoryId !== 'ALL' ? params.categoryId : undefined,
          search: params?.search,
        },
      });

      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.claims)) {
        return response.data.claims;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch all tenant expense categories.
   * Calls GET /api/expenses/categories
   */
  static async getCategories(): Promise<ExpenseCategory[]> {
    try {
      const response = await apiClient.get<any>('/api/expenses/categories');
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.categories)) {
        return response.data.categories;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Submit a new expense claim.
   * Calls POST /api/expenses/claims
   */
  static async submitClaim(payload: CreateExpenseClaimPayload): Promise<ExpenseClaim> {
    const response = await apiClient.post<ExpenseClaim>('/api/expenses/claims', payload);
    return response.data;
  }

  /**
   * Fetch single claim details by ID.
   * Calls GET /api/expenses/claims/:id
   */
  static async getClaimDetail(id: string): Promise<ExpenseClaim | null> {
    try {
      const response = await apiClient.get<ExpenseClaim>(`/api/expenses/claims/${id}`);
      return response.data;
    } catch {
      return null;
    }
  }
}

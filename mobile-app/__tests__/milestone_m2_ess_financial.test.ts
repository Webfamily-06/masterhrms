import { ExpenseService } from '../src/core/services/expenseService';
import { PayrollService } from '../src/core/services/payrollService';
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

describe('Milestone M2 — ESS Financial Integration Verification Suites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GAP-001 & GAP-002: Expense Claims Service & Screen Wiring', () => {
    it('fetches expense claims via GET /api/expenses/claims with category/status filters', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          claimCode: 'EXP-1001',
          title: 'Client Lunch in Mumbai',
          amount: 2500,
          expenseDate: '2026-11-15',
          merchant: 'Taj Hotel',
          status: 'pending',
          createdAt: '2026-11-15T12:00:00Z',
          category: { id: 'cat-meals', name: 'Meals', code: 'MEALS' },
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockClaims });

      const claims = await ExpenseService.getMyClaims({ status: 'pending', categoryId: 'cat-meals' });
      expect(apiClient.get).toHaveBeenCalledWith('/api/expenses/claims', {
        params: { status: 'pending', categoryId: 'cat-meals', search: undefined },
      });
      expect(claims).toHaveLength(1);
      expect(claims[0].claimCode).toBe('EXP-1001');
    });

    it('fetches expense categories via GET /api/expenses/categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Travel', code: 'TRAVEL', monthlyLimit: 50000, requiresReceipt: true },
        { id: 'cat-2', name: 'Meals', code: 'MEALS', monthlyLimit: 15000, requiresReceipt: true },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockCategories });

      const categories = await ExpenseService.getCategories();
      expect(apiClient.get).toHaveBeenCalledWith('/api/expenses/categories');
      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Travel');
    });

    it('submits a new expense claim via POST /api/expenses/claims with validated payload', async () => {
      const mockCreated = {
        id: 'claim-new-99',
        claimCode: 'EXP-8899',
        title: 'Cab ride to Airport',
        amount: 850,
        merchant: 'Uber India',
        status: 'pending',
        createdAt: '2026-11-18T10:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: mockCreated });

      const res = await ExpenseService.submitClaim({
        employeeId: 'emp-101',
        categoryId: 'cat-1',
        title: 'Cab ride to Airport',
        amount: 850,
        merchant: 'Uber India',
        expenseDate: '2026-11-18',
        description: 'Client on-site visit travel',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/expenses/claims', {
        employeeId: 'emp-101',
        categoryId: 'cat-1',
        title: 'Cab ride to Airport',
        amount: 850,
        merchant: 'Uber India',
        expenseDate: '2026-11-18',
        description: 'Client on-site visit travel',
      });
      expect(res.claimCode).toBe('EXP-8899');
    });

    it('fetches single expense claim detail via GET /api/expenses/claims/:id', async () => {
      const mockDetail = {
        id: 'claim-xyz',
        claimCode: 'EXP-5555',
        title: 'Broadband Bill',
        amount: 1499,
        merchant: 'Airtel',
        status: 'approved',
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: mockDetail });

      const claim = await ExpenseService.getClaimDetail('claim-xyz');
      expect(apiClient.get).toHaveBeenCalledWith('/api/expenses/claims/claim-xyz');
      expect(claim?.merchant).toBe('Airtel');
    });
  });

  describe('GAP-003: Salary Advance Loan Request', () => {
    it('submits salary advance loan request via POST /api/v1/me/payroll/loans/request', async () => {
      const mockLoan = {
        id: 'loan-1',
        loanType: 'salary_advance',
        principal: 50000,
        tenureMonths: 6,
        monthlyEmi: 8333.33,
        disbursedAmount: 0,
        outstandingBalance: 50000,
        status: 'pending',
        deductionStartMonth: '2026-12',
        reason: 'Medical emergency',
        createdAt: '2026-11-18T12:00:00Z',
      };

      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { loan: mockLoan } });

      const res = await PayrollService.requestSalaryAdvance({
        principal: 50000,
        tenureMonths: 6,
        deductionStartMonth: '2026-12',
        reason: 'Medical emergency',
        loanType: 'salary_advance',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/me/payroll/loans/request', {
        principal: 50000,
        tenureMonths: 6,
        deductionStartMonth: '2026-12',
        reason: 'Medical emergency',
        loanType: 'salary_advance',
      });
      expect(res.id).toBe('loan-1');
      expect(res.monthlyEmi).toBe(8333.33);
    });

    it('fetches employee loans via GET /api/v1/me/payroll/reimbursements-loans', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          loanType: 'salary_advance',
          principal: 30000,
          tenureMonths: 3,
          monthlyEmi: 10000,
          status: 'active',
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { claims: [], loans: mockLoans } });

      const loans = await PayrollService.getMyLoans();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/payroll/reimbursements-loans');
      expect(loans).toHaveLength(1);
      expect(loans[0].monthlyEmi).toBe(10000);
    });
  });

  describe('GAP-004: Salary Slip Detail Breakdown', () => {
    it('fetches payslip detail via GET /api/v1/me/payslips/:id and unpacks breakdown', async () => {
      const mockPayslip = {
        id: 'slip-2026-11',
        periodMonth: 11,
        periodYear: 2026,
        grossSalary: 85000,
        deductions: 7500,
        netSalary: 77500,
        breakdown: {
          earnings: {
            basicSalary: 50000,
            hra: 20000,
            specialAllowance: 15000,
          },
          deductions: {
            epfEmployee: 1800,
            esiEmployee: 0,
            professionalTax: 200,
            tds: 5500,
          },
        },
      };

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { payslip: mockPayslip } });

      const payslip = await PayrollService.getPayslipDetail('slip-2026-11');
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/payslips/slip-2026-11');
      expect(payslip).not.toBeNull();
      expect(payslip?.grossSalary).toBe(85000);
      expect(payslip?.netSalary).toBe(77500);
      expect(payslip?.breakdown.earnings.basicSalary).toBe(50000);
    });

    it('fetches payslips list via GET /api/v1/me/payslips', async () => {
      const mockPayslips = [
        { id: 'slip-1', periodMonth: 10, periodYear: 2026, grossSalary: 80000, netSalary: 73000 },
        { id: 'slip-2', periodMonth: 11, periodYear: 2026, grossSalary: 85000, netSalary: 77500 },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { payslips: mockPayslips } });

      const list = await PayrollService.getMyPayslips();
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/payslips');
      expect(list).toHaveLength(2);
    });
  });
});

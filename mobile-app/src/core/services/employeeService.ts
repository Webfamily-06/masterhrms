import { apiClient } from '../api/apiClient';

export interface EmployeeProfile {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  joiningDate?: string | null;
  designation?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  reportingManager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  panNumber?: string | null;
  aadhaarNumber?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bloodGroup?: string | null;
  gender?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: string;
  url?: string;
  size?: number;
  uploadedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type?: string;
  isOptional?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isImportant?: boolean;
}

export interface PerformanceReview {
  id: string;
  cycleId?: string;
  cycleName?: string;
  reviewType: string;
  status: string;
  reviewerName?: string;
  ratingScore?: number | null;
  feedbackText?: string | null;
  createdAt: string;
}

export interface GoalKeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  checkins?: Array<{ id: string; note: string; value: number; createdAt: string }>;
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description?: string;
  cycle?: { id: string; name: string };
  keyResults: GoalKeyResult[];
  status?: string;
}

export interface CompanyContract {
  id: string;
  title: string;
  contractType?: string;
  status: string;
  effectiveDate?: string;
  expiryDate?: string;
  documentUrl?: string;
}

export class EmployeeService {
  /**
   * Fetch full profile of current authenticated employee
   */
  static async getMyProfile(): Promise<EmployeeProfile | null> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/profile');
      return response.data?.data || response.data?.employee || response.data;
    } catch {
      return null;
    }
  }

  /**
   * Update profile contact details (phone, gender) directly
   */
  static async updateMyProfile(data: Partial<EmployeeProfile>): Promise<any> {
    const response = await apiClient.put('/api/v1/me/profile', data);
    return response.data;
  }

  /**
   * Submit change request for sensitive profile attributes (bank, statutory, address, emergency contact)
   * Calls POST /api/v1/me/profile/change-requests
   */
  static async submitProfileChangeRequest(payload: {
    category: string;
    fieldKey: string;
    newValue: string;
    reason?: string;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/me/profile/change-requests', payload);
    return response.data;
  }

  /**
   * Fetch current employee's documents
   */
  static async getMyDocuments(): Promise<EmployeeDocument[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/documents');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.documents)) return response.data.documents;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Request a new HR document (e.g. Bonafide, Salary Certificate)
   */
  static async requestDocument(payload: {
    type: string;
    reason: string;
  }): Promise<any> {
    const response = await apiClient.post('/api/v1/me/documents/request', payload);
    return response.data;
  }

  /**
   * Fetch company holidays calendar
   */
  static async getHolidays(): Promise<Holiday[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/organization/holidays');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.holidays)) return response.data.holidays;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch company announcements
   */
  static async getAnnouncements(): Promise<Announcement[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/organization/announcements');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.announcements)) return response.data.announcements;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch performance reviews for the current employee
   */
  static async getMyPerformanceReviews(): Promise<PerformanceReview[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/performance/reviews');
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch OKR goals and key results
   */
  static async getMyGoals(): Promise<PerformanceGoal[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/performance/goals');
      if (Array.isArray(response.data)) return response.data;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Record a check-in progress on a key result
   */
  static async checkinGoal(payload: { keyResultId: string; currentValue: number; comment?: string }): Promise<any> {
    const response = await apiClient.post('/api/v1/me/performance/goals/checkin', payload);
    return response.data;
  }

  /**
   * Fetch employment contracts
   */
  static async getMyContracts(): Promise<CompanyContract[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/documents/contracts');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.contracts)) return response.data.contracts;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch workspace employees (directory for mentions, shift swaps, delegation)
   */
  static async getEmployees(search?: string): Promise<Array<{ id: string; firstName: string; lastName: string; employeeCode: string; email?: string }>> {
    try {
      const response = await apiClient.get<any>('/api/employees', { params: { search, limit: 100 } });
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.employees)) return data.employees;
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch Finance Widgets data (Small, Medium, Large) for PaymentCardsScreen
   */
  static async getFinanceWidgets(period: 'month' | 'quarter' | 'year' = 'month'): Promise<{
    netPay: string;
    delta: string;
    taxSaved: string;
    reimbursements: string;
    loanEmi: string;
    bars: number[];
    labels: string[];
    utilization: number;
  } | null> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/finance-widgets', {
        params: { period },
      });
      return response.data?.data || response.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch Home Dashboard Live Widgets summary (streak, net pay, OKR progress)
   */
  static async getHomeWidgetsSummary(): Promise<{
    attendanceStreakDays: number;
    streakDelta: string;
    netPayFormatted: string;
    financeDelta: string;
    okrProgress: number;
    okrRemainingMilestones: number;
  } | null> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/widgets/summary');
      return response.data?.data || response.data || null;
    } catch {
      return null;
    }
  }
}

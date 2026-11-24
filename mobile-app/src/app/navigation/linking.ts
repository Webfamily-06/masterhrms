import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation.types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['masterhrms://', 'https://app.masterhrms.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Splash: 'splash',
          Onboarding: 'onboarding',
          Login: 'login',
          Register: 'register',
          CompanyDiscovery: 'company-discovery',
          TwoFactorVerify: 'verify-2fa',
          ForgotPassword: 'forgot-password',
          ResetPassword: 'reset-password/:token',
          FingerprintAuth: 'auth/fingerprint',
          FaceIdAuth: 'auth/faceid',
        },
      },
      App: {
        screens: {
          // Dashboards
          EmployeeHome: 'home/employee',
          ManagerHome: 'home/manager',
          HrAdminHome: 'home/hr',
          TenantAdminHome: 'home/tenant-admin',
          SuperAdminHome: 'home/super-admin',

          // Collaboration
          ChatConversations: 'chat',
          ChatConversationDetail: 'chat/thread/:threadId',
          ChatCall: 'chat/call/:callId',
          CalendarMain: 'calendar',
          TodoList: 'todo',
          GanttTimeline: 'gantt',

          // ESS Modules
          AttendanceDetail: 'attendance',
          LeaveDetail: 'leaves',
          ApplyLeave: 'leaves/apply',
          CalendarLeavePlanner: 'leaves/planner',
          GeofenceMapPunch: 'attendance/geofence-punch',
          Payslips: 'payslips',
          SalarySlipDetail: 'payslips/:payslipId',
          PaymentCards: 'finance/payment-cards',
          ExpenseClaims: 'finance/expense-claims',
          SalaryAdvanceLoan: 'finance/salary-advances',
          ShiftSchedule: 'shifts',
          Timesheet: 'timesheets',
          EmployeeServicesHub: 'hub',
          Notifications: 'notifications',
          Profile: 'profile',
          EditProfile: 'profile/edit',
          Performance: 'performance',
          DocumentsVault: 'documents',
          Settings: 'settings',
          EmployeeDirectory: 'directory',

          // Management & HR
          TeamAttendance: 'team/attendance',
          TeamApprovals: 'team/approvals',
          TeamProjects: 'team/projects',
          OrgAttendance: 'hr/attendance',
          PendingApprovals: 'hr/approvals',
          PayrollOverview: 'hr/payroll',

          // Workspace & Admin
          WorkspaceSettings: 'admin/workspace-settings',
          UserAccess: 'admin/user-access',
          SecurityOverview: 'admin/security',
          ModulesOverview: 'admin/modules',
          PlatformTenants: 'platform/tenants',
          SystemDiagnostics: 'platform/diagnostics',
        },
      },
      AccessDenied: 'access-denied',
    },
  },
};

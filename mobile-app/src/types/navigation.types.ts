import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: { workspaceSlug?: string };
  Register: undefined;
  CompanyDiscovery: undefined;
  TwoFactorVerify: { mfaToken: string; email: string; maskedEmail: string; isSetup?: boolean };
  ForgotPassword: { email?: string };
  ResetPassword: { email: string; token?: string; code?: string };
  FingerprintAuth: undefined;
  FaceIdAuth: undefined;
};

export type SharedCollaborationModuleParamList = {
  ChatConversations:
    | {
        initialTab?: 'chats' | 'groups' | 'contacts' | 'calls';
        joinGroupToken?: string;
      }
    | undefined;
  ChatConversationDetail: {
    threadId: string;
    title: string;
    type?: 'direct' | 'group' | 'announcement';
    groupId?: string;
    otherParticipantId?: string;
    avatarUrl?: string;
    isAnnouncementOnly?: boolean;
  };
  ChatCall: {
    callId?: string;
    receiverId?: string;
    receiverName?: string;
    receiverAvatar?: string;
    callerAvatar?: string;
    callType?: 'audio' | 'video';
    threadId?: string;
    groupId?: string;
    groupName?: string;
    isGroupMeeting?: boolean;
    isIncoming?: boolean;
    hasAccepted?: boolean;
    initialStatus?: string;
  };
  CalendarMain:
    | {
        initialView?: 'agenda' | 'month' | 'week' | 'day';
        focusDate?: string;
      }
    | undefined;
  TodoList:
    | {
        taskId?: string;
      }
    | undefined;
  GanttTimeline:
    | {
        taskId?: string;
      }
    | undefined;
};

export type EmployeeStackParamList = SharedCollaborationModuleParamList & {
  EmployeeHome: undefined;
  AttendanceDetail: undefined;
  LeaveDetail: undefined;
  ApplyLeave: undefined;
  Payslips: undefined;
  SalarySlipDetail: { payslipId?: string; month: string; year: number; gross?: number; net?: number };
  Profile: undefined;
  EditProfile: undefined;
  CalendarLeavePlanner: undefined;
  GeofenceMapPunch: undefined;
  PaymentCards: undefined;
  ExpenseClaims: undefined;
  SalaryAdvanceLoan: undefined;
  ShiftSchedule: undefined;
  Timesheet: undefined;
  EmployeeServicesHub: undefined;
  Notifications: undefined;
  FingerprintAuth: undefined;
  FaceIdAuth: undefined;
  EmployeeDirectory: undefined;
  Performance: undefined;
  DocumentsVault: undefined;
  Settings: undefined;
};

export type ManagerStackParamList = SharedCollaborationModuleParamList & {
  ManagerHome: undefined;
  TeamAttendance: undefined;
  TeamApprovals: undefined;
  TeamProjects: undefined;
  Notifications: undefined;
  FingerprintAuth: undefined;
  FaceIdAuth: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EmployeeDirectory: undefined;
  Performance: undefined;
  DocumentsVault: undefined;
  Settings: undefined;
};

export type HrAdminStackParamList = SharedCollaborationModuleParamList & {
  HrAdminHome: undefined;
  EmployeeDirectory: undefined;
  OrgAttendance: undefined;
  PendingApprovals: undefined;
  PayrollOverview: undefined;
  Notifications: undefined;
  FingerprintAuth: undefined;
  FaceIdAuth: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Performance: undefined;
  DocumentsVault: undefined;
  Settings: undefined;
};

export type TenantAdminStackParamList = SharedCollaborationModuleParamList & {
  TenantAdminHome: undefined;
  UserAccess: undefined;
  WorkspaceSettings: undefined;
  SecurityOverview: undefined;
  ModulesOverview: undefined;
  Notifications: undefined;
  FingerprintAuth: undefined;
  FaceIdAuth: undefined;
  Profile: undefined;
  EditProfile: undefined;
  EmployeeDirectory: undefined;
  Performance: undefined;
  DocumentsVault: undefined;
  Settings: undefined;
};

export type SuperAdminStackParamList = {
  SuperAdminHome: undefined;
  PlatformTenants: undefined;
  SystemDiagnostics: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  EmployeeDashboard: undefined;
  ManagerDashboard: undefined;
  HrAdminDashboard: undefined;
  TenantAdminDashboard: undefined;
  SuperAdminDashboard: undefined;
  AccessDenied: { reason?: string };
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  AccessDenied: { reason?: string };
};

export type CombinedParamList = AuthStackParamList &
  AppStackParamList &
  EmployeeStackParamList &
  ManagerStackParamList &
  HrAdminStackParamList &
  TenantAdminStackParamList &
  SuperAdminStackParamList;

export type NavigationProp<T extends keyof CombinedParamList> = NativeStackNavigationProp<
  CombinedParamList,
  T
>;

export type RouteProps<T extends keyof CombinedParamList> = RouteProp<CombinedParamList, T>;

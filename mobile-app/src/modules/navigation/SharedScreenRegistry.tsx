import React from 'react';
// Collaboration Screens
import { ChatConversationsScreen } from '../chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../chat/screens/ChatConversationDetailScreen';
import { ChatCallScreen } from '../chat/screens/ChatCallScreen';
import { CalendarMainScreen } from '../calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../todo/screens/GanttTimelineScreen';

// ESS Screens
import { AttendanceDetailScreen } from '../ess/screens/AttendanceDetailScreen';
import { LeaveDetailScreen } from '../ess/screens/LeaveDetailScreen';
import { ApplyLeaveScreen } from '../ess/screens/ApplyLeaveScreen';
import { CalendarLeavePlannerScreen } from '../ess/screens/CalendarLeavePlannerScreen';
import { GeofenceMapPunchScreen } from '../ess/screens/GeofenceMapPunchScreen';
import { PayslipsScreen } from '../ess/screens/PayslipsScreen';
import { SalarySlipDetailScreen } from '../ess/screens/SalarySlipDetailScreen';
import { PaymentCardsScreen } from '../ess/screens/PaymentCardsScreen';
import { ExpenseClaimsScreen } from '../ess/screens/ExpenseClaimsScreen';
import { SalaryAdvanceLoanScreen } from '../ess/screens/SalaryAdvanceLoanScreen';
import { ShiftScheduleScreen } from '../ess/screens/ShiftScheduleScreen';
import { TimesheetScreen } from '../ess/screens/TimesheetScreen';
import { EmployeeServicesHubScreen } from '../ess/screens/EmployeeServicesHubScreen';
import { NotificationsScreen } from '../ess/screens/NotificationsScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';
import { EditProfileScreen } from '../ess/screens/EditProfileScreen';
import { PerformanceScreen } from '../ess/screens/PerformanceScreen';
import { DocumentsVaultScreen } from '../ess/screens/DocumentsVaultScreen';
import { SettingsScreen } from '../ess/screens/SettingsScreen';
import { FingerprintAuthScreen } from '../authentication/screens/FingerprintAuthScreen';
import { FaceIdAuthScreen } from '../authentication/screens/FaceIdAuthScreen';
import { EmployeeDirectoryScreen } from '../hr/screens/EmployeeDirectoryScreen';

// Manager Screens
import { TeamAttendanceScreen } from '../manager/screens/TeamAttendanceScreen';
import { TeamApprovalsScreen } from '../manager/screens/TeamApprovalsScreen';
import { TeamProjectsScreen } from '../manager/screens/TeamProjectsScreen';

// HR Screens
import { OrgAttendanceScreen } from '../hr/screens/OrgAttendanceScreen';
import { PendingApprovalsScreen } from '../hr/screens/PendingApprovalsScreen';
import { PayrollOverviewScreen } from '../hr/screens/PayrollOverviewScreen';

// Tenant Admin Screens
import { WorkspaceSettingsScreen } from '../tenant-admin/screens/WorkspaceSettingsScreen';
import { UserAccessScreen } from '../tenant-admin/screens/UserAccessScreen';
import { SecurityOverviewScreen } from '../tenant-admin/screens/SecurityOverviewScreen';
import { ModulesOverviewScreen } from '../tenant-admin/screens/ModulesOverviewScreen';

// Super Admin Screens
import { PlatformTenantsScreen } from '../super-admin/screens/PlatformTenantsScreen';
import { SystemDiagnosticsScreen } from '../super-admin/screens/SystemDiagnosticsScreen';

export const renderSharedCollaborationScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="ChatConversations" component={ChatConversationsScreen} />
    <Stack.Screen name="ChatConversationDetail" component={ChatConversationDetailScreen} />
    <Stack.Screen name="ChatCall" component={ChatCallScreen} />
    <Stack.Screen name="CalendarMain" component={CalendarMainScreen} />
    <Stack.Screen name="TodoList" component={TodoListScreen} />
    <Stack.Screen name="GanttTimeline" component={GanttTimelineScreen} />
  </React.Fragment>
);

export const renderSharedEssScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
    <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} />
    <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
    <Stack.Screen name="CalendarLeavePlanner" component={CalendarLeavePlannerScreen} />
    <Stack.Screen name="GeofenceMapPunch" component={GeofenceMapPunchScreen} />
    <Stack.Screen name="Payslips" component={PayslipsScreen} />
    <Stack.Screen name="SalarySlipDetail" component={SalarySlipDetailScreen} />
    <Stack.Screen name="PaymentCards" component={PaymentCardsScreen} />
    <Stack.Screen name="ExpenseClaims" component={ExpenseClaimsScreen} />
    <Stack.Screen name="SalaryAdvanceLoan" component={SalaryAdvanceLoanScreen} />
    <Stack.Screen name="ShiftSchedule" component={ShiftScheduleScreen} />
    <Stack.Screen name="Timesheet" component={TimesheetScreen} />
    <Stack.Screen name="EmployeeServicesHub" component={EmployeeServicesHubScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Performance" component={PerformanceScreen} />
    <Stack.Screen name="DocumentsVault" component={DocumentsVaultScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="FingerprintAuth" component={FingerprintAuthScreen} />
    <Stack.Screen name="FaceIdAuth" component={FaceIdAuthScreen} />
    <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
  </React.Fragment>
);

export const renderSharedManagerScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="TeamAttendance" component={TeamAttendanceScreen} />
    <Stack.Screen name="TeamApprovals" component={TeamApprovalsScreen} />
    <Stack.Screen name="TeamProjects" component={TeamProjectsScreen} />
  </React.Fragment>
);

export const renderSharedHrScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="OrgAttendance" component={OrgAttendanceScreen} />
    <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
    <Stack.Screen name="PayrollOverview" component={PayrollOverviewScreen} />
  </React.Fragment>
);

export const renderSharedTenantAdminScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="WorkspaceSettings" component={WorkspaceSettingsScreen} />
    <Stack.Screen name="UserAccess" component={UserAccessScreen} />
    <Stack.Screen name="SecurityOverview" component={SecurityOverviewScreen} />
    <Stack.Screen name="ModulesOverview" component={ModulesOverviewScreen} />
  </React.Fragment>
);

export const renderSharedSuperAdminScreens = (Stack: any) => (
  <React.Fragment>
    <Stack.Screen name="PlatformTenants" component={PlatformTenantsScreen} />
    <Stack.Screen name="SystemDiagnostics" component={SystemDiagnosticsScreen} />
  </React.Fragment>
);

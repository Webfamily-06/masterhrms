import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmployeeStackParamList } from '../../types/navigation.types';
import { EmployeeDashboardScreen } from '../dashboard/screens/EmployeeDashboardScreen';
import { AttendanceDetailScreen } from '../ess/screens/AttendanceDetailScreen';
import { LeaveDetailScreen } from '../ess/screens/LeaveDetailScreen';
import { ApplyLeaveScreen } from '../ess/screens/ApplyLeaveScreen';
import { PayslipsScreen } from '../ess/screens/PayslipsScreen';
import { SalarySlipDetailScreen } from '../ess/screens/SalarySlipDetailScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';
import { EditProfileScreen } from '../ess/screens/EditProfileScreen';
import { CalendarLeavePlannerScreen } from '../ess/screens/CalendarLeavePlannerScreen';
import { GeofenceMapPunchScreen } from '../ess/screens/GeofenceMapPunchScreen';
import { PaymentCardsScreen } from '../ess/screens/PaymentCardsScreen';
import { ExpenseClaimsScreen } from '../ess/screens/ExpenseClaimsScreen';
import { SalaryAdvanceLoanScreen } from '../ess/screens/SalaryAdvanceLoanScreen';
import { ShiftScheduleScreen } from '../ess/screens/ShiftScheduleScreen';
import { TimesheetScreen } from '../ess/screens/TimesheetScreen';
import { EmployeeServicesHubScreen } from '../ess/screens/EmployeeServicesHubScreen';
import { NotificationsScreen } from '../ess/screens/NotificationsScreen';
import { EmployeeDirectoryScreen } from '../hr/screens/EmployeeDirectoryScreen';
import { PerformanceScreen } from '../ess/screens/PerformanceScreen';
import { DocumentsVaultScreen } from '../ess/screens/DocumentsVaultScreen';
import { SettingsScreen } from '../ess/screens/SettingsScreen';
import { FingerprintAuthScreen } from '../authentication/screens/FingerprintAuthScreen';
import { FaceIdAuthScreen } from '../authentication/screens/FaceIdAuthScreen';
import { ChatConversationsScreen } from '../chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../chat/screens/ChatConversationDetailScreen';
import { ChatCallScreen } from '../chat/screens/ChatCallScreen';
import { CalendarMainScreen } from '../calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../todo/screens/GanttTimelineScreen';

const Stack = createNativeStackNavigator<EmployeeStackParamList>();

export const EmployeeNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeHome" component={EmployeeDashboardScreen} />
      <Stack.Screen name="AttendanceDetail" component={AttendanceDetailScreen} />
      <Stack.Screen name="LeaveDetail" component={LeaveDetailScreen} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
      <Stack.Screen name="Payslips" component={PayslipsScreen} />
      <Stack.Screen name="SalarySlipDetail" component={SalarySlipDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="CalendarLeavePlanner" component={CalendarLeavePlannerScreen} />
      <Stack.Screen name="GeofenceMapPunch" component={GeofenceMapPunchScreen} />
      <Stack.Screen name="PaymentCards" component={PaymentCardsScreen} />
      <Stack.Screen name="ExpenseClaims" component={ExpenseClaimsScreen} />
      <Stack.Screen name="SalaryAdvanceLoan" component={SalaryAdvanceLoanScreen} />
      <Stack.Screen name="ShiftSchedule" component={ShiftScheduleScreen} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} />
      <Stack.Screen name="EmployeeServicesHub" component={EmployeeServicesHubScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="DocumentsVault" component={DocumentsVaultScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="FingerprintAuth" component={FingerprintAuthScreen} />
      <Stack.Screen name="FaceIdAuth" component={FaceIdAuthScreen} />
      <Stack.Screen name="ChatConversations" component={ChatConversationsScreen} />
      <Stack.Screen name="ChatConversationDetail" component={ChatConversationDetailScreen} />
      <Stack.Screen name="ChatCall" component={ChatCallScreen} />
      <Stack.Screen name="CalendarMain" component={CalendarMainScreen} />
      <Stack.Screen name="TodoList" component={TodoListScreen} />
      <Stack.Screen name="GanttTimeline" component={GanttTimelineScreen} />
    </Stack.Navigator>
  );
};

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HrAdminStackParamList } from '../../types/navigation.types';
import { HrAdminDashboardScreen } from '../dashboard/screens/HrAdminDashboardScreen';
import { EmployeeDirectoryScreen } from '../hr/screens/EmployeeDirectoryScreen';
import { OrgAttendanceScreen } from '../hr/screens/OrgAttendanceScreen';
import { PendingApprovalsScreen } from '../hr/screens/PendingApprovalsScreen';
import { PayrollOverviewScreen } from '../hr/screens/PayrollOverviewScreen';
import { NotificationsScreen } from '../ess/screens/NotificationsScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';
import { EditProfileScreen } from '../ess/screens/EditProfileScreen';
import { PerformanceScreen } from '../ess/screens/PerformanceScreen';
import { DocumentsVaultScreen } from '../ess/screens/DocumentsVaultScreen';
import { SettingsScreen } from '../ess/screens/SettingsScreen';
import { ChatConversationsScreen } from '../chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../chat/screens/ChatConversationDetailScreen';
import { ChatCallScreen } from '../chat/screens/ChatCallScreen';
import { CalendarMainScreen } from '../calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../todo/screens/GanttTimelineScreen';

const Stack = createNativeStackNavigator<HrAdminStackParamList>();

export const HrAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HrAdminHome" component={HrAdminDashboardScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="OrgAttendance" component={OrgAttendanceScreen} />
      <Stack.Screen name="PendingApprovals" component={PendingApprovalsScreen} />
      <Stack.Screen name="PayrollOverview" component={PayrollOverviewScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="DocumentsVault" component={DocumentsVaultScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ChatConversations" component={ChatConversationsScreen} />
      <Stack.Screen name="ChatConversationDetail" component={ChatConversationDetailScreen} />
      <Stack.Screen name="ChatCall" component={ChatCallScreen} />
      <Stack.Screen name="CalendarMain" component={CalendarMainScreen} />
      <Stack.Screen name="TodoList" component={TodoListScreen} />
      <Stack.Screen name="GanttTimeline" component={GanttTimelineScreen} />
    </Stack.Navigator>
  );
};

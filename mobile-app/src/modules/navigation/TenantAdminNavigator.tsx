import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TenantAdminStackParamList } from '../../types/navigation.types';
import { TenantAdminDashboardScreen } from '../dashboard/screens/TenantAdminDashboardScreen';
import { WorkspaceSettingsScreen } from '../tenant-admin/screens/WorkspaceSettingsScreen';
import { UserAccessScreen } from '../tenant-admin/screens/UserAccessScreen';
import { SecurityOverviewScreen } from '../tenant-admin/screens/SecurityOverviewScreen';
import { ModulesOverviewScreen } from '../tenant-admin/screens/ModulesOverviewScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';
import { EditProfileScreen } from '../ess/screens/EditProfileScreen';
import { EmployeeDirectoryScreen } from '../hr/screens/EmployeeDirectoryScreen';
import { PerformanceScreen } from '../ess/screens/PerformanceScreen';
import { DocumentsVaultScreen } from '../ess/screens/DocumentsVaultScreen';
import { SettingsScreen } from '../ess/screens/SettingsScreen';
import { ChatConversationsScreen } from '../chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../chat/screens/ChatConversationDetailScreen';
import { ChatCallScreen } from '../chat/screens/ChatCallScreen';
import { CalendarMainScreen } from '../calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../todo/screens/GanttTimelineScreen';

const Stack = createNativeStackNavigator<TenantAdminStackParamList>();

export const TenantAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TenantAdminHome" component={TenantAdminDashboardScreen} />
      <Stack.Screen name="WorkspaceSettings" component={WorkspaceSettingsScreen} />
      <Stack.Screen name="UserAccess" component={UserAccessScreen} />
      <Stack.Screen name="SecurityOverview" component={SecurityOverviewScreen} />
      <Stack.Screen name="ModulesOverview" component={ModulesOverviewScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
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

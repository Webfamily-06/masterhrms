import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerStackParamList } from '../../types/navigation.types';
import { ManagerDashboardScreen } from '../dashboard/screens/ManagerDashboardScreen';
import { TeamAttendanceScreen } from '../manager/screens/TeamAttendanceScreen';
import { TeamApprovalsScreen } from '../manager/screens/TeamApprovalsScreen';
import { TeamProjectsScreen } from '../manager/screens/TeamProjectsScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';
import { EditProfileScreen } from '../ess/screens/EditProfileScreen';
import { EmployeeDirectoryScreen } from '../hr/screens/EmployeeDirectoryScreen';
import { PerformanceScreen } from '../ess/screens/PerformanceScreen';
import { DocumentsVaultScreen } from '../ess/screens/DocumentsVaultScreen';
import { SettingsScreen } from '../ess/screens/SettingsScreen';
import { NotificationsScreen } from '../ess/screens/NotificationsScreen';
import { FingerprintAuthScreen } from '../authentication/screens/FingerprintAuthScreen';
import { FaceIdAuthScreen } from '../authentication/screens/FaceIdAuthScreen';
import { ChatConversationsScreen } from '../chat/screens/ChatConversationsScreen';
import { ChatConversationDetailScreen } from '../chat/screens/ChatConversationDetailScreen';
import { ChatCallScreen } from '../chat/screens/ChatCallScreen';
import { CalendarMainScreen } from '../calendar/screens/CalendarMainScreen';
import { TodoListScreen } from '../todo/screens/TodoListScreen';
import { GanttTimelineScreen } from '../todo/screens/GanttTimelineScreen';

const Stack = createNativeStackNavigator<ManagerStackParamList>();

export const ManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManagerHome" component={ManagerDashboardScreen} />
      <Stack.Screen name="TeamAttendance" component={TeamAttendanceScreen} />
      <Stack.Screen name="TeamApprovals" component={TeamApprovalsScreen} />
      <Stack.Screen name="TeamProjects" component={TeamProjectsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="Performance" component={PerformanceScreen} />
      <Stack.Screen name="DocumentsVault" component={DocumentsVaultScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
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

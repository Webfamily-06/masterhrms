import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TenantAdminStackParamList } from '../../types/navigation.types';
import { TenantAdminDashboardScreen } from '../dashboard/screens/TenantAdminDashboardScreen';
import {
  renderSharedCollaborationScreens,
  renderSharedEssScreens,
  renderSharedHrScreens,
  renderSharedManagerScreens,
  renderSharedTenantAdminScreens,
} from './SharedScreenRegistry';

const Stack = createNativeStackNavigator<TenantAdminStackParamList>();

export const TenantAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="TenantAdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="TenantAdminHome" component={TenantAdminDashboardScreen} />
      {renderSharedCollaborationScreens(Stack)}
      {renderSharedEssScreens(Stack)}
      {renderSharedHrScreens(Stack)}
      {renderSharedManagerScreens(Stack)}
      {renderSharedTenantAdminScreens(Stack)}
    </Stack.Navigator>
  );
};

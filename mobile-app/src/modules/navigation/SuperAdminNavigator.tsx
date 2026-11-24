import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SuperAdminStackParamList } from '../../types/navigation.types';
import { SuperAdminDashboardScreen } from '../dashboard/screens/SuperAdminDashboardScreen';
import {
  renderSharedCollaborationScreens,
  renderSharedEssScreens,
  renderSharedSuperAdminScreens,
} from './SharedScreenRegistry';

const Stack = createNativeStackNavigator<SuperAdminStackParamList>();

export const SuperAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="SuperAdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="SuperAdminHome" component={SuperAdminDashboardScreen} />
      {renderSharedCollaborationScreens(Stack)}
      {renderSharedEssScreens(Stack)}
      {renderSharedSuperAdminScreens(Stack)}
    </Stack.Navigator>
  );
};

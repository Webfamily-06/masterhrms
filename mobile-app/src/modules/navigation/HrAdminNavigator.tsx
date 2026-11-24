import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HrAdminStackParamList } from '../../types/navigation.types';
import { HrAdminDashboardScreen } from '../dashboard/screens/HrAdminDashboardScreen';
import {
  renderSharedCollaborationScreens,
  renderSharedEssScreens,
  renderSharedHrScreens,
  renderSharedManagerScreens,
} from './SharedScreenRegistry';

const Stack = createNativeStackNavigator<HrAdminStackParamList>();

export const HrAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="HrAdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="HrAdminHome" component={HrAdminDashboardScreen} />
      {renderSharedCollaborationScreens(Stack)}
      {renderSharedEssScreens(Stack)}
      {renderSharedHrScreens(Stack)}
      {renderSharedManagerScreens(Stack)}
    </Stack.Navigator>
  );
};

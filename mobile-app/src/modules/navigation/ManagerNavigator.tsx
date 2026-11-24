import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerStackParamList } from '../../types/navigation.types';
import { ManagerDashboardScreen } from '../dashboard/screens/ManagerDashboardScreen';
import {
  renderSharedCollaborationScreens,
  renderSharedEssScreens,
  renderSharedManagerScreens,
} from './SharedScreenRegistry';

const Stack = createNativeStackNavigator<ManagerStackParamList>();

export const ManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ManagerHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="ManagerHome" component={ManagerDashboardScreen} />
      {renderSharedCollaborationScreens(Stack)}
      {renderSharedEssScreens(Stack)}
      {renderSharedManagerScreens(Stack)}
    </Stack.Navigator>
  );
};

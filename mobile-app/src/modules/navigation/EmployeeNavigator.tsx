import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmployeeStackParamList } from '../../types/navigation.types';
import { EmployeeDashboardScreen } from '../dashboard/screens/EmployeeDashboardScreen';
import {
  renderSharedCollaborationScreens,
  renderSharedEssScreens,
} from './SharedScreenRegistry';

const Stack = createNativeStackNavigator<EmployeeStackParamList>();

export const EmployeeNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="EmployeeHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="EmployeeHome" component={EmployeeDashboardScreen} />
      {renderSharedCollaborationScreens(Stack)}
      {renderSharedEssScreens(Stack)}
    </Stack.Navigator>
  );
};

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SuperAdminStackParamList } from '../../types/navigation.types';
import { SuperAdminDashboardScreen } from '../dashboard/screens/SuperAdminDashboardScreen';
import { PlatformTenantsScreen } from '../super-admin/screens/PlatformTenantsScreen';
import { SystemDiagnosticsScreen } from '../super-admin/screens/SystemDiagnosticsScreen';
import { ProfileScreen } from '../ess/screens/ProfileScreen';

const Stack = createNativeStackNavigator<SuperAdminStackParamList>();

export const SuperAdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuperAdminHome" component={SuperAdminDashboardScreen} />
      <Stack.Screen name="PlatformTenants" component={PlatformTenantsScreen} />
      <Stack.Screen name="SystemDiagnostics" component={SystemDiagnosticsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

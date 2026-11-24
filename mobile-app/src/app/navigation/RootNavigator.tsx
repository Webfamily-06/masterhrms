import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../providers/ThemeProvider';
import { RootStackParamList, AuthStackParamList } from '../../types/navigation.types';
import { SplashScreen } from '../../modules/authentication/screens/SplashScreen';
import { OnboardingScreen } from '../../modules/authentication/screens/OnboardingScreen';
import { RegisterScreen } from '../../modules/authentication/screens/RegisterScreen';
import { CompanyDiscoveryScreen } from '../../modules/authentication/screens/CompanyDiscoveryScreen';
import { LoginScreen } from '../../modules/authentication/screens/LoginScreen';
import { TwoFactorVerifyScreen } from '../../modules/authentication/screens/TwoFactorVerifyScreen';
import { ForgotPasswordScreen } from '../../modules/authentication/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../../modules/authentication/screens/ResetPasswordScreen';
import { FingerprintAuthScreen } from '../../modules/authentication/screens/FingerprintAuthScreen';
import { FaceIdAuthScreen } from '../../modules/authentication/screens/FaceIdAuthScreen';
import { AppNavigator } from '../../modules/navigation/AppNavigator';

import { navigationRef } from './navigationRef';
import { linking } from './linking';
import { NotificationRealtimeBridge } from '../../components/notification/NotificationRealtimeBridge';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="TwoFactorVerify" component={TwoFactorVerifyScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStack.Screen name="CompanyDiscovery" component={CompanyDiscoveryScreen} />
      <AuthStack.Screen name="FingerprintAuth" component={FingerprintAuthScreen} />
      <AuthStack.Screen name="FaceIdAuth" component={FaceIdAuthScreen} />
    </AuthStack.Navigator>
  );
};

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { theme } = useTheme();

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={{
        dark: theme.isDark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.danger,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {isAuthenticated ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
      {isAuthenticated && <NotificationRealtimeBridge />}
    </NavigationContainer>
  );
};

import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { AppProviders } from './providers/AppProviders';
import { AppBootstrap } from './bootstrap/AppBootstrap';

export const App: React.FC = () => {
  useEffect(() => {
    // Ignore known Expo Go warnings for remote notifications on Android SDK 53
    LogBox.ignoreLogs([
      /\[expo-notifications\] Push notifications \(remote notifications\) are unavailable in Expo Go/,
      /`expo-notifications` functionality is not fully supported in Expo Go/,
      /'expo-notifications' functionality is not fully supported in Expo Go/,
    ]);
  }, []);

  return (
    <AppProviders>
      <AppBootstrap />
    </AppProviders>
  );
};

export default App;

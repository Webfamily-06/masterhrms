/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';

// Suppress known Expo Go limitations for remote push notifications (SDK 52/53+)
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (
    message.includes('[expo-notifications] Push notifications') ||
    message.includes('functionality is not fully supported in Expo Go') ||
    message.includes('unavailable in Expo Go on Android since SDK 53')
  ) {
    return;
  }
  originalWarn(...args);
};

LogBox.ignoreLogs([
  /\[expo-notifications\] Push notifications \(remote notifications\) are unavailable in Expo Go/,
  /`expo-notifications` functionality is not fully supported in Expo Go/,
  /'expo-notifications' functionality is not fully supported in Expo Go/,
]);

import App from './App';
import { name as appName } from './app.json';

// Support both bare React Native CLI and Expo
AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);


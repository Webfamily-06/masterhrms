/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Support both bare React Native CLI and Expo
AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);

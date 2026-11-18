/* eslint-env jest */
// Mock react-native-keychain native module
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue(null),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('FaceID'),
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
  },
  ACCESSIBLE: {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
  },
}));

// Mock lucide-react-native icons for Jest
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        return (props) => React.createElement(View, { ...props, testID: `icon-${String(prop)}` });
      },
    }
  );
});

// Mock expo native modules
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('expo-file-system', () => {
  class MockFile {
    constructor(parent, name) {
      this.uri = `file:///mock/${name}`;
    }
    static downloadFileAsync = jest.fn().mockResolvedValue({ uri: 'file:///mock/downloaded' });
    static canPreview = jest.fn().mockResolvedValue(true);
    static preview = jest.fn().mockResolvedValue(true);
  }
  return {
    File: MockFile,
    Paths: {
      cache: { uri: 'file:///mock/cache' },
      document: { uri: 'file:///mock/document' },
    },
    cacheDirectory: 'file:///mock/cache/',
    downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/downloaded' }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(inset);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn().mockReturnValue(false),
}));

jest.mock('expo-audio', () => {
  const mockPlayer = {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
    release: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    currentTime: 0,
    duration: 20,
    playing: false,
    isLoaded: true,
  };
  const mockRecorder = {
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    uri: 'file:///mock/recording.m4a',
    isRecording: false,
    currentTime: 0,
    getStatus: jest.fn().mockReturnValue({ canRecord: true, isRecording: false, durationMillis: 0 }),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    remove: jest.fn(),
  };

  return {
    useAudioPlayer: jest.fn(() => mockPlayer),
    useAudioPlayerStatus: jest.fn(() => ({
      currentTime: 0,
      duration: 20,
      playing: false,
      isLoaded: true,
      didJustFinish: false,
    })),
    createAudioPlayer: jest.fn(() => mockPlayer),
    useAudioRecorder: jest.fn(() => mockRecorder),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    setIsAudioActiveAsync: jest.fn().mockResolvedValue(undefined),
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
    getRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
    RecordingPresets: {
      HIGH_QUALITY: { extension: '.m4a' },
      LOW_QUALITY: { extension: '.m4a' },
    },
    AudioModule: {
      requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    },
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock-token]' }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-device-token' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  registerTaskAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  AndroidNotificationPriority: { MAX: 2, HIGH: 1, DEFAULT: 0 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  modelName: 'MockDevice',
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///mock/camera.jpg' }] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///mock/gallery.jpg' }] }),
  MediaTypeOptions: { Images: 'Images', All: 'All' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///mock/doc.pdf', name: 'doc.pdf', mimeType: 'application/pdf', size: 1024 }],
  }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({ coords: { latitude: 13.0827, longitude: 80.2707 } }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([{ street: 'Mount Road', city: 'Chennai', region: 'Tamil Nadu' }]),
  Accuracy: { Balanced: 3, High: 4 },
}));

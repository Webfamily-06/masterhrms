import { PermissionsAndroid, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync, getRecordingPermissionsAsync } from 'expo-audio';

export interface MediaPermissionsStatus {
  camera: boolean;
  microphone: boolean;
  storage?: boolean;
  location?: boolean;
  notifications?: boolean;
}

/**
 * Checks camera permission without prompting the user.
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    }
    if (typeof ImagePicker?.getCameraPermissionsAsync === 'function') {
      const response = await ImagePicker.getCameraPermissionsAsync();
      return Boolean(response?.granted);
    }
    return true;
  } catch (err) {
    console.warn('[PermissionService] Check camera permission error:', err);
    return false;
  }
};

/**
 * Checks microphone permission without prompting the user.
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }
    if (typeof getRecordingPermissionsAsync === 'function') {
      const response = await getRecordingPermissionsAsync();
      return Boolean(response?.granted);
    }
    return true;
  } catch (err) {
    console.warn('[PermissionService] Check microphone permission error:', err);
    return false;
  }
};

/**
 * Requests camera permission with genuine native platform calls.
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Request',
          message:
            'MasterHRMS requires access to your camera for taking profile & attachment photos.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (typeof ImagePicker?.requestCameraPermissionsAsync === 'function') {
      const response = await ImagePicker.requestCameraPermissionsAsync();
      return Boolean(response?.granted);
    }
    return true;
  } catch (err) {
    console.warn('[PermissionService] Camera permission error:', err);
    return false;
  }
};

/**
 * Requests microphone permission with genuine native platform calls.
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission Request',
          message:
            'MasterHRMS requires access to your microphone for recording voice notes.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    if (typeof requestRecordingPermissionsAsync === 'function') {
      const response = await requestRecordingPermissionsAsync();
      return Boolean(response?.granted);
    }
    return true;
  } catch (err) {
    console.warn('[PermissionService] Microphone permission error:', err);
    return false;
  }
};

/**
 * Requests storage/media library permission with Android 13+ modern permissions fallback.
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const version =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10) || 0;
      if (version >= 33) {
        const perms = [
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
        ].filter(Boolean);
        const results = await PermissionsAndroid.requestMultiple(perms);
        return Object.values(results).some((res) => res === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Request',
            message:
              'MasterHRMS requires access to your device files to attach documents and preview photos.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[PermissionService] Storage permission error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Requests location permission for sharing current or live location in chats.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Request',
          message:
            'MasterHRMS requires access to your location to share your current or live location with your team.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return (
        granted === PermissionsAndroid.RESULTS.GRANTED ||
        granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      );
    } catch (err) {
      console.warn('[PermissionService] Location permission error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Requests essential hardware permissions upon application startup.
 */
export const requestAppMediaPermissions = async (): Promise<MediaPermissionsStatus> => {
  // General bootstrap permission flow
  if (Platform.OS === 'android') {
    try {
      const permissionsToRequest: any[] = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      const version =
        typeof Platform.Version === 'number'
          ? Platform.Version
          : parseInt(String(Platform.Version), 10) || 0;

      if (version >= 33) {
        if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        }
        if (PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
        }
      } else {
        if (PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE) {
          permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const cameraGranted =
        results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      const audioGranted =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      const storageGranted =
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] ===
          PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
          PermissionsAndroid.RESULTS.GRANTED;

      return {
        camera: cameraGranted,
        microphone: audioGranted,
        storage: storageGranted,
        notifications: true,
      };
    } catch (err) {
      console.warn('[PermissionService] Failed to request permissions:', err);
      return { camera: false, microphone: false, storage: false };
    }
  }

  // iOS check
  const [camStatus, micStatus] = await Promise.all([
    checkCameraPermission(),
    checkMicrophonePermission(),
  ]);

  return {
    camera: camStatus,
    microphone: micStatus,
    storage: true,
    notifications: true,
  };
};

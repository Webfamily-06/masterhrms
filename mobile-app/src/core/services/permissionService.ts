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
};/**
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

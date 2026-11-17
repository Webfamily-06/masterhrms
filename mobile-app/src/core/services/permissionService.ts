import { PermissionsAndroid, Platform } from 'react-native';

export interface MediaPermissionsStatus {
  camera: boolean;
  microphone: boolean;
  storage?: boolean;
  location?: boolean;
  notifications?: boolean;
}

/**
 * Requests camera permission with rationale fallback.
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Request',
          message:
            'MasterHRMS requires access to your camera for video calling and taking profile & attachment photos.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[PermissionService] Camera permission error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Requests microphone permission with rationale fallback.
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission Request',
          message:
            'MasterHRMS requires access to your microphone for voice calling and recording audio notes.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[PermissionService] Microphone permission error:', err);
      return false;
    }
  }
  return true;
};

/**
 * Requests storage/media library permission with Android 13+ modern permissions fallback.
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;
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
 * Requests essential hardware permissions (Camera, Microphone, Storage, Notifications)
 * upon application startup for frictionless video calling, voice calling, and push delivery.
 */
export const requestAppMediaPermissions = async (): Promise<MediaPermissionsStatus> => {
  if (Platform.OS === 'android') {
    try {
      const permissionsToRequest: any[] = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ];

      const version = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10) || 0;

      // Android 13+ (API 33+) requires runtime POST_NOTIFICATIONS and READ_MEDIA_*
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
        results[PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES] === PermissionsAndroid.RESULTS.GRANTED ||
        results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;

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

  // iOS permissions are triggered upon usage, Info.plist entries handle OS prompts
  return { camera: true, microphone: true, storage: true, notifications: true };
};

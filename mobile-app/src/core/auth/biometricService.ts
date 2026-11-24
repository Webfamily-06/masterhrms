import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Keychain from '../storage/keychainAdapter';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';

const BIOMETRIC_CREDENTIAL_KEY = 'masterhrms_biometric_gate';

export interface BiometricCapabilities {
  supported: boolean;
  isEnrolled: boolean;
  hasFingerprint: boolean;
  hasFaceId: boolean;
  biometryType: string | null;
}

export class BiometricService {
  /**
   * Returns detailed hardware biometric capabilities (Fingerprint / Touch ID & Face ID / Facial Recognition).
   * Works across Expo Go, custom dev builds, and standalone production apps on Android & iOS.
   */
  public static async getCapabilities(): Promise<BiometricCapabilities> {
    try {
      if (LocalAuthentication && typeof LocalAuthentication.hasHardwareAsync === 'function') {
        const [hasHardware, isEnrolled, types, securityLevel] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
          typeof LocalAuthentication.getEnrolledLevelAsync === 'function'
            ? LocalAuthentication.getEnrolledLevelAsync()
            : Promise.resolve(0),
        ]);

        const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
        const hasFaceId =
          types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
          types.includes(LocalAuthentication.AuthenticationType.IRIS);

        // Supported if hardware biometric exists OR device screen lock (PIN/Passcode) is enrolled
        const hasDevicePasscode = Number(securityLevel) >= 1;
        const supported = Boolean(hasHardware || hasDevicePasscode);

        let biometryType: string | null = null;
        if (hasFaceId && hasFingerprint) {
          biometryType = 'Face ID & Fingerprint';
        } else if (hasFaceId) {
          biometryType = Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
        } else if (hasFingerprint) {
          biometryType = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
        } else if (supported) {
          biometryType = 'Device Passcode / Biometrics';
        }

        return {
          supported,
          isEnrolled: Boolean(isEnrolled || hasDevicePasscode),
          hasFingerprint: hasFingerprint || (Platform.OS === 'android' && supported),
          hasFaceId: hasFaceId || (Platform.OS === 'ios' && supported),
          biometryType,
        };
      }
    } catch {
      // Fallback to Keychain check
    }

    try {
      const type = await Keychain.getSupportedBiometryType();
      return {
        supported: Boolean(type),
        isEnrolled: Boolean(type),
        hasFingerprint: Boolean(type && /touch|fingerprint|biometrics/i.test(type)),
        hasFaceId: Boolean(type && /face/i.test(type)),
        biometryType: type,
      };
    } catch {
      return {
        supported: false,
        isEnrolled: false,
        hasFingerprint: false,
        hasFaceId: false,
        biometryType: null,
      };
    }
  }

  /**
   * Backwards-compatible hardware check.
   */
  public static async isBiometricsSupported(): Promise<{ supported: boolean; biometryType: string | null }> {
    const caps = await this.getCapabilities();
    return {
      supported: caps.supported,
      biometryType: caps.biometryType,
    };
  }

  /**
   * Checks whether any biometric unlock (Fingerprint or Face ID) is enabled.
   */
  public static async isBiometricsEnabled(): Promise<boolean> {
    try {
      const [general, fp, face] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
        secureStorage.getItem(STORAGE_KEYS.FINGERPRINT_ENABLED),
        secureStorage.getItem(STORAGE_KEYS.FACE_ID_ENABLED),
      ]);
      return general === 'true' || fp === 'true' || face === 'true';
    } catch {
      return false;
    }
  }

  public static async isFingerprintEnabled(): Promise<boolean> {
    try {
      const [fp, general] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.FINGERPRINT_ENABLED),
        secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
      ]);
      return fp === 'true' || (fp === null && general === 'true');
    } catch {
      return false;
    }
  }

  public static async isFaceIdEnabled(): Promise<boolean> {
    try {
      const [face, general] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.FACE_ID_ENABLED),
        secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
      ]);
      return face === 'true' || (face === null && general === 'true');
    } catch {
      return false;
    }
  }

  /**
   * Saves encrypted login credentials for biometric quick-unlock across sign-outs.
   */
  public static async saveBiometricCredentials(email: string, password: string): Promise<void> {
    try {
      await Promise.all([
        secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_SAVED_EMAIL, email.trim().toLowerCase()),
        secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_SAVED_SECRET, password),
      ]);
    } catch {
      // Non-fatal
    }
  }

  public static async getSavedBiometricCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      const [email, password] = await Promise.all([
        secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_SAVED_EMAIL),
        secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_SAVED_SECRET),
      ]);
      if (email && password) {
        return { email, password };
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async setFingerprintEnabled(enabled: boolean, sessionId = 'active_session'): Promise<boolean> {
    try {
      await secureStorage.setItem(STORAGE_KEYS.FINGERPRINT_ENABLED, enabled ? 'true' : 'false');
      const faceEnabled = await secureStorage.getItem(STORAGE_KEYS.FACE_ID_ENABLED);
      const anyEnabled = enabled || faceEnabled === 'true';
      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, anyEnabled ? 'true' : 'false');

      if (enabled) {
        await Keychain.setGenericPassword('biometric_user', sessionId, {
          service: BIOMETRIC_CREDENTIAL_KEY,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        }).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  public static async setFaceIdEnabled(enabled: boolean, sessionId = 'active_session'): Promise<boolean> {
    try {
      await secureStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, enabled ? 'true' : 'false');
      const fpEnabled = await secureStorage.getItem(STORAGE_KEYS.FINGERPRINT_ENABLED);
      const anyEnabled = enabled || fpEnabled === 'true';
      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, anyEnabled ? 'true' : 'false');

      if (enabled) {
        await Keychain.setGenericPassword('biometric_user', sessionId, {
          service: BIOMETRIC_CREDENTIAL_KEY,
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
          accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
        }).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enables unified biometric unlock.
   */
  public static async enableBiometrics(sessionId: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('biometric_user', sessionId, {
        service: BIOMETRIC_CREDENTIAL_KEY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      }).catch(() => {});
      await Promise.all([
        secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true'),
        secureStorage.setItem(STORAGE_KEYS.FINGERPRINT_ENABLED, 'true'),
        secureStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, 'true'),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disables all biometric unlock options.
   */
  public static async disableBiometrics(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: BIOMETRIC_CREDENTIAL_KEY }).catch(() => {});
      await Promise.all([
        secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false'),
        secureStorage.setItem(STORAGE_KEYS.FINGERPRINT_ENABLED, 'false'),
        secureStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, 'false'),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompts the native OS biometric challenge (Fingerprint / Touch ID / Face ID) directly
   * WITHOUT requiring biometric settings to already be enabled (used during enrollment & unlock).
   */
  public static async verifyHardwareBiometric(
    promptMessage = 'Verify your identity to unlock MasterHRMS',
    mode: 'fingerprint' | 'face' | 'any' = 'any'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (LocalAuthentication && typeof LocalAuthentication.authenticateAsync === 'function') {
        const caps = await this.getCapabilities();
        if (!caps.supported && !caps.isEnrolled) {
          // Allow simulator / emulator testing in __DEV__ when no hardware sensor exists
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            return { success: true };
          }
          return {
            success: false,
            error: 'No Fingerprint or Face ID is enrolled on this device. Please set up biometrics in your device Settings.',
          };
        }

        const label =
          mode === 'face'
            ? Platform.OS === 'ios'
              ? 'Face ID Verification'
              : 'Face Unlock Verification'
            : mode === 'fingerprint'
            ? Platform.OS === 'ios'
              ? 'Touch ID Verification'
              : 'Fingerprint Verification'
            : promptMessage;

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: promptMessage || label,
          cancelLabel: 'Use Password',
          fallbackLabel: 'Use Device Passcode',
          disableDeviceFallback: false,
          biometricsSecurityLevel: 'weak',
        });

        if (result.success) {
          return { success: true };
        }

        return {
          success: false,
          error:
            result.error === 'user_cancel' || result.error === 'system_cancel'
              ? 'Biometric verification was cancelled.'
              : result.error === 'not_enrolled'
              ? 'No Fingerprint or Face ID enrolled in device settings.'
              : 'Biometric verification was not recognized. Please try again.',
        };
      }

      const credentials = await Keychain.getGenericPassword({
        service: BIOMETRIC_CREDENTIAL_KEY,
        authenticationPrompt: {
          title: 'MasterHRMS Security',
          subtitle: promptMessage,
          description: 'Scan your Fingerprint or Face ID to unlock your workspace',
          cancel: 'Use Password',
        },
      });

      return {
        success: Boolean(credentials && typeof credentials === 'object' && credentials.password),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'An error occurred during biometric verification.',
      };
    }
  }

  /**
   * Prompts the native OS biometric challenge for unlocking an active workspace.
   */
  public static async authenticateWithBiometrics(
    promptMessage = 'Authenticate to access MasterHRMS',
    mode: 'fingerprint' | 'face' | 'any' = 'any'
  ): Promise<boolean> {
    const res = await this.verifyHardwareBiometric(promptMessage, mode);
    return res.success;
  }
}

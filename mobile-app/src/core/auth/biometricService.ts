import * as Keychain from '../storage/keychainAdapter';
import { secureStorage } from '../storage/secureStorage';
import { STORAGE_KEYS } from '../../config/constants';

const BIOMETRIC_CREDENTIAL_KEY = 'masterhrms_biometric_gate';

export class BiometricService {
  /**
   * Checks if the device has enrolled hardware biometrics (Face ID, Touch ID, Fingerprint, Iris).
   */
  public static async isBiometricsSupported(): Promise<{ supported: boolean; biometryType: string | null }> {
    try {
      const type = await Keychain.getSupportedBiometryType();
      return {
        supported: Boolean(type),
        biometryType: type,
      };
    } catch {
      return { supported: false, biometryType: null };
    }
  }

  /**
   * Checks whether the user has toggled biometric unlock ON in mobile settings.
   */
  public static async isBiometricsEnabled(): Promise<boolean> {
    try {
      const enabled = await secureStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enables biometric unlock by persisting a biometric-gated hardware key.
   */
  public static async enableBiometrics(sessionId: string): Promise<boolean> {
    try {
      await Keychain.setGenericPassword('biometric_user', sessionId, {
        service: BIOMETRIC_CREDENTIAL_KEY,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });
      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Disables biometric unlock and resets biometric credentials.
   */
  public static async disableBiometrics(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({ service: BIOMETRIC_CREDENTIAL_KEY });
      await secureStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Prompts the native OS biometric challenge (FaceID / Fingerprint).
   * Returns true on success, false on cancel or failure.
   */
  public static async authenticateWithBiometrics(promptMessage = 'Authenticate to access MasterHRMS'): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricsEnabled();
      if (!isEnabled) return false;

      const credentials = await Keychain.getGenericPassword({
        service: BIOMETRIC_CREDENTIAL_KEY,
        authenticationPrompt: {
          title: 'MasterHRMS Security',
          subtitle: promptMessage,
          description: 'Scan your biometric to unlock your workspace',
          cancel: 'Use Password',
        },
      });

      return Boolean(credentials && typeof credentials === 'object' && credentials.password);
    } catch {
      return false;
    }
  }
}

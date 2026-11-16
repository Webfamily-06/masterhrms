import { NativeModules } from 'react-native';

declare const process: any;

/**
 * Safe Keychain Adapter
 * Delegates to react-native-keychain in bare native builds (Keystore/Keychain).
 * Provides graceful in-memory fallback in Expo Go client where RNKeychainManager is not registered.
 */

let NativeKeychain: any = null;
let isNativeSupported = false;

// Only attempt to require react-native-keychain in tests or if the native module is actually linked in the binary
const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
if (isTestEnv || (NativeModules && NativeModules.RNKeychainManager)) {
  try {
    const mod = require('react-native-keychain');
    if (mod && (typeof mod.getGenericPassword === 'function' || mod.default)) {
      NativeKeychain = mod.default || mod;
      isNativeSupported = true;
    }
  } catch {
    isNativeSupported = false;
    NativeKeychain = null;
  }
}

const memoryStore = new Map<string, string>();

export const ACCESS_CONTROL = {
  BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE: 'BiometryCurrentSetOrDevicePasscode',
};

export const ACCESSIBLE = {
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
};

export async function getGenericPassword(options?: {
  service?: string;
  authenticationPrompt?: {
    title?: string;
    subtitle?: string;
    description?: string;
    cancel?: string;
  };
  accessControl?: any;
  accessible?: any;
}): Promise<any> {
  if (isNativeSupported && NativeKeychain) {
    try {
      return await NativeKeychain.getGenericPassword(options);
    } catch {
      // Fallback if native execution fails
    }
  }
  const key = options?.service || 'default_credentials';
  const val = memoryStore.get(key);
  if (val) {
    return { username: 'user', password: val, service: key };
  }
  return false;
}

export async function setGenericPassword(
  usernameOrKey: string,
  password: string,
  options?: any
): Promise<any> {
  if (isNativeSupported && NativeKeychain) {
    try {
      return await NativeKeychain.setGenericPassword(usernameOrKey, password, options);
    } catch {
      // Fallback
    }
  }
  const key = options?.service || usernameOrKey;
  memoryStore.set(key, password);
  return true;
}

export async function resetGenericPassword(options?: { service?: string }): Promise<any> {
  if (isNativeSupported && NativeKeychain) {
    try {
      return await NativeKeychain.resetGenericPassword(options);
    } catch {
      // Fallback
    }
  }
  const key = options?.service || 'default_credentials';
  memoryStore.delete(key);
  return true;
}

export async function getSupportedBiometryType(): Promise<string | null> {
  if (isNativeSupported && NativeKeychain?.getSupportedBiometryType) {
    try {
      return await NativeKeychain.getSupportedBiometryType();
    } catch {
      return null;
    }
  }
  return null;
}

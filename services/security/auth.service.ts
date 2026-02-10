import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'taxify_app_pin';
const BIOMETRIC_ENABLED_KEY = 'taxify_biometric_enabled';
const LOCK_ENABLED_KEY = 'taxify_lock_enabled';
const AUTO_LOCK_TIME_KEY = 'taxify_auto_lock_time';

const DEFAULT_AUTO_LOCK_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface AuthCheckResult {
  authenticated: boolean;
  error?: string;
}

export interface BiometricAvailability {
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  error?: string;
}

export interface AuthSettings {
  lockEnabled: boolean;
  biometricEnabled: boolean;
  autoLockTime: number; // in milliseconds
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    // Check if hardware supports biometric
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return {
        available: false,
        enrolled: false,
        types: [],
        error: 'Device does not support biometric authentication',
      };
    }

    // Check if user has enrolled biometrics
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        available: true,
        enrolled: false,
        types: [],
        error: 'No biometrics enrolled on this device',
      };
    }

    // Get supported authentication types
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: true,
      enrolled: true,
      types,
    };
  } catch (error) {
    return {
      available: false,
      enrolled: false,
      types: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to access Taxify'
): Promise<AuthCheckResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use PIN',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });

    if (result.success) {
      return { authenticated: true };
    } else {
      return {
        authenticated: false,
        error: result.error || 'Authentication cancelled',
      };
    }
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

export async function setPIN(pin: string): Promise<void> {
  // Validate PIN (4-6 digits)
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }
  
  await SecureStore.setItemAsync(PIN_KEY, pin);
}

export async function getPIN(): Promise<string | null> {
  return SecureStore.getItemAsync(PIN_KEY);
}

export async function validatePIN(enteredPIN: string): Promise<boolean> {
  const storedPIN = await getPIN();
  if (!storedPIN) return false;
  return storedPIN === enteredPIN;
}

export async function removePIN(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function hasPIN(): Promise<boolean> {
  const pin = await getPIN();
  return pin !== null;
}

export async function authenticateWithPIN(enteredPIN: string): Promise<AuthCheckResult> {
  const isValid = await validatePIN(enteredPIN);
  if (isValid) {
    return { authenticated: true };
  } else {
    return {
      authenticated: false,
      error: 'Invalid PIN',
    };
  }
}

export async function getAuthSettings(): Promise<AuthSettings> {
  const [lockEnabled, biometricEnabled, autoLockTime] = await Promise.all([
    SecureStore.getItemAsync(LOCK_ENABLED_KEY),
    SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
    SecureStore.getItemAsync(AUTO_LOCK_TIME_KEY),
  ]);

  return {
    lockEnabled: lockEnabled === 'true',
    biometricEnabled: biometricEnabled === 'true',
    autoLockTime: autoLockTime ? parseInt(autoLockTime, 10) : DEFAULT_AUTO_LOCK_TIME,
  };
}

export async function saveAuthSettings(settings: Partial<AuthSettings>): Promise<void> {
  const promises: Promise<void>[] = [];

  if (settings.lockEnabled !== undefined) {
    promises.push(SecureStore.setItemAsync(LOCK_ENABLED_KEY, String(settings.lockEnabled)));
  }

  if (settings.biometricEnabled !== undefined) {
    promises.push(SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(settings.biometricEnabled)));
  }

  if (settings.autoLockTime !== undefined) {
    promises.push(SecureStore.setItemAsync(AUTO_LOCK_TIME_KEY, String(settings.autoLockTime)));
  }

  await Promise.all(promises);
}

export async function isLockEnabled(): Promise<boolean> {
  const settings = await getAuthSettings();
  return settings.lockEnabled;
}

export async function enableLock(pin: string, useBiometric: boolean = false): Promise<void> {
  await setPIN(pin);
  
  // Check biometric availability if requested
  if (useBiometric) {
    const bioAvail = await checkBiometricAvailability();
    if (!bioAvail.available || !bioAvail.enrolled) {
      throw new Error('Biometric authentication not available');
    }
  }
  
  await saveAuthSettings({
    lockEnabled: true,
    biometricEnabled: useBiometric,
  });
}

export async function disableLock(): Promise<void> {
  await removePIN();
  await saveAuthSettings({
    lockEnabled: false,
    biometricEnabled: false,
  });
}

export async function authenticate(): Promise<AuthCheckResult> {
  const settings = await getAuthSettings();
  
  if (!settings.lockEnabled) {
    return { authenticated: true };
  }

  // Try biometric first if enabled
  if (settings.biometricEnabled) {
    const bioAvail = await checkBiometricAvailability();
    if (bioAvail.enrolled) {
      const bioResult = await authenticateWithBiometrics();
      if (bioResult.authenticated) {
        return { authenticated: true };
      }
      // If biometric failed (not cancelled), fall through to PIN
      if (bioResult.error !== 'user_cancel') {
        return bioResult;
      }
    }
  }

  // Will fall through to PIN entry in UI
  return { authenticated: false, error: 'PIN required' };
}

export function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}

export async function shouldAutoLock(lastActiveTime: number | null): Promise<boolean> {
  if (!lastActiveTime) return true;
  
  const settings = await getAuthSettings();
  if (!settings.lockEnabled) return false;
  
  const elapsed = Date.now() - lastActiveTime;
  return elapsed > settings.autoLockTime;
}

export default {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  setPIN,
  getPIN,
  validatePIN,
  removePIN,
  hasPIN,
  authenticateWithPIN,
  getAuthSettings,
  saveAuthSettings,
  isLockEnabled,
  enableLock,
  disableLock,
  authenticate,
  getBiometricLabel,
  shouldAutoLock,
};

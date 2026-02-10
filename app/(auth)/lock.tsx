
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button, useTheme, IconButton, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { AppTheme } from '@/types/theme';
import {
  authenticateWithBiometrics,
  authenticateWithPIN,
  checkBiometricAvailability,
  getBiometricLabel,
  getAuthSettings,
  type BiometricAvailability,
} from '@/services/security/auth.service';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/services/security/AuthContext';

const PIN_LENGTH = 4;

export default function LockScreen() {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const { authenticate } = useAuth();
  
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [biometricAvail, setBiometricAvail] = useState<BiometricAvailability | null>(null);
  const [authSettings, setAuthSettings] = useState<{ biometricEnabled: boolean } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  useEffect(() => {
    async function init() {
      const [bioAvail, settings] = await Promise.all([
        checkBiometricAvailability(),
        getAuthSettings(),
      ]);
      setBiometricAvail(bioAvail);
      setAuthSettings(settings);
      
      if (settings.biometricEnabled && bioAvail.enrolled) {
        handleBiometricAuth();
      }
    }
    init();
  }, []);
  
  const handleBiometricAuth = useCallback(async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError('');
    
    const result = await authenticateWithBiometrics();
    
    if (result.authenticated) {
      authenticate();
    } else if (result.error === 'user_cancel') {
      // User cancelled, let them enter PIN
      setIsAuthenticating(false);
    } else {
      setError(result.error || 'Authentication failed');
      setIsAuthenticating(false);
    }
  }, [isAuthenticating, authenticate]);
  
  const handlePinDigit = useCallback((digit: string) => {
    if (pin.length < PIN_LENGTH && !isAuthenticating) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      
      if (newPin.length === PIN_LENGTH) {
        handlePinSubmit(newPin);
      }
    }
  }, [pin, isAuthenticating]);
  
  const handlePinSubmit = useCallback(async (pinToSubmit: string) => {
    setIsAuthenticating(true);
    
    const result = await authenticateWithPIN(pinToSubmit);
    
    if (result.authenticated) {
      authenticate();
    } else {
      Vibration.vibrate(200);
      setError(t('auth.invalidPIN') || 'Invalid PIN');
      setPin('');
      setIsAuthenticating(false);
    }
  }, [t, authenticate]);
  
  const handleBackspace = useCallback(() => {
    if (!isAuthenticating) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  }, [pin, isAuthenticating]);
  
  const renderPinDots = () => {
    return (
      <View style={styles.pinContainer}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              {
                backgroundColor: index < pin.length
                  ? theme.colors.primary
                  : theme.colors.outline,
                borderColor: theme.colors.outline,
              },
            ]}
          />
        ))}
      </View>
    );
  };
  
  const renderKeypad = () => {
    const keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];
    
    return (
      <View style={styles.keypad}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === '') {
                return <View key="empty" style={styles.keypadButton} />;
              }
              
              if (key === 'backspace') {
                return (
                  <IconButton
                    key={key}
                    icon="backspace"
                    size={28}
                    onPress={handleBackspace}
                    style={styles.keypadButton}
                    disabled={pin.length === 0 || isAuthenticating}
                  />
                );
              }
              
              return (
                <Button
                  key={key}
                  mode="text"
                  onPress={() => handlePinDigit(key)}
                  style={styles.keypadButton}
                  labelStyle={styles.keypadButtonLabel}
                  disabled={isAuthenticating}
                >
                  {key}
                </Button>
              );
            })}
          </View>
        ))}
      </View>
    );
  };
  
  const biometricLabel = biometricAvail?.types
    ? getBiometricLabel(biometricAvail.types)
    : 'Biometric';
  
  const showBiometricButton = biometricAvail?.enrolled && !isAuthenticating;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="shield-lock"
          size={64}
          color={theme.colors.primary}
        />
        <Text variant="headlineMedium" style={styles.title}>
          {t('auth.appLocked') || 'App Locked'}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
          {t('auth.enterPIN') || 'Enter your PIN to unlock'}
        </Text>
      </View>
      
      {renderPinDots()}
      
      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      ) : (
        <View style={styles.errorPlaceholder} />
      )}
      
      {showBiometricButton && (
        <Button
          mode="outlined"
          icon="fingerprint"
          onPress={handleBiometricAuth}
          style={styles.biometricButton}
          disabled={isAuthenticating}
        >
          {t('auth.useBiometric', { type: biometricLabel }) || `Use ${biometricLabel}`}
        </Button>
      )}
      
      {renderKeypad()}
      
      <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.outline }]}>
        Taxify - {t('auth.secure') || 'Secure'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  error: {
    marginBottom: 16,
    fontWeight: '500',
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: 16,
  },
  biometricButton: {
    marginBottom: 24,
    minWidth: 200,
  },
  keypad: {
    width: 280,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  keypadButton: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 36,
  },
  keypadButtonLabel: {
    fontSize: 24,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
  },
});

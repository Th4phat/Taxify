
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Vibration } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { 
  Text, 
  List, 
  Switch, 
  Divider, 
  useTheme, 
  Button, 
  Portal, 
  Dialog,
  TextInput,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  checkBiometricAvailability,
  getAuthSettings,
  saveAuthSettings,
  enableLock,
  disableLock,
  hasPIN,
  getBiometricLabel,
  type BiometricAvailability,
  type AuthSettings,
} from '@/services/security/auth.service';
import { useTranslation } from '@/hooks/useTranslation';

const PIN_LENGTH = 4;

export default function SecuritySettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [biometricAvail, setBiometricAvail] = useState<BiometricAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [setupPinVisible, setSetupPinVisible] = useState(false);
  const [confirmPinVisible, setConfirmPinVisible] = useState(false);
  const [currentPinStep, setCurrentPinStep] = useState('');
  const [confirmPinStep, setConfirmPinStep] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [disableDialogVisible, setDisableDialogVisible] = useState(false);
  
  useEffect(() => {
    navigation.setOptions({
      headerTitle: t('settings.title') || 'Security',
    });
    
    loadSettings();
  }, [navigation, t]);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settings, bioAvail] = await Promise.all([
        getAuthSettings(),
        checkBiometricAvailability(),
      ]);
      setAuthSettings(settings);
      setBiometricAvail(bioAvail);
    } catch (error) {
      console.error('Error loading security settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleLock = async (value: boolean) => {
    if (value) {
      // Start PIN setup
      setCurrentPinStep('');
      setConfirmPinStep('');
      setPinError('');
      setSetupPinVisible(true);
    } else {
      // Show disable confirmation
      setDisableDialogVisible(true);
    }
  };
  
  const handleToggleBiometric = async (value: boolean) => {
    if (!authSettings) return;
    
    try {
      await saveAuthSettings({ ...authSettings, biometricEnabled: value });
      setAuthSettings({ ...authSettings, biometricEnabled: value });
    } catch (error) {
      console.error('Error saving biometric setting:', error);
    }
  };
  
  const handlePinDigit = (digit: string) => {
    if (currentPinStep.length < PIN_LENGTH) {
      const newPin = currentPinStep + digit;
      setCurrentPinStep(newPin);
      setPinError('');
      
      if (newPin.length === PIN_LENGTH) {
        // Move to confirmation
        setTimeout(() => {
          setSetupPinVisible(false);
          setConfirmPinVisible(true);
          setConfirmPinStep('');
        }, 200);
      }
    }
  };
  
  const handleConfirmPinDigit = (digit: string) => {
    if (confirmPinStep.length < PIN_LENGTH) {
      const newPin = confirmPinStep + digit;
      setConfirmPinStep(newPin);
      setPinError('');
      
      if (newPin.length === PIN_LENGTH) {
        // Verify match
        if (newPin === currentPinStep) {
          // Success - enable lock
          completePinSetup(newPin);
        } else {
          Vibration.vibrate(200);
          setPinError(t('settings.pinMismatch') || 'PINs do not match');
          setConfirmPinStep('');
        }
      }
    }
  };
  
  const completePinSetup = async (pin: string) => {
    try {
      const useBiometric = biometricAvail?.enrolled && authSettings?.biometricEnabled;
      await enableLock(pin, useBiometric || false);
      
      await loadSettings();
      setConfirmPinVisible(false);
      setCurrentPinStep('');
      setConfirmPinStep('');
    } catch (error) {
      console.error('Error enabling lock:', error);
      setPinError(t('settings.setupError') || 'Failed to setup lock');
    }
  };
  
  const handleDisableLock = async () => {
    try {
      await disableLock();
      await loadSettings();
      setDisableDialogVisible(false);
    } catch (error) {
      console.error('Error disabling lock:', error);
    }
  };
  
  const handleBackspace = () => {
    if (setupPinVisible) {
      setCurrentPinStep(currentPinStep.slice(0, -1));
    } else if (confirmPinVisible) {
      setConfirmPinStep(confirmPinStep.slice(0, -1));
    }
    setPinError('');
  };
  
  const renderPinDots = (pin: string) => (
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
  
  const renderKeypad = (onPress: (digit: string) => void) => {
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
                  />
                );
              }
              
              return (
                <Button
                  key={key}
                  mode="text"
                  onPress={() => onPress(key)}
                  style={styles.keypadButton}
                  labelStyle={styles.keypadButtonLabel}
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
  
  if (loading || !authSettings) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ textAlign: 'center', marginTop: 32 }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }
  
  const biometricLabel = biometricAvail?.types
    ? getBiometricLabel(biometricAvail.types)
    : t('settings.biometric');
  
  const canUseBiometric = biometricAvail?.enrolled && authSettings.lockEnabled;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="titleSmall" style={[styles.sectionHeader, { color: theme.colors.primary }]}>
          {t('settings.appLock')}
        </Text>
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={t('settings.enableLock')}
            description={t('settings.enableLockDesc')}
            left={(props) => <List.Icon {...props} icon="lock" />}
            right={() => (
              <Switch
                value={authSettings.lockEnabled}
                onValueChange={handleToggleLock}
              />
            )}
          />
          
          {biometricAvail?.available && (
            <>
              <Divider />
              <List.Item
                title={t('settings.useBiometric', { type: biometricLabel })}
                description={biometricAvail.enrolled 
                  ? t('settings.biometricAvailable')
                  : t('settings.biometricNotEnrolled')
                }
                left={(props) => <List.Icon {...props} icon="fingerprint" />}
                right={() => (
                  <Switch
                    value={authSettings.biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    disabled={!canUseBiometric}
                  />
                )}
              />
            </>
          )}
        </List.Section>
        
        <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.outline }]}>
          {t('settings.info')}
        </Text>
        
        <View style={{ height: 32 }} />
      </ScrollView>
      
      <Portal>
        <Dialog visible={setupPinVisible} onDismiss={() => setSetupPinVisible(false)}>
          <Dialog.Title>{t('settings.createPIN')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
              {t('settings.enterPIN')}
            </Text>
            {renderPinDots(currentPinStep)}
            {pinError ? (
              <Text style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}>
                {pinError}
              </Text>
            ) : null}
            {renderKeypad(handlePinDigit)}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSetupPinVisible(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Portal>
        <Dialog visible={confirmPinVisible} onDismiss={() => setConfirmPinVisible(false)}>
          <Dialog.Title>{t('settings.confirmPIN')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: 'center', marginBottom: 16 }}>
              {t('settings.reenterPIN')}
            </Text>
            {renderPinDots(confirmPinStep)}
            {pinError ? (
              <Text style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}>
                {pinError}
              </Text>
            ) : null}
            {renderKeypad(handleConfirmPinDigit)}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setConfirmPinVisible(false);
              setSetupPinVisible(true);
            }}>{t('common.back')}</Button>
            <Button onPress={() => setConfirmPinVisible(false)}>{t('common.cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Portal>
        <Dialog visible={disableDialogVisible} onDismiss={() => setDisableDialogVisible(false)}>
          <Dialog.Title>{t('settings.disableLock')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t('settings.disableWarning')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDisableDialogVisible(false)}>{t('common.cancel')}</Button>
            <Button onPress={handleDisableLock} textColor={theme.colors.error}>
              {t('settings.disable')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoText: {
    marginHorizontal: 16,
    marginTop: 16,
    textAlign: 'center',
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
  keypad: {
    width: 240,
    alignSelf: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  keypadButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  keypadButtonLabel: {
    fontSize: 24,
    fontWeight: '500',
  },
});

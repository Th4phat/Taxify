import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import { Text, Button, IconButton, useTheme, Portal, Modal } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import type { AppTheme } from '@/types/theme';
import {
  parseReceiptWithGemini,
  mapToAppCategory,
  isGeminiConfigured,
  getConfidenceLevel,
  type GeminiReceiptData,
} from '@/services/receipt/gemini.service';
import { useTranslation } from '@/hooks/useTranslation';

interface ReceiptScannerProps {
  onScanComplete: (data: {
    amount: number;
    merchantName: string;
    date: Date;
    categoryId: string | null;
    suggestedCategory: string;
    items: string[];
    taxAmount: number | null;
    receiptImageUri: string;
    confidence: number;
    rawData: GeminiReceiptData;
  }) => void;
  onCancel: () => void;
  visible: boolean;
  // Pass available categories for auto-mapping
  availableCategories: { id: string; name: string; nameTh?: string | null; type: string }[];
}

export function ReceiptScanner({
  onScanComplete,
  onCancel,
  visible,
  availableCategories,
}: ReceiptScannerProps) {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashMode, setFlashMode] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<GeminiReceiptData | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  const geminiReady = isGeminiConfigured();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setPreviewUri(photo.uri);
        await processImage(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert(t('common.error'), t('receipt.failedCapture'));
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets[0].uri) {
        setPreviewUri(result.assets[0].uri);
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('common.error'), t('receipt.failedLoadImage'));
    }
  };

  const processImage = async (imageUri: string) => {
    if (!geminiReady) {
      Alert.alert(
        t('receipt.apiKeyMissing'),
        t('receipt.configureGeminiKey')
      );
      return;
    }

    setIsProcessing(true);
    try {
      const receiptData = await parseReceiptWithGemini(imageUri);
      setScanResult(receiptData);
      setShowResultModal(true);
    } catch (error) {
      console.error('Gemini processing error:', error);
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('receipt.failedAnalyze'),
        [{ text: t('common.ok'), onPress: () => setPreviewUri(null) }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const parseDateToLocal = (dateString: string): Date => {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    // Create date in local timezone (month is 0-indexed)
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  };

  // Confirm and return scanned data
  const handleConfirmScan = () => {
    if (!scanResult || !previewUri) return;

    const categoryId = mapToAppCategory(
      scanResult.category,
      availableCategories.filter((c) => c.type === 'expense')
    );

    const parsedDate = parseDateToLocal(scanResult.date);

    onScanComplete({
      amount: scanResult.totalAmount,
      merchantName: scanResult.merchantName,
      date: parsedDate,
      categoryId,
      suggestedCategory: scanResult.category,
      items: scanResult.items.map((item) => item.name),
      taxAmount: scanResult.taxAmount,
      receiptImageUri: previewUri,
      confidence: scanResult.confidence,
      rawData: scanResult,
    });

    setShowResultModal(false);
    setPreviewUri(null);
    setScanResult(null);
  };

  const handleRetake = () => {
    setPreviewUri(null);
    setScanResult(null);
    setShowResultModal(false);
  };

  if (!geminiReady) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.permissionModal}>
          <View style={[styles.permissionContainer, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineSmall" style={styles.permissionTitle}>
              {t('receipt.apiKeyMissing')}
            </Text>
            <Text variant="bodyMedium" style={styles.permissionText}>
              {t('receipt.configureGeminiKey')}
            </Text>
            <Button mode="contained" onPress={onCancel} style={styles.permissionButton}>
              {t('common.ok')}
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  }

  if (!permission?.granted) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onCancel} contentContainerStyle={styles.permissionModal}>
          <View style={[styles.permissionContainer, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineSmall" style={styles.permissionTitle}>
              {t('receipt.cameraPermission')}
            </Text>
            <Text variant="bodyMedium" style={styles.permissionText}>
              {t('receipt.cameraPermissionDesc')}
            </Text>
            <Button mode="contained" onPress={handleRequestPermission} style={styles.permissionButton}>
              {t('receipt.grantPermission')}
            </Button>
            <Button mode="text" onPress={onCancel} style={styles.cancelButton}>
              {t('common.cancel')}
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal visible={visible && !showResultModal} onDismiss={onCancel} contentContainerStyle={styles.modal}>
        <View style={styles.container}>
          {previewUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewUri }} style={styles.previewImage} />

              <View style={styles.previewOverlay}>
                <View style={styles.topBar}>
                  <IconButton icon="close" size={24} iconColor="#fff" onPress={handleRetake} />
                  <Text style={styles.title}>{t('receipt.preview')}</Text>
                  <View style={{ width: 48 }} />
                </View>

                {isProcessing ? (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={styles.processingText}>{t('receipt.aiAnalyzing')}</Text>
                  </View>
                ) : (
                  <View style={styles.previewActions}>
                    <Button
                      mode="contained"
                      onPress={handleRetake}
                      style={[styles.previewButton, { backgroundColor: theme.colors.surfaceVariant }]}
                      textColor={theme.colors.onSurface}
                    >
                      {t('receipt.retake')}
                    </Button>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <CameraView ref={cameraRef} style={styles.camera} facing="back" enableTorch={flashMode}>
              <View style={styles.overlay}>
                <View style={styles.topBar}>
                  <IconButton icon="close" size={24} iconColor="#fff" onPress={onCancel} />
                  <Text style={styles.title}>{t('receipt.scanReceipt')}</Text>
                  <IconButton
                    icon={flashMode ? 'flash' : 'flash-off'}
                    size={24}
                    iconColor="#fff"
                    onPress={() => setFlashMode(!flashMode)}
                  />
                </View>

                {/* Scan Frame */}
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>

                {/* Instructions */}
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructions}>
                    {t('receipt.positionReceipt')}
                  </Text>
                </View>

                {/* Bottom Controls */}
                <View style={styles.bottomBar}>
                  <IconButton
                    icon="image"
                    size={28}
                    iconColor="#fff"
                    onPress={pickImage}
                    style={styles.galleryButton}
                  />

                  <TouchableOpacity
                    style={[styles.captureButton, { borderColor: theme.colors.primary }]}
                    onPress={takePicture}
                  >
                    <View style={[styles.captureInner, { backgroundColor: theme.colors.primary }]} />
                  </TouchableOpacity>

                  <View style={styles.placeholder} />
                </View>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>

      <Modal
        visible={showResultModal}
        onDismiss={handleRetake}
        contentContainerStyle={[styles.resultModalContainer, { backgroundColor: theme.colors.surface }]}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>
          {t('receipt.reviewReceipt')}
        </Text>

        {scanResult && (
          <ScrollView style={styles.resultScroll}>
            <View
              style={[
                styles.confidenceBadge,
                {
                  backgroundColor:
                    getConfidenceLevel(scanResult.confidence) === 'high'
                      ? theme.colors.success
                      : getConfidenceLevel(scanResult.confidence) === 'medium'
                        ? theme.colors.warning
                        : theme.colors.error,
                },
              ]}
            >
              <Text style={styles.confidenceText}>
                {getConfidenceLevel(scanResult.confidence) === 'high'
                  ? t('receipt.highConfidence')
                  : getConfidenceLevel(scanResult.confidence) === 'medium'
                    ? t('receipt.mediumConfidence')
                    : t('receipt.lowConfidence')}
              </Text>
            </View>

            <View style={styles.resultSection}>
              <Text variant="titleMedium">{scanResult.merchantName}</Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary, marginTop: 8 }}>
                ฿{scanResult.totalAmount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.resultSection}>
              <Text variant="bodySmall" style={styles.resultLabel}>
                {t('receipt.suggestedCategory')}
              </Text>
              <View style={styles.categoryChip}>
                <Text style={{ color: theme.colors.onPrimary }}>{scanResult.category}</Text>
              </View>
              {scanResult.categoryConfidence < 0.6 && (
                <Text variant="bodySmall" style={{ color: theme.colors.warning, marginTop: 4 }}>
                  {t('receipt.lowCategoryConfidence')}
                </Text>
              )}
            </View>

            <View style={styles.resultSection}>
              <Text variant="bodySmall" style={styles.resultLabel}>
                {t('receipt.date')}
              </Text>
              <Text variant="bodyLarge">
                {parseDateToLocal(scanResult.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              {(() => {
                const receiptDate = parseDateToLocal(scanResult.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = receiptDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < -31) {
                  return (
                    <Text variant="bodySmall" style={{ color: theme.colors.warning, marginTop: 4 }}>
                      ⚠️ {t('receipt.oldReceiptWarning')}
                    </Text>
                  );
                } else if (diffDays > 1) {
                  return (
                    <Text variant="bodySmall" style={{ color: theme.colors.warning, marginTop: 4 }}>
                      ⚠️ {t('receipt.futureReceiptWarning')}
                    </Text>
                  );
                }
                return (
                  <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                    {t('receipt.tapEditAfterSave')}
                  </Text>
                );
              })()}
            </View>

            {scanResult.items.length > 0 && (
              <View style={styles.resultSection}>
                <Text variant="bodySmall" style={styles.resultLabel}>
                  {t('receipt.items')} ({scanResult.items.length})
                </Text>
                {scanResult.items.slice(0, 5).map((item, index) => (
                  <Text key={index} variant="bodyMedium" style={styles.itemText}>
                    • {item.name} x{item.quantity}
                  </Text>
                ))}
                {scanResult.items.length > 5 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {t('receipt.moreItems', { count: scanResult.items.length - 5 })}
                  </Text>
                )}
              </View>
            )}

            {scanResult.taxAmount && (
              <View style={styles.resultSection}>
                <Text variant="bodySmall" style={styles.resultLabel}>
                  {t('receipt.taxVat')}
                </Text>
                <Text variant="bodyLarge">฿{scanResult.taxAmount.toFixed(2)}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.resultActions}>
          <Button onPress={handleRetake} style={styles.resultButton}>
            {t('receipt.retake')}
          </Button>
          <Button mode="contained" onPress={handleConfirmScan} style={styles.resultButton}>
            {t('receipt.useThisData')}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scanFrame: {
    width: 280,
    height: 380,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructions: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  galleryButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  placeholder: {
    width: 48,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  permissionModal: {
    margin: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
  },
  permissionTitle: {
    marginBottom: 12,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  permissionButton: {
    width: '100%',
    marginBottom: 8,
  },
  cancelButton: {
    width: '100%',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingHorizontal: 32,
  },
  previewButton: {
    minWidth: 120,
  },
  resultModalContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  resultScroll: {
    maxHeight: 400,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  confidenceText: {
    color: '#fff',
    fontWeight: '600',
  },
  resultSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  resultLabel: {
    opacity: 0.6,
    marginBottom: 4,
  },
  categoryChip: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  itemText: {
    marginBottom: 2,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  resultButton: {
    flex: 1,
  },
});

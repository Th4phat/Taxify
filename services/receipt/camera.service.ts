import { useRef, useState, useCallback } from 'react';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CameraState {
  hasPermission: boolean | null;
  isReady: boolean;
  facing: CameraType;
}

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
}

export function useReceiptCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  const toggleFacing = useCallback(() => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  }, []);
  
  const onCameraReady = useCallback(() => {
    setIsReady(true);
  }, []);
  
  const takePicture = useCallback(async (): Promise<CapturedImage | null> => {
    if (!cameraRef.current || !isReady) {
      return null;
    }
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      
      if (!photo) {
        return null;
      }
      
      return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
    } catch (error) {
      console.error('Error taking picture:', error);
      return null;
    }
  }, [isReady]);
  
  const optimizeForOCR = useCallback(async (imageUri: string): Promise<string> => {
    try {
      // Resize to reasonable dimensions for OCR
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1920 } }, // Max width for OCR
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      return manipulated.uri;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return imageUri;
    }
  }, []);
  
  return {
    cameraRef,
    permission,
    requestPermission,
    facing,
    isReady,
    toggleFacing,
    onCameraReady,
    takePicture,
    optimizeForOCR,
  };
}

export function hasCameraPermission(
  permission: ReturnType<typeof useCameraPermissions>[0]
): boolean {
  return permission?.granted ?? false;
}

export async function ensureCameraPermission(
  permission: ReturnType<typeof useCameraPermissions>[0],
  requestPermission: () => Promise<ReturnType<typeof useCameraPermissions>[0]>
): Promise<boolean> {
  if (permission?.granted) {
    return true;
  }
  
  const result = await requestPermission();
  return result?.granted ?? false;
}

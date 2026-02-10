import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { isLockEnabled, shouldAutoLock } from './auth.service';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticate: () => void;
  lock: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActiveTime, setLastActiveTime] = useState<number | null>(null);

  // Check if lock is enabled and redirect if needed
  const checkAuth = useCallback(async () => {
    try {
      const lockEnabled = await isLockEnabled();
      
      if (!lockEnabled) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const isAuthGroup = segments[0] === '(auth)';
      
      if (isAuthenticated && !isAuthGroup) {
        setLastActiveTime(Date.now());
      }

      if (!isAuthGroup && !isAuthenticated && lastActiveTime) {
        const needsLock = await shouldAutoLock(lastActiveTime);
        if (needsLock) {
          router.replace('/(auth)/lock');
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsLoading(false);
    }
  }, [segments, isAuthenticated, lastActiveTime, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Update last active time when user navigates away from lock screen
  useEffect(() => {
    if (segments[0] !== '(auth)' && isAuthenticated) {
      setLastActiveTime(Date.now());
    }
  }, [segments, isAuthenticated]);

  const authenticate = useCallback(() => {
    setIsAuthenticated(true);
    setLastActiveTime(Date.now());
  }, []);

  const lock = useCallback(async () => {
    const lockEnabled = await isLockEnabled();
    if (lockEnabled) {
      setIsAuthenticated(false);
      setLastActiveTime(null);
      router.replace('/(auth)/lock');
    }
  }, [router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, authenticate, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

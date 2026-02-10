import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocale } from '@/i18n';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Language = 'en' | 'th';

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  
  language: Language;
  setLanguage: (lang: Language) => void;
  
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  dailyReminder: boolean;
  setDailyReminder: (enabled: boolean) => void;
  taxDeadlineReminder: boolean;
  setTaxDeadlineReminder: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      setThemeMode: (mode) => set({ themeMode: mode }),
      
      language: 'en',
      setLanguage: (lang) => {
        setLocale(lang);  // Update i18n locale
        set({ language: lang });
      },
      
      notificationsEnabled: true,
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      dailyReminder: false,
      setDailyReminder: (enabled) => set({ dailyReminder: enabled }),
      taxDeadlineReminder: true,
      setTaxDeadlineReminder: (enabled) => set({ taxDeadlineReminder: enabled }),
    }),
    {
      name: 'taxify-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          setLocale(state.language);
        }
      },
    }
  )
);

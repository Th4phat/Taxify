/**
 * i18n-js Configuration
 * Internationalization setup for Taxify app
 */

import { I18n } from 'i18n-js';
import { enTranslations } from './translations/en';
import { thTranslations } from './translations/th';

// Create i18n instance
export const i18n = new I18n();

// Store translations
i18n.store({
  en: enTranslations,
  th: thTranslations,
});

// Configure i18n
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Initialize with stored locale (will be set by settings store)
i18n.locale = 'en';

// Listeners for locale changes
const listeners = new Set<() => void>();

// Helper function to set locale
export function setLocale(locale: 'en' | 'th') {
  i18n.locale = locale;
  // Notify all listeners
  listeners.forEach((callback) => callback());
}

// Helper function to get current locale
export function getLocale(): string {
  return i18n.locale;
}

// Subscribe to locale changes
export function subscribeToLocale(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Type-safe translation helper
export function t(
  key: string,
  options?: Record<string, string | number>
): string {
  return i18n.t(key, options);
}

export default i18n;

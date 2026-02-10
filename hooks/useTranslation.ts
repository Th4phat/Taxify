import { useCallback, useEffect, useState } from 'react';
import { t as translate, subscribeToLocale } from '@/i18n';

export function useTranslation() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToLocale(() => {
      setTick((t) => t + 1);
    });

    return unsubscribe;
  }, []);

  const t = useCallback(
    (key: string, options?: Record<string, string | number>): string => {
      return translate(key, options);
    },
    []
  );

  return { t };
}

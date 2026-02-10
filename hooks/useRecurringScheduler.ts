import { useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { processDueRecurringTransactions } from '@/services/recurring/recurringScheduler.service';

export async function checkAndProcessRecurringTransactions(): Promise<number> {
  try {
    const result = await processDueRecurringTransactions(new Date());
    
    if (result.generated.length > 0) {
      console.log(`Generated ${result.generated.length} recurring transactions:`);
      result.generated.forEach((tx) => {
        console.log(`  - ${tx.description}: ฿${tx.amount}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.error('Errors processing recurring transactions:', result.errors);
    }
    
    return result.generated.length;
  } catch (error) {
    console.error('Error in checkAndProcessRecurringTransactions:', error);
    return 0;
  }
}

export function useRecurringScheduler(enabled: boolean = true) {
  const appState = useRef(AppState.currentState);
  const isProcessing = useRef(false);

  const processRecurring = useCallback(async () => {
    if (isProcessing.current) return;
    
    isProcessing.current = true;
    try {
      await checkAndProcessRecurringTransactions();
    } finally {
      isProcessing.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    processRecurring();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        processRecurring();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, processRecurring]);
}

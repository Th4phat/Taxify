import { useEffect, useState } from 'react';
import { seedDefaultCategories } from '@/database/repositories/category.repo';
import { DEFAULT_CATEGORIES } from '@/constants/categories';

export function useDatabaseSeed(migrationsComplete: boolean) {
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!migrationsComplete) return;
    
    async function seed() {
      try {
        await seedDefaultCategories(DEFAULT_CATEGORIES);
        setSeeded(true);
      } catch (err) {
        console.error('Error seeding database:', err);
        setError(err instanceof Error ? err : new Error('Failed to seed database'));
      }
    }
    
    seed();
  }, [migrationsComplete]);
  
  return { seeded, error };
}

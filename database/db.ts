import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open database synchronously - this is the correct pattern for Expo SDK 54
const expoDb = openDatabaseSync('taxify.db');

// Create Drizzle database instance with schema
export const db = drizzle(expoDb, { schema });

// Export database type for use in repositories
export type Database = typeof db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await expoDb.getAllAsync<{ name: string }>(
      `SELECT name FROM pragma_table_info('${tableName}') WHERE name = ?`,
      [columnName]
    );
    return result.length > 0;
  } catch {
    return false;
  }
}

async function addColumnIfNotExists(
  tableName: string, 
  columnName: string, 
  columnDef: string
): Promise<void> {
  const exists = await columnExists(tableName, columnName);
  if (!exists) {
    try {
      await expoDb.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`[DB] Added column ${columnName} to ${tableName}`);
    } catch (error) {
      // Column might have been added by another process or migration
      console.log(`[DB] Column ${columnName} may already exist:`, error);
    }
  }
}

async function ensureSchemaColumns(): Promise<void> {
  // Add withholding tax columns that may be missing from migration 0002
  await addColumnIfNotExists('transactions', 'withholding_tax', 'REAL DEFAULT 0');
  await addColumnIfNotExists('transactions', 'withholding_tax_rate', 'REAL');
  await addColumnIfNotExists('transactions', 'has_withholding_certificate', 'INTEGER DEFAULT 0');
  
  // Create index if it doesn't exist
  try {
    await expoDb.execAsync(
      'CREATE INDEX IF NOT EXISTS transaction_withholding_idx ON transactions(withholding_tax)'
    );
  } catch (error) {
    console.log('[DB] Index may already exist:', error);
  }
}

export async function initializeDatabase(): Promise<void> {
  await expoDb.execAsync('PRAGMA journal_mode = WAL;');
  
  // Ensure all schema columns exist (handles partial migration failures)
  await ensureSchemaColumns();
}

export async function setEncryptionKey(key: string): Promise<void> {
  await expoDb.execAsync(`PRAGMA key = '${key}';`);
}

export async function closeDatabase(): Promise<void> {
  await expoDb.closeAsync();
}

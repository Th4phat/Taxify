# Taxify Implementation Guide
## Phase-by-Phase Development Instructions

---

## Phase 1: Foundation Setup

> **Note:** This project uses [Bun](https://bun.sh/) as the package manager. Bun provides faster package installation, better monorepo support, and improved performance over npm. Make sure you have Bun installed: `curl -fsSL https://bun.sh/install | bash`

### Step 1.1: Install Dependencies

```bash
# Navigate to project
cd /home/bunk/Stuff/mobile_app/taxify

# Install all dependencies using Bun
bun install

# Install database and ORM
bunx expo install expo-sqlite drizzle-orm
bun add -d drizzle-kit

# Install chart library
bunx expo install react-native-gifted-charts expo-linear-gradient react-native-svg

# Install camera and OCR
bunx expo install expo-camera expo-mlkit-ocr expo-image-manipulator

# Install security libraries
bunx expo install expo-secure-store expo-crypto

# Install state management and utilities
bun add zustand date-fns uuid
bun add -d @types/uuid

# Install additional utilities
bunx expo install expo-haptics expo-localization
```

### Step 1.2: Configure app.json

Update `app.json` with required plugins:

```json
{
  "expo": {
    "name": "Taxify",
    "slug": "taxify",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "taxify",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.taxify",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Taxify uses Face ID to secure your financial data"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0F766E"
      },
      "package": "com.yourcompany.taxify"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-sqlite",
        {
          "useSQLCipher": true
        }
      ],
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow Taxify to use Face ID to secure your financial data"
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Taxify to access your camera to scan receipts",
          "microphonePermission": "Allow Taxify to access your microphone"
        }
      ],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#0F766E"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### Step 1.3: Create Database Schema

Create `database/schema.ts`:

```typescript
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  categoryId: text('category_id').notNull(),
  section40Type: integer('section_40_type'),
  isTaxDeductible: integer('is_tax_deductible', { mode: 'boolean' }).default(false),
  description: text('description'),
  receiptImageUri: text('receipt_image_uri'),
  transactionDate: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  dateIdx: index('transaction_date_idx').on(table.transactionDate),
  typeIdx: index('transaction_type_idx').on(table.type),
}));

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameTh: text('name_th'),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false),
  displayOrder: integer('display_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('main'),
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).default(false),
  language: text('language', { enum: ['th', 'en'] }).default('th'),
  themeMode: text('theme_mode', { enum: ['light', 'dark', 'system'] }).default('system'),
  defaultTaxYear: integer('default_tax_year'),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
```

### Step 1.4: Create Database Provider

Create `database/db.ts`:

```typescript
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import * as schema from './schema';
import migrations from './migrations/migrations';

const DatabaseContext = createContext<ReturnType<typeof drizzle> | null>(null);

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) throw new Error('useDatabase must be used within DatabaseProvider');
  return context;
}

async function migrateDatabase(db: ReturnType<typeof drizzle>) {
  await migrate(db, migrations);
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider 
      databaseName="taxify.db" 
      onInit={async (sqlite) => {
        await sqlite.execAsync('PRAGMA journal_mode = WAL;');
      }}
    >
      <InnerProvider>{children}</InnerProvider>
    </SQLiteProvider>
  );
}

function InnerProvider({ children }: PropsWithChildren) {
  const sqlite = useSQLiteContext();
  const db = useMemo(() => drizzle(sqlite, { schema }), [sqlite]);
  
  return (
    <DatabaseContext.Provider value={db}>
      {children}
    </DatabaseContext.Provider>
  );
}
```

### Step 1.5: Create Theme System

Create `theme/index.ts`:

```typescript
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0F766E',
    secondary: '#0369A1',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    income: '#10B981',
    expense: '#EF4444',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#5EEAD4',
    secondary: '#7DD3FC',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    income: '#34D399',
    expense: '#F87171',
  },
};
```

### Step 1.6: Update Root Layout

Update `app/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '@/theme';
import { DatabaseProvider } from '@/database/db';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <DatabaseProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(app)" />
        </Stack>
      </PaperProvider>
    </DatabaseProvider>
  );
}
```

---

## Phase 2: Core Transactions Feature

### Step 2.1: Create Category Seed Data

Create `constants/categories.ts`:

```typescript
export const DEFAULT_CATEGORIES = [
  // Income categories
  { id: 'inc-salary', name: 'Salary', nameTh: 'เงินเดือน', type: 'income', icon: 'cash', color: '#10B981', section40: 1 },
  { id: 'inc-freelance', name: 'Freelance', nameTh: 'ฟรีแลนซ์', type: 'income', icon: 'laptop', color: '#3B82F6', section40: 2 },
  { id: 'inc-rental', name: 'Rental', nameTh: 'ค่าเช่า', type: 'income', icon: 'home', color: '#8B5CF6', section40: 5 },
  { id: 'inc-dividend', name: 'Dividend', nameTh: 'เงินปันผล', type: 'income', icon: 'trending-up', color: '#F59E0B', section40: 4 },
  { id: 'inc-business', name: 'Business', nameTh: 'ธุรกิจ', type: 'income', icon: 'store', color: '#EC4899', section40: 8 },
  
  // Expense categories
  { id: 'exp-food', name: 'Food', nameTh: 'อาหาร', type: 'expense', icon: 'food', color: '#EF4444' },
  { id: 'exp-transport', name: 'Transport', nameTh: 'ค่าเดินทาง', type: 'expense', icon: 'car', color: '#F97316' },
  { id: 'exp-utilities', name: 'Utilities', nameTh: 'ค่าสาธารณูปโภค', type: 'expense', icon: 'flash', color: '#EAB308' },
  { id: 'exp-shopping', name: 'Shopping', nameTh: 'ช็อปปิ้ง', type: 'expense', icon: 'shopping', color: '#8B5CF6' },
  { id: 'exp-healthcare', name: 'Healthcare', nameTh: 'สุขภาพ', type: 'expense', icon: 'medical-bag', color: '#06B6D4' },
  { id: 'exp-entertainment', name: 'Entertainment', nameTh: 'บันเทิง', type: 'expense', icon: 'movie', color: '#EC4899' },
];
```

### Step 2.2: Create Transaction Repository

Create `database/repositories/transaction.repo.ts`:

```typescript
import { useDatabase } from '../db';
import { transactions, type NewTransaction, type Transaction } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export function useTransactionRepository() {
  const db = useDatabase();

  return {
    async getAll(): Promise<Transaction[]> {
      return db.query.transactions.findMany({
        orderBy: desc(transactions.transactionDate),
      });
    },

    async getByDateRange(start: Date, end: Date): Promise<Transaction[]> {
      return db.query.transactions.findMany({
        where: and(
          gte(transactions.transactionDate, start),
          lte(transactions.transactionDate, end)
        ),
        orderBy: desc(transactions.transactionDate),
      });
    },

    async getById(id: string): Promise<Transaction | null> {
      const result = await db.query.transactions.findFirst({
        where: eq(transactions.id, id),
      });
      return result || null;
    },

    async create(data: Omit<NewTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
      const id = crypto.randomUUID();
      const now = new Date();
      
      await db.insert(transactions).values({
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      });
      
      return id;
    },

    async update(id: string, data: Partial<NewTransaction>): Promise<void> {
      await db.update(transactions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(transactions.id, id));
    },

    async delete(id: string): Promise<void> {
      await db.delete(transactions).where(eq(transactions.id, id));
    },

    async getSummary(start: Date, end: Date): Promise<{ income: number; expense: number }> {
      const results = await db.query.transactions.findMany({
        where: and(
          gte(transactions.transactionDate, start),
          lte(transactions.transactionDate, end)
        ),
      });

      return results.reduce((acc, t) => ({
        income: acc.income + (t.type === 'income' ? t.amount : 0),
        expense: acc.expense + (t.type === 'expense' ? t.amount : 0),
      }), { income: 0, expense: 0 });
    },
  };
}
```

### Step 2.3: Create Dashboard Screen

Create `app/(app)/dashboard.tsx`:

```typescript
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, FAB, useTheme } from 'react-native-paper';
import { useEffect, useState } from 'react';
import { useTransactionRepository } from '@/database/repositories/transaction.repo';
import { formatCurrency } from '@/utils/formatters';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { router } from 'expo-router';

export default function Dashboard() {
  const theme = useTheme();
  const repo = useTransactionRepository();
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const data = await repo.getSummary(start, end);
    setSummary(data);
    setLoading(false);
  };

  const balance = summary.income - summary.expense;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.greeting}>
          {format(new Date(), 'MMMM yyyy')}
        </Text>

        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text variant="titleMedium">Total Balance</Text>
            <Text variant="displayLarge" style={{ color: theme.colors.primary }}>
              {formatCurrency(balance)}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { flex: 1, marginRight: 8 }]}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.income }}>
                Income
              </Text>
              <Text variant="titleLarge">{formatCurrency(summary.income)}</Text>
            </Card.Content>
          </Card>

          <Card style={[styles.summaryCard, { flex: 1, marginLeft: 8 }]}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.expense }}>
                Expense
              </Text>
              <Text variant="titleLarge">{formatCurrency(summary.expense)}</Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/transactions/new')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  greeting: {
    marginBottom: 16,
  },
  balanceCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    elevation: 2,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
```

---

## Phase 3: Tax Calculator Implementation

### Step 3.1: Create Tax Service

Create `services/tax/calculator.ts`:

```typescript
export interface TaxCalculationInput {
  incomes: { type: number; amount: number }[];
  deductions: {
    personalAllowance: number;
    spouseAllowance: number;
    childAllowance: number;
    parentAllowance: number;
    socialSecurity: number;
    lifeInsurance: number;
    rmf: number;
    ssf: number;
  };
}

export interface TaxCalculationResult {
  netIncome: number;
  taxableIncome: number;
  taxAmount: number;
  effectiveRate: number;
}

const TAX_BRACKETS = [
  { limit: 150000, rate: 0 },
  { limit: 300000, rate: 0.05 },
  { limit: 500000, rate: 0.10 },
  { limit: 750000, rate: 0.15 },
  { limit: 1000000, rate: 0.20 },
  { limit: 2000000, rate: 0.25 },
  { limit: 5000000, rate: 0.30 },
  { limit: Infinity, rate: 0.35 },
];

export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  // Calculate gross income
  const grossIncome = input.incomes.reduce((sum, inc) => sum + inc.amount, 0);
  
  // Calculate expense deductions (simplified)
  let expenseDeduction = 0;
  for (const income of input.incomes) {
    if (income.type === 1 || income.type === 2) {
      // 50% capped at 100,000
      expenseDeduction += Math.min(income.amount * 0.5, 100000);
    } else if (income.type === 8) {
      // 60% for business
      expenseDeduction += income.amount * 0.6;
    }
  }
  
  const netIncome = grossIncome - expenseDeduction;
  
  // Calculate total deductions
  const totalDeductions = Object.values(input.deductions).reduce((a, b) => a + b, 0);
  
  const taxableIncome = Math.max(0, netIncome - totalDeductions);
  
  // Calculate progressive tax
  let taxAmount = 0;
  let previousLimit = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of TAX_BRACKETS) {
    if (remainingIncome <= 0) break;
    
    const bracketSize = bracket.limit === Infinity 
      ? remainingIncome 
      : Math.min(bracket.limit - previousLimit, remainingIncome);
    
    if (previousLimit > 0) {
      taxAmount += bracketSize * bracket.rate;
    }
    
    remainingIncome -= bracketSize;
    previousLimit = bracket.limit;
  }
  
  return {
    netIncome,
    taxableIncome,
    taxAmount,
    effectiveRate: grossIncome > 0 ? taxAmount / grossIncome : 0,
  };
}
```

---

## Testing Checklist

### Unit Tests
```bash
# Run tests
bun test
```

### Manual Testing
- [ ] App launches without errors
- [ ] Theme switches correctly (light/dark)
- [ ] Database initializes properly
- [ ] Can add a transaction
- [ ] Can view transaction list
- [ ] Dashboard shows correct totals
- [ ] Tax calculator produces expected results

### Device Testing
- [ ] iOS device
- [ ] Android device
- [ ] Camera permission flow
- [ ] OCR accuracy check
- [ ] Database encryption verified

---

## Deployment Preparation

### Build Configuration
```bash
# Install EAS CLI
bun add -g eas-cli

# Configure build
eas build:configure

# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

### App Store Assets
- [ ] App icon (1024x1024)
- [ ] Screenshot for iPhone
- [ ] Screenshot for iPad
- [ ] App description in Thai and English
- [ ] Privacy policy

---

*This guide provides step-by-step instructions for implementing Taxify. Follow each phase sequentially for best results.*

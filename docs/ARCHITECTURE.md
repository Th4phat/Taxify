# Taxify Architecture Documentation

## System Overview

Taxify follows a **local-first, privacy-centric architecture** designed to keep sensitive financial data on the user's device while providing powerful Thai tax calculation capabilities.

---

## Core Principles

### 1. Privacy by Design
- All data stored locally in encrypted SQLite database
- No cloud synchronization required (optional future feature)
- Biometric authentication support
- Secure key storage using iOS Keychain / Android Keystore

### 2. Local-First Architecture
```
┌─────────────────────────────────────────┐
│           React Native UI               │
│    (react-native-paper components)      │
├─────────────────────────────────────────┤
│         Zustand State Store             │
│      (local UI state management)        │
├─────────────────────────────────────────┤
│         Drizzle ORM Layer               │
│    (type-safe database operations)      │
├─────────────────────────────────────────┤
│      SQLite (SQLCipher)                 │
│    (encrypted local database)           │
├─────────────────────────────────────────┤
│      expo-secure-store                  │
│    (encryption key management)          │
└─────────────────────────────────────────┘
```

### 3. Modular Tax Engine
The tax calculation system is modular to accommodate changes in Thai tax law:

```
services/tax/
├── section40.ts      # Income classification (8 types)
├── deductions.ts     # Allowances & deductions
├── calculator.ts     # Main calculation logic
└── penalties.ts      # Late filing penalties
```

---

## Data Flow

### Transaction Creation Flow
```
1. User Input (Manual or OCR)
   ↓
2. Form Validation
   ↓
3. Transaction Repository
   ↓
4. Drizzle ORM
   ↓
5. Encrypted SQLite Storage
   ↓
6. Zustand Store Update
   ↓
7. UI Re-render
```

### Tax Calculation Flow
```
1. Load Transactions (filter by tax year)
   ↓
2. Group by Section 40 Type
   ↓
3. Calculate Expense Deductions
   ↓
4. Apply Personal Allowances
   ↓
5. Calculate Progressive Tax
   ↓
6. Compare with Alternative Minimum Tax
   ↓
7. Display Results
```

---

## Security Architecture

### Encryption Layers

| Layer | Method | Purpose |
|-------|--------|---------|
| Database | SQLCipher (AES-256) | Full database encryption |
| Key Storage | iOS Keychain / Android Keystore | Secure encryption key storage |
| Field-level | App-level encryption | Extra sensitive fields (Tax ID) |
| Biometric | iOS LocalAuthentication / Android Biometric | App access control |

### Key Management
```typescript
// Encryption key lifecycle
1. App First Launch
   └─> Generate random 256-bit key
   └─> Store in SecureStore (hardware-backed)

2. Database Open
   └─> Retrieve key from SecureStore
   └─> Execute: PRAGMA key = 'retrieved_key'

3. Key Rotation (future)
   └─> Re-encrypt with new key
   └─> Securely delete old key
```

---

## Database Schema Relationships

```
┌─────────────────┐     ┌──────────────────┐
│   categories    │     │  transactions    │
├─────────────────┤     ├──────────────────┤
│ id (PK)         │◄────┤ categoryId (FK)  │
│ name            │     │ id (PK)          │
│ type            │     │ amount           │
│ icon            │     │ type             │
│ color           │     │ section40Type    │
│ section40       │     │ description      │
└─────────────────┘     │ transactionDate  │
                        │ receiptImageUri  │
                        └──────────────────┘
                                  │
                                  │
                        ┌──────────────────┐
                        │  receipt_cache   │
                        ├──────────────────┤
                        │ id (PK)          │
                        │ imageUri         │
                        │ processedText    │
                        │ merchantName     │
                        │ totalAmount      │
                        └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  tax_profiles   │     │  app_settings    │
├─────────────────┤     ├──────────────────┤
│ id (PK)         │     │ id (PK)          │
│ taxYear         │     │ isEncrypted      │
│ *allowances     │     │ themeMode        │
│ *insurances     │     │ language         │
│ estimatedTax    │     │ defaultTaxYear   │
└─────────────────┘     └──────────────────┘
```

---

## Component Architecture

### Theming System
```
theme/
├── index.ts           # Theme exports and provider setup
├── colors.ts          # Light/dark color palettes
├── fonts.ts           # Typography configuration
└── components.ts      # Component-specific styles

Theme inheritance:
MD3Theme (react-native-paper)
    ↓
Custom colors (brand colors)
    ↓
Component styles (Card, Button, etc.)
    ↓
Screen-specific overrides
```

### Screen Components
```
app/(app)/
├── _layout.tsx        # Tab navigation configuration
├── dashboard.tsx      # Main dashboard with charts
├── transactions/
│   ├── index.tsx      # List with filters
│   ├── [id].tsx       # Detail/edit view
│   └── new.tsx        # Create transaction
├── scan/
│   └── index.tsx      # Camera + OCR flow
└── tax/
    ├── index.tsx      # Tax dashboard
    └── calculator.tsx # Detailed calculator
```

---

## State Management

### Zustand Stores

```typescript
// stores/transaction.store.ts
interface TransactionState {
  transactions: Transaction[];
  selectedMonth: Date;
  filters: FilterState;
  
  // Actions
  addTransaction: (t: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setSelectedMonth: (date: Date) => void;
  refreshTransactions: () => Promise<void>;
}

// stores/theme.store.ts
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: ThemeState['mode']) => void;
}
```

---

## Tax Calculation Algorithm

### Progressive Tax Calculation
```typescript
function calculateProgressiveTax(netIncome: number): number {
  const brackets = [
    { limit: 150_000, rate: 0.00 },
    { limit: 300_000, rate: 0.05 },
    { limit: 500_000, rate: 0.10 },
    { limit: 750_000, rate: 0.15 },
    { limit: 1_000_000, rate: 0.20 },
    { limit: 2_000_000, rate: 0.25 },
    { limit: 5_000_000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];
  
  let tax = 0;
  let previousLimit = 0;
  
  for (const bracket of brackets) {
    if (netIncome <= previousLimit) break;
    
    const taxableAtThisBracket = Math.min(
      netIncome - previousLimit,
      bracket.limit - previousLimit
    );
    
    tax += taxableAtThisBracket * bracket.rate;
    previousLimit = bracket.limit;
  }
  
  return tax;
}
```

### Section 40 Expense Deduction
```typescript
function calculateExpenseDeduction(
  section40Type: Section40Type,
  income: number
): number {
  switch (section40Type) {
    case 1: // Salary
    case 2: // Service
      return Math.min(income * 0.5, 100_000);
    
    case 3: // IP
      return Math.min(income * 0.5, 100_000); // Or actual
    
    case 4: // Passive
      return 0;
    
    case 5: // Rental
      return income * 0.30; // Building (or actual)
    
    case 6: // Professional
      return income * 0.30; // Or 60% for medical
    
    case 7: // Contract
      return income * 0.60; // Or actual
    
    case 8: // Business
      return income * 0.60; // Or actual (if in decree)
    
    default:
      return 0;
  }
}
```

---

## OCR Pipeline

### Receipt Processing Flow
```
1. Camera Capture
   └─> expo-camera with optimized settings
   └─> Image size: ~1200px width for OCR

2. Image Preprocessing
   └─> expo-image-manipulator
   └─> Resize, normalize orientation

3. OCR Processing
   └─> expo-mlkit-ocr
   └─> Text recognition with confidence score

4. Text Parsing
   └─> Regex patterns for amounts
   └─> Date extraction
   └─> Merchant name detection

5. Data Validation
   └─> Amount sanity check
   └─> Date validation
   └─> User confirmation

6. Transaction Creation
   └─> Pre-fill transaction form
   └─> User edits if needed
   └─> Save to database
```

---

## Performance Considerations

### Database Optimization
- WAL mode enabled for better concurrent access
- Indexed columns: `transactionDate`, `type`, `categoryId`
- Lazy loading for transaction history
- Pagination for large datasets

### Rendering Optimization
- React.memo for list items
- FlatList for transaction lists
- Reanimated for smooth animations
- Chart data aggregation (daily/weekly grouping)

### Memory Management
- Image cleanup after OCR processing
- Query result size limits
- Cache invalidation strategy

---

## Error Handling Strategy

### Layers
```
1. UI Layer
   └─> Form validation (Zod schema)
   └─> User-friendly error messages

2. Service Layer
   └─> Business logic errors
   └─> Tax calculation edge cases

3. Data Layer
   └─> Database constraint violations
   └─> SQLite errors

4. System Layer
   └─> Camera permission denied
   └─> Storage full
   └─> Memory pressure
```

---

## Future Extensibility

### Planned Features
1. **Cloud Sync** (optional)
   - End-to-end encrypted backup
   - Cross-device synchronization
   - iCloud / Google Drive integration

2. **Advanced Analytics**
   - Spending pattern analysis
   - Tax optimization suggestions
   - Year-over-year comparisons

3. **Document Management**
   - PDF export for tax filing
   - Receipt image compression
   - Automatic categorization with ML

4. **Multi-currency Support**
   - Exchange rate integration
   - Foreign income handling

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Expo SDK 52 | Rapid development, OTA updates |
| Database | SQLite (SQLCipher) | Native support, encryption |
| ORM | Drizzle | Type-safe, lightweight |
| UI Library | react-native-paper | Material You, accessibility |
| Charts | react-native-gifted-charts | Expo-compatible, performant |
| OCR | ML Kit | On-device, privacy-friendly |
| State | Zustand | Simple, effective |

---

## Development Guidelines

### Code Organization
- Feature-based folder structure
- Separation of concerns (UI / Business Logic / Data)
- TypeScript strict mode enabled
- ESLint for code quality

### Testing Strategy
- Unit tests for tax calculations
- Integration tests for database operations
- E2E tests for critical user flows
- Manual testing on physical devices

### Security Checklist
- [ ] No hardcoded secrets
- [ ] Input sanitization
- [ ] SQL injection prevention (prepared statements)
- [ ] Secure key storage
- [ ] Biometric authentication flow

---

*This architecture document serves as the technical foundation for Taxify development. It should be updated as the system evolves.*

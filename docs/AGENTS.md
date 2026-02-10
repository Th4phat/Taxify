# Taxify - Agent Development Guide

## Project Overview

**Taxify** is a privacy-focused, local-first mobile application for Thai personal income tax calculation and expense tracking. Built with Expo SDK 54 and React Native, it keeps all sensitive financial data on the user's device using encrypted SQLite storage.

### Key Features
- Track income and expenses with categorization
- Scan and parse receipts using OCR (camera + ML Kit)
- Calculate Thai Personal Income Tax based on Revenue Code Section 40
- Visualize financial health through dashboards
- Offline-first architecture with no cloud dependency

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Expo SDK | ~54.0.33 | Cross-platform development |
| Package Manager | Bun | Latest | Fast dependency management |
| Language | TypeScript | ~5.9.2 | Type safety |
| UI Library | react-native-paper | ^5.14.5 | Material Design 3 components |
| Navigation | expo-router | ~6.0.23 | File-based routing |
| Database | expo-sqlite | ~16.0.10 (SDK 54) | Local SQLite with SQLCipher |
| ORM | Drizzle ORM | ^0.38.0 | Type-safe database operations (drizzle-orm/expo-sqlite) |
| State Management | Zustand | ^5.0.0 | Global state management |
| Camera | expo-camera | ~17.0.10 (SDK 54) | Receipt scanning |
| OCR | **rn-mlkit-ocr** | **^0.3.1** | **Google ML Kit text recognition (latin)** |
| Image Manipulation | expo-image-manipulator | ~14.0.8 (SDK 54) | Image optimization for OCR |
| Animations | react-native-reanimated | ~4.1.1 | Smooth UI transitions |

---

## Project Structure

```
taxify/
├── app/                          # Expo Router routes
│   ├── _layout.tsx              # Root layout with PaperProvider & migrations
│   ├── (tabs)/                  # Tab navigation routes
│   │   ├── _layout.tsx          # Tab navigation configuration
│   │   ├── index.tsx            # Home screen (currently template)
│   │   └── explore.tsx          # Explore screen (currently template)
│   └── modal.tsx                # Modal screen example
│
├── components/                   # Reusable UI components
│   ├── ui/                      # Base UI components
│   │   ├── collapsible.tsx      # Collapsible section component
│   │   ├── icon-symbol.tsx      # Cross-platform icon component
│   │   └── icon-symbol.ios.tsx  # iOS-specific SF Symbols
│   ├── external-link.tsx        # External link component
│   ├── haptic-tab.tsx           # Haptic feedback tab button
│   ├── hello-wave.tsx           # Animated wave component
│   ├── parallax-scroll-view.tsx # Parallax scroll view
│   ├── themed-text.tsx          # Theme-aware text component
│   └── themed-view.tsx          # Theme-aware view component
│
├── database/                     # Database layer
│   ├── schema.ts                # Drizzle ORM schema definition
│   ├── db.ts                    # Database connection & initialization
│   └── repositories/            # Data access layer
│       └── transaction.repo.ts  # Transaction repository
│
├── services/                     # Business logic services
│   ├── tax/
│   │   └── calculator.ts        # Thai tax calculation engine
│   └── receipt/
│       └── camera.service.ts    # Camera functionality for OCR
│
├── theme/                        # Theming system
│   └── index.ts                 # Light/dark theme configuration
│
├── constants/                    # Application constants
│   └── theme.ts                 # Color and font constants
│
├── utils/                        # Utility functions
│   ├── formatters.ts            # Currency, date, number formatters
│   └── uuid.ts                  # UUID generation for React Native
│
├── hooks/                        # Custom React hooks
│   ├── use-color-scheme.ts      # Color scheme detection
│   └── use-theme-color.ts       # Theme-aware color hook
│
├── drizzle/                      # Database migrations
│   └── migrations.js            # Migration manifest
│
├── drizzle.config.ts            # Drizzle Kit configuration
├── app.json                     # Expo app configuration
├── package.json                 # Dependencies and scripts
└── tsconfig.json                # TypeScript configuration
```

---

## Build and Development Commands

### Install Dependencies
```bash
bun install
```

### Start Development Server
```bash
# Start with Expo CLI
bunx expo start

# Or use the script
bun run start
```

### Platform-Specific Development
```bash
# Android
bun run android

# iOS
bun run ios

# Web
bun run web
```

### Database Operations
```bash
# Generate database migrations
bun run db:generate

# Run database migrations
bun run db:migrate
```

### Linting
```bash
bun run lint
```

---

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled** - All strict TypeScript checks are active
- Path aliases use `@/*` prefix mapped to project root
- Always define explicit return types for public functions

### React Native Paper v5 (MD3) Patterns

#### Component Naming Conventions
- Use Material Design 3 component patterns
- Deprecated component names to avoid:
  - ❌ `Headline` → ✅ `Text variant="headlineSmall"`
  - ❌ `Title` → ✅ `Text variant="titleLarge"`
  - ❌ `Subheading` → ✅ `Text variant="titleMedium"`
  - ❌ `Paragraph` → ✅ `Text variant="bodyMedium"`
  - ❌ `Caption` → ✅ `Text variant="bodySmall"`

#### Button Props
- ❌ `color="red"` → ✅ `buttonColor="red"` or `textColor="red"`

### Database Patterns

#### Using Drizzle ORM
```typescript
// CORRECT: Use async/await with query API
const results = await db.query.transactions.findMany({
  where: eq(transactions.type, 'income'),
  orderBy: desc(transactions.transactionDate),
});

// CORRECT: Use insert/update/delete patterns
await db.insert(transactions).values({ ... });
await db.update(transactions).set({ ... }).where(eq(transactions.id, id));
await db.delete(transactions).where(eq(transactions.id, id));
```

#### Repository Pattern
All database operations should go through repository files in `database/repositories/`:
- `TransactionRepository` - Transaction CRUD operations
- Follow the existing pattern with exported const objects

### Expo Camera SDK 54+ API

```typescript
// CORRECT API usage:
import { CameraView, useCameraPermissions } from 'expo-camera';

// Key changes from older versions:
// - CameraView replaces Camera component
// - 'back' | 'front' for CameraType (not constants)
// - ref.takePicture() replaces takePictureAsync()
```

---

## Database Schema

### Tables

#### transactions
- Stores income and expense records
- Supports Thai Revenue Code Section 40 income classification
- Includes OCR metadata for receipt scanning

#### categories
- Transaction categories (income/expense)
- Supports Thai and English names
- Links to Section 40 types for tax calculation

#### taxProfiles
- User's tax configuration per tax year
- Stores allowances, insurance, and investment deductions
- Caches estimated tax calculations

#### appSettings
- Single-row table for app configuration
- Security, preferences, theme, notifications

#### receiptCache
- Stores OCR processing results
- Links receipt images to parsed data

---

## Testing Instructions

### Current State
The project currently has template/starter code in `app/(tabs)/`. The actual Taxify features (dashboard, transactions, tax calculator, receipt scanning) are documented in implementation guides but not yet fully implemented.

### Manual Testing Checklist
- [ ] App launches without errors
- [ ] Theme switches correctly (light/dark)
- [ ] Database initializes properly (check migration logs)
- [ ] Tab navigation works with haptic feedback
- [ ] Modal screens display correctly

### Testing Tax Calculations
The tax calculator service (`services/tax/calculator.ts`) includes:
- Section 40 income type classification
- Progressive tax bracket calculation
- Alternative minimum tax (0.5% method)
- Expense deductions per income type

Verify calculations against Thai Revenue Department examples.

---

## Security Considerations

### Data Encryption
- SQLCipher enabled for full database encryption
- Encryption keys stored in iOS Keychain / Android Keystore via `expo-secure-store`
- WAL mode enabled for performance

### Key Files
```typescript
// Database encryption setup in database/db.ts
await setEncryptionKey(key);  // Set before any operations
await initializeDatabase();    // Enables WAL mode
```

### Permissions
The following permissions are configured in `app.json`:
- **Camera**: For receipt scanning
- **Face ID / Biometric**: For app access control
- **Secure Store**: For encryption key management

### Best Practices
- Never hardcode encryption keys
- Always use parameterized queries (Drizzle ORM handles this)
- Sanitize all user inputs
- Clear sensitive data from memory when possible

---

## Key Documentation References

All documentation is in the `docs/` folder:

- `docs/ARCHITECTURE.md` - Detailed system architecture and data flow
- `docs/IMPLEMENTATION_GUIDE.md` - Phase-by-phase development instructions
- `docs/PLAN.md` - Comprehensive project plan with code examples
- `docs/API_MIGRATION_GUIDE.md` - Notes on API updates and deprecations
- `docs/FEATURES_SUMMARY.md` - Feature overview and implementation status
- `docs/AI_FEATURES.md` - AI integration documentation

---

## Development Roadmap

### Phase 1: Foundation (Complete)
- ✅ Project setup with Expo SDK 54
- ✅ Database schema with Drizzle ORM
- ✅ Theme system with react-native-paper
- ✅ Migration system configured

### Phase 2: Core Features (In Progress)
- 🔄 Transaction management screens
- 🔄 Dashboard with summary cards
- 🔄 Category management

### Phase 3: Tax Engine (Planned)
- ⏳ Tax calculator UI
- ⏳ Section 40 income classification
- ⏳ Deduction and allowance forms

### Phase 4: Receipt Scanning (Planned)
- ⏳ Camera integration
- ⏳ OCR with ML Kit
- ⏳ Receipt parsing logic

### Phase 5: Polish & Release (Planned)
- ⏳ Data visualization charts
- ⏳ Biometric authentication
- ⏳ App store preparation

---

## Common Issues and Solutions

### Database Migration Errors
If migrations fail on app start:
1. Check `drizzle/migrations.js` exists and is properly formatted
2. Verify `useMigrations` hook is called in root layout
3. Check console for specific SQL errors

### Camera Permission Denied
- Ensure `app.json` has proper camera permission strings
- Test on physical device (simulator has limited camera support)
- Use `requestCameraPermission()` from camera service

### Theme Not Applying
- Verify `PaperProvider` wraps the app in `_layout.tsx`
- Check that theme objects extend MD3LightTheme/MD3DarkTheme
- Use `useTheme()` hook from react-native-paper in components

---

## Contact & Resources

- **Expo Documentation**: https://docs.expo.dev/
- **React Native Paper**: https://reactnativepaper.com/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Thai Revenue Department**: https://www.rd.go.th/

---

*This document is maintained for AI coding agents working on the Taxify project. Update it when making significant architectural changes.*

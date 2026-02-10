# Taxify API Migration Guide
## Deprecated/Discontinued APIs and Their Replacements

This document lists all the deprecated, discontinued, or incorrect APIs found in the original PLAN.md and IMPLEMENTATION_GUIDE.md, along with their correct replacements.

---

## ⚠️ Critical Issues Found

### 1. expo-sqlite: `SQLiteProvider` and `useSQLiteContext` DO NOT EXIST

**❌ INCORRECT (in IMPLEMENTATION_GUIDE.md):**
```typescript
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

export function DatabaseProvider({ children }) {
  return (
    <SQLiteProvider databaseName="taxify.db">
      {children}
    </SQLiteProvider>
  );
}
```

**✅ CORRECT:**
```typescript
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

const expoDb = openDatabaseSync('taxify.db');
export const db = drizzle(expoDb);
```

**Why:** `SQLiteProvider` and `useSQLiteContext` are not exported from `expo-sqlite`. They may have been confused with a different library or are non-existent patterns.

---

## 📦 React Native Paper v5

### Typography Components (DEPRECATED)

The following components were removed in v5 in favor of the `Text` component with variants:

| ❌ DEPRECATED | ✅ REPLACEMENT |
|--------------|----------------|
| `Headline` | `Text variant="headlineSmall"` |
| `Title` | `Text variant="titleLarge"` |
| `Subheading` | `Text variant="titleMedium"` |
| `Paragraph` | `Text variant="bodyMedium"` |
| `Caption` | `Text variant="bodySmall"` |

**Example:**
```typescript
// ❌ OLD
import { Title, Paragraph } from 'react-native-paper';
<Title>My Title</Title>
<Paragraph>My paragraph text</Paragraph>

// ✅ NEW
import { Text } from 'react-native-paper';
<Text variant="titleLarge">My Title</Text>
<Text variant="bodyMedium">My paragraph text</Text>
```

### Button Props (DEPRECATED)

| ❌ DEPRECATED | ✅ REPLACEMENT |
|--------------|----------------|
| `color` (for background) | `buttonColor` |
| `color` (for text) | `textColor` |

**Example:**
```typescript
// ❌ OLD
<Button mode="contained" color="red">Press me</Button>

// ✅ NEW
<Button mode="contained" buttonColor="red">Press me</Button>
```

---

## 📦 expo-sqlite (SDK 54)

### Database Opening Methods

| ❌ DEPRECATED | ✅ REPLACEMENT | Notes |
|--------------|----------------|-------|
| `SQLite.openDatabase()` | `openDatabaseSync()` or `openDatabaseAsync()` | Old API without suffix is removed |
| `SQLite.openDatabaseAsync()` | `openDatabaseAsync()` from 'expo-sqlite' | Still valid |
| `new SQLite.WebSQLDatabase()` | Removed entirely | Use `openDatabaseAsync` instead |

**Example:**
```typescript
// ❌ OLD
import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabase('mydb.db');

// ✅ NEW
import { openDatabaseSync } from 'expo-sqlite';
const db = openDatabaseSync('mydb.db');
```

### Transaction Methods

| ❌ DEPRECATED | ✅ REPLACEMENT | Notes |
|--------------|----------------|-------|
| `db.transaction()` | `db.withTransactionAsync()` | Callback-based → Promise-based |
| `db.readTransaction()` | `db.withTransactionAsync()` | Use for read-only |
| `tx.executeSql()` | `db.runAsync()`, `db.getAllAsync()` | Direct methods on db |
| `db.execSQL()` | `db.execAsync()` | Renamed |

**Example:**
```typescript
// ❌ OLD
await db.transaction(tx => {
  tx.executeSql('SELECT * FROM users', [], (tx, results) => {
    console.log(results.rows._array);
  });
});

// ✅ NEW
const users = await db.getAllAsync('SELECT * FROM users');
```

### Exclusive Transactions (IMPORTANT)

For transactions where only queries within the scope should be included:

```typescript
// ❌ May include concurrent queries
await db.withTransactionAsync(async () => {
  await db.runAsync('INSERT INTO users (name) VALUES (?)', 'John');
});

// ✅ Guaranteed exclusive scope (SDK 53+)
await db.withExclusiveTransactionAsync(async () => {
  await db.runAsync('INSERT INTO users (name) VALUES (?)', 'John');
});
```

---

## 📦 expo-camera (SDK 54)

### Main Component

| ❌ DEPRECATED | ✅ REPLACEMENT |
|--------------|----------------|
| `Camera` component | `CameraView` component |

### Types and Constants

| ❌ DEPRECATED | ✅ REPLACEMENT |
|--------------|----------------|
| `Camera.Constants.Type.back` | `CameraType` type: `'back' \| 'front'` |
| `Camera.Constants.FlashMode.on` | `FlashMode` type: `'on' \| 'off' \| 'auto'` |
| `Camera.Constants.VideoQuality['1080p']` | Use `quality` number or preset string |

### Methods

| ❌ DEPRECATED | ✅ REPLACEMENT |
|--------------|----------------|
| `ref.takePictureAsync()` | `ref.takePicture()` |
| `ref.recordAsync()` | `ref.record()` |
| `Camera.requestCameraPermissionsAsync()` | `useCameraPermissions()` hook |

**Example:**
```typescript
// ❌ OLD
import { Camera } from 'expo-camera';
const [permission] = await Camera.requestCameraPermissionsAsync();
<Camera type={Camera.Constants.Type.back} ref={cameraRef} />
const photo = await cameraRef.current.takePictureAsync();

// ✅ NEW
import { CameraView, useCameraPermissions } from 'expo-camera';
const [permission, requestPermission] = useCameraPermissions();
<CameraView facing="back" ref={cameraRef} />
const photo = await cameraRef.current.takePicture();
```

---

## 📦 Drizzle ORM with Expo SQLite

### Migration Pattern

| ❌ INCORRECT | ✅ CORRECT |
|-------------|------------|
| Manual migration running | `useMigrations` hook |
| `migrate()` function outside React | `useMigrations(db, migrations)` in component |

**Example:**
```typescript
// ✅ CORRECT
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from './drizzle/migrations';

function App() {
  const { success, error } = useMigrations(db, migrations);
  
  if (!success) return <Loading />;
  if (error) return <Error error={error} />;
  
  return <MainApp />;
}
```

### Database Connection

| ❌ INCORRECT | ✅ CORRECT |
|-------------|------------|
| `withDatabase` pattern | `drizzle(openDatabaseSync('db.db'))` |
| `useSQLiteContext()` | Direct `openDatabaseSync()` call |

---

## 📦 expo-secure-store

### Methods (No Changes, but Best Practice Updated)

```typescript
// ✅ Current API (no deprecated methods)
import * as SecureStore from 'expo-secure-store';

// Store with biometric authentication
await SecureStore.setItemAsync('key', 'value', {
  keychainService: 'com.taxify.service',
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access your data',
});

// Retrieve
const value = await SecureStore.getItemAsync('key');

// Delete
await SecureStore.deleteItemAsync('key');
```

---

## 📝 Summary Table

| Library | Deprecated/Incorrect | Correct Replacement |
|---------|---------------------|---------------------|
| **expo-sqlite** | `SQLiteProvider`, `useSQLiteContext` | `openDatabaseSync()` + `drizzle()` |
| **expo-sqlite** | `SQLite.openDatabase()` | `openDatabaseSync()` or `openDatabaseAsync()` |
| **expo-sqlite** | `db.transaction()` | `db.withTransactionAsync()` or `db.withExclusiveTransactionAsync()` |
| **expo-sqlite** | `tx.executeSql()` | `db.runAsync()`, `db.getAllAsync()`, `db.getFirstAsync()` |
| **expo-camera** | `Camera` component | `CameraView` component |
| **expo-camera** | `takePictureAsync()` | `takePicture()` |
| **react-native-paper** | `Headline`, `Title`, `Subheading`, `Paragraph`, `Caption` | `Text` with `variant` prop |
| **react-native-paper** | Button `color` prop | `buttonColor` or `textColor` |
| **Drizzle ORM** | Manual migration patterns | `useMigrations` hook |

---

## ✅ Verified Correct APIs

The following APIs are current and correct as of Expo SDK 54:

- ✅ `openDatabaseSync()` / `openDatabaseAsync()` from 'expo-sqlite'
- ✅ `drizzle()` from 'drizzle-orm/expo-sqlite'
- ✅ `useMigrations()` from 'drizzle-orm/expo-sqlite/migrator'
- ✅ `CameraView` from 'expo-camera'
- ✅ `useCameraPermissions()` from 'expo-camera'
- ✅ `MD3LightTheme`, `MD3DarkTheme` from 'react-native-paper'
- ✅ `Text` component with `variant` prop from 'react-native-paper'
- ✅ `PaperProvider` from 'react-native-paper'
- ✅ `configureFonts` from 'react-native-paper'

---

## 🔍 References

- Context7 Library IDs used for verification:
  - `/llmstxt/orm_drizzle_team_llms_txt` - Drizzle ORM
  - `/callstack/react-native-paper` - React Native Paper
  - `/websites/expo_dev_versions_sdk-54` - Expo SDK 54
  - `/expo/expo` - Expo (general)

---

*Last Updated: 2026-02-04*
*Verified against: Expo SDK 54, React Native Paper v5, Drizzle ORM latest*

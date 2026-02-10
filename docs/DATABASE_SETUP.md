# Drizzle ORM + Expo SQLite Setup Guide

This document describes how Drizzle ORM is configured with Expo SQLite in this project.

## 📁 File Structure

```
taxify/
├── database/
│   ├── schema.ts           # Drizzle table definitions
│   ├── db.ts              # Database connection
│   └── repositories/      # Data access layer
│
├── drizzle/               # Migrations folder
│   ├── 0000_*.sql         # SQL migration files
│   ├── meta/              # Migration metadata
│   └── migrations.js      # Auto-generated manifest
│
├── drizzle.config.ts      # Drizzle Kit configuration
├── metro.config.js        # Metro bundler config
└── babel.config.js        # Babel config for SQL imports
```

## 🔧 Configuration Files

### 1. metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
```

This tells Metro bundler to treat `.sql` files as source files that can be imported.

### 2. babel.config.js
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['inline-import', { extensions: ['.sql'] }]
    ]
  };
};
```

The `babel-plugin-inline-import` inlines SQL files as strings during bundling.

### 3. drizzle.config.ts
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
```

### 4. database/db.ts
```typescript
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const expoDb = openDatabaseSync('taxify.db');
export const db = drizzle(expoDb, { schema });
```

### 5. Relations
Drizzle ORM relations enable the `with` syntax for joining tables:

```typescript
export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));
```

### 5. app/_layout.tsx
```typescript
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';

const { success, error } = useMigrations(db, migrations);
```

## 🚀 Workflow

### Generate Migrations
After modifying `database/schema.ts`, run:

```bash
npx drizzle-kit generate
```

This creates SQL files in `drizzle/` and updates `drizzle/migrations.js`.

### Verify Setup
```bash
node scripts/convert-migrations.js
```

## 📚 Key Points

1. **Schema Location**: `database/schema.ts`
2. **Migrations Location**: `drizzle/*.sql`
3. **Migration Manifest**: `drizzle/migrations.js` (auto-generated)
4. **SQL Import**: Handled by `babel-plugin-inline-import`
5. **Metro Config**: `.sql` files added to `sourceExts`

## 🔗 References

- [Drizzle ORM + Expo Docs](https://orm.drizzle.team/docs/get-started/expo-new)
- [Expo SQLite Docs](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [babel-plugin-inline-import](https://github.com/sebjwallace/babel-plugin-inline-import)

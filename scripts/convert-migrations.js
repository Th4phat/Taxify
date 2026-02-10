#!/usr/bin/env node

/**
 * Migration Helper Script
 * 
 * This script helps manage Drizzle ORM migrations for Expo.
 * When you generate new migrations with 'npx drizzle-kit generate',
 * run this script to update the drizzle/migrations.js file.
 * 
 * Note: With the babel-plugin-inline-import setup, SQL files are imported
 * directly, so this script is mainly for reference.
 */

const fs = require('fs');
const path = require('path');

const drizzleDir = path.join(__dirname, '../drizzle');

console.log('🔍 Checking Drizzle ORM migrations...\n');

// Find all SQL files in drizzle folder
const sqlFiles = fs.readdirSync(drizzleDir).filter(f => f.endsWith('.sql'));

if (sqlFiles.length === 0) {
  console.log('❌ No SQL migration files found in drizzle/ folder');
  process.exit(1);
}

console.log(`✅ Found ${sqlFiles.length} migration file(s):`);
sqlFiles.forEach(f => console.log(`   - ${f}`));

// Check that migrations.js exists and imports the SQL files
const migrationsJsPath = path.join(drizzleDir, 'migrations.js');
if (fs.existsSync(migrationsJsPath)) {
  const content = fs.readFileSync(migrationsJsPath, 'utf8');
  
  // Check if all SQL files are imported
  const missingImports = sqlFiles.filter(sql => !content.includes(sql));
  
  if (missingImports.length > 0) {
    console.log(`\n⚠️  Missing imports in migrations.js:`);
    missingImports.forEach(f => console.log(`   - ${f}`));
    console.log(`\n📝 Regenerate migrations with: npx drizzle-kit generate`);
  } else {
    console.log('\n✅ All SQL files are properly imported in migrations.js');
  }
} else {
  console.log('\n❌ migrations.js not found. Run: npx drizzle-kit generate');
}

console.log('\n📚 Drizzle ORM + Expo Setup:');
console.log('   1. Schema: database/schema.ts');
console.log('   2. Migrations: drizzle/*.sql');
console.log('   3. Config: drizzle.config.ts');
console.log('   4. Metro: metro.config.js (handles .sql imports)');
console.log('   5. Babel: babel.config.js (inlines .sql files)');

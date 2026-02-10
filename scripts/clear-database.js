#!/usr/bin/env node

/**
 * Clear Database Script
 * Removes the SQLite database file to start fresh
 * Useful when schema changes cause migration errors
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Possible database file locations
const dbPaths = [
  path.join(projectRoot, 'taxify.db'),
  path.join(projectRoot, 'taxify.db-journal'),
  path.join(projectRoot, 'taxify.db-wal'),
  path.join(projectRoot, 'taxify.db-shm'),
];

console.log('🗑️  Clearing database files...\n');

let cleared = 0;
for (const dbPath of dbPaths) {
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
      console.log(`✅ Removed: ${path.basename(dbPath)}`);
      cleared++;
    } catch (error) {
      console.error(`❌ Failed to remove ${path.basename(dbPath)}:`, error.message);
    }
  }
}

if (cleared === 0) {
  console.log('ℹ️  No database files found to clear');
} else {
  console.log(`\n🎉 Cleared ${cleared} file(s)`);
}

console.log('\n📱 Next steps:');
console.log('   1. Rebuild the app: bun run android');
console.log('   2. Database will be recreated on next launch');

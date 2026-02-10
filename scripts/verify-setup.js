#!/usr/bin/env node

/**
 * Setup Verification Script
 * Verifies that all dependencies are correctly installed and configured
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

console.log(`${BLUE}🔍 Verifying Taxify Setup...${NC}\n`);

let allPassed = true;

function check(name, condition, successMsg, errorMsg) {
  if (condition) {
    console.log(`${GREEN}✅${NC} ${name}: ${successMsg}`);
    return true;
  } else {
    console.log(`${RED}❌${NC} ${name}: ${errorMsg}`);
    allPassed = false;
    return false;
  }
}

// Check node_modules
check(
  'rn-mlkit-ocr',
  fs.existsSync(path.join(__dirname, '../node_modules/rn-mlkit-ocr')),
  'Installed',
  'Not found in node_modules'
);

check(
  'babel-plugin-inline-import',
  fs.existsSync(path.join(__dirname, '../node_modules/babel-plugin-inline-import')),
  'Installed',
  'Not found in node_modules'
);

// Check config files
check(
  'metro.config.js',
  fs.existsSync(path.join(__dirname, '../metro.config.js')),
  'Exists',
  'Not found'
);

check(
  'babel.config.js',
  fs.existsSync(path.join(__dirname, '../babel.config.js')),
  'Exists',
  'Not found'
);

check(
  'drizzle.config.ts',
  fs.existsSync(path.join(__dirname, '../drizzle.config.ts')),
  'Exists',
  'Not found'
);

// Check iOS native directory
check(
  'iOS Native Project',
  fs.existsSync(path.join(__dirname, '../ios/Taxify.xcodeproj')),
  'Created',
  'Not found'
);

// Check Android native directory
check(
  'Android Native Project',
  fs.existsSync(path.join(__dirname, '../android/app')),
  'Created',
  'Not found'
);

// Check iOS deployment target
const iosPodfile = path.join(__dirname, '../ios/Podfile.properties.json');
let podfileProps = null;
if (fs.existsSync(iosPodfile)) {
  podfileProps = JSON.parse(fs.readFileSync(iosPodfile, 'utf8'));
  check(
    'iOS Deployment Target',
    podfileProps['ios.deploymentTarget'] === '15.5',
    `Set to ${podfileProps['ios.deploymentTarget']}`,
    'Not set to 15.5'
  );
} else {
  check('iOS Deployment Target', false, '', 'Podfile.properties.json not found');
}

// Check SQLCipher configuration
check(
  'SQLCipher',
  podfileProps && podfileProps['expo.sqlite.useSQLCipher'] === 'true',
  'Enabled',
  'Not enabled'
);

// Check drizzle migrations
check(
  'Drizzle Migrations',
  fs.existsSync(path.join(__dirname, '../drizzle/migrations.js')),
  'Generated',
  'Not found'
);

// Check Drizzle relations
check(
  'Drizzle Relations',
  fs.readFileSync(path.join(__dirname, '../database/schema.ts'), 'utf8').includes('relations('),
  'Defined in schema',
  'Not found in schema.ts'
);

const sqlFiles = fs.readdirSync(path.join(__dirname, '../drizzle')).filter(f => f.endsWith('.sql'));
check(
  'SQL Migration Files',
  sqlFiles.length > 0,
  `${sqlFiles.length} file(s) found`,
  'No SQL files in drizzle/ folder'
);

// Check rn-mlkit-ocr iOS config
const podfile = path.join(__dirname, '../ios/Podfile');
if (fs.existsSync(podfile)) {
  const content = fs.readFileSync(podfile, 'utf8');
  check(
    'rn-mlkit-ocr iOS Config',
    content.includes('ReactNativeOcrSubspecs'),
    'Configured in Podfile',
    'Not configured'
  );
} else {
  check('rn-mlkit-ocr iOS Config', false, '', 'Podfile not found');
}

// Check rn-mlkit-ocr Android config
const androidBuildGradle = path.join(__dirname, '../android/build.gradle');
if (fs.existsSync(androidBuildGradle)) {
  const content = fs.readFileSync(androidBuildGradle, 'utf8');
  check(
    'rn-mlkit-ocr Android Config',
    content.includes('ocrModels') && content.includes('latin'),
    'Configured in build.gradle',
    'Not configured'
  );
} else {
  check('rn-mlkit-ocr Android Config', false, '', 'build.gradle not found');
}

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log(`${GREEN}🎉 All checks passed!${NC}`);
  console.log(`${BLUE}You can now run:${NC}`);
  console.log(`  bun run ios     # for iOS`);
  console.log(`  bun run android # for Android`);
} else {
  console.log(`${RED}⚠️  Some checks failed.${NC}`);
  console.log(`Run ${YELLOW}bunx expo prebuild --clean${NC} to regenerate native projects.`);
  process.exit(1);
}

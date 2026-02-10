const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add .sql to source extensions so Metro can import SQL files
config.resolver.sourceExts.push('sql');

module.exports = config;

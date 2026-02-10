# Package Versions for Expo SDK 54

This document lists all package versions compatible with Expo SDK 54.0.33.

## ⚠️ Important Note

The Expo CLI may suggest SDK 55 versions (like expo-camera@~17.0.0), but this project uses **Expo SDK 54**. Using SDK 55 packages with SDK 54 can cause compatibility issues.

## ✅ Correct SDK 54 Versions

| Package | SDK 54 Version | Notes |
|---------|---------------|-------|
| expo | ~54.0.33 | Core SDK |
| expo-camera | ~17.0.10 | Camera access |
| expo-sqlite | ~16.0.10 | SQLite with SQLCipher |
| expo-crypto | ~15.0.8 | Cryptographic functions |
| expo-secure-store | ~15.0.8 | Secure storage |
| expo-image-manipulator | ~14.0.8 | Image manipulation |
| expo-build-properties | ~1.0.10 | Build configuration |
| react-native-svg | ~15.12.1 | Required peer dependency for charts |
| expo-constants | ~18.0.13 | Environment constants |
| expo-font | ~14.0.11 | Font loading |
| expo-haptics | ~15.0.8 | Haptic feedback |
| expo-image | ~3.0.11 | Image component |
| expo-linking | ~8.0.11 | Deep linking |
| expo-router | ~6.0.23 | File-based routing |
| expo-splash-screen | ~31.0.13 | Splash screen |
| expo-status-bar | ~3.0.9 | Status bar |
| expo-symbols | ~1.0.8 | SF Symbols |
| expo-system-ui | ~6.0.9 | System UI |
| expo-web-browser | ~15.0.10 | Web browser |

## 📋 Previous SDK 54 Versions (Outdated)

These older versions also work with SDK 54, but the newer versions above are recommended:

| Package | Old Version | New Version |
|---------|-------------|-------------|
| expo-camera | ~16.0.0 | ~17.0.10 |
| expo-sqlite | ~15.0.0 | ~16.0.10 |
| expo-crypto | ~14.0.0 | ~15.0.8 |
| expo-secure-store | ~14.0.0 | ~15.0.8 |
| expo-image-manipulator | ~13.0.0 | ~14.0.8 |
| expo-build-properties | ~0.14.0 | ~1.0.10 |

## 🔄 Fixing Version Issues

If you see warnings about package versions, run:

```bash
# Use Expo's install command (automatically uses correct versions)
bunx expo install expo-camera expo-sqlite expo-crypto \
  expo-secure-store expo-image-manipulator expo-build-properties \
  react-native-svg
```

Then rebuild the native projects:

```bash
bunx expo prebuild --clean
```

## 📋 Verification

Check installed versions:

```bash
bun list expo-camera expo-sqlite expo-crypto expo-secure-store \
  expo-image-manipulator expo-build-properties
```

Expected output should show:
- expo-camera: 17.x.x
- expo-sqlite: 16.x.x
- expo-crypto: 15.x.x
- expo-secure-store: 15.x.x
- expo-image-manipulator: 14.x.x
- expo-build-properties: 1.0.x
- react-native-svg: 15.x.x

## 📝 Notes

- **rn-mlkit-ocr** (^0.3.1) is compatible with both SDK 54 and 55
- **drizzle-orm** (^0.38.0) and **drizzle-kit** (^0.30.0) are database tools, not tied to Expo SDK
- **react-native-paper** (^5.14.5) is a UI library, not tied to Expo SDK
- Always use `bunx expo install` to ensure compatibility

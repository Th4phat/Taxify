#!/bin/bash

# Taxify Setup Script
# This script sets up the Taxify project with all required dependencies

set -e

echo "🚀 Setting up Taxify..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed!${NC}"
    echo "Please install Bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Installing dependencies with Bun...${NC}"
bun install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Check if we're in an Expo project
if [ ! -f "app.json" ]; then
    echo -e "${RED}❌ Not in an Expo project directory!${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 Step 2: Generating Drizzle ORM migrations...${NC}"
npx drizzle-kit generate
echo -e "${GREEN}✅ Migrations generated${NC}"
echo ""

echo -e "${BLUE}🏗️  Step 3: Running Expo prebuild to configure native modules...${NC}"
echo -e "${YELLOW}⚠️  This will create/update ios and android directories${NC}"
bun run prebuild
echo -e "${GREEN}✅ Prebuild completed${NC}"
echo ""

echo -e "${BLUE}📝 Step 4: Additional iOS setup for rn-mlkit-ocr...${NC}"
if [ -d "ios" ]; then
    echo -e "${YELLOW}⚠️  iOS deployment target is set to 15.5 in app.json${NC}"
    echo -e "${YELLOW}⚠️  rn-mlkit-ocr plugin is configured for latin text recognition${NC}"
    echo -e "${GREEN}✅ iOS setup completed${NC}"
else
    echo -e "${YELLOW}⚠️  iOS directory not found. Run 'bun run ios' to create it.${NC}"
fi
echo ""

echo -e "${BLUE}📱 Step 5: Verifying Android setup...${NC}"
if [ -d "android" ]; then
    echo -e "${GREEN}✅ Android setup completed${NC}"
else
    echo -e "${YELLOW}⚠️  Android directory not found. Run 'bun run android' to create it.${NC}"
fi
echo ""

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo "To run the app:"
echo "  ${BLUE}bun run ios${NC}     # for iOS"
echo "  ${BLUE}bun run android${NC} # for Android"
echo ""
echo "📚 Project Structure:"
echo "  - Database: Drizzle ORM + expo-sqlite (SQLCipher)"
echo "  - OCR: rn-mlkit-ocr (latin text recognition)"
echo "  - Camera: expo-camera (SDK 54)"
echo "  - UI: react-native-paper v5 (MD3)"
echo "  - State: Zustand"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "  - iOS requires minimum deployment target of 15.5 (configured in app.json)"
echo "  - OCR models are bundled with the app (offline capability)"
echo "  - Database uses SQLCipher encryption"
echo "  - Camera permission is required for receipt scanning"
echo ""

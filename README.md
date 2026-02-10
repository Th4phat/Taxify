# Taxify 🇹🇭

> **⚡ Vibe Coded** — This project was built primarily through AI-assisted development using modern tools and iterative conversation-driven programming.

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-blue?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-0.38-green)](https://orm.drizzle.team)

A privacy-focused, local-first mobile application for Thai personal income tax calculation and expense tracking. Built with Expo SDK 54 and React Native, Taxify keeps all your sensitive financial data securely on your device using encrypted SQLite storage.

<p align="center">
  <img src="assets/images/icon.png" width="120" alt="Taxify App Icon">
</p>

## ✨ Features

- 📊 **Expense & Income Tracking** — Categorize and monitor your financial transactions
- 📸 **Receipt Scanning** — OCR-powered receipt parsing using Google ML Kit
- 🧮 **Thai Tax Calculation** — Accurate PIT calculation based on Revenue Code Section 40
- 🤖 **AI-Powered Insights** — Smart expense analysis and tax optimization suggestions
- 🔒 **Privacy-First** — All data stays on your device with SQLCipher encryption
- 🌐 **Bilingual** — Full Thai and English language support
- 🔔 **Smart Notifications** — Tax deadline reminders and budget alerts

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Expo SDK 54 |
| Language | TypeScript 5.9 |
| UI | React Native Paper (Material Design 3) |
| Navigation | Expo Router |
| Database | SQLite with SQLCipher (via expo-sqlite) |
| ORM | Drizzle ORM |
| State | Zustand |
| OCR | Google ML Kit (rn-mlkit-ocr) |
| AI | Google Gemini API |

## 📱 Screenshots

<p align="center">
  <em>Screenshots coming soon</em>
</p>

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- iOS: macOS with Xcode 15+
- Android: Android Studio with SDK 34+

### Installation

```bash
# Clone the repository
git clone https://github.com/Th4phat/taxify.git
cd taxify

# Install dependencies
bun install

# Start the development server
bun run start
```

### Running on Device/Simulator

```bash
# iOS
bun run ios

# Android
bun run android
```

## 📁 Project Structure

```
taxify/
├── app/                    # Expo Router routes
│   ├── (tabs)/            # Tab navigation screens
│   ├── (app)/             # Stack screens
│   └── transactions/      # Transaction management
├── components/            # Reusable UI components
├── database/              # Drizzle ORM schema & repositories
├── services/              # Business logic services
│   ├── ai/               # AI/ML services
│   ├── tax/              # Tax calculation engine
│   └── receipt/          # OCR & receipt parsing
├── stores/                # Zustand state stores
├── theme/                 # Material Design 3 theming
├── constants/             # App constants
├── hooks/                 # Custom React hooks
└── utils/                 # Utility functions
```

## 🔐 Privacy & Security

- **Local-First**: All data is stored locally on your device
- **Encryption**: SQLCipher provides full database encryption
- **Biometric Auth**: Face ID / Touch ID / Fingerprint support
- **No Cloud**: No data is sent to external servers (except optional AI features)

## 🤖 AI Features

Taxify includes optional AI-powered features via Google Gemini:

- Expense categorization suggestions
- Tax optimization recommendations
- Spending insights and analysis
- Natural language tax Q&A

*Note: AI features require an API key and send anonymized data to Google's services.*

## 🧪 Testing

```bash
# Linting
bun run lint

# Database migrations
bun run db:generate
bun run db:migrate
```

## 📚 Documentation

Additional documentation is available in the [`docs/`](docs/) folder:

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [Database Setup](docs/DATABASE_SETUP.md)
- [API Migration Guide](docs/API_MIGRATION_GUIDE.md)
- [Agent Development Guide](docs/AGENTS.md)

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Thai Revenue Department for tax calculation guidelines
- Expo team for the amazing development platform
- React Native Paper for beautiful Material Design components

---

<p align="center">
  <sub>Built with 💚 for Thai taxpayers</sub>
</p>

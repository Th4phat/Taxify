## Inspiration

Filing taxes in Thailand is unnecessarily complicated. Every year, millions of Thai residents struggle to:
- Track scattered income sources (salary, freelance, investments, rentals)
- Understand which expenses are tax-deductible under the Revenue Code
- Calculate complex progressive tax brackets and alternative minimum taxes
- Remember filing deadlines and avoid penalties

At the same time, most financial apps store sensitive data on corporate servers, creating privacy risks. **Taxify was born from the belief that your financial data should stay yours**  on your device, encrypted, and accessible even offline.

We wanted to build something that demystifies Thai personal income tax while respecting user privacy completely.

---

## What it does

**Taxify** is a privacy-first, AI-powered mobile app for Thai personal income tax calculation and expense tracking:

### Core Features
- **Transaction Tracking**  Log income and expenses with categorization (English/Thai)
- **Thai Tax Calculator**  Accurate calculation based on Revenue Code Section 40 with 8 income types
- **Receipt Scanner**  OCR-powered receipt scanning using Google ML Kit
- **AI Tax Assistant**  Conversational AI that answers tax questions and queries your financial data
- **Smart Tax Optimization**  AI-powered suggestions to legally minimize tax (RMF/SSF recommendations, deduction gap analysis)
- **Expense Insights**  AI-analyzed spending patterns with actionable recommendations
- **Tax Deadline Tracking**  Automated reminders for filing deadlines (March 31 paper / April 8 e-filing)
- **Data Export**  CSV and HTML reports for accountants
- **Privacy by Design**  Full SQLCipher encryption, no cloud storage, biometric authentication support

### Tax Engine Highlights
- Progressive tax brackets (0%–35%)
- Alternative minimum tax (0.5% method)
- All Section 40 income classifications
- Expense deductions per income type
- Full allowances and investment deductions (RMF, SSF, insurance)

---

## How we built it

### Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Expo SDK 54 | Cross-platform development |
| **Language** | TypeScript (strict mode) | Type safety |
| **UI** | React Native Paper v5 | Material Design 3 |
| **Navigation** | Expo Router | File-based routing |
| **Database** | expo-sqlite (SQLCipher) | Encrypted local storage |
| **ORM** | Drizzle ORM | Type-safe database operations |
| **AI** | Google Gemini API | Smart categorization, chat, insights |
| **OCR** | rn-mlkit-ocr | Receipt text recognition |
| **Camera** | expo-camera | Receipt scanning |
| **State** | Zustand | Global state management |

### Architecture Highlights
- **Local-first**: All data stays on device with SQLCipher encryption
- **Repository Pattern**: Clean separation between data layer and UI
- **Modular Services**: Tax engine, AI services, and export functionality are self-contained
- **Type Safety**: Zero `any` types, strict TypeScript throughout

### AI Integration
We integrated Google's Gemini API for:
1. **Auto-categorization**  Suggests categories based on merchant/description
2. **Tax Chat Assistant**  Natural language queries with function calling to user's data
3. **Expense Insights**  Anomaly detection, trend analysis, saving opportunities
4. **Tax Optimization**  Personalized recommendations to reduce tax liability

---

## Challenges we ran into

### 1. Thai Tax Complexity
Thai personal income tax has **8 different income types** (Section 40), each with unique deduction rules. Some allow actual expense deductions, others don't. Some are subject to alternative minimum tax, others aren't. We spent significant time ensuring calculations match the Thai Revenue Department's official methods.

### 2. Offline-First with AI
Balancing AI features with privacy was tricky. Since we don't store data in the cloud, we had to design the AI services to send only necessary, anonymized data to Gemini API  never storing or training on user financial information.

### 3. Database Encryption
Setting up SQLCipher with expo-sqlite required careful key management using expo-secure-store. We had to ensure encryption keys are stored in the iOS Keychain/Android Keystore while maintaining app performance.

### 4. Receipt OCR Accuracy
Receipts in Thailand vary widely  some have Thai text, some English, some mixed. Tuning the ML Kit OCR to reliably extract merchant names and amounts required extensive testing and post-processing logic.

### 5. Tax Year vs Calendar Year
Thai tax year follows calendar year (Jan-Dec), but filing is due March/April of the following year. Managing tax year transitions and projections required careful date handling.

---

## Accomplishments that we're proud of

### 🎯 Complete Thai Tax Compliance
Built a tax engine that accurately handles:
- All 8 Section 40 income types
- Progressive tax brackets (0%–35%)
- Alternative minimum tax calculation
- All standard deductions and allowances
- Penalty and surcharge calculations

### 🤖 AI-Powered Features
Integrated Google Gemini to create:
- **Smart Auto-Categorization** that learns from user patterns
- **Conversational Tax Assistant** with function calling to query real financial data
- **Intelligent Tax Optimization** with personalized savings recommendations
- **Natural Language Insights**  ask "How much did I spend on dining?" and get instant answers

### 🔒 Privacy Without Compromise
- Full database encryption with SQLCipher
- Zero cloud data storage
- Biometric authentication ready
- Works completely offline

### 📱 Modern Mobile Experience
- Material Design 3 with custom financial color palette
- Smooth animations with react-native-reanimated
- Light/dark theme support
- Responsive layouts for all screen sizes

### 🛠️ Developer Experience
- 100% TypeScript with strict mode
- Clean architecture with separation of concerns
- Comprehensive documentation
- Drizzle ORM for type-safe database operations

---

## What we learned

### Technical Insights
- **Drizzle ORM with Expo SQLite**  Learned the `openDatabaseSync` pattern and migration system for local-first apps
- **Google Gemini Function Calling**  Discovered how to let AI query real user data safely and contextually
- **SQLCipher Integration**  Mastered encrypted database setup with proper key management
- **React Native Paper v5**  Adopted Material Design 3 patterns for consistent, modern UI

### Domain Knowledge
- **Thai Revenue Code**  Deep dive into Section 40 income types, deductions, and tax brackets
- **Tax Optimization Strategies**  Learned legal ways to reduce tax burden (RMF, SSF, timing strategies)
- **Receipt Data Extraction**  Understood OCR limitations and post-processing techniques

### Product Lessons
- Privacy can be a feature, not a limitation
- AI enhances user experience when integrated thoughtfully
- Local-first apps require different architectural thinking than cloud-based apps
- Tax software needs to be both accurate and approachable

---

## What's next for Taxify

### Near-term
- **PDF Export**  Generate professional PDF tax reports using `expo-print`
- **Encrypted Backup**  Optional iCloud/Google Drive backup with client-side encryption
- **Data Visualization**  Interactive charts for spending trends and tax projections
- **Receipt Auto-Match**  Automatically link scanned receipts to transactions

### Medium-term
- **Multi-Currency Support**  Handle foreign income and exchange rates
- **Recurring Transaction Intelligence**  Smart detection and management of recurring expenses
- **Widget Support**  iOS/Android home screen widgets for quick stats
- **Voice Input**  Talk to your AI tax assistant

### Long-term Vision
- **Bank Integration**  Secure import from Thai banks (with user consent)
- **Tax Form Auto-Fill**  Pre-fill P.N.D. 90/91 forms
- **Regional Expansion**  Adapt for other Southeast Asian tax systems

### Technical Improvements
- Local AI model for offline categorization
- Enhanced receipt OCR with Thai language optimization
- Automated tax document scanning (50 Tawi, donation receipts)

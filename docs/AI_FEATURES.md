# Taxify AI Features

This document describes the AI-powered features added to Taxify using Google's Gemini API.

## Features Overview

### 1. Smart Auto-Categorization

**Location:** `services/ai/autoCategorization.service.ts`, `components/ai/CategorySuggestion.tsx`

**Description:**
AI-powered transaction categorization that suggests the most appropriate category based on transaction description, amount, and merchant name.

**Key Features:**
- Real-time category suggestions as user types
- Confidence scoring (0-1) for each suggestion
- Alternative category options
- Pattern matching for common Thai merchants (7-Eleven, PTT, Grab, etc.)
- Learning from user's historical categorization patterns

**Usage:**
```typescript
import { suggestCategory } from '@/services/ai/autoCategorization';

const result = await suggestCategory(
  'Starbucks Central World',
  150,
  'expense'
);
// Returns: { suggestion: { categoryId, categoryName, confidence, reason }, alternatives: [] }
```

### 2. AI Tax Assistant Chat

**Location:** `services/ai/taxChat.service.ts`, `components/ai/AIChat.tsx`, `app/(app)/ai-chat.tsx`

**Description:**
Conversational AI assistant for Thai tax questions with function calling capabilities to query user's financial data.

**Key Features:**
- Natural language Q&A about Thai tax laws
- Function calling to query transactions, income, and tax data
- Conversation history management
- Context-aware responses
- Quick question suggestions

**Available Functions:**
- `queryTransactions` - Filter and query user's transactions
- `getIncomeSummary` - Get income breakdown by Section 40 type
- `getMonthlySummary` - Get monthly income/expense summary
- `calculateTaxEstimate` - Calculate estimated tax for a year
- `getCategories` - Get list of transaction categories

**Usage:**
```typescript
import { createChatSession, sendMessage } from '@/services/ai/taxChat';

const session = createChatSession('Tax Questions');
const response = await sendMessage(session.id, 'How much tax will I owe this year?');
```

### 3. Expense Insights & Analytics

**Location:** `services/ai/expenseInsights.service.ts`, `components/ai/InsightsCard.tsx`, `app/(app)/insights.tsx`

**Description:**
AI-powered analysis of spending patterns with actionable insights.

**Key Features:**
- Spending trend analysis
- Category anomaly detection
- Period comparisons
- Seasonal pattern recognition
- Budget alerts
- Saving opportunities identification
- Tax-relevant observations

**Insight Types:**
- `spending_trend` - Income/expense trends over time
- `category_anomaly` - Unusual spending in specific categories
- `comparison` - Period-over-period comparisons
- `seasonal_pattern` - Seasonal spending patterns
- `budget_alert` - Budget threshold warnings
- `saving_opportunity` - Potential savings recommendations
- `tax_relevance` - Tax-deductible expense highlights

**Usage:**
```typescript
import { generateSpendingInsights } from '@/services/ai/expenseInsights';

const insights = await generateSpendingInsights(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

**Natural Language Queries:**
```typescript
import { processNaturalLanguageQuery } from '@/services/ai/expenseInsights';

const result = await processNaturalLanguageQuery(
  'How much did I spend on dining this month?'
);
// Returns: { query, result: { answer, chartType, chartData } }
```

### 4. Tax Optimization Advisor

**Location:** `services/ai/taxOptimization.service.ts`, `components/ai/TaxOptimization.tsx`

**Description:**
AI-powered tax optimization recommendations to minimize tax liability legally.

**Key Features:**
- Deduction gap analysis
- Investment opportunity recommendations (RMF, SSF)
- Tax bracket optimization
- Missing document identification
- Scenario comparisons
- Potential savings calculations

**Suggestion Types:**
- `additional_deduction` - Unused deduction allowances
- `investment_opportunity` - RMF/SSF investment recommendations
- `income_timing` - Strategic income timing advice
- `bracket_optimization` - Tax bracket management
- `missing_document` - Required tax documents

**Usage:**
```typescript
import { generateTaxOptimizationReport } from '@/services/ai/taxOptimization';

const report = await generateTaxOptimizationReport(
  2024,
  currentDeductions,
  totalIncome,
  incomeBySection40
);
// Returns: { suggestions[], totalPotentialSavings, currentTaxAmount, ... }
```

**Scenario Comparison:**
```typescript
import { compareTaxScenarios } from '@/services/ai/taxOptimization';

const comparisons = await compareTaxScenarios(
  baseScenario,
  [
    { name: 'Max RMF', deductionChanges: { rmf: 100000 } },
    { name: 'Buy Insurance', deductionChanges: { lifeInsurance: 50000 } }
  ]
);
```

## Core AI Service

**Location:** `services/ai/gemini.client.ts`

**Description:**
Core Gemini API client with support for structured outputs and function calling.

**Key Features:**
- Singleton client pattern
- Structured JSON output with schema validation
- Function calling support
- Error handling and retries
- Model selection (Flash, Flash-Lite, Pro)

**Usage:**
```typescript
import { generateContent, generateStructuredContent, GEMINI_MODELS } from '@/services/ai';

// Simple text generation
const result = await generateContent('Explain Thai tax brackets', {
  model: GEMINI_MODELS.FLASH,
  temperature: 0.3
});

// Structured output
const schema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING }
  }
};
const { data } = await generateStructuredContent<SchemaType>(prompt, schema);
```

## UI Components

### AIChat
Full-screen chat interface with message history, quick actions, and loading states.

### CategorySuggestionCard
Displays AI category suggestions with confidence scores and alternatives.

### InsightsCard
Shows AI-generated spending insights with severity indicators and actions.

### TaxOptimizationCard
Displays tax optimization recommendations with potential savings.

## Environment Setup

Ensure you have the Gemini API key configured in `.env`:

```
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

## Architecture

```
services/ai/
├── gemini.client.ts          # Core Gemini API client
├── autoCategorization.ts     # Smart categorization
├── taxChat.ts                # Tax assistant chat
├── expenseInsights.ts        # Spending analysis
├── taxOptimization.ts        # Tax optimization
└── index.ts                  # Service exports

components/ai/
├── AIChat.tsx                # Chat UI
├── CategorySuggestion.tsx    # Category suggestion UI
├── InsightsCard.tsx          # Insights display UI
└── TaxOptimization.tsx       # Tax optimization UI

app/(app)/
├── ai-chat.tsx               # Chat screen
└── insights.tsx              # Insights detail screen
```

## Performance Considerations

- All AI calls are debounced to prevent excessive API usage
- Results are not cached by default (can be added via AsyncStorage)
- Flash-Lite model used for simple categorization (faster, cheaper)
- Flash model used for chat and insights (balanced)
- Pro model used for tax optimization (highest quality)

## Privacy & Security

- All AI processing happens via Google Gemini API
- No financial data is stored by the AI service
- Transaction data is only sent for the specific operation
- API key is stored in environment variables only

## Future Enhancements

- [ ] Local caching of AI responses
- [ ] Offline mode with queued AI requests
- [ ] Personalized insights based on spending history
- [ ] Voice input for chat
- [ ] Multi-language support for AI responses
- [ ] Receipt image analysis with Gemini Vision
- [ ] Tax form auto-fill suggestions

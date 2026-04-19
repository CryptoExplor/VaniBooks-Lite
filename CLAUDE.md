# VaniBooks Lite — CLAUDE.md
# AI Context for Autonomous Build (Claude Code)

> ⚠️ READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.
> This file is the single source of truth. Never deviate from structure, stack, or module order defined here.

---

## 0. Mission

Build **VaniBooks Lite** — an AI-first accounting agent for Indian MSMEs.

Users type or speak a transaction in plain language.
Claude converts it into structured financial data, generates invoices, and answers financial questions.

**Claude is not a helper. Claude IS the product.**

---

## 1. Stack (Non-Negotiable)

| Layer         | Choice                          |
|---------------|---------------------------------|
| Framework     | React 18 + Vite 5               |
| Language      | TypeScript (strict mode)        |
| Styling       | TailwindCSS v3                  |
| State         | Zustand                         |
| AI Engine     | Anthropic Claude API (claude-opus-4-7) |
| DB / Persist  | Supabase (Postgres) OR localStorage (MVP fallback) |
| Deploy        | Vercel                          |
| Voice Input   | Web Speech API (browser native) |
| Node          | 20+, ESM                        |
| Package mgr   | npm (lockfile enforced)         |

**Never use floating point for money. Always use integer paise (₹1 = 100 paise), convert only for display.**

---

## 2. Project Folder Structure

Create this structure FIRST before any code:

```
vanibooks-lite/
├── CLAUDE.md                        ← this file
├── .env.example                     ← secrets template (never commit .env)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── src/
│   ├── main.tsx                     ← app entry
│   ├── App.tsx                      ← root layout + routing
│   ├── env.ts                       ← typed env vars (Zod-validated)
│   ├── types/
│   │   ├── transaction.ts           ← Transaction, Invoice, FinancialSummary types
│   │   └── ai.ts                    ← Claude API request/response types
│   ├── store/
│   │   └── ledger.ts                ← Zustand store (transactions, invoices)
│   ├── services/
│   │   ├── claude.ts                ← Claude API client
│   │   ├── parser.ts                ← intent detection (which prompt mode)
│   │   └── gst.ts                   ← GST calculation utilities (BigInt)
│   ├── prompts/
│   │   ├── expense.ts               ← EXPENSE/INCOME system prompt
│   │   ├── invoice.ts               ← INVOICE system prompt
│   │   └── analysis.ts              ← FINANCIAL ANALYSIS system prompt
│   ├── components/
│   │   ├── InputBar.tsx             ← text + voice input
│   │   ├── ResultCard.tsx           ← shows parsed JSON output
│   │   ├── Ledger.tsx               ← transaction table
│   │   ├── InvoicePreview.tsx       ← rendered invoice
│   │   ├── SummaryPanel.tsx         ← profit/expense breakdown
│   │   └── ErrorBoundary.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx            ← main page
│   │   └── InvoicePage.tsx          ← invoice detail view
│   └── lib/
│       ├── format.ts                ← currency, date formatters
│       ├── validate.ts              ← JSON response validators
│       └── logger.ts                ← structured JSON logger (no PII)
├── supabase/
│   └── schema.sql                   ← DB schema (run once)
└── public/
    └── favicon.svg
```

---

## 3. Environment Variables

Create `.env.example` with these keys. NEVER commit actual values.

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxx

# Supabase (optional — falls back to localStorage if not set)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx

# App
VITE_APP_ENV=development
VITE_APP_VERSION=0.1.0
```

---

## 4. Data Types (`src/types/transaction.ts`)

```typescript
// All money stored as integer PAISE (1 INR = 100 paise)
// NEVER use float for financial values

export type TransactionType =
  | "income"
  | "expense"
  | "invoice"
  | "payment"
  | "receipt";

export type PaymentMode = "cash" | "bank" | "upi" | "card" | "unknown";

export interface Transaction {
  id: string;                    // uuid
  type: TransactionType;
  amountPaise: bigint;           // ALWAYS paise, NEVER float rupees
  currency: "INR";
  category: string;
  paymentMode: PaymentMode;
  party: string;
  description: string;
  date: string;                  // ISO 8601 YYYY-MM-DD
  gstApplicable: boolean;
  gstRatePct: number;            // e.g. 18 for 18%
  gstAmountPaise: bigint;
  confidence: number;            // 0–1
  rawInput: string;              // original user text
  createdAt: string;             // ISO timestamp
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  pricePaise: bigint;
  totalPaise: bigint;
}

export interface Invoice {
  id: string;
  clientName: string;
  items: InvoiceItem[];
  subtotalPaise: bigint;
  gstRatePct: number;
  gstAmountPaise: bigint;
  totalAmountPaise: bigint;
  currency: "INR";
  date: string;
  rawInput: string;
  createdAt: string;
}

export interface FinancialSummary {
  revenuePaise: bigint;
  expensesPaise: bigint;
  profitPaise: bigint;
  summary: string;
  period: string;
}
```

---

## 5. Claude Prompts (`src/prompts/`)

### 5a. `expense.ts` — Core Accounting Prompt

```typescript
export const EXPENSE_SYSTEM_PROMPT = `
You are an expert Indian accountant and GST specialist.

Your job is to convert user input (natural language) into a structured accounting entry.

STRICT RULES:
- Output ONLY valid JSON. No explanation, no markdown, no backticks.
- Assume Indian accounting context: INR currency, Indian GST laws.
- If party name is unknown, use "unknown" — do NOT hallucinate names.
- Dates default to today's date (ISO 8601) if not mentioned.
- amount must be a NUMBER in rupees (float is acceptable here — server will convert).
- gst_rate is an integer percentage (e.g. 18 for 18%).
- confidence is a float 0–1 representing how sure you are.

TRANSACTION TYPES: income | expense | invoice | payment | receipt

OUTPUT FORMAT (strict — no deviation):
{
  "type": "income | expense | invoice | payment | receipt",
  "amount": number,
  "currency": "INR",
  "category": string,
  "payment_mode": "cash | bank | upi | card | unknown",
  "party": string,
  "description": string,
  "date": "YYYY-MM-DD",
  "gst_applicable": boolean,
  "gst_rate": number,
  "confidence": number
}

CATEGORY MAPPING:
- rent → "rent"
- salary / wages → "salary"
- purchase of goods → "purchase"
- sales of goods → "sales"
- food / meals → "food"
- travel / transport → "travel"
- utilities (electric, water, internet) → "utilities"
- professional fees → "professional_fees"
- other → "other"

GST RULES:
- Business goods/services default to 18% GST
- Rent, salary, wages → gst_applicable: false, gst_rate: 0
- Personal/petty expenses → gst_applicable: false, gst_rate: 0
- Medicines → 12%

IMPORTANT:
- Never return text outside the JSON object
- If unclear, lower confidence below 0.5
- Never refuse — always produce best-guess output
`.trim();
```

---

### 5b. `invoice.ts` — Invoice Generation Prompt

```typescript
export const INVOICE_SYSTEM_PROMPT = `
You are an expert GST invoice generator for India.

Convert user input into a structured invoice JSON.

STRICT RULES:
- Output ONLY valid JSON. No explanation, no markdown, no backticks.
- Always calculate totals correctly (subtotal = sum of item totals).
- GST default = 18% unless user specifies.
- If quantity not mentioned, assume 1.
- price is per unit in rupees.

OUTPUT FORMAT (strict):
{
  "type": "invoice",
  "client_name": string,
  "items": [
    {
      "name": string,
      "quantity": number,
      "price": number,
      "total": number
    }
  ],
  "subtotal": number,
  "gst_rate": number,
  "gst_amount": number,
  "total_amount": number,
  "currency": "INR",
  "date": "YYYY-MM-DD"
}

IMPORTANT:
- gst_amount = subtotal * (gst_rate / 100)
- total_amount = subtotal + gst_amount
- Never return text outside the JSON object
`.trim();
```

---

### 5c. `analysis.ts` — Financial Q&A Prompt

```typescript
export const ANALYSIS_SYSTEM_PROMPT = `
You are an AI financial analyst for an Indian small business.

You will receive a JSON array of transaction records.

Your job: analyze income and expenses, return a clear summary.

STRICT RULES:
- Output ONLY valid JSON. No explanation, no markdown, no backticks.
- revenue = sum of all income/receipt/payment received entries
- expenses = sum of all expense entries
- profit = revenue - expenses
- summary must be in simple English, no jargon, max 2 sentences
- All amount values are in rupees (number type)

OUTPUT FORMAT (strict):
{
  "revenue": number,
  "expenses": number,
  "profit": number,
  "summary": string,
  "period": string
}
`.trim();
```

---

## 6. Intent Detection (`src/services/parser.ts`)

```typescript
// Detect which Claude mode to use BEFORE API call
// This is client-side — no AI needed for routing

export type IntentMode = "expense" | "invoice" | "analysis";

const INVOICE_KEYWORDS = [
  "invoice", "bill", "create bill", "generate invoice", "raise invoice",
  "bana", "banao", "challan"
];

const ANALYSIS_KEYWORDS = [
  "profit", "loss", "revenue", "expense total", "how much",
  "kitna", "summary", "report", "balance", "paisa kitna"
];

export function detectIntent(input: string): IntentMode {
  const lower = input.toLowerCase().trim();

  if (INVOICE_KEYWORDS.some(kw => lower.includes(kw))) return "invoice";
  if (ANALYSIS_KEYWORDS.some(kw => lower.includes(kw))) return "analysis";
  return "expense";
}
```

---

## 7. Claude API Client (`src/services/claude.ts`)

```typescript
import { EXPENSE_SYSTEM_PROMPT } from "../prompts/expense";
import { INVOICE_SYSTEM_PROMPT } from "../prompts/invoice";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysis";
import type { IntentMode } from "./parser";
import type { Transaction, Invoice, FinancialSummary } from "../types/transaction";

const CLAUDE_MODEL = "claude-opus-4-7";
const API_URL = "https://api.anthropic.com/v1/messages";

function getSystemPrompt(mode: IntentMode): string {
  if (mode === "invoice") return INVOICE_SYSTEM_PROMPT;
  if (mode === "analysis") return ANALYSIS_SYSTEM_PROMPT;
  return EXPENSE_SYSTEM_PROMPT;
}

interface ClaudeCallOptions {
  mode: IntentMode;
  userMessage: string;
  contextData?: object;  // for analysis mode: pass transaction array
}

// [RISK] API key exposed in client. For hackathon only.
// Production: proxy through /api/claude backend route.
export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const { mode, userMessage, contextData } = opts;

  const content = contextData
    ? `Transactions: ${JSON.stringify(contextData)}\n\nUser question: ${userMessage}`
    : userMessage;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0.2,           // low temp = consistent structured output
      system: getSystemPrompt(mode),
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const text = data.content
    ?.filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("") ?? "";

  return text.trim();
}

// Safe JSON parse with fallback
export function parseClaudeResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }
}
```

---

## 8. GST Utilities (`src/services/gst.ts`)

```typescript
// All calculations use BigInt paise to avoid floating point errors.

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function paiseToRupees(paise: bigint): string {
  const whole = paise / 100n;
  const frac = paise % 100n;
  return `₹${whole}.${String(frac).padStart(2, "0")}`;
}

export function calculateGst(amountPaise: bigint, ratePct: number): bigint {
  // ratePct is integer e.g. 18
  return (amountPaise * BigInt(ratePct)) / 100n;
}

export function totalWithGst(amountPaise: bigint, ratePct: number): bigint {
  return amountPaise + calculateGst(amountPaise, ratePct);
}
```

---

## 9. Zustand Store (`src/store/ledger.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Transaction, Invoice } from "../types/transaction";

interface LedgerState {
  transactions: Transaction[];
  invoices: Invoice[];
  addTransaction: (t: Transaction) => void;
  addInvoice: (i: Invoice) => void;
  clearAll: () => void;
}

export const useLedger = create<LedgerState>()(
  persist(
    (set) => ({
      transactions: [],
      invoices: [],
      addTransaction: (t) =>
        set((s) => ({ transactions: [t, ...s.transactions] })),
      addInvoice: (i) =>
        set((s) => ({ invoices: [i, ...s.invoices] })),
      clearAll: () => set({ transactions: [], invoices: [] }),
    }),
    {
      name: "vanibooks-ledger-v1",
      // Supabase sync can be added here as middleware later
    }
  )
);
```

---

## 10. UI Components — Spec

### `InputBar.tsx`
- Full-width text input at bottom of screen
- Mic icon button (right side) → toggle Web Speech API recognition
- Enter key OR button submits
- Shows loading spinner while Claude processes
- Displays error inline if Claude fails (never crash)
- Placeholder: `"Type anything... 'Paid 5000 rent' or 'Create invoice for Ramesh'"`

### `ResultCard.tsx`
- Appears above InputBar after each successful parse
- Shows:
  - Transaction type badge (color-coded: green=income, red=expense, blue=invoice)
  - Amount in ₹ formatted
  - Category, party, date
  - GST badge if applicable
  - Confidence meter (progress bar, hide if > 0.85)
  - "Add to Ledger" CTA button
  - "Explain this" link → calls Claude for plain-language explanation

### `Ledger.tsx`
- Table: Date | Type | Description | Party | Amount | GST | Action
- Sortable by date (default: newest first)
- Color-coded rows (income=green tint, expense=red tint)
- "Export CSV" button
- Paginate at 20 rows

### `InvoicePreview.tsx`
- Renders invoice as clean printable card
- Shows: Invoice # | Date | Client | Items table | Subtotal | GST | Total
- "Print" button
- "Download PDF" (use browser print API with @media print)

### `SummaryPanel.tsx`
- Shows at top: Revenue | Expenses | Profit (cards)
- Triggered by analysis queries
- Animated count-up numbers
- Color: profit=green, loss=red

---

## 11. Voice Input Implementation

```typescript
// In InputBar.tsx
const startVoice = () => {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("Voice not supported in this browser. Use Chrome.");
    return;
  }
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";          // Indian English accent
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    setInputValue(transcript);
    handleSubmit(transcript);           // auto-submit on voice end
  };

  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
  };

  recognition.start();
};
```

---

## 12. Design System

### Color Palette
```css
--primary: #1a1a2e;       /* Deep navy */
--accent: #e94560;        /* Vermillion red (Indian palette) */
--income: #00b894;        /* Emerald green */
--expense: #d63031;       /* Alert red */
--invoice: #0984e3;       /* Business blue */
--bg: #f8f9fa;
--surface: #ffffff;
--border: #e2e8f0;
--text: #1a202c;
--muted: #718096;
```

### Typography
- Display/Headings: `Sora` (Google Fonts)
- Body: `DM Sans` (Google Fonts)
- Mono/amounts: `JetBrains Mono` (for numbers)

### Layout
- Mobile-first, max-width 768px centered
- Sticky InputBar at bottom (like chat)
- Scrollable feed above it
- No sidebar — single-column

---

## 13. Supabase Schema (`supabase/schema.sql`)

```sql
-- Run once in Supabase SQL editor

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  amount_paise BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  category TEXT,
  payment_mode TEXT,
  party TEXT,
  description TEXT,
  date DATE NOT NULL,
  gst_applicable BOOLEAN DEFAULT false,
  gst_rate_pct INTEGER DEFAULT 0,
  gst_amount_paise BIGINT DEFAULT 0,
  confidence FLOAT,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal_paise BIGINT NOT NULL,
  gst_rate_pct INTEGER DEFAULT 18,
  gst_amount_paise BIGINT NOT NULL,
  total_amount_paise BIGINT NOT NULL,
  currency TEXT DEFAULT 'INR',
  date DATE NOT NULL,
  raw_input TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (enable for production)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

---

## 14. Error Handling Contract

Every Claude call must follow this pattern. No exceptions.

```typescript
interface AppError {
  code: string;          // e.g. "CLAUDE_PARSE_ERROR"
  message: string;       // user-facing message in simple English
  details?: unknown;     // dev details (never shown to user)
  traceId: string;       // uuid for log correlation
}

// Error codes used in this app:
// CLAUDE_API_ERROR       → Claude API returned non-200
// CLAUDE_PARSE_ERROR     → Response was not valid JSON
// VOICE_NOT_SUPPORTED    → Browser lacks Speech API
// SUPABASE_WRITE_ERROR   → DB write failed (fallback to localStorage)
// VALIDATION_ERROR       → Response missing required fields
```

---

## 15. Build & Run Commands

```bash
# Setup
npm install

# Dev
npm run dev

# Type check
npx tsc --noEmit

# Lint
npx eslint src/ --ext .ts,.tsx

# Build
npm run build

# Preview build
npm run preview
```

---

## 16. Implementation Order (Build Modules in THIS Sequence)

Claude Code must build in this exact order. Complete each module before starting the next.

```
Phase 1 — Foundation
  [1] package.json, tsconfig.json, vite.config.ts, tailwind.config.ts
  [2] src/types/transaction.ts + src/types/ai.ts
  [3] src/services/gst.ts (pure functions, no deps)
  [4] src/lib/format.ts + src/lib/logger.ts

Phase 2 — AI Layer
  [5] src/prompts/expense.ts + invoice.ts + analysis.ts
  [6] src/services/parser.ts (intent detection)
  [7] src/services/claude.ts (API client)

Phase 3 — State
  [8] src/store/ledger.ts (Zustand + persist)

Phase 4 — UI Components
  [9]  src/components/InputBar.tsx (text + voice)
  [10] src/components/ResultCard.tsx
  [11] src/components/Ledger.tsx
  [12] src/components/InvoicePreview.tsx
  [13] src/components/SummaryPanel.tsx

Phase 5 — Pages + Assembly
  [14] src/pages/Dashboard.tsx
  [15] src/App.tsx + src/main.tsx
  [16] index.html (import fonts, meta tags)

Phase 6 — Polish
  [17] .env.example + .gitignore
  [18] supabase/schema.sql
  [19] README.md (setup + deploy instructions)
  [20] vercel.json (SPA redirect rule)
```

---

## 17. Critical Rules — Never Violate

- **Money**: Never `float` for INR amounts in storage or calculation. Use `BigInt` paise. Display-only formatting may use `number`.
- **API Key**: `ANTHROPIC_API_KEY` in `.env` only (server-side). Never log it. Never hardcode.
- **JSON from Claude**: Always wrap `JSON.parse()` in try/catch. Show user-friendly error on failure.
- **Voice**: Gracefully degrade if browser doesn't support `SpeechRecognition`. Never crash.
- **Offline**: If Claude API fails, show error card, do NOT add incomplete entry to ledger.
- **Git**: Never commit `.env`. Always commit `.env.example`.
- **No ERPNext**: This is a focused MVP. Do not add backend frameworks, complex auth, or payment gateways.
- **No float math for GST**: `gst_amount = (subtotal_paise * gst_rate) / 100n` — all BigInt.

---

## 18. Hackathon Submission Checklist

Before submitting, verify:

- [ ] Claude is called for every transaction parse (not a regex/rule engine)
- [ ] Voice input works on Chrome mobile
- [ ] Ledger persists across page refresh
- [ ] Invoice renders cleanly and is printable
- [ ] Financial summary (profit/loss) works from chat query
- [ ] No API key visible in source
- [ ] Works on mobile viewport (375px)
- [ ] Demo flow: expense → invoice → analysis → ledger view
- [ ] Error states don't crash the app
- [ ] `npm run build` succeeds with zero TypeScript errors

---

## 19. Demo Flow (for judges)

This is the exact flow to demo in 60 seconds:

1. Type: `"Paid 5000 for office rent in cash"` → show structured expense card
2. Click "Add to Ledger" → show ledger row appears
3. Type: `"Create invoice for Ramesh for 10 shirts at 500 each"` → show invoice preview
4. Type: `"What's my profit this month?"` → show summary panel
5. Click mic → speak an expense in Hindi/English mix → show it parsed

---

*VaniBooks Lite — Built for Built with Opus 4.7 Hackathon*
*Author: Ravi (@CryptoExplor / dare1.eth)*
*Stack: React + TypeScript + Claude API + TailwindCSS + Supabase*

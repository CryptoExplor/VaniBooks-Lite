// Detect which Claude mode to use BEFORE API call
// Client-side keyword routing — no AI needed for intent detection

export type IntentMode = "expense" | "invoice" | "analysis" | "explain";

const INVOICE_KEYWORDS = [
  "invoice",
  "bill",
  "create bill",
  "generate invoice",
  "raise invoice",
  "bana",
  "banao",
  "challan",
];

const ANALYSIS_KEYWORDS = [
  "profit",
  "loss",
  "revenue",
  "expense total",
  "how much",
  "kitna",
  "summary",
  "report",
  "balance",
  "paisa kitna",
  "total income",
  "total expense",
  "net",
  "earnings",
  "munafa",
  "nuksaan",
  "kharch",
  "aay",
  "bachat",
  "total milaya",
  "hisaab",
  "mahine ka",
];

export function detectIntent(input: string): IntentMode {
  const lower = input.toLowerCase().trim();

  if (INVOICE_KEYWORDS.some((kw) => lower.includes(kw))) return "invoice";
  if (ANALYSIS_KEYWORDS.some((kw) => lower.includes(kw))) return "analysis";
  return "expense";
}

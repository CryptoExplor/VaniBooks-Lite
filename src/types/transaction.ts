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

// Claude API request/response types

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  system: string;
  messages: ClaudeMessage[];
}

export interface ClaudeContentBlock {
  type: "text" | "tool_use";
  text?: string;
}

export interface ClaudeResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ClaudeContentBlock[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// Parsed Claude output shapes (before conversion to domain types)

export interface RawExpenseOutput {
  type: "income" | "expense" | "invoice" | "payment" | "receipt";
  amount: number;
  currency: "INR";
  category: string;
  payment_mode: "cash" | "bank" | "upi" | "card" | "unknown";
  party: string;
  description: string;
  date: string;
  gst_applicable: boolean;
  gst_rate: number;
  confidence: number;
}

export interface RawInvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface RawInvoiceOutput {
  type: "invoice";
  client_name: string;
  items: RawInvoiceItem[];
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  currency: "INR";
  date: string;
}

export interface RawAnalysisOutput {
  revenue: number;
  expenses: number;
  profit: number;
  summary: string;
  period: string;
}

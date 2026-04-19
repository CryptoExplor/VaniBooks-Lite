// JSON response validators for Claude output

import type { RawExpenseOutput, RawInvoiceOutput, RawAnalysisOutput } from "../types/ai";

export function isValidExpenseOutput(obj: unknown): obj is RawExpenseOutput {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.type === "string" &&
    ["income", "expense", "invoice", "payment", "receipt"].includes(o.type) &&
    typeof o.amount === "number" &&
    typeof o.currency === "string" &&
    typeof o.category === "string" &&
    typeof o.payment_mode === "string" &&
    typeof o.party === "string" &&
    typeof o.description === "string" &&
    typeof o.date === "string" &&
    typeof o.gst_applicable === "boolean" &&
    typeof o.gst_rate === "number" &&
    typeof o.confidence === "number"
  );
}

export function isValidInvoiceOutput(obj: unknown): obj is RawInvoiceOutput {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.client_name === "string" &&
    Array.isArray(o.items) &&
    o.items.length > 0 &&
    typeof o.subtotal === "number" &&
    typeof o.gst_rate === "number" &&
    typeof o.gst_amount === "number" &&
    typeof o.total_amount === "number" &&
    typeof o.currency === "string" &&
    typeof o.date === "string"
  );
}

export function isValidAnalysisOutput(obj: unknown): obj is RawAnalysisOutput {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.revenue === "number" &&
    typeof o.expenses === "number" &&
    typeof o.profit === "number" &&
    typeof o.summary === "string" &&
    typeof o.period === "string"
  );
}

import { EXPENSE_SYSTEM_PROMPT } from "../prompts/expense";
import { INVOICE_SYSTEM_PROMPT } from "../prompts/invoice";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysis";
import { EXPLAIN_SYSTEM_PROMPT } from "../prompts/explain";
import type { IntentMode } from "./parser";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";

const CLAUDE_MODEL = "claude-opus-4-7";
const API_URL = "/api/claude";

function getSystemPrompt(mode: IntentMode): string {
  if (mode === "invoice") return INVOICE_SYSTEM_PROMPT;
  if (mode === "analysis") return ANALYSIS_SYSTEM_PROMPT;
  if (mode === "explain") return EXPLAIN_SYSTEM_PROMPT;
  return EXPENSE_SYSTEM_PROMPT;
}

export interface ClaudeCallOptions {
  mode: IntentMode;
  userMessage: string;
  contextData?: object; // for analysis mode
  onChunk?: (text: string) => void;
}

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const { mode, userMessage, contextData, onChunk } = opts;
  const traceId = uuidv4();

  // MOCK MODE — remove before submission
  const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === "true";

  if (MOCK_MODE) {
    let mockResponse = "";
    if (mode === "invoice") {
      mockResponse = JSON.stringify({
        type: "invoice",
        client_name: "Ramesh Traders",
        items: [{ name: "Shirts", quantity: 10, price: 500, total: 5000 }],
        subtotal: 5000,
        gst_rate: 18,
        gst_amount: 900,
        total_amount: 5900,
        currency: "INR",
        date: new Date().toISOString().split("T")[0],
      }, null, 2);
    } else if (mode === "analysis") {
      mockResponse = JSON.stringify({
        revenue: 25000,
        expenses: 5000,
        profit: 20000,
        summary: "Your business is profitable this month. Revenue exceeds expenses by ₹20,000.",
        period: "This month",
      }, null, 2);
    } else if (mode === "explain") {
      mockResponse = "This is a rent expense paid in cash. Rent payments are exempt from GST under Indian tax law, so no GST has been applied to this entry.";
    } else {
      mockResponse = JSON.stringify({
        type: "expense",
        amount: 5000,
        currency: "INR",
        category: "rent",
        payment_mode: "cash",
        party: "unknown",
        description: "Office rent payment",
        date: new Date().toISOString().split("T")[0],
        gst_applicable: false,
        gst_rate: 0,
        confidence: 0.95,
      }, null, 2);
    }

    if (onChunk) {
      const chunkSize = 12;
      let pos = 0;
      while (pos < mockResponse.length) {
        await new Promise(r => setTimeout(r, 30));
        pos = Math.min(pos + chunkSize, mockResponse.length);
        onChunk(mockResponse.slice(0, pos));
      }
    } else {
      await new Promise(r => setTimeout(r, 800));
    }
    return mockResponse;
  }

  const content = contextData
    ? `Transactions: ${JSON.stringify(contextData)}\n\nUser question: ${userMessage}`
    : userMessage;

  logger.info("Claude API call", { traceId, data: { mode } });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      temperature: 0.2,
      system: getSystemPrompt(mode),
      messages: [{ role: "user", content }],
      stream: !!onChunk,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    logger.error("Claude API error", { traceId, data: { status: response.status } });
    throw new Error(`Claude API error ${response.status}: ${JSON.stringify(err)}`);
  }

  if (onChunk) {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            fullText += parsed.delta.text;
            onChunk(fullText);
          }
        } catch {
          // malformed chunk
        }
      }
    }
    logger.info("Claude API success (stream)", { traceId, data: { mode } });
    return fullText.trim();
  }

  const data = await response.json();
  const text = data.content
    ?.filter((b: any) => b.type === "text")
    .map((b: any) => b.text ?? "")
    .join("") ?? "";

  logger.info("Claude API success", { traceId, data: { mode } });
  return text.trim();
}

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

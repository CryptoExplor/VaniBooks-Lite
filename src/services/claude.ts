import { EXPENSE_SYSTEM_PROMPT } from "../prompts/expense";
import { INVOICE_SYSTEM_PROMPT } from "../prompts/invoice";
import { ANALYSIS_SYSTEM_PROMPT } from "../prompts/analysis";
import { EXPLAIN_SYSTEM_PROMPT } from "../prompts/explain";
import type { IntentMode } from "./parser";
import { logger } from "../lib/logger";
import { v4 as uuidv4 } from "uuid";

const CLAUDE_MODEL = "claude-opus-4-7-20250514";
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
  contextData?: object; // for analysis mode: pass transaction array
}

// [RISK] API key exposed in client. For hackathon/MVP only.
  // Production: proxy through /api/claude backend route.
export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const { mode, userMessage, contextData } = opts;
  const traceId = uuidv4();

  const content = contextData
    ? `Transactions: ${JSON.stringify(contextData)}\n\nUser question: ${userMessage}`
    : userMessage;

  logger.info("Claude API call", { traceId, data: { mode } });

  let attempts = 0;
  let response: Response | undefined;

  while (attempts < 2) {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        temperature: 0.2, // low temp = consistent structured output
        system: getSystemPrompt(mode),
        messages: [{ role: "user", content }],
      }),
    });
    
    if (!response.ok && (response.status === 429 || response.status >= 500) && attempts === 0) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    
    break;
  }

  if (!response || !response.ok) {
    const err = await response?.json().catch(() => ({})) || {};
    logger.error("Claude API error", {
      traceId,
      code: "CLAUDE_API_ERROR",
      data: { status: response?.status ?? "FETCH_FAILED" },
    });
    throw new Error(
      `Claude API error ${response?.status ?? "unknown"}: ${JSON.stringify(err)}`
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("") ?? "";

  logger.info("Claude API success", { traceId, data: { mode } });
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

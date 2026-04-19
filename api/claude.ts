import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_MODELS = ["claude-opus-4-7"];
const MAX_TOKENS_LIMIT = 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // 1. Origin check — only accept requests from your own domain
  const origin = req.headers.origin;
  const host = req.headers.host;
  
  const isLocal = host?.includes("localhost") || host?.includes("127.0.0.1");
  const isVercel = host?.endsWith(".vercel.app");
  
  // Allow if:
  // - No origin header (same-site/direct) AND it's a known environment
  // - Origin matches allowed list
  // - Host matches Vercel/Local patterns
  const allowedOrigins = [
    "https://vani-books-lite.vercel.app",
    "http://localhost:5173",
  ];
  
  const isAllowed = !origin || allowedOrigins.includes(origin) || isLocal || isVercel;

  if (!isAllowed) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // 2. Validate and sanitize the body — never blindly forward
  const { model, max_tokens, system, messages, temperature } = req.body ?? {};

  if (!ALLOWED_MODELS.includes(model)) {
    return res.status(400).json({ error: "Invalid model" });
  }
  if (typeof max_tokens !== "number" || max_tokens > MAX_TOKENS_LIMIT) {
    return res.status(400).json({ error: "max_tokens exceeds limit" });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid messages" });
  }

  // 3. Build request explicitly — never spread req.body
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature: typeof temperature === "number" ? temperature : 0.2,
      system,
      messages,
    }),
  });

  const data = await response.json();
  res.status(response.status).json(data);
}

export const config = { runtime: "edge" };

const ALLOWED_MODELS = ["claude-opus-4-7"];
const MAX_TOKENS_LIMIT = 1024;

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  // 1. Origin check
  const host = req.headers.get("host");
  const origin = req.headers.get("origin");
  const isLocal = host?.includes("localhost") || host?.includes("127.0.0.1");
  const isVercel = host?.endsWith(".vercel.app");
  
  const allowedOrigins = [
    "https://vani-books-lite.vercel.app",
    "http://localhost:5173",
  ];
  
  const isAllowed = !origin || allowedOrigins.includes(origin) || isLocal || isVercel;

  if (!isAllowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { 
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2. Validate body
  const body = await req.json();
  const { model, max_tokens, system, messages, temperature, stream } = body ?? {};

  if (!ALLOWED_MODELS.includes(model)) {
    return new Response(JSON.stringify({ error: "Invalid model" }), { status: 400 });
  }
  if (typeof max_tokens !== "number" || max_tokens > MAX_TOKENS_LIMIT) {
    return new Response(JSON.stringify({ error: "max_tokens exceeds limit" }), { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400 });
  }

  // 3. Build request to Anthropic
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
      stream: stream === true,
    }),
  });

  // 4. Return as stream or JSON
  if (stream) {
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { "Content-Type": "application/json" }
  });
}

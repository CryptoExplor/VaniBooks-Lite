# VaniBooks Lite

AI-first accounting agent for Indian MSMEs. Type or speak a transaction in plain language — Claude converts it into structured financial data, generates GST invoices, and answers financial questions.

## Stack

- React 18 + Vite 5 + TypeScript (strict)
- TailwindCSS v3
- Zustand (persisted to localStorage)
- Anthropic Claude API (`claude-opus-4-7-20250514`)
- Web Speech API for voice input

## Setup

```bash
npm install
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key (Server-side) |
| `VITE_SUPABASE_URL` | No | Supabase project URL (falls back to localStorage) |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon key |
| `VITE_APP_ENV` | No | `development` or `production` |

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type-check + production build
npm run preview    # Preview production build
npm run lint       # ESLint
```

## Deploy to Vercel

```bash
npm i -g vercel && vercel
vercel env add ANTHROPIC_API_KEY
```

`vercel.json` SPA rewrite rule is included.

## Demo Flow

1. `"Paid 5000 for office rent in cash"` → structured expense card
2. Click **Add to Ledger** → row appears in ledger
3. `"Create invoice for Ramesh for 10 shirts at 500 each"` → invoice preview
4. `"What's my profit this month?"` → summary panel
5. Tap mic → speak an expense → auto-parsed

## Money Handling

All financial values are stored as integer **paise** (`BigInt`) — never floats. Display formatting converts to rupees only at render time.

## Notes

- API key is managed securely via the Vercel Serverless proxy backend (`/api/claude`).
- Voice input requires Chrome (Web Speech API).
- Data persists in `localStorage` under key `vanibooks-ledger-v1`.

---

*Built for the Built with Opus 4.7 Hackathon · @CryptoExplor / dare1.eth*

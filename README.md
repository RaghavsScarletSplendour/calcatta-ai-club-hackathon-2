# STAND

A typed goal compiles into a live coaching session. No users, no catalog.

Locked UX: `UX-LOCK.md`. Build plan: Grok session `plan.md`.

```
typed goal → /api/compile → cards
answer     → /api/turn    → grade + next card + cited memory
Skip 2 days→ /api/skip    → refresher; miss rusts a live skill
Speak      → /api/speak   → Grok TTS (browser speech if that dies)
```

ChatGPT is the brain (`OPENAI_API_KEY`). Grok is the voice (`XAI_API_KEY`). Skill empty/live/rust is set in code, not by the model.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Home is a blank goal box. Placeholders: statistics, intro CS, change a tire.

## Deploy on Vercel

Import this GitHub repo. Set these project env vars (Production + Preview):

- `OPENAI_API_KEY` — brain
- `XAI_API_KEY` — voice
- `ALCHEMYST_AI_API_KEY` — optional receipts push

Do not commit `.env.local`. After deploy, hit the production URL and run the same stage script as local.

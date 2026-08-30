# STAND

A typed goal compiles into a live, one-card-at-a-time coaching session. No
login, no database — the browser holds the session; each API route is
stateless and takes the whole session in, mutates it, and returns it.

**Stack**: Next.js 16 (App Router), React 19, TypeScript, `openai` SDK
(pointed at OpenAI or xAI), raw `fetch` for xAI TTS, Alchemyst for
write-only memory receipts.

**Structure**: `src/app/api/*` are thin route wrappers around
`src/lib/coach.ts`, which tries the LLM brain (`lib/brain.ts`) first, then
falls back to a hand-authored offline curriculum (`lib/fallback.ts`) for 4
rehearsed demo goals, with `lib/rules.ts` clamping every result to the
UX-LOCK caps regardless of source.

For full architecture, module-by-module details, data flow diagrams, and
known gotchas, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

Product spec: [UX-LOCK.md](UX-LOCK.md) (the decisions actually built) and
[ONE-PAGER.md](ONE-PAGER.md) (original pitch, partly superseded).

## How we work here

**Docs drift; code doesn't lie.** If this file disagrees with the code,
trust the code, then fix this file in the same session.

### Working loop

1. Plan before you build. For anything non-trivial, write a short plan and
   check it with the user before writing code.
2. Work in small, logical steps. Give a one-line "here's what changed" per
   step.
3. Keep changes as small as they can be. A bug fix doesn't need surrounding
   cleanup; a one-shot task doesn't need a new abstraction.
4. Check whether something already exists before writing it (DRY).
5. Commit only when asked to. One logical change per commit, with a clear
   message.

### Non-negotiables

- Don't act before you're told to. If intent is unclear, ask or recommend
  first; implement only on a clear ask.
- Don't describe code you haven't opened. No guessed APIs or assumed
  behavior — read or grep first.
- Never weaken a test to make it pass: no loosened assertions, no skipped
  tests, no re-recorded fixtures to hide a real diff. If a test looks
  wrong, say so instead of changing it quietly.
- A passing test, a 200 response, or "it compiles" is not proof a feature
  works. Run the real flow and check the actual output.
- Treat destructive or hard-to-reverse actions (force-push, resetting
  branches, deleting data, changing shared/production settings) as
  off-limits unless the user explicitly asks for them in that session.

### Quality bar — before calling something done

- [ ] Tests and type checks pass, and none were weakened to get there.
- [ ] The diff contains only the task at hand — no drive-by refactors.
- [ ] The change was actually exercised (run, tested, or viewed), not just
      assumed to work.
- [ ] Anything learned that contradicts this file gets fixed here in the
      same session.

### When uncertain

- **Missing fact about the code or system** — go find it (read, grep, run
  a command). Don't ask the user something you can check yourself.
- **Ambiguous request** — stop before building. Lay out the readings you
  see and ask which one, with your recommendation first.
- **Blocked on something only the user can do** (an external account, a
  production system, a decision only they can make) — don't guess or work
  around it silently. Explain the block and what you'd do once it's lifted.

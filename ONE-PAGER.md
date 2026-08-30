# STAND — one-pager for Problem 4 (The Coach)

**Build a coach for one person, not a course for a niche.** Goal in, first session out, before they sit down. Ready 16:45.

The sheet says this twice: *“Not a course, a coach”* and *“goal stated on stage, plan and first coaching session out before they sit down.”* Alchemyst is on the table because *“a coach only works if it remembers.”*

---

## Cut this from the meeting notes

Keep: no chatbot, sequential cards, infer level from answers, one generalized format.

Drop (these lose the 5-hour bet):

- A Khan Academy of many niches
- Scraping the internet for content
- “Cover all niches at launch”
- Per-niche dashboard tabs
- A native app

**How you still cover any niche:** any goal string compiles into a coach. Demo three chips. That is the format. That is not a catalog.

---

## What it is

**STAND** — a living coaching file for one professional and one goal.

1. Volunteer states a goal. Typed, or 15 seconds of voice. No “what’s your level.”
2. Six probes, one card at a time. First two are baseline for that goal. The rest drill the weak spot.
3. A skill map draws itself from the answers. Strengths and holes, with the answer that proved each one.
4. A five-session plan appears. Session 1 starts now: one teach card (90 seconds, using *their* job), then one work-sample probe.
5. After every turn the file writes three facts to Alchemyst (sponsor memory, credits on the table):
   - **stand** — where they are
   - **landed** — which explanation finally worked
   - **promised** — what they said they would do
6. A **“it’s next week”** button. Coach recalls the file, notices a missed promise, rewrites the plan. That is the “life got in the way” line from the brief.

Not a chat thread. A worksheet: one card, a progress rail, a file on the right that fills in as they answer.

---

## Steal from work you already know (do not port the repos)

| Source | What to steal | What to leave |
|---|---|---|
| **potionlabs-kernel** | “A file becomes a running system.” A goal YAML compiles into probes + plan. Memory is cited (`this claim ← answer #4`). Score in code, not vibes. Surveyor: infer from evidence, mark every guess. | The ERP, Sheriff, Postgres compiler. |
| **Orchestrant (voice tool)** | Voice as the *intake*, not the product. Browser speech → goal text. Remember as a small graph of facts, not a transcript dump. | Tauri, Rust, Docker, phone-as-mic. Website only. |
| **Grok Bot** | A named teammate with durable state. Context compounds. One persistent file, not a new chat. | The cloud VM, browser-use, multi-bot desk. Too heavy for a 5-hour website demo. |

Kernel slogan, rewritten: **a goal becomes a coach.**

---

## Four ideas that look expensive and are not

These are the “cool” bets. Each is one screen or one button. Sources at the bottom.

1. **Work sample, not a quiz.** If the goal is “accounts → analytics,” do not ask “what is a JOIN.” Put six invoice rows on the card and ask *which customers overpaid.* Fail → teach INNER vs LEFT with *those* rows → a simpler table. (Apprenticeship: watch, correct, adapt — not content delivery.)
2. **Two models, two jobs.** One writes the teach card. A second grades the answer against a rubric and cannot see the first model’s praise. Career trainers split player and scorer so the coach cannot mark its own homework.
3. **One next step.** After the map, do not dump a catalog. Surface the single best next card. That is what a coach does.
4. **Cited memory, shown on screen.** Every line in the file ends with `[a:3]` (answer 3). Alchemyst stores it. In the demo, open the file and read it aloud: *“Weak on joins [a:3]. Excel pivots are fine [a:1]. Promised 20 minutes tonight [a:6].”* Judges and the sponsor both see it.

Voice is optional wow, not the spine. If the mic flakes, type.

---

## Generalized format (Raghav owns this — lock in 15 min)

```yaml
person: { name, role, goal }
stand:  [{ skill, level: 0-3, evidence: "a:3" }]
landed: [{ idea, explanation_that_worked, evidence: "a:5" }]
promised: [{ action, by, kept: false }]
plan:   [{ n, title, why_this_next }]
session:
  teach: { idea, example_from_their_job, 90s }
  probe: { type: work_sample|question, stem, rubric, next_if_fail, next_if_pass }
```

Three seed goals, generated live, not hardcoded courses:

- Accounts manager → analytics *(the example on the sheet)*
- Ops / logistics
- Close more deals

Same schema. Different probes. That is “all niches.”

---

## Demo (90 seconds, volunteer from the room)

1. Home is a blank file. Chip: *“I want to move from accounts into analytics.”*
2. Six cards. Room watches the map fill.
3. Plan appears. Session 1 teach + one work sample. Volunteer answers on stage.
4. File on the right now has stand / landed / promised. Point at Alchemyst: it remembered.
5. Hit **“it’s next week.”** Coach: *“You missed Tuesday. We drop session 3. Joins still don’t land. New drill.”*

Stop. Sit down. That *is* the brief.

Backup volunteer if the room is shy: one teammate, same script, same file.

---

## Five hours

| When | Who | Done means |
|---|---|---|
| 0:00–0:15 | Whole team | Schema locked. Demo script locked. Three seed goals locked. **Do not split before this.** |
| 0:15–3:30 | Tech | Next.js site. Grok (or whatever key is on the table) with structured JSON. Alchemyst add/search on `stand` / `landed` / `promised`. One-card UI. “Next week” button. |
| 0:15–3:30 | Raghav | Copy, three seed goals, probe stems + rubrics, teach-card voice, file layout, demo volunteer brief. |
| 3:30–4:15 | Together | Live generate for a *fourth* goal someone in the room shouts. Fix the ugly miss. |
| 4:15–4:45 | Together | Rehearse the 90-second script twice. Deploy. |

**If behind at 2:30:** kill voice, kill the fourth goal, kill pretty charts. Keep: diagnostic → map → session 1 → Alchemyst file → next week.

---

## Do not build

Auth. Scraping. A course library. A chatbot. Native app. Email/WhatsApp nudges. User-reported skill level. More than one full session.

---

## Look

Not ChatGPT. Not Duolingo. A **coaching file**: paper-white, ink, one red pencil for the weak skill. One card in the center, the file filling on the right. Sequential because coaching is sequential.

---

## Why this wins the room

The other tables will ship a chatbot that writes a syllabus. You ship the thing the sheet asked for: one real professional, one real goal, first session before they sit, and a file that still knows them next week.

---

## Sources (so you can defend a choice)

- Problem sheet, Statement 04 — Calcutta AI Club, 30 Aug 2026. *Verified: PDF.*
- Team notes (Granola) — keep UX, cut catalog. *Given.*
- Kernel: `docs/memory.md`, `docs/k1-walkthrough.md`, Surveyor/score. *Verified.*
- Voice tool README (Orchestrant): voice in, graph memory, website-only for this event. *Verified.*
- Grok Bot overview: named teammate, durable state. *Verified: docs.x.ai/grok-bot/overview.*
- Alchemyst: memory + user profiling + `groupName` arithmetic. *Verified: getalchemystai.com/docs.*
- 360Learning Coach Mode (Jul 2026): one next step, not a menu.
- Careertrainer.ai: one model plays, a second scores.
- SkillShift.ai: map the gap, then coach until it sticks.
- NIIT / “AI gave every worker an expert” (Jun 2026): watch, correct, adapt = apprenticeship.
- Devfolio on 5-hour hacks (Aug 2026): spend the day proving the *bold* part, not the catalog.

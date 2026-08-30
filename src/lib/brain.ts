import OpenAI from "openai";
import type { Card, Memory, Path, Session, Skill } from "./schema";

export type CompileResult = {
  path: Path;
  why?: string;
  skills: Skill[];
  firstCard: Card;
  provider: string;
};

export type TurnResult = {
  correct?: boolean;
  feedback?: string;
  nextCards: Card[];
  memoryAdds: Partial<Memory>;
  provider: string;
};

export type SkipResult = {
  skillId: string;
  card: Card;
  memoryAdds: Partial<Memory>;
  provider: string;
};

function openaiClient(): { client: OpenAI; model: string; provider: string } | null {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    return { client: new OpenAI({ apiKey: key }), model: "gpt-4o-mini", provider: "openai:gpt-4o-mini" };
  }
  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      client: new OpenAI({ apiKey: xai, baseURL: "https://api.x.ai/v1" }),
      model: "grok-4-fast",
      provider: "xai:grok-4-fast",
    };
  }
  return null;
}

function extractJson(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

async function ask(system: string, user: string, timeoutMs = 20000): Promise<{ json: unknown; provider: string }> {
  const cfg = openaiClient();
  if (!cfg) throw new Error("No OPENAI_API_KEY or XAI_API_KEY");
  const completion = await cfg.client.chat.completions.create(
    {
      model: cfg.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    { timeout: timeoutMs },
  );
  const text = completion.choices[0]?.message?.content || "";
  return { json: extractJson(text), provider: cfg.provider };
}

const COMPILE_SYS = `You compile any typed goal into a coaching session. JSON only.
Rules:
- path is "college" for a course/academic skill, "life" for a how-to (change a tire, cook, fix).
- skills: exactly 6 short labels for this goal. Do not set state. They start empty.
- firstCard is always kind "background", phase "diagnostic", prompt exactly "What last confused you about this?"
- Do not write a syllabus. Do not chat.
Return: { "path": "college"|"life", "why": string, "skills": [{"id":"s1","label":"..."} x6], "firstCard": { "kind":"background", "prompt":"What last confused you about this?", "phase":"diagnostic", "skillId":"s1" } }`;

const TURN_SYS = `You are the brain of a sequential coach. JSON only. One next beat, not a catalog.
The code, not you, sets skill live/rust. You may hint.
After a diagnostic answer:
- Mix: if the background is still vague, next is kind "chips" with 3 choices. Else a real "problem".
- At most 3 background/chips total. Stop early once you can write a real problem.
- Opening diagnostic cap is 6 cards (typical 1 background + 3 problems), then a teach card.
College path: after diagnostic, one "teach" with exactly 3 steps {title, body, speak}, then 2 "problem" cards with phase "check" and choices.
Life path: after diagnostic, one "teach" how-to with 3 steps, then one "confirm" phase "check" — a real knowledge question, NOT "did you do it".
Miss (correct false) and this card is not already a retry: nextCards = [reteach teach, one easier retry with retryOf set to the missed card id]. Then move. No infinite loop.
Pass on a check/confirm: you may add a short landed memory line.
Return: { "correct": boolean|null, "feedback": string, "nextCards": Card[], "memoryAdds": { "stand": string[], "landed": string[], "promised": string[] } }
Card fields: id?, kind, prompt, skillId?, choices?, steps?, retryOf?, phase, expected (the correct choice text if choices exist).
Unknown future kinds are allowed but keep to the kinds above for MVP.`;

const SKIP_SYS = `JSON only. Pick one live skill (state live). Write one refresher problem with choices for that skill, as if two days passed.
Return: { "skillId": "...", "card": { "kind":"refresher", "phase":"refresher", "prompt":"...", "choices":[...], "expected":"...", "skillId":"..." }, "memoryAdds": { "stand": string[], "promised": string[] } }`;

function asSkills(raw: unknown): Skill[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const row = item as { id?: string; label?: string };
    return {
      id: row.id || `s${i + 1}`,
      label: String(row.label || `Skill ${i + 1}`),
      state: "empty",
      evidence: [],
    };
  });
}

function asCard(raw: unknown): Card | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Card;
  if (!row.kind || !row.prompt) return null;
  return {
    id: row.id,
    kind: String(row.kind),
    prompt: String(row.prompt),
    skillId: row.skillId,
    choices: Array.isArray(row.choices) ? row.choices.map(String) : undefined,
    steps: Array.isArray(row.steps)
      ? row.steps.map((step) => ({
          title: String(step.title || ""),
          body: String(step.body || ""),
          speak: String(step.speak || `${step.title || ""}. ${step.body || ""}`),
        }))
      : undefined,
    retryOf: row.retryOf,
    phase: row.phase,
    expected: row.expected,
  };
}

function asCards(raw: unknown): Card[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(asCard).filter((card): card is Card => Boolean(card));
}

export async function brainCompile(goal: string): Promise<CompileResult> {
  const { json, provider } = await ask(COMPILE_SYS, `Goal: ${goal}`);
  const row = json as {
    path?: string;
    why?: string;
    skills?: unknown;
    firstCard?: unknown;
  };
  const path: Path = row.path === "life" ? "life" : "college";
  const first = asCard(row.firstCard) || {
    kind: "background",
    prompt: "What last confused you about this?",
    phase: "diagnostic",
    skillId: "s1",
    id: "c1",
  };
  first.kind = "background";
  first.phase = "diagnostic";
  first.prompt = "What last confused you about this?";
  return {
    path,
    why: row.why,
    skills: asSkills(row.skills),
    firstCard: first,
    provider,
  };
}

export async function brainTurn(session: Session, answered: Card): Promise<TurnResult> {
  const slim = {
    goal: session.goal,
    path: session.path,
    version: session.version,
    skills: session.skills,
    memory: session.memory,
    diagnosticCount: session.cards.filter((c) => c.phase !== "teach" && c.phase !== "check" && c.phase !== "refresher").length,
    answeredCard: answered,
    recent: session.cards.slice(-8).map((c) => ({
      id: c.id,
      kind: c.kind,
      phase: c.phase,
      prompt: c.prompt,
      answer: c.answer,
      correct: c.correct,
      retryOf: c.retryOf,
      skillId: c.skillId,
    })),
  };
  const { json, provider } = await ask(TURN_SYS, JSON.stringify(slim));
  const row = json as {
    correct?: boolean | null;
    feedback?: string;
    nextCards?: unknown;
    memoryAdds?: Partial<Memory>;
  };
  return {
    correct: typeof row.correct === "boolean" ? row.correct : undefined,
    feedback: row.feedback,
    nextCards: asCards(row.nextCards),
    memoryAdds: row.memoryAdds || {},
    provider,
  };
}

export async function brainSkip(session: Session): Promise<SkipResult> {
  const slim = {
    goal: session.goal,
    path: session.path,
    skills: session.skills,
    memory: session.memory,
  };
  const { json, provider } = await ask(SKIP_SYS, JSON.stringify(slim));
  const row = json as { skillId?: string; card?: unknown; memoryAdds?: Partial<Memory> };
  const card = asCard(row.card);
  if (!card) throw new Error("Skip model returned no card");
  card.kind = "refresher";
  card.phase = "refresher";
  const skillId = row.skillId || card.skillId || session.skills.find((s) => s.state === "live")?.id || "s1";
  card.skillId = skillId;
  return {
    skillId,
    card,
    memoryAdds: row.memoryAdds || {},
    provider,
  };
}

export function brainConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY);
}

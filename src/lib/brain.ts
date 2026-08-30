import OpenAI from "openai";
import type { Card, ContentBlock, Memory, Path, Session, Skill, Source } from "./schema";

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
- path is always "college" — every goal is a course/academic skill.
- skills: exactly 6 short labels for this goal. Do not set state. They start empty.
- firstCard is always kind "background", phase "diagnostic", prompt exactly "What last confused you about this?"
- Do not write a syllabus. Do not chat.
Return: { "path": "college", "why": string, "skills": [{"id":"s1","label":"..."} x6], "firstCard": { "kind":"background", "prompt":"What last confused you about this?", "phase":"diagnostic", "skillId":"s1" } }`;

const TURN_SYS = `You are the brain of a sequential coach. JSON only. One next beat.
The code, not you, sets skill live/rust. You may hint.
If the session already has a sourced module (moduleId set), do NOT invent a new lesson. After diagnostic, nextCards may be empty — code will attach the sourced training then teaching cards.
After a diagnostic answer:
- Mix: if the background is still vague, next is kind "chips" with 3 choices. Else a real "problem".
- At most 3 background/chips total. Stop early once you can write a real problem.
- Opening diagnostic cap is 6 cards, then training, then teaching.
Without a sourced module: after diagnostic, one "training" card (~1 min) that teaches the listening stance for this subject (what to hold while the lesson runs). Never mention the UI, grey text, transcripts, karaoke, or an ask box. Then one "teach" with blocks (concept, definition, example, analogy, heading) plus a spoken script capped at ~5 minutes, then 2 multiple-choice "problem" checks and 1 subjective open check (subjective true, rubric, expected).
Cite sources on college teach cards when you know them: sources: [{id, title, url, attribution, license}].
Miss (correct false) and this card is not already a retry: nextCards = [reteach teach, one easier retry with retryOf set to the missed card id]. Then move. No infinite loop.
For subjective answers, set correct from the rubric. Be strict but not pedantic.
Pass on a check/confirm: you may add a short landed memory line.
Return: { "correct": boolean|null, "feedback": string, "nextCards": Card[], "memoryAdds": { "stand": string[], "landed": string[], "promised": string[] } }
Card fields: id?, kind, prompt, skillId?, choices?, steps?, blocks?, script?, sources?, subjective?, rubric?, retryOf?, phase, expected.`;

export const EXPLAIN_SYS = `You elaborate one college teaching beat. JSON only.
Stay inside the current card. Use the cited sources. Short. Structured headings, no text dump.
Do not mention the app UI, grey text, or how the product works.
If you do not know, say so and point at a source URL.
Return: { "heading": string, "body": string, "kind": "definition"|"example"|"analogy", "sourceId": string|null }`;

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

function asSources(raw: unknown): Source[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const sources: Source[] = [];
  for (const item of raw) {
    const row = item as Partial<Source>;
    if (!row.title && !row.url) continue;
    const source: Source = {
      id: String(row.id || row.url || row.title),
      title: String(row.title || row.url || "Source"),
      url: String(row.url || ""),
      attribution: String(row.attribution || row.title || ""),
    };
    if (row.license) source.license = String(row.license);
    sources.push(source);
  }
  return sources.length ? sources : undefined;
}

function asBlocks(raw: unknown): ContentBlock[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks: ContentBlock[] = [];
  for (const [i, item] of raw.entries()) {
    const row = item as Partial<ContentBlock>;
    if (!row.kind || !row.body) continue;
    const block: ContentBlock = {
      id: String(row.id || `b${i + 1}`),
      kind: row.kind,
      body: String(row.body),
    };
    if (row.heading) block.heading = String(row.heading);
    if (row.sourceId) block.sourceId = String(row.sourceId);
    blocks.push(block);
  }
  return blocks.length ? blocks : undefined;
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
      ? row.steps
          .map((step) => ({
            title: String(step.title || ""),
            body: String(step.body || ""),
            speak: String(step.speak || `${step.title || ""}. ${step.body || ""}`),
          }))
          .filter((step) => step.title.trim() || step.body.trim())
      : undefined,
    blocks: asBlocks(row.blocks),
    script: row.script ? String(row.script) : undefined,
    sources: asSources(row.sources),
    subjective: row.subjective ? true : undefined,
    rubric: row.rubric ? String(row.rubric) : undefined,
    minutes: typeof row.minutes === "number" ? row.minutes : undefined,
    moduleId: row.moduleId,
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
    why?: string;
    skills?: unknown;
    firstCard?: unknown;
  };
  const path: Path = "college";
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
    moduleId: session.moduleId,
    moduleTitle: session.moduleTitle,
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

export type ExplainResult = {
  heading: string;
  body: string;
  kind: string;
  sourceId?: string;
  provider: string;
};

export async function brainExplain(input: {
  goal: string;
  card: Card;
  question: string;
  blockId?: string;
}): Promise<ExplainResult> {
  const block = input.card.blocks?.find((item) => item.id === input.blockId);
  const { json, provider } = await ask(
    EXPLAIN_SYS,
    JSON.stringify({
      goal: input.goal,
      question: input.question,
      prompt: input.card.prompt,
      block,
      blocks: input.card.blocks,
      sources: input.card.sources,
    }),
  );
  const row = json as { heading?: string; body?: string; kind?: string; sourceId?: string | null };
  return {
    heading: String(row.heading || "A closer look"),
    body: String(row.body || "I cannot add more without leaving the sources on this card."),
    kind: String(row.kind || "definition"),
    sourceId: row.sourceId ? String(row.sourceId) : undefined,
    provider,
  };
}

export function brainConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.XAI_API_KEY);
}

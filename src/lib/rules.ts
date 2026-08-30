import type { Card, Session, Skill, SkillState } from "./schema";

export const MAX_SKILLS = 6;
export const MAX_BACKGROUND = 3;
export const MAX_DIAGNOSTIC = 6;

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isLesson(card: Card): boolean {
  return card.kind === "training" || card.kind === "teach" || card.phase === "training" || card.phase === "teach";
}

export function isDiagnostic(card: Card): boolean {
  if (isLesson(card) || card.phase === "check" || card.phase === "refresher") {
    return false;
  }
  return card.kind === "background" || card.kind === "chips" || card.kind === "problem";
}

export function backgroundCount(session: Session): number {
  return session.cards.filter((card) => card.kind === "background" || card.kind === "chips").length;
}

export function diagnosticOpenerCount(session: Session): number {
  return session.cards.filter((card) => isDiagnostic(card) && !card.retryOf).length;
}

export function answeredProblems(session: Session): number {
  return session.cards.filter(
    (card) => card.kind === "problem" && card.phase !== "check" && card.answer !== undefined && !card.retryOf,
  ).length;
}

export function hasTraining(session: Session): boolean {
  return session.cards.some(
    (card) => (card.kind === "training" || card.phase === "training") && !card.retryOf,
  );
}

export function hasTeach(session: Session): boolean {
  return session.cards.some((card) => card.kind === "teach" && card.phase === "teach" && !card.retryOf);
}

export function checkCount(session: Session): number {
  return session.cards.filter(
    (card) => (card.kind === "confirm" || card.phase === "check") && !card.retryOf,
  ).length;
}

export function checksDone(session: Session): boolean {
  const answered = session.cards.filter(
    (card) =>
      (card.kind === "confirm" || card.phase === "check") &&
      !card.retryOf &&
      card.answer !== undefined,
  );
  return answered.length >= 3;
}

export function shouldStopBackground(session: Session, lastAnswer: string): boolean {
  const count = backgroundCount(session);
  if (count >= MAX_BACKGROUND) return true;
  if (count >= 1 && lastAnswer.trim().length >= 40) return true;
  return false;
}

export function shouldEndDiagnostic(session: Session): boolean {
  if (hasTraining(session) || hasTeach(session)) return true;
  if (diagnosticOpenerCount(session) >= MAX_DIAGNOSTIC) return true;
  if (answeredProblems(session) >= 2 && backgroundCount(session) >= 1) return true;
  return false;
}

function usefulLabel(label: string | undefined, fallback: string): string {
  const text = label?.trim() || "";
  if (!text || /^skill\s*\d+$/i.test(text)) return fallback;
  return text;
}

export function padSkills(skills: Skill[]): Skill[] {
  const fillers = ["Baseline", "Core", "Example", "Common miss", "Do it", "Keep it"];
  const next = skills.slice(0, MAX_SKILLS).map((skill, i) => ({
    id: skill.id || `s${i + 1}`,
    label: usefulLabel(skill.label, fillers[i]),
    state: "empty" as SkillState,
    evidence: [],
  }));
  while (next.length < MAX_SKILLS) {
    const i = next.length;
    next.push({
      id: `s${i + 1}`,
      label: fillers[i],
      state: "empty",
      evidence: [],
    });
  }
  return next;
}

export function gradeAnswer(card: Card, answer: string): boolean | undefined {
  if (card.kind === "background" || card.kind === "chips" || isLesson(card)) {
    return undefined;
  }
  if (card.subjective) {
    if (!card.expected) return undefined;
    const got = normalize(answer);
    const keys = normalize(card.expected)
      .split(" ")
      .filter((word) => word.length > 4);
    const hits = keys.filter((word) => got.includes(word)).length;
    if (got.length < 24) return false;
    return hits >= Math.min(2, Math.max(1, keys.length - 2));
  }
  if (card.expected) {
    const got = normalize(answer);
    const want = normalize(card.expected);
    return got === want || got.includes(want) || want.includes(got);
  }
  if (card.choices?.length) {
    return false;
  }
  return undefined;
}

export function applySkillStates(session: Session): void {
  for (const skill of session.skills) {
    const related = session.cards.filter((card) => card.skillId === skill.id);
    const refreshers = related.filter(
      (card) => card.kind === "refresher" && card.answer !== undefined,
    );
    const lastRefresher = refreshers.at(-1);
    const passed = related.filter(
      (card) =>
        card.correct === true &&
        (card.kind === "confirm" || card.kind === "refresher" || card.phase === "check"),
    );
    skill.evidence = passed
      .map((card) => (card.answerEventId ? `[a:${card.answerEventId}]` : ""))
      .filter(Boolean);
    if (lastRefresher) {
      skill.state = lastRefresher.correct ? "live" : "rust";
    } else if (passed.length) {
      skill.state = "live";
    } else {
      skill.state = "empty";
    }
  }
}

export function liveSkills(session: Session): Skill[] {
  return session.skills.filter((skill) => skill.state === "live");
}

export function withIds(session: Session, cards: Card[]): Card[] {
  return cards.map((card, i) => ({
    ...card,
    id: card.id && !session.cards.some((existing) => existing.id === card.id)
      ? card.id
      : `c${session.cards.length + i + 1}`,
  }));
}

export function clampIncoming(session: Session, incoming: Card[], lastAnswer: string): Card[] {
  const accepted: Card[] = [];
  const pretend = (): Session => ({
    ...session,
    cards: [...session.cards, ...accepted],
  });

  for (const raw of incoming) {
    const card: Card = { ...raw };
    const kind = card.kind || "problem";
    card.kind = kind;

    if ((kind === "background" || kind === "chips") && shouldStopBackground(pretend(), lastAnswer)) {
      continue;
    }
    if (isDiagnostic(card) && !card.retryOf && shouldEndDiagnostic(pretend()) && kind !== "teach") {
      continue;
    }
    if ((kind === "training" || card.phase === "training") && hasTraining(pretend()) && !card.retryOf) {
      continue;
    }
    if (kind === "teach" && !hasTraining(pretend()) && !card.retryOf) {
      continue;
    }
    if (kind === "teach" && card.phase === "teach" && hasTeach(pretend()) && !card.retryOf) {
      continue;
    }
    const maxChecks = 3;
    if (
      (kind === "confirm" || card.phase === "check") &&
      !card.retryOf &&
      checkCount(pretend()) >= maxChecks
    ) {
      continue;
    }
    if (checksDone(pretend()) && kind !== "refresher") {
      continue;
    }
    accepted.push(card);
  }
  return withIds(session, accepted);
}

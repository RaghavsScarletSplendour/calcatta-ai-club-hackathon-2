import type { Card, Path, Session } from "./schema";
import { pushReceipts } from "./alchemyst";
import { brainCompile, brainSkip, brainTurn } from "./brain";
import {
  fallbackAfterAnswer,
  fallbackCompile,
  fallbackOverrideTeach,
  fallbackSkip,
  rehearsalKind,
} from "./fallback";
import { addMemory } from "./memory";
import {
  applySkillStates,
  checksDone,
  clampIncoming,
  gradeAnswer,
  hasTeach,
  liveSkills,
  padSkills,
  shouldEndDiagnostic,
  withIds,
} from "./rules";
import { bump, cloneSession, currentCard, newSession, pushEvent } from "./session";

function recordAnswer(session: Session, card: Card, answer: string, didIt?: boolean): number {
  card.answer = answer;
  if (didIt) card.didIt = true;
  const event = pushEvent(session, "answer", { answer, didIt }, card.id);
  card.answerEventId = event.id;
  return event.id;
}

function attachNext(session: Session, incoming: Card[], lastAnswer: string): void {
  const clamped = clampIncoming(session, incoming, lastAnswer);
  session.cards.push(...clamped);
}

function ensureTeach(session: Session): void {
  if (hasTeach(session)) return;
  if (!shouldEndDiagnostic(session) && currentCard(session)) return;
  if (currentCard(session)) return;
  session.cards.push(...withIds(session, fallbackOverrideTeach(session)));
}

function ensureChecks(session: Session, justAnswered: Card): void {
  if (justAnswered.kind !== "teach" || justAnswered.phase !== "teach") return;
  if (checksDone(session)) return;
  const openCheck = session.cards.some(
    (card) => (card.phase === "check" || card.kind === "confirm") && card.answer === undefined,
  );
  if (openCheck) return;
  const fb = fallbackAfterAnswer(session, justAnswered);
  attachNext(session, fb.nextCards, justAnswered.answer || "");
}

function pruneFinished(session: Session): void {
  if (!checksDone(session)) return;
  session.cards = session.cards.filter(
    (card) => card.answer !== undefined || card.kind === "refresher",
  );
}

function applyGrade(card: Card, answer: string, modelCorrect?: boolean): void {
  const local = gradeAnswer(card, answer);
  if (card.kind === "background" || card.kind === "chips" || card.kind === "teach") {
    card.correct = undefined;
    return;
  }
  if (typeof local === "boolean") {
    card.correct = local;
    return;
  }
  if (typeof modelCorrect === "boolean") {
    card.correct = modelCorrect;
    return;
  }
  card.correct = undefined;
}

async function remember(session: Session): Promise<void> {
  const stored = await pushReceipts(session);
  session.receipts = {
    alchemyst: stored,
    note: stored ? "stored" : process.env.ALCHEMYST_AI_API_KEY ? "alchemyst failed" : "local file",
  };
}

export async function compileGoal(goal: string): Promise<Session> {
  const trimmed = goal.trim();
  if (!trimmed) throw new Error("Type a goal first.");

  try {
    const compiled = await brainCompile(trimmed);
    const canned = rehearsalKind(trimmed) ? fallbackCompile(trimmed).skills : compiled.skills;
    const session = newSession({
      goal: trimmed,
      path: compiled.path,
      skills: padSkills(canned),
      first: compiled.firstCard,
      brain: compiled.provider,
    });
    await remember(session);
    return session;
  } catch {
    const compiled = fallbackCompile(trimmed);
    const session = newSession({
      goal: trimmed,
      path: compiled.path,
      skills: padSkills(compiled.skills),
      first: compiled.first,
      brain: compiled.brain,
    });
    await remember(session);
    return session;
  }
}

export async function applyAnswer(
  sessionIn: Session,
  answer: string,
  extra?: { didIt?: boolean },
): Promise<Session> {
  const session = cloneSession(sessionIn);
  const card = currentCard(session);
  if (!card) throw new Error("No open card.");
  const text = answer.trim();
  if (!text) throw new Error("Type an answer, or pick a choice.");

  const eventId = recordAnswer(session, card, text, extra?.didIt);

  let modelCorrect: boolean | undefined;
  let nextCards: Card[] = [];
  let memoryAdds = {};
  let usedBrain = false;

  try {
    const turned = await brainTurn(session, card);
    usedBrain = true;
    modelCorrect = turned.correct;
    nextCards = turned.nextCards;
    memoryAdds = turned.memoryAdds;
    session.brain = turned.provider;
  } catch {
    usedBrain = false;
  }

  applyGrade(card, text, modelCorrect);

  if (usedBrain) {
    addMemory(session, memoryAdds, eventId);
  } else {
    const fb = fallbackAfterAnswer(session, card);
    nextCards = fb.nextCards;
    addMemory(session, fb.memoryAdds, eventId);
  }

  if (card.kind === "background" && text) {
    addMemory(session, { stand: [`Background: ${text.slice(0, 140)}`] }, eventId);
  }

  if (extra?.didIt) {
    addMemory(session, { promised: ["Said they did the steps"] }, eventId);
  }

  if (card.kind === "refresher") {
    nextCards = [];
  } else if (card.correct === false && !card.retryOf) {
    const hasRetry = nextCards.some((c) => c.retryOf === card.id);
    if (!hasRetry) {
      nextCards = fallbackAfterAnswer(session, card).nextCards;
    }
  }

  if (card.correct === false && card.retryOf) {
    nextCards = nextCards.filter((c) => c.kind !== "teach" && !c.retryOf);
  }

  attachNext(session, nextCards, text);
  ensureTeach(session);
  ensureChecks(session, card);
  pruneFinished(session);
  applySkillStates(session);
  bump(session);
  await remember(session);
  return session;
}

export async function applySkip(sessionIn: Session): Promise<Session> {
  const session = cloneSession(sessionIn);
  pruneFinished(session);
  if (!liveSkills(session).length) {
    throw new Error("A slot has to go live before you can skip two days.");
  }
  if (currentCard(session)) {
    throw new Error("Finish the open card first.");
  }

  let nextCards: Card[] = [];
  let memoryAdds = {};
  try {
    const skipped = await brainSkip(session);
    nextCards = [skipped.card];
    memoryAdds = skipped.memoryAdds;
  } catch {
    const fb = fallbackSkip(session);
    nextCards = fb.nextCards;
    memoryAdds = fb.memoryAdds;
  }

  const event = pushEvent(session, "skip", { skills: liveSkills(session).map((s) => s.id) });
  addMemory(session, memoryAdds, event.id);
  if (!session.memory.promised.some((line) => line.includes(`[a:${event.id}]`))) {
    addMemory(session, { promised: ["Come back in two days on a live skill"] }, event.id);
  }
  attachNext(session, nextCards, "");
  applySkillStates(session);
  bump(session);
  await remember(session);
  return session;
}

export async function applyOverride(sessionIn: Session, path: Path): Promise<Session> {
  const session = cloneSession(sessionIn);
  if (session.path === path) return session;
  session.path = path;
  session.cards = session.cards.filter((card) => {
    if (card.answer !== undefined) return true;
    if (card.kind === "teach" || card.kind === "confirm" || card.kind === "refresher") return false;
    if (card.phase === "teach" || card.phase === "check" || card.phase === "refresher") return false;
    return true;
  });
  const event = pushEvent(session, "override", { path });
  addMemory(session, { stand: [`Path set to ${path === "college" ? "college" : "do it now"}`] }, event.id);
  if (!currentCard(session)) {
    let nextCards: Card[] = [];
    try {
      const fake: Card = {
        id: "override",
        kind: "background",
        prompt: "path override",
        answer: path,
        phase: "diagnostic",
      };
      const turned = await brainTurn(session, fake);
      nextCards = turned.nextCards.filter((c) => c.kind === "teach" || c.kind === "confirm" || c.phase === "check");
    } catch {
      nextCards = [];
    }
    if (!nextCards.length) nextCards = fallbackOverrideTeach(session);
    attachNext(session, nextCards, "");
  }
  applySkillStates(session);
  bump(session);
  await remember(session);
  return session;
}

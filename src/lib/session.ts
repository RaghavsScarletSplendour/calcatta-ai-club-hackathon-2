import type { Card, Event, Path, Session, Skill } from "./schema";

export const FIRST_BACKGROUND =
  "What last confused you about this?";

export function currentCard(session: Session): Card | undefined {
  return session.cards.find((card) => card.answer === undefined);
}

export function nextEventId(session: Session): number {
  return session.events.reduce((max, event) => Math.max(max, event.id), 0) + 1;
}

export function nextCardId(session: Session): string {
  const nums = session.cards
    .map((card) => Number(String(card.id).replace(/^c/, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `c${max + 1}`;
}

export function pushEvent(
  session: Session,
  kind: string,
  payload?: unknown,
  cardId?: string,
): Event {
  const event: Event = {
    id: nextEventId(session),
    t: new Date().toISOString(),
    kind,
    cardId,
    payload,
  };
  session.events.push(event);
  return event;
}

export function newSession(input: {
  goal: string;
  path: Path;
  skills: Skill[];
  first: Card;
  brain?: string;
  moduleId?: string;
  moduleTitle?: string;
}): Session {
  const first: Card = {
    ...input.first,
    id: input.first.id || "c1",
    kind: "background",
    prompt: FIRST_BACKGROUND,
    phase: "diagnostic",
  };
  const session: Session = {
    id: crypto.randomUUID(),
    version: 1,
    goal: input.goal.trim(),
    path: input.path,
    skills: input.skills.slice(0, 6),
    cards: [first],
    events: [],
    memory: { stand: [], landed: [], promised: [] },
    brain: input.brain,
    moduleId: input.moduleId,
    moduleTitle: input.moduleTitle,
  };
  pushEvent(session, "compile", {
    goal: session.goal,
    path: session.path,
    brain: input.brain,
    moduleId: input.moduleId,
  });
  return session;
}

export function cloneSession(session: Session): Session {
  return structuredClone(session);
}

export function bump(session: Session): Session {
  session.version += 1;
  return session;
}

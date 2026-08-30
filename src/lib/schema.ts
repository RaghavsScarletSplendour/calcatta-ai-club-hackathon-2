export type Path = "college" | "life";
export type SkillState = "empty" | "live" | "rust";

export type Skill = {
  id: string;
  label: string;
  state: SkillState;
  evidence: string[];
};

export type Step = {
  title: string;
  body: string;
  speak: string;
};

export type Card = {
  id: string;
  kind: string;
  prompt: string;
  skillId?: string;
  choices?: string[];
  steps?: Step[];
  answer?: string;
  correct?: boolean;
  retryOf?: string;
  phase?: "diagnostic" | "teach" | "check" | "refresher";
  didIt?: boolean;
  expected?: string;
  answerEventId?: number;
};

export type Event = {
  id: number;
  t: string;
  kind: string;
  cardId?: string;
  payload?: unknown;
};

export type Memory = {
  stand: string[];
  landed: string[];
  promised: string[];
};

export type Session = {
  id: string;
  version: number;
  goal: string;
  path: Path;
  skills: Skill[];
  cards: Card[];
  events: Event[];
  memory: Memory;
  brain?: string;
  receipts?: { alchemyst?: boolean; note?: string };
};

export type Path = "college";
export type SkillState = "empty" | "live" | "rust";
export type CardPhase =
  | "diagnostic"
  | "training"
  | "teach"
  | "check"
  | "refresher"
  | "confidence"
  | "recognition"
  | "application"
  | "generation"
  | "reveal";
export type BlockKind = "heading" | "concept" | "definition" | "example" | "analogy";
export type AssessKind = "full" | "quick";

export type AssessOption = {
  text: string;
  isCorrect: boolean;
  misconceptionTag?: string;
  explanation: string;
};

export type Subscores = {
  core_accuracy: number;
  own_words: number;
  concreteness: number;
};

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

export type Source = {
  id: string;
  title: string;
  url: string;
  attribution: string;
  license?: string;
};

export type ContentBlock = {
  id: string;
  kind: BlockKind;
  heading?: string;
  body: string;
  sourceId?: string;
};

export type WordCue = {
  text: string;
  start: number;
  end: number;
};

export type Card = {
  id: string;
  kind: string;
  prompt: string;
  skillId?: string;
  choices?: string[];
  steps?: Step[];
  blocks?: ContentBlock[];
  script?: string;
  sources?: Source[];
  minutes?: number;
  moduleId?: string;
  subjective?: boolean;
  rubric?: string;
  answer?: string;
  correct?: boolean;
  retryOf?: string;
  phase?: CardPhase;
  expected?: string;
  answerEventId?: number;
  feedback?: string;
  options?: AssessOption[];
  correctionNote?: string;
  assessKind?: AssessKind;
  confidence?: number;
  rubricCriteria?: string[];
  coreIdea?: string;
  subscores?: Subscores;
  compositeScore?: number;
  calibrationMessage?: string;
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
  moduleId?: string;
  moduleTitle?: string;
};

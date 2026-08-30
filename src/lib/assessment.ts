import { brainScoreGeneration } from "./brain";
import { getModule, matchModule, moduleAssessment } from "./catalog";
import type {
  AssessKind,
  AssessOption,
  Card,
  Session,
  Subscores,
} from "./schema";
import { nextCardId } from "./session";

const CREATIVE_WORDS = [
  "story",
  "storytelling",
  "narrative",
  "writing",
  "write",
  "speech",
  "speaking",
  "presentation",
  "pitch",
  "persuasion",
  "negotiation",
  "design",
  "art",
  "music",
  "poetry",
  "perform",
  "communication",
  "empathy",
  "creativity",
  "brainstorm",
];

function catalogFor(session: Session) {
  return getModule(session.moduleId) || matchModule(session.goal);
}

export function assessKindFor(session: Session, skillLabel: string): AssessKind {
  const mod = catalogFor(session);
  if (mod) return "full";
  const text = `${session.goal} ${skillLabel}`.toLowerCase();
  return CREATIVE_WORDS.some((word) => text.includes(word)) ? "quick" : "full";
}

export function confidenceCard(session: Session, skillId: string, skillLabel: string): Card {
  return {
    id: nextCardId(session),
    kind: "confidence",
    phase: "confidence",
    skillId,
    prompt: `Before we teach it — how confident do you feel about "${skillLabel}"? (1 = not at all, 5 = very confident)`,
    choices: ["1", "2", "3", "4", "5"],
  };
}

function genericRecognition(session: Session, skillId: string): Card {
  const goal = session.goal;
  return {
    id: nextCardId(session),
    kind: "recognition",
    phase: "recognition",
    skillId,
    prompt: `What is the core move for: ${goal}?`,
    choices: [
      "Name the outcome you want, then take the first real step toward it",
      "Read everything about it before trying anything",
      "Wait until you feel fully ready before starting",
    ],
    expected: "Name the outcome you want, then take the first real step toward it",
    options: [
      {
        text: "Name the outcome you want, then take the first real step toward it",
        isCorrect: true,
        explanation: "Right — naming the outcome and taking a real, testable step is what actually builds the skill.",
      },
      {
        text: "Read everything about it before trying anything",
        isCorrect: false,
        misconceptionTag: "reading_first",
        explanation: "Reading alone doesn't build the skill. A real, testable step teaches you faster than more reading does.",
      },
      {
        text: "Wait until you feel fully ready before starting",
        isCorrect: false,
        misconceptionTag: "perfection_first",
        explanation: "Waiting for full readiness usually just delays the first real step — that step is where the learning actually starts.",
      },
    ],
  };
}

function genericApplication(session: Session, skillId: string): Card {
  const goal = session.goal;
  return {
    id: nextCardId(session),
    kind: "application",
    phase: "application",
    skillId,
    prompt: `You've just started on "${goal}" and hit your first real mistake. What's the best next move?`,
    choices: [
      "Look at exactly what went wrong, fix that one thing, then try again",
      "Start over completely from the beginning",
      "Move on and hope it goes better next time",
    ],
    expected: "Look at exactly what went wrong, fix that one thing, then try again",
    options: [
      {
        text: "Look at exactly what went wrong, fix that one thing, then try again",
        isCorrect: true,
        explanation: "Right — a targeted fix on the actual miss is faster than a restart or a hope-based retry.",
      },
      {
        text: "Start over completely from the beginning",
        isCorrect: false,
        explanation: "A full restart throws away the parts you already had right, not just the mistake.",
      },
      {
        text: "Move on and hope it goes better next time",
        isCorrect: false,
        explanation: "Without looking at what went wrong, the same mistake is likely to repeat.",
      },
    ],
  };
}

function genericGeneration(session: Session, skillId: string): Card {
  const goal = session.goal;
  return {
    id: nextCardId(session),
    kind: "generation",
    phase: "generation",
    skillId,
    prompt: `Explain to a 12-year-old what "${goal}" is about, using your own example.`,
    rubricCriteria: ["core_accuracy", "own_words", "concreteness"],
    coreIdea: `The core idea behind ${goal}, explained correctly in your own words with a concrete example.`,
  };
}

function optionsToChoicesAndExpected(options: AssessOption[]): { choices: string[]; expected: string } {
  const choices = options.map((o) => o.text);
  const expected = options.find((o) => o.isCorrect)?.text || choices[0];
  return { choices, expected };
}

export function recognitionCard(session: Session, skillId: string): Card {
  const mod = catalogFor(session);
  const spec = mod ? moduleAssessment(mod, skillId)?.recognition : undefined;
  if (!spec) return genericRecognition(session, skillId);
  const { choices, expected } = optionsToChoicesAndExpected(spec.options);
  return {
    id: nextCardId(session),
    kind: "recognition",
    phase: "recognition",
    skillId,
    moduleId: mod?.id,
    prompt: spec.prompt,
    choices,
    expected,
    options: spec.options,
  };
}

export function retryRecognitionCard(session: Session, missed: Card): Card {
  const mod = catalogFor(session);
  const spec = missed.skillId && mod ? moduleAssessment(mod, missed.skillId)?.recognition : undefined;
  const pickedTag = spec?.options.find((o) => o.text === missed.answer)?.misconceptionTag;
  const correction = pickedTag ? spec?.microCorrections[pickedTag] : undefined;
  return {
    id: nextCardId(session),
    kind: "recognition",
    phase: "recognition",
    skillId: missed.skillId,
    moduleId: missed.moduleId,
    retryOf: missed.id,
    prompt: missed.prompt + " — one more try, simpler read.",
    choices: missed.choices,
    expected: missed.expected,
    options: missed.options,
    correctionNote: correction || "Look again at the option that matches the definition most exactly, not the one that sounds closest.",
  };
}

export function applicationCard(session: Session, skillId: string): Card {
  const mod = catalogFor(session);
  const spec = mod ? moduleAssessment(mod, skillId)?.application : undefined;
  if (!spec) return genericApplication(session, skillId);
  const { choices, expected } = optionsToChoicesAndExpected(spec.options);
  return {
    id: nextCardId(session),
    kind: "application",
    phase: "application",
    skillId,
    moduleId: mod?.id,
    prompt: spec.prompt,
    choices,
    expected,
    options: spec.options,
  };
}

export function generationCard(session: Session, skillId: string): Card {
  const mod = catalogFor(session);
  const spec = mod ? moduleAssessment(mod, skillId)?.generation : undefined;
  if (!spec) return genericGeneration(session, skillId);
  return {
    id: nextCardId(session),
    kind: "generation",
    phase: "generation",
    skillId,
    moduleId: mod?.id,
    prompt: spec.prompt,
    rubricCriteria: spec.rubricCriteria,
    coreIdea: spec.coreIdea,
  };
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

export function scoreGenerationOffline(answer: string, coreIdea: string): { subscores: Subscores; feedbackSentence: string } {
  const answerWords = normalizeWords(answer);
  const coreWords = new Set(normalizeWords(coreIdea));
  const hits = answerWords.filter((w) => coreWords.has(w)).length;
  const coverage = coreWords.size ? Math.min(1, hits / Math.min(coreWords.size, 6)) : 0;
  const length = answer.trim().length;

  const core_accuracy = Math.round(Math.min(100, coverage * 100 + (length > 20 ? 10 : 0)));
  const own_words = Math.round(coverage > 0.85 ? 55 : Math.min(100, 60 + Math.min(40, answerWords.length)));
  const concreteness = Math.round(/\b\d/.test(answer) || /\bfor example|like when|such as|e\.g\./i.test(answer) ? 85 : Math.min(70, 30 + answerWords.length * 3));

  let feedbackSentence: string;
  if (core_accuracy < 40) {
    feedbackSentence = "The central idea isn't clearly present yet — revisit the core definition before your next attempt.";
  } else if (concreteness < 40) {
    feedbackSentence = "The idea is there, but add one specific, real example instead of a general statement.";
  } else {
    feedbackSentence = "Solid — the core idea comes through in your own words with a concrete example.";
  }

  return { subscores: { core_accuracy, own_words, concreteness }, feedbackSentence };
}

export async function scoreGeneration(
  answer: string,
  coreIdea: string,
  rubricCriteria: string[],
): Promise<{ subscores: Subscores; feedbackSentence: string }> {
  try {
    return await brainScoreGeneration(answer, coreIdea, rubricCriteria);
  } catch {
    return scoreGenerationOffline(answer, coreIdea);
  }
}

export function compositeScoreFor(
  assessKind: AssessKind,
  recognitionCorrect: boolean,
  applicationCorrect: boolean | undefined,
  subscores: Subscores,
): number {
  const recognitionScore = recognitionCorrect ? 100 : 0;
  const generationScore = Math.round(
    (subscores.core_accuracy + subscores.own_words + subscores.concreteness) / 3,
  );
  if (assessKind === "quick" || applicationCorrect === undefined) {
    return Math.round(0.35 * recognitionScore + 0.65 * generationScore);
  }
  const applicationScore = applicationCorrect ? 100 : 0;
  return Math.round(0.25 * recognitionScore + 0.25 * applicationScore + 0.5 * generationScore);
}

export function calibrationMessage(confidence: number | undefined, compositeScore: number, feedbackSentence: string): string {
  if (confidence === undefined) {
    return compositeScore >= 60 ? "You landed this one." : "Worth another pass on this one.";
  }
  const confidenceScore = ((confidence - 1) / 4) * 100;
  const gap = compositeScore - confidenceScore;
  if (gap >= 20) return "You knew more than you thought.";
  if (gap <= -20) {
    return `You were confident here — worth a second look: ${feedbackSentence}`;
  }
  return compositeScore >= 60 ? "Your gut matched your grade — nice." : "Your gut matched your grade, and both say: practice this one again.";
}

export function revealCard(
  session: Session,
  skillId: string,
  data: {
    assessKind: AssessKind;
    confidence?: number;
    recognitionCorrect: boolean;
    applicationCorrect?: boolean;
    subscores: Subscores;
    feedbackSentence: string;
  },
): Card {
  const compositeScore = compositeScoreFor(
    data.assessKind,
    data.recognitionCorrect,
    data.applicationCorrect,
    data.subscores,
  );
  const message = calibrationMessage(data.confidence, compositeScore, data.feedbackSentence);
  return {
    id: nextCardId(session),
    kind: "reveal",
    phase: "reveal",
    skillId,
    prompt: "Here's how that landed",
    subscores: data.subscores,
    compositeScore,
    calibrationMessage: message,
    feedback: data.feedbackSentence,
    correct: compositeScore >= 60,
  };
}

export function hasPhaseFor(session: Session, phase: string, skillId: string): boolean {
  return session.cards.some((c) => c.phase === phase && c.skillId === skillId);
}

export function recognitionResolved(session: Session, skillId: string): boolean {
  return session.cards.some(
    (c) =>
      c.phase === "recognition" &&
      c.skillId === skillId &&
      c.answer !== undefined &&
      (c.correct === true || c.retryOf !== undefined),
  );
}

export function applicationResolved(session: Session, skillId: string): boolean {
  return session.cards.some(
    (c) => c.phase === "application" && c.skillId === skillId && c.answer !== undefined,
  );
}

export function hasRevealFor(session: Session, skillId: string): boolean {
  return session.cards.some((c) => c.phase === "reveal" && c.skillId === skillId);
}

export function revealAnsweredFor(session: Session, skillId: string): boolean {
  return session.cards.some(
    (c) => c.phase === "reveal" && c.skillId === skillId && c.answer !== undefined,
  );
}

export function confidenceFor(session: Session, skillId: string): number | undefined {
  const card = session.cards.find((c) => c.phase === "confidence" && c.skillId === skillId);
  const n = card?.answer ? Number(card.answer) : undefined;
  return typeof n === "number" && !Number.isNaN(n) ? n : undefined;
}

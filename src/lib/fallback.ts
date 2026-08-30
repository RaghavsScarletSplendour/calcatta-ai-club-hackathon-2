import {
  checkCards,
  getModule,
  matchModule,
  moduleSkills,
  teachingCard,
  trainingCard,
} from "./catalog";
import {
  applicationCard,
  assessKindFor,
  confidenceCard,
  generationCard,
  recognitionCard,
  retryRecognitionCard,
} from "./assessment";
import type { Card, Memory, Path, Session, Skill, Step } from "./schema";
import {
  answeredProblems,
  backgroundCount,
  hasTeach,
  hasTraining,
  shouldEndDiagnostic,
  shouldStopBackground,
} from "./rules";
import { FIRST_BACKGROUND, nextCardId } from "./session";

type Next = { nextCards: Card[]; memoryAdds: Partial<Memory> };

function steps(items: [string, string][]): Step[] {
  return items.map(([title, body]) => ({ title, body, speak: `${title}. ${body}` }));
}

function withScript(card: Card): Card {
  if (card.script) return card;
  if (!card.steps?.length) return card;
  return {
    ...card,
    script: card.steps.map((step) => step.speak || `${step.title}. ${step.body}`).join(" "),
  };
}

export function hasLessonBody(card: Card): boolean {
  const script = (card.script || "").replace(/[.\s]+/g, " ").trim();
  if (script.length >= 12) return true;
  if (card.blocks?.some((block) => (block.body || "").trim())) return true;
  if (card.steps?.some((step) => (step.title || "").trim() || (step.body || "").trim())) return true;
  return false;
}

export function fillHollowLesson(session: Session, card: Card): Card {
  if (card.kind === "training" || card.phase === "training") {
    return hasLessonBody(card) ? card : trainingFor(session);
  }
  if (card.kind === "teach" && (card.phase === "teach" || !card.phase)) {
    return hasLessonBody(card) ? card : teachFor(session);
  }
  return card;
}

function skill(id: string, label: string): Skill {
  return { id, label, state: "empty", evidence: [] };
}

export function rehearsalKind(goal: string): "stats" | "cs" | "psych" | null {
  const g = goal.toLowerCase();
  if (/(stat|mean|median|probability|variance)/.test(g)) return "stats";
  if (/(intro cs|computer science|coding|programming|python|javascript)/.test(g)) {
    return "cs";
  }
  if (matchModule(goal)?.subject === "psychology") return "psych";
  return null;
}

export function fallbackCompile(goal: string): {
  path: Path;
  skills: Skill[];
  first: Card;
  brain: string;
} {
  const kind = rehearsalKind(goal);
  const first: Card = {
    id: "c1",
    kind: "background",
    prompt: FIRST_BACKGROUND,
    phase: "diagnostic",
    skillId: "s1",
  };
  const matched = matchModule(goal);
  if (matched) {
    return {
      path: "college",
      brain: `catalog:${matched.id}`,
      first,
      skills: moduleSkills(matched),
    };
  }

  if (kind === "stats") {
    return {
      path: "college",
      brain: "fallback:stats",
      first,
      skills: [
        skill("s1", "Mean vs median"),
        skill("s2", "Spread"),
        skill("s3", "Sampling"),
        skill("s4", "Distributions"),
        skill("s5", "A real table"),
        skill("s6", "Keep it live"),
      ],
    };
  }
  if (kind === "cs") {
    return {
      path: "college",
      brain: "fallback:cs",
      first,
      skills: [
        skill("s1", "Variables"),
        skill("s2", "Conditionals"),
        skill("s3", "Loops"),
        skill("s4", "Functions"),
        skill("s5", "Debug a miss"),
        skill("s6", "Keep it live"),
      ],
    };
  }
  return {
    path: "college",
    brain: "fallback:generic",
    first,
    skills: [
      skill("s1", "Where you are"),
      skill("s2", "The core move"),
      skill("s3", "The easy miss"),
      skill("s4", "A worked example"),
      skill("s5", "Do it now"),
      skill("s6", "Keep it live"),
    ],
  };
}

function catalogFor(session: Session) {
  return getModule(session.moduleId) || matchModule(session.goal);
}

function trainingFor(session: Session): Card {
  const mod = catalogFor(session);
  if (mod) {
    const card = trainingCard(mod);
    card.id = nextCardId(session);
    return card;
  }
  return {
    id: nextCardId(session),
    kind: "training",
    phase: "training",
    skillId: "s1",
    minutes: 1,
    prompt: "Hold one idea, then check it",
    script:
      "Do not collect a syllabus. Hold one idea you can use. Name the outcome. Watch the easy miss. Then a short check that you can actually do.",
    blocks: [
      {
        id: "t1",
        kind: "heading",
        heading: "One idea",
        body: "Name the outcome before you collect topics.",
      },
      {
        id: "t2",
        kind: "concept",
        heading: "The easy miss",
        body: "The step people skip is usually the definition or the stop condition.",
      },
    ],
    steps: steps([
      ["Hold one idea", "Name the outcome before you collect topics."],
      ["Then a check", "A short check that you can actually do."],
    ]),
  };
}

function teachFor(session: Session): Card {
  const mod = catalogFor(session);
  if (mod) {
    const card = teachingCard(mod);
    card.id = nextCardId(session);
    return card;
  }
  const kind = rehearsalKind(session.goal);
  const id = nextCardId(session);
  if (kind === "stats") {
    return withScript({
      id,
      kind: "teach",
      phase: "teach",
      skillId: "s1",
      prompt: "Three minutes: mean vs median, with a tiny table.",
      steps: steps([
        ["The pull", "The mean follows the extreme number. The median does not."],
        ["The table", "Incomes 20, 22, 24, 26, 200. Mean looks rich. Median is 24."],
        ["The ask", "Always ask: compared to what, and is one point dragging this?"],
      ]),
    });
  }
  if (kind === "cs") {
    return withScript({
      id,
      kind: "teach",
      phase: "teach",
      skillId: "s3",
      prompt: "Three minutes: a loop is a named recipe you repeat.",
      steps: steps([
        ["A box", "A variable is a labeled box. The name stays. The value can change."],
        ["Repeat", "A loop runs the same steps while a condition is still true."],
        ["Stop", "The easy miss is forgetting the stop. Infinite loops are missing exits."],
      ]),
    });
  }
  const goal = session.goal;
  return withScript({
    id,
    kind: "teach",
    phase: "teach",
    skillId: "s2",
    prompt: `Five minutes on: ${goal}`,
    steps: steps([
      ["Name the outcome", `What “done” looks like for: ${goal}.`],
      ["The easy miss", "The step people skip is usually the safety or the definition."],
      ["The check", "A check you can do in 10 seconds to know it worked."],
    ]),
  });
}

function diagnosticKind(session: Session): "stats" | "cs" | "psych" | null {
  const mod = catalogFor(session);
  if (mod?.subject === "psychology") return "psych";
  if (mod?.subject === "computer-science") return "cs";
  return rehearsalKind(session.goal);
}

function diagnosticProblem(session: Session): Card {
  const kind = diagnosticKind(session);
  const n = answeredProblems(session);
  if (kind === "stats") {
    return n === 0
      ? {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s1",
          prompt: "A class has scores 2, 3, 3, 4, 18. Someone says the average is 6. What’s off?",
          choices: [
            "Nothing — 6 is the mean",
            "The mean is pulled by 18; typical is closer to 3",
            "You cannot average whole numbers",
          ],
          expected: "The mean is pulled by 18; typical is closer to 3",
        }
      : {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s3",
          prompt: "You poll 12 friends about a campus issue. Why might that lie?",
          choices: [
            "Friends are a convenience sample, not the campus",
            "12 is always enough",
            "Polls cannot be wrong",
          ],
          expected: "Friends are a convenience sample, not the campus",
        };
  }
  if (kind === "psych") {
    return n === 0
      ? {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s1",
          prompt: "Psychology, in the open courses we cite, is the scientific study of what?",
          choices: [
            "Only mental illness",
            "Mind and behavior",
            "Personality quizzes",
          ],
          expected: "Mind and behavior",
        }
      : {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s2",
          prompt: "If a grid makes you see dots that are not printed, what is that showing?",
          choices: [
            "The page is broken",
            "Perception constructs what you see",
            "You need glasses",
          ],
          expected: "Perception constructs what you see",
        };
  }
  if (kind === "cs") {
    return n === 0
      ? {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s1",
          prompt: "x = 3 then x = x + 1. What is in the box named x?",
          choices: ["3", "4", "x + 1 as text"],
          expected: "4",
        }
      : {
          id: nextCardId(session),
          kind: "problem",
          phase: "diagnostic",
          skillId: "s3",
          prompt: "A loop never stops. What is the usual miss?",
          choices: [
            "The variable name is too short",
            "The stop condition never becomes true",
            "You used a function",
          ],
          expected: "The stop condition never becomes true",
        };
  }
  return {
    id: nextCardId(session),
    kind: "problem",
    phase: "diagnostic",
    skillId: "s1",
    prompt: `What’s the first real snag people hit with: ${session.goal}?`,
    choices: [
      "They skip the first safety or definition",
      "They already mastered it",
      "There is no snag",
    ],
    expected: "They skip the first safety or definition",
  };
}

function chips(session: Session): Card {
  return {
    id: nextCardId(session),
    kind: "chips",
    phase: "diagnostic",
    skillId: "s1",
    prompt: "Which is closest?",
    choices: ["I’ve done this for real", "I’ve seen it, not done it", "Starting from zero"],
  };
}

function reteach(session: Session, missed: Card): Card[] {
  const easier: Card = {
    id: nextCardId(session),
    kind: "teach",
    phase: missed.phase === "check" ? "check" : missed.phase,
    skillId: missed.skillId,
    prompt: "Same idea, slower.",
    steps: steps([
      ["One beat", "Ignore extra numbers. Name the one rule this card is testing."],
      ["Then choose", "Pick the option that matches that rule. Not the fancy one."],
    ]),
  };
  const retry: Card = {
    id: `c${session.cards.length + 2}`,
    kind: "problem",
    phase: missed.phase === "diagnostic" ? "diagnostic" : "check",
    skillId: missed.skillId,
    retryOf: missed.id,
    prompt: missed.prompt + " — try the simpler read.",
    choices: missed.choices?.slice(0, 2),
    expected: missed.expected,
  };
  return [easier, retry];
}

function skillLabel(session: Session, skillId: string): string {
  return session.skills.find((s) => s.id === skillId)?.label || skillId;
}

function hasConfidenceFor(session: Session, skillId: string): boolean {
  return session.cards.some((c) => c.phase === "confidence" && c.skillId === skillId);
}

function recognitionFollowUp(session: Session, answered: Card): Next {
  const skillId = answered.skillId || "s1";
  if (answered.correct === false && !answered.retryOf) {
    return { nextCards: [retryRecognitionCard(session, answered)], memoryAdds: {} };
  }
  const label = skillLabel(session, skillId);
  const kind = assessKindFor(session, label);
  const next = kind === "full" ? applicationCard(session, skillId) : generationCard(session, skillId);
  const memoryAdds: Partial<Memory> = answered.correct
    ? { landed: [`Recognized ${label} correctly`] }
    : {};
  return { nextCards: [next], memoryAdds };
}

function revealFollowUp(session: Session): Card[] {
  if (!hasTeach(session)) {
    if (!hasConfidenceFor(session, "s2")) {
      return [confidenceCard(session, "s2", skillLabel(session, "s2"))];
    }
    return [teachFor(session)];
  }
  return [];
}

export function fallbackAfterAnswer(session: Session, answered: Card): Next {
  const memoryAdds: Partial<Memory> = {};
  if (answered.kind === "background") {
    memoryAdds.stand = [`Background: ${answered.answer?.slice(0, 140)}`];
  }

  if (answered.phase === "confidence") {
    const next = hasTraining(session) ? teachFor(session) : trainingFor(session);
    return { nextCards: [next], memoryAdds };
  }
  if (answered.phase === "recognition") {
    return recognitionFollowUp(session, answered);
  }
  if (answered.phase === "application") {
    return { nextCards: [generationCard(session, answered.skillId || "s1")], memoryAdds };
  }
  if (answered.phase === "reveal") {
    return { nextCards: revealFollowUp(session), memoryAdds };
  }
  if (answered.phase === "generation") {
    return { nextCards: [], memoryAdds };
  }

  if (answered.correct === false && !answered.retryOf) {
    return { nextCards: reteach(session, answered), memoryAdds };
  }

  if ((answered.kind === "training" || answered.phase === "training") && !hasTeach(session)) {
    return { nextCards: [recognitionCard(session, answered.skillId || "s1")], memoryAdds };
  }

  if (answered.kind === "teach" && answered.phase === "teach") {
    return { nextCards: [recognitionCard(session, answered.skillId || "s2")], memoryAdds };
  }

  if (!hasTraining(session) && !hasTeach(session) && !shouldEndDiagnostic(session)) {
    if ((answered.kind === "background" || answered.kind === "chips") && !shouldStopBackground(session, answered.answer || "")) {
      if ((answered.answer || "").trim().length < 40 && backgroundCount(session) < 3) {
        return { nextCards: [chips(session)], memoryAdds };
      }
    }
    if (!shouldEndDiagnostic(session)) {
      return { nextCards: [diagnosticProblem(session)], memoryAdds };
    }
  }

  if (!hasTraining(session)) {
    const next = hasConfidenceFor(session, "s1")
      ? trainingFor(session)
      : confidenceCard(session, "s1", skillLabel(session, "s1"));
    return { nextCards: [next], memoryAdds };
  }

  if (!hasTeach(session)) {
    const next = hasConfidenceFor(session, "s2")
      ? teachFor(session)
      : confidenceCard(session, "s2", skillLabel(session, "s2"));
    return { nextCards: [next], memoryAdds };
  }

  return { nextCards: [], memoryAdds };
}

export function catalogSkip(session: Session): Next {
  const mod = catalogFor(session);
  if (!mod) return fallbackSkip(session);
  const live = session.skills.find((skill) => skill.state === "live") || session.skills[0];
  const checks = checkCards(mod);
  const match = checks.find((check) => check.skillId === live.id) || checks[0];
  const card: Card = {
    id: nextCardId(session),
    kind: "refresher",
    phase: "refresher",
    skillId: live.id,
    prompt: `Two days later. ${match.prompt}`,
    choices: match.choices,
    expected: match.expected,
    subjective: match.subjective,
    rubric: match.rubric,
    moduleId: mod.id,
  };
  return {
    nextCards: [card],
    memoryAdds: {
      promised: [`Practice ${live.label} after two days`],
      stand: [`Time skip on ${live.label}`],
    },
  };
}

export function fallbackSkip(session: Session): Next {
  const live = session.skills.find((skill) => skill.state === "live") || session.skills[0];
  const kind = rehearsalKind(session.goal);
  let card: Card;
  if (kind === "stats") {
    card = {
      id: nextCardId(session),
      kind: "refresher",
      phase: "refresher",
      skillId: live.id,
      prompt: "Two days later. Scores 4, 5, 5, 6, 40. Typical value?",
      choices: ["The mean", "The median", "40"],
      expected: "The median",
    };
  } else {
    card = {
      id: nextCardId(session),
      kind: "refresher",
      phase: "refresher",
      skillId: live.id,
      prompt: `Two days later. What was the core move for: ${session.goal}?`,
      choices: [
        "The first real step, in order",
        "Reread a catalog",
        "Skip the check",
      ],
      expected: "The first real step, in order",
    };
  }
  return {
    nextCards: [card],
    memoryAdds: {
      promised: [`Practice ${live.label} after two days`],
      stand: [`Time skip on ${live.label}`],
    },
  };
}

export function fallbackOverrideTeach(session: Session): Card[] {
  if (!hasTraining(session)) {
    return [
      hasConfidenceFor(session, "s1")
        ? trainingFor(session)
        : confidenceCard(session, "s1", skillLabel(session, "s1")),
    ];
  }
  if (!hasTeach(session)) {
    return [
      hasConfidenceFor(session, "s2")
        ? teachFor(session)
        : confidenceCard(session, "s2", skillLabel(session, "s2")),
    ];
  }
  return [recognitionCard(session, "s2")];
}

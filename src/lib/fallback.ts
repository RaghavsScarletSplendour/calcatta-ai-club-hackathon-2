import {
  checkCards,
  getModule,
  matchModule,
  moduleSkills,
  teachingCard,
  trainingCard,
} from "./catalog";
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

function checksFor(session: Session): Card[] {
  const mod = catalogFor(session);
  if (mod) {
    return checkCards(mod).map((card, i) => ({
      ...card,
      id: `c${session.cards.length + i + 1}`,
    }));
  }
  const kind = rehearsalKind(session.goal);
  const start = session.cards.length;
  if (kind === "stats") {
    return [
      {
        id: `c${start + 1}`,
        kind: "problem",
        phase: "check",
        skillId: "s1",
        prompt: "Five incomes: 20, 22, 24, 26, 200. Which number better describes a typical income?",
        choices: ["The mean", "The median", "The biggest value"],
        expected: "The median",
      },
      {
        id: `c${start + 2}`,
        kind: "problem",
        phase: "check",
        skillId: "s3",
        prompt: "A sample of 8 students has a higher mean than the class. What should you do first?",
        choices: [
          "Trust the sample — it is data",
          "Ask how they were chosen",
          "Drop the low scores",
        ],
        expected: "Ask how they were chosen",
      },
      {
        id: `c${start + 3}`,
        kind: "problem",
        phase: "check",
        skillId: "s1",
        subjective: true,
        prompt: "In two sentences: when should you prefer the median over the mean?",
        expected: "When an extreme value pulls the mean, the median is a better typical value.",
        rubric: "Pass if they mention outliers or a pulled mean.",
      },
    ];
  }
  if (kind === "cs") {
    return [
      {
        id: `c${start + 1}`,
        kind: "problem",
        phase: "check",
        skillId: "s3",
        prompt: "A loop never stops. What is the usual miss?",
        choices: [
          "The variable name is too short",
          "The stop condition never becomes true",
          "You used a function",
        ],
        expected: "The stop condition never becomes true",
      },
      {
        id: `c${start + 2}`,
        kind: "problem",
        phase: "check",
        skillId: "s1",
        prompt: "What does a variable keep?",
        choices: ["A labeled value that can change", "The whole program", "Only numbers"],
        expected: "A labeled value that can change",
      },
      {
        id: `c${start + 3}`,
        kind: "problem",
        phase: "check",
        skillId: "s3",
        subjective: true,
        prompt: "In two sentences: what makes a loop stop?",
        expected: "A loop stops when its condition becomes false. The usual miss is never changing the value that condition reads.",
        rubric: "Pass if they mention a stop condition or an exit.",
      },
    ];
  }
  return [
    {
      id: `c${start + 1}`,
      kind: "problem",
      phase: "check",
      skillId: "s2",
      prompt: `Pick the core move for: ${session.goal}`,
      choices: [
        "Name the outcome, then do the first real step",
        "Read a full syllabus first",
        "Skip the check and hope",
      ],
      expected: "Name the outcome, then do the first real step",
    },
    {
      id: `c${start + 2}`,
      kind: "problem",
      phase: "check",
      skillId: "s3",
      prompt: "After a miss, what does this coach do?",
      choices: ["Loop forever", "Reteach, one easier retry, then move", "Mark it live anyway"],
      expected: "Reteach, one easier retry, then move",
    },
    {
      id: `c${start + 3}`,
      kind: "problem",
      phase: "check",
      skillId: "s2",
      subjective: true,
      prompt: `In two sentences: what is the core move for ${session.goal}?`,
      expected: "Name the outcome, then do the first real step, then check it.",
      rubric: "Pass if they name a first real step, not a syllabus.",
    },
  ];
}

function diagnosticProblem(session: Session): Card {
  const kind = rehearsalKind(session.goal);
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
    kind: missed.kind === "confirm" ? "confirm" : "problem",
    phase: missed.phase === "diagnostic" ? "diagnostic" : "check",
    skillId: missed.skillId,
    retryOf: missed.id,
    prompt: missed.prompt + " — try the simpler read.",
    choices: missed.choices?.slice(0, 2),
    expected: missed.expected,
  };
  return [easier, retry];
}

export function fallbackAfterAnswer(session: Session, answered: Card): Next {
  const memoryAdds: Partial<Memory> = {};
  if (answered.kind === "background") {
    memoryAdds.stand = [`Background: ${answered.answer?.slice(0, 140)}`];
  }
  if (answered.correct === true && (answered.phase === "check" || answered.kind === "confirm")) {
    memoryAdds.landed = [`Check passed on ${answered.skillId || "a skill"}`];
  }

  if (answered.correct === false && !answered.retryOf) {
    return { nextCards: reteach(session, answered), memoryAdds };
  }

  if ((answered.kind === "training" || answered.phase === "training") && !hasTeach(session)) {
    return { nextCards: [teachFor(session)], memoryAdds };
  }

  if (answered.kind === "teach" && answered.phase === "teach") {
    return { nextCards: checksFor(session), memoryAdds };
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
    return { nextCards: [trainingFor(session)], memoryAdds };
  }

  if (!hasTeach(session)) {
    return { nextCards: [teachFor(session)], memoryAdds };
  }

  const pendingCheck = session.cards.some(
    (card) =>
      (card.phase === "check" || card.kind === "confirm") && card.answer === undefined,
  );
  if (!pendingCheck && answered.phase === "diagnostic") {
    return { nextCards: [trainingFor(session)], memoryAdds };
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
  if (!hasTraining(session)) return [trainingFor(session)];
  if (!hasTeach(session)) return [teachFor(session)];
  return checksFor(session);
}

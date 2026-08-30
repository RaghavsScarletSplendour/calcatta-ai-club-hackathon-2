import type { Card, Memory, Path, Session, Skill, Step } from "./schema";
import {
  answeredProblems,
  backgroundCount,
  hasTeach,
  shouldEndDiagnostic,
  shouldStopBackground,
} from "./rules";
import { FIRST_BACKGROUND, nextCardId } from "./session";

type Next = { nextCards: Card[]; memoryAdds: Partial<Memory> };

function steps(items: [string, string][]): Step[] {
  return items.map(([title, body]) => ({ title, body, speak: `${title}. ${body}` }));
}

function skill(id: string, label: string): Skill {
  return { id, label, state: "empty", evidence: [] };
}

export function guessPath(goal: string): Path {
  const g = goal.toLowerCase();
  if (
    /(tire|tyre|oil|cook|change a|how to|fix|repair|knot|bike|jump.?start)/.test(g)
  ) {
    return "life";
  }
  return "college";
}

export function rehearsalKind(goal: string): "stats" | "cs" | "tire" | null {
  const g = goal.toLowerCase();
  if (/(stat|mean|median|probability|variance)/.test(g)) return "stats";
  if (/(intro cs|computer science|coding|programming|python|javascript)/.test(g)) {
    return "cs";
  }
  if (/(tire|tyre)/.test(g)) return "tire";
  return null;
}

export function fallbackCompile(goal: string): {
  path: Path;
  skills: Skill[];
  first: Card;
  brain: string;
} {
  const kind = rehearsalKind(goal);
  const path = kind === "tire" ? "life" : guessPath(goal);
  const first: Card = {
    id: "c1",
    kind: "background",
    prompt: FIRST_BACKGROUND,
    phase: "diagnostic",
    skillId: "s1",
  };

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
  if (kind === "tire") {
    return {
      path: "life",
      brain: "fallback:tire",
      first,
      skills: [
        skill("s1", "Safety first"),
        skill("s2", "Loosen before jack"),
        skill("s3", "Jack point"),
        skill("s4", "Swap the wheel"),
        skill("s5", "Star torque"),
        skill("s6", "Keep it live"),
      ],
    };
  }
  return {
    path,
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

function teachFor(session: Session): Card {
  const kind = rehearsalKind(session.goal);
  const id = nextCardId(session);
  if (kind === "stats") {
    return {
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
    };
  }
  if (kind === "cs") {
    return {
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
    };
  }
  if (kind === "tire") {
    return {
      id,
      kind: "teach",
      phase: "teach",
      skillId: "s2",
      prompt: "How to change a tire — three steps, in order.",
      steps: steps([
        ["Before the jack", "Park, hazards, chock. Loosen the nuts while the wheel is still on the ground."],
        ["Swap", "Jack at the marked point. Take the wheel off. Seat the spare on the studs."],
        ["Down, then tight", "Lower the car, then tighten in a star. Torque after it is on the ground."],
      ]),
    };
  }
  const goal = session.goal;
  return {
    id,
    kind: "teach",
    phase: "teach",
    skillId: "s2",
    prompt: session.path === "life" ? `How to: ${goal}` : `Three minutes on: ${goal}`,
    steps: steps([
      ["Name the outcome", `What “done” looks like for: ${goal}.`],
      ["The easy miss", "The step people skip is usually the safety or the definition."],
      ["The check", "A check you can do in 10 seconds to know it worked."],
    ]),
  };
}

function checksFor(session: Session): Card[] {
  const kind = rehearsalKind(session.goal);
  const start = session.cards.length;
  if (session.path === "life") {
    if (kind === "tire") {
      return [
        {
          id: `c${start + 1}`,
          kind: "confirm",
          phase: "check",
          skillId: "s2",
          prompt: "When do you loosen the lug nuts?",
          choices: [
            "After the car is in the air",
            "While the wheel is still on the ground",
            "After you put the spare on",
          ],
          expected: "While the wheel is still on the ground",
        },
      ];
    }
    return [
      {
        id: `c${start + 1}`,
        kind: "confirm",
        phase: "check",
        skillId: "s5",
        prompt: `Which step is easiest to get wrong for: ${session.goal}?`,
        choices: [
          "The first safety step",
          "The order of the core move",
          "Celebrating at the end",
        ],
        expected: "The order of the core move",
      },
    ];
  }
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
  if (kind === "tire") {
    return {
      id: nextCardId(session),
      kind: "problem",
      phase: "diagnostic",
      skillId: "s1",
      prompt: "Before you touch the spare, what comes first?",
      choices: [
        "Jack the car immediately",
        "Park safe, hazards, and stop the car rolling",
        "Take all the nuts off",
      ],
      expected: "Park safe, hazards, and stop the car rolling",
    };
  }
  if (kind === "cs") {
    return {
      id: nextCardId(session),
      kind: "problem",
      phase: "diagnostic",
      skillId: "s1",
      prompt: "x = 3 then x = x + 1. What is in the box named x?",
      choices: ["3", "4", "x + 1 as text"],
      expected: "4",
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

  if (answered.kind === "teach" && answered.phase === "teach") {
    return { nextCards: checksFor(session), memoryAdds };
  }

  if (!hasTeach(session) && !shouldEndDiagnostic(session)) {
    if ((answered.kind === "background" || answered.kind === "chips") && !shouldStopBackground(session, answered.answer || "")) {
      if ((answered.answer || "").trim().length < 40 && backgroundCount(session) < 3) {
        return { nextCards: [chips(session)], memoryAdds };
      }
    }
    if (!shouldEndDiagnostic(session)) {
      return { nextCards: [diagnosticProblem(session)], memoryAdds };
    }
  }

  if (!hasTeach(session)) {
    return { nextCards: [teachFor(session)], memoryAdds };
  }

  const pendingCheck = session.cards.some(
    (card) =>
      (card.phase === "check" || card.kind === "confirm") && card.answer === undefined,
  );
  if (!pendingCheck && answered.phase === "diagnostic") {
    return { nextCards: [teachFor(session)], memoryAdds };
  }

  return { nextCards: [], memoryAdds };
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
  } else if (kind === "tire") {
    card = {
      id: nextCardId(session),
      kind: "refresher",
      phase: "refresher",
      skillId: live.id,
      prompt: "Two days later. You already jacked the car. Nuts are still tight. What went wrong?",
      choices: [
        "You should loosen nuts on the ground, before jacking",
        "You forgot the spare",
        "Nothing — tight is safe",
      ],
      expected: "You should loosen nuts on the ground, before jacking",
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
  return [teachFor(session)];
}

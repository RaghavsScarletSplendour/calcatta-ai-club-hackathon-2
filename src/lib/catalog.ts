import catalogJson from "../../data/courses/catalog.json";
import type { Card, ContentBlock, Skill, Source } from "./schema";

export type LessonPart = {
  prompt: string;
  script: string;
  blocks: ContentBlock[];
};

export type CheckSpec = {
  kind: string;
  phase: "check";
  skillId: string;
  prompt: string;
  choices?: string[];
  expected: string;
  subjective?: boolean;
  rubric?: string;
};

export type CourseModule = {
  id: string;
  subject: string;
  title: string;
  keywords: string[];
  minutes: number;
  skills: { id: string; label: string }[];
  sources: Source[];
  training: LessonPart;
  teaching: LessonPart;
  checks: CheckSpec[];
};

type CatalogFile = {
  updated: string;
  note: string;
  modules: CourseModule[];
};

const catalog = catalogJson as CatalogFile;

export function listModules(): CourseModule[] {
  return catalog.modules;
}

export function getModule(id: string | undefined): CourseModule | undefined {
  if (!id) return undefined;
  return catalog.modules.find((mod) => mod.id === id);
}

const MATCH_STOPWORDS = new Set(["to", "a", "an", "the", "of", "in"]);

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word && !MATCH_STOPWORDS.has(word))
    .join(" ");
}

export function matchModule(goal: string): CourseModule | undefined {
  const g = normalizeForMatch(goal);
  let best: { score: number; mod: CourseModule } | undefined;
  for (const mod of catalog.modules) {
    let score = 0;
    for (const key of mod.keywords) {
      const k = normalizeForMatch(key);
      if (k && g.includes(k)) score += k.includes(" ") ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { score, mod };
  }
  return best?.mod;
}

export function moduleSkills(mod: CourseModule): Skill[] {
  return mod.skills.map((skill) => ({
    id: skill.id,
    label: skill.label,
    state: "empty",
    evidence: [],
  }));
}

function lessonCard(
  mod: CourseModule,
  part: LessonPart,
  kind: "training" | "teach",
  skillId: string,
): Card {
  return {
    id: kind === "training" ? "train" : "teach",
    kind,
    phase: kind === "training" ? "training" : "teach",
    skillId,
    prompt: part.prompt,
    script: part.script,
    blocks: part.blocks,
    sources: mod.sources,
    minutes: kind === "teach" ? mod.minutes : 1,
    moduleId: mod.id,
  };
}

export function trainingCard(mod: CourseModule): Card {
  return lessonCard(mod, mod.training, "training", mod.skills[0]?.id || "s1");
}

export function teachingCard(mod: CourseModule): Card {
  return lessonCard(mod, mod.teaching, "teach", mod.skills[1]?.id || "s2");
}

export function checkCards(mod: CourseModule): Card[] {
  return mod.checks.map((check, i) => ({
    id: `check${i + 1}`,
    kind: check.kind,
    phase: "check",
    skillId: check.skillId,
    prompt: check.prompt,
    choices: check.choices,
    expected: check.expected,
    subjective: check.subjective,
    rubric: check.rubric,
    moduleId: mod.id,
    sources: mod.sources,
  }));
}

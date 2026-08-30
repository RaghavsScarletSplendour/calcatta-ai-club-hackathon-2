import type { Memory, Session } from "./schema";

const MODEL_CITE = /\[a:\d+\]/g;

export function stampLine(line: string, answerId: number): string {
  const clean = line.replace(MODEL_CITE, "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return `${clean} [a:${answerId}]`;
}

export function stampLines(lines: string[] | undefined, answerId: number): string[] {
  if (!lines?.length) return [];
  return lines.map((line) => stampLine(line, answerId)).filter(Boolean);
}

export function addMemory(
  session: Session,
  adds: Partial<Memory> | undefined,
  answerId: number,
): void {
  if (!adds) return;
  session.memory.stand.push(...stampLines(adds.stand, answerId));
  session.memory.landed.push(...stampLines(adds.landed, answerId));
  session.memory.promised.push(...stampLines(adds.promised, answerId));
}

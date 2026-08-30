"use client";

import type { Skill } from "@/lib/schema";

export function SkillsRail({
  skills,
  canSkip,
  busy,
  onSkip,
  onReceipts,
}: {
  skills: Skill[];
  canSkip: boolean;
  busy: boolean;
  onSkip: () => void;
  onReceipts: () => void;
}) {
  return (
    <aside className="skills-rail">
      <h2>Your skills</h2>
      <div className="slots">
        {skills.map((skill) => (
          <div className={`slot ${skill.state}`} key={skill.id}>
            <span className="dot" aria-hidden />
            <span className="label">{skill.label}</span>
            <span className="state">{skill.state}</span>
          </div>
        ))}
      </div>
      <div className="rail-actions">
        <button type="button" onClick={onSkip} disabled={!canSkip || busy}>
          Skip 2 days
        </button>
        <button type="button" onClick={onReceipts} disabled={busy}>
          Receipts
        </button>
      </div>
    </aside>
  );
}

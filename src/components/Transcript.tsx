"use client";

import { activeWordIndex } from "@/lib/cues";
import type { WordCue } from "@/lib/schema";

export function Transcript({
  words,
  currentTime,
  playing,
}: {
  words: WordCue[];
  currentTime: number;
  playing: boolean;
}) {
  const active = playing ? activeWordIndex(words, currentTime) : -1;
  const finished = !playing && currentTime > 0.05;

  return (
    <p className="transcript" aria-live="off">
      {words.map((word, i) => {
        const spoken = finished || (playing && currentTime >= word.end - 0.03) || (active >= 0 && i < active);
        const on = i === active;
        return (
          <span
            key={`${word.start}-${i}`}
            className={`word${spoken ? " spoken" : ""}${on ? " active" : ""}`}
          >
            {word.text}
          </span>
        );
      })}
    </p>
  );
}

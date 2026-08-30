import type { WordCue } from "./schema";

export function estimateCues(text: string, duration: number): WordCue[] {
  const parts = text.match(/\S+\s*/g);
  if (!parts?.length) {
    return [{ text, start: 0, end: Math.max(duration, 0.4) }];
  }
  const total = Math.max(text.length, 1);
  const span = Math.max(duration, 0.4);
  let t = 0;
  return parts.map((part, i) => {
    const share = part.length / total;
    const start = t;
    const end = i === parts.length - 1 ? span : Math.min(span, t + share * span);
    t = end;
    return { text: part, start, end };
  });
}

export function cuesFromCharTimes(
  text: string,
  graphChars: string[] | undefined,
  graphTimes: [number, number][] | undefined,
): WordCue[] | null {
  if (!graphChars?.length || !graphTimes?.length) return null;
  if (graphChars.length !== graphTimes.length) return null;

  const words: WordCue[] = [];
  let buf = "";
  let start = graphTimes[0]?.[0] ?? 0;
  let end = start;

  const flush = () => {
    if (!buf) return;
    words.push({ text: buf, start, end: Math.max(end, start + 0.05) });
    buf = "";
  };

  for (let i = 0; i < graphChars.length; i++) {
    const ch = graphChars[i] ?? "";
    const [s, e] = graphTimes[i] ?? [end, end];
    if (!buf) start = s;
    buf += ch;
    end = e;
    if (/\s/.test(ch)) flush();
  }
  flush();

  if (!words.length) return null;
  const joined = words.map((w) => w.text).join("");
  if (joined.replace(/\s+/g, " ").trim() !== text.replace(/\s+/g, " ").trim()) {
    // Timestamps still usable even if TTS normalized a few characters.
    if (Math.abs(joined.length - text.length) > Math.max(12, text.length * 0.2)) {
      return null;
    }
  }
  return words;
}

export function activeWordIndex(words: WordCue[], time: number): number {
  if (!words.length) return -1;
  for (let i = 0; i < words.length; i++) {
    if (time >= words[i].start && time < words[i].end) return i;
  }
  if (time >= words[words.length - 1].end) return words.length - 1;
  return -1;
}

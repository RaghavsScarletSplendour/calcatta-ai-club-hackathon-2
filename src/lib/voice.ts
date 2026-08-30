import { cuesFromCharTimes, estimateCues } from "./cues";
import type { WordCue } from "./schema";

export type SpeakResult = {
  audio: Buffer;
  type: string;
  duration?: number;
  words: WordCue[];
};

function asPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const start = Number(value[0]);
  const end = Number(value[1]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return [start, end];
}

function wordsFromPayload(text: string, payload: Record<string, unknown>, duration: number): WordCue[] {
  const stamps = payload.audio_timestamps as
    | { graph_chars?: string[]; graph_times?: unknown[] }
    | undefined;
  const fromChars = cuesFromCharTimes(
    text,
    stamps?.graph_chars,
    (stamps?.graph_times || []).map(asPair).filter((row): row is [number, number] => Boolean(row)),
  );
  if (fromChars?.length) return fromChars;

  const rawWords = payload.words as { text?: string; start?: number; end?: number }[] | undefined;
  if (Array.isArray(rawWords) && rawWords.length) {
    const mapped = rawWords
      .map((row) => ({
        text: String(row.text || ""),
        start: Number(row.start) || 0,
        end: Number(row.end) || 0,
      }))
      .filter((row) => row.text);
    if (mapped.length) return mapped;
  }

  return estimateCues(text, duration);
}

export async function speak(text: string): Promise<SpeakResult | null> {
  const key = process.env.XAI_API_KEY;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!key || !trimmed) return null;
  const spoken = trimmed.slice(0, 4000);

  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: spoken,
      voice_id: "eve",
      language: "en",
      with_timestamps: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Grok TTS ${response.status}: ${err.slice(0, 200)}`);
  }

  const type = response.headers.get("content-type") || "audio/mpeg";
  if (type.includes("json")) {
    const payload = (await response.json()) as Record<string, unknown>;
    const b64 = String(payload.audio || payload.audio_base64 || "");
    if (!b64) return null;
    const audio = Buffer.from(b64, "base64");
    if (audio.length < 40) return null;
    const duration = Number(payload.duration) || 0;
    return {
      audio,
      type: String(payload.content_type || payload.mime_type || "audio/mpeg"),
      duration,
      words: wordsFromPayload(spoken, payload, duration),
    };
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 40) return null;
  return { audio, type, words: estimateCues(spoken, Math.max(audio.length / 16000, 4)) };
}

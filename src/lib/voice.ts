export async function speak(text: string): Promise<{ audio: Buffer; type: string } | null> {
  const key = process.env.XAI_API_KEY;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!key || !trimmed) return null;

  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: trimmed.slice(0, 4000),
      voice_id: "eve",
      language: "en",
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Grok TTS ${response.status}: ${err.slice(0, 200)}`);
  }

  const type = response.headers.get("content-type") || "audio/mpeg";
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 40) return null;
  return { audio, type };
}

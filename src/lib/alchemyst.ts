import type { Session } from "./schema";

export async function pushReceipts(session: Session): Promise<boolean> {
  const key = process.env.ALCHEMYST_AI_API_KEY;
  if (!key) return false;

  const pages = [
    ["stand", session.memory.stand],
    ["landed", session.memory.landed],
    ["promised", session.memory.promised],
  ] as const;

  try {
    for (const [page, lines] of pages) {
      if (!lines.length) continue;
      const response = await fetch("https://platform-backend.getalchemystai.com/api/v1/context/add", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documents: [{ content: lines.join("\n") }],
          source: "stand",
          context_type: "conversation",
          scope: "internal",
          metadata: {
            fileName: `${session.id}-${page}.txt`,
            fileType: "text/plain",
            groupName: [session.id, page],
          },
        }),
      });
      if (!response.ok) return false;
    }
    return true;
  } catch {
    return false;
  }
}

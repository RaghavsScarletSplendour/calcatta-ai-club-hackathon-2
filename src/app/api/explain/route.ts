import { brainExplain } from "@/lib/brain";
import type { Card } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      goal?: string;
      card?: Card;
      question?: string;
      blockId?: string;
    };
    const question = (body.question || "").trim();
    if (!question) return Response.json({ error: "Ask a question first." }, { status: 400 });
    if (!body.card) return Response.json({ error: "Missing card" }, { status: 400 });
    const result = await brainExplain({
      goal: body.goal || "",
      card: body.card,
      question,
      blockId: body.blockId,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explain failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

import { applyAnswer } from "@/lib/coach";
import type { Session } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      session?: Session;
      answer?: string;
    };
    if (!body.session) {
      return Response.json({ error: "Missing session" }, { status: 400 });
    }
    const session = await applyAnswer(body.session, body.answer || "");
    return Response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Turn failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

import { applySkip } from "@/lib/coach";
import type { Session } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { session?: Session };
    if (!body.session) {
      return Response.json({ error: "Missing session" }, { status: 400 });
    }
    const session = await applySkip(body.session);
    return Response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skip failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

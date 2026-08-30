import { applyAnswer, applyOverride } from "@/lib/coach";
import type { Path, Session } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      session?: Session;
      answer?: string;
      didIt?: boolean;
      action?: string;
      path?: Path;
    };
    if (!body.session) {
      return Response.json({ error: "Missing session" }, { status: 400 });
    }
    if (body.action === "override" && (body.path === "college" || body.path === "life")) {
      const session = await applyOverride(body.session, body.path);
      return Response.json({ session });
    }
    const session = await applyAnswer(body.session, body.answer || "", { didIt: body.didIt });
    return Response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Turn failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

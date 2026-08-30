import { compileGoal } from "@/lib/coach";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { goal?: string };
    const session = await compileGoal(body.goal || "");
    return Response.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compile failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

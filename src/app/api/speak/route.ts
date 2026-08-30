import { speak } from "@/lib/voice";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string };
    const result = await speak(body.text || "");
    if (!result) {
      return Response.json({ error: "No voice" }, { status: 500 });
    }
    return new Response(new Uint8Array(result.audio), {
      headers: {
        "Content-Type": result.type,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speak failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

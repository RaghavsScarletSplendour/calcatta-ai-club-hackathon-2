import { listModules } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const modules = listModules().map((mod) => ({
    id: mod.id,
    subject: mod.subject,
    title: mod.title,
    minutes: mod.minutes,
    sources: mod.sources,
  }));
  return Response.json({ modules });
}

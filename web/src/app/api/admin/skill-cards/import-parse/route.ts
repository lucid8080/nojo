import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { parseSkillMarkdownImport } from "@/lib/skillCard/parseSkillMarkdownImport";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const markdown = typeof body.markdown === "string" ? body.markdown : "";
    const filename =
      typeof body.filename === "string" && body.filename.trim()
        ? body.filename.trim()
        : undefined;

    const parsed = parseSkillMarkdownImport(markdown, { filename });

    return NextResponse.json({
      success: true,
      data: {
        title: parsed.title,
        slug: parsed.slug,
        fullDefinitionMarkdown: parsed.fullDefinitionMarkdown,
        sourceTypeSuggestion: parsed.sourceTypeSuggestion,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

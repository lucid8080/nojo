import { NextResponse } from "next/server";
import path from "path";
import { readdir } from "fs/promises";

const allowedExt = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function toPublicAvatarUrl(filename: string) {
  return `/avatar/${encodeURIComponent(filename)}`;
}

export async function GET() {
  const avatarDir = path.join(process.cwd(), "public", "avatar");
  try {
    const entries = await readdir(avatarDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => allowedExt.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    return NextResponse.json({
      avatars: files.map((f) => ({ filename: f, url: toPublicAvatarUrl(f) })),
      count: files.length,
      sourceDir: avatarDir,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Failed to list avatar images.",
        sourceDir: avatarDir,
        hint:
          "Ensure avatar images exist under web/public/avatar (e.g. web/public/avatar/agent-1.png).",
        details: message,
      },
      { status: 500 },
    );
  }
}


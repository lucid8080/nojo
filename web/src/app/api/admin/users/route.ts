import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminUserListRow } from "@/types/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const roleFilter = searchParams.get("role")?.trim() as UserRole | "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
            ],
          }
        : {}),
      ...(roleFilter === "USER" || roleFilter === "ADMIN" ? { role: roleFilter } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              workspaceAgents: true,
              workspaceConversations: true,
              runs: true,
            },
          },
        },
      }),
    ]);

    const rows: AdminUserListRow[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      counts: {
        agents: u._count.workspaceAgents,
        conversations: u._count.workspaceConversations,
        runs: u._count.runs,
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        rows,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

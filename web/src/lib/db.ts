import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * After `prisma generate` adds models, a dev-only cached `PrismaClient` can be stale
 * (missing new delegates like `workspaceConversation`). Replace when incomplete.
 */
function isCurrentSchemaClient(client: PrismaClient): boolean {
  const c = client as unknown as {
    workspaceConversation?: { create?: unknown };
    userWorkspaceAgent?: { create?: unknown };
  };
  return (
    typeof c.workspaceConversation?.create === "function" &&
    typeof c.userWorkspaceAgent?.create === "function"
  );
}

export const prisma: PrismaClient = (() => {
  const g = globalForPrisma;
  if (g.prisma && isCurrentSchemaClient(g.prisma)) {
    return g.prisma;
  }
  const next = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    g.prisma = next;
  }
  return next;
})();

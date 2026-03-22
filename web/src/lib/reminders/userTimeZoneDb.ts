import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Read/write `User.timeZone` via raw SQL so the app works even when `prisma generate` has not been
 * re-run after adding the column (stale generated client). After `npx prisma generate`, you may
 * switch these to `prisma.user.findUnique` / `update` if you prefer.
 */
export async function getUserTimeZoneFromDb(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<Array<{ timeZone: string | null }>>(
    Prisma.sql`SELECT "timeZone" FROM "User" WHERE "id" = ${userId}`,
  );
  return rows[0]?.timeZone ?? null;
}

export async function setUserTimeZoneInDb(userId: string, timeZone: string | null): Promise<void> {
  if (timeZone === null) {
    await prisma.$executeRaw(Prisma.sql`UPDATE "User" SET "timeZone" = NULL WHERE "id" = ${userId}`);
  } else {
    await prisma.$executeRaw(
      Prisma.sql`UPDATE "User" SET "timeZone" = ${timeZone} WHERE "id" = ${userId}`,
    );
  }
}

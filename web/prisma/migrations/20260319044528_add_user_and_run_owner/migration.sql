/*
  Warnings:

  - Added the required column `userId` to the `Run` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openclawRunId" TEXT,
    "prompt" TEXT NOT NULL,
    "agentId" TEXT,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "errorMessage" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("agentId", "conversationId", "createdAt", "errorMessage", "id", "lastCheckedAt", "openclawRunId", "prompt", "status", "updatedAt") SELECT "agentId", "conversationId", "createdAt", "errorMessage", "id", "lastCheckedAt", "openclawRunId", "prompt", "status", "updatedAt" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable
CREATE TABLE "UserWorkspaceAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "avatarClass" TEXT NOT NULL,
    "categoryLabel" TEXT,
    "identityJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserWorkspaceAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserWorkspaceAgent_userId_idx" ON "UserWorkspaceAgent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWorkspaceAgent_userId_agentId_key" ON "UserWorkspaceAgent"("userId", "agentId");

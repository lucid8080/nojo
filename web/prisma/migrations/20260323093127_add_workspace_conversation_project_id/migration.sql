-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkspaceConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agentIds" JSONB NOT NULL,
    "primaryAgentId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkspaceConversation" ("agentIds", "createdAt", "description", "id", "primaryAgentId", "title", "updatedAt", "userId") SELECT "agentIds", "createdAt", "description", "id", "primaryAgentId", "title", "updatedAt", "userId" FROM "WorkspaceConversation";
DROP TABLE "WorkspaceConversation";
ALTER TABLE "new_WorkspaceConversation" RENAME TO "WorkspaceConversation";
CREATE INDEX "WorkspaceConversation_userId_idx" ON "WorkspaceConversation"("userId");
CREATE INDEX "WorkspaceConversation_createdAt_idx" ON "WorkspaceConversation"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openclawRunId" TEXT,
    "prompt" TEXT NOT NULL,
    "agentId" TEXT,
    "conversationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "errorMessage" TEXT,
    "lastCheckedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

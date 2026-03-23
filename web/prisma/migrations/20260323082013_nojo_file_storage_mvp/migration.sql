-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "currentRevisionId" TEXT,
    "createdByType" TEXT NOT NULL DEFAULT 'USER',
    "createdByUserId" TEXT,
    "createdByAgentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "ProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectFile_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "FileRevision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FileRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectFileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "changeSummary" TEXT,
    "createdByType" TEXT NOT NULL DEFAULT 'USER',
    "createdByUserId" TEXT,
    "createdByAgentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileRevision_projectFileId_fkey" FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_currentRevisionId_key" ON "ProjectFile"("currentRevisionId");

-- CreateIndex
CREATE INDEX "ProjectFile_projectId_idx" ON "ProjectFile"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFile_ownerUserId_idx" ON "ProjectFile"("ownerUserId");

-- CreateIndex
CREATE INDEX "ProjectFile_updatedAt_idx" ON "ProjectFile"("updatedAt");

-- CreateIndex
CREATE INDEX "FileRevision_projectFileId_idx" ON "FileRevision"("projectFileId");

-- CreateIndex
CREATE INDEX "FileRevision_createdAt_idx" ON "FileRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FileRevision_projectFileId_versionNumber_key" ON "FileRevision"("projectFileId", "versionNumber");

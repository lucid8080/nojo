-- CreateTable
CREATE TABLE "SkillCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT [],
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fullDefinitionMarkdown" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourcePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillCard_slug_key" ON "SkillCard"("slug");

-- CreateIndex
CREATE INDEX "SkillCard_status_idx" ON "SkillCard"("status");

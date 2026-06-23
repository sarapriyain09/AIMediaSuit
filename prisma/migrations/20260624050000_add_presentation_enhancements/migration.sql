-- Add enhancement metadata fields to presentation generations
ALTER TABLE "PresentationGeneration"
ADD COLUMN "visualStyle" TEXT,
ADD COLUMN "imagePrompt" TEXT,
ADD COLUMN "images" JSONB,
ADD COLUMN "subtitleSourceLanguage" TEXT,
ADD COLUMN "subtitleTargetLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "subtitleCues" JSONB,
ADD COLUMN "subtitleTranslations" JSONB,
ADD COLUMN "voiceoverText" TEXT,
ADD COLUMN "voiceover" JSONB;

-- Collaboration comments per presentation
CREATE TABLE "PresentationComment" (
  "id" UUID NOT NULL,
  "presentationId" UUID NOT NULL,
  "author" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresentationComment_pkey" PRIMARY KEY ("id")
);

-- Version snapshots per presentation
CREATE TABLE "PresentationVersion" (
  "id" UUID NOT NULL,
  "presentationId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "note" TEXT,
  "snapshotText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresentationVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PresentationComment_presentationId_createdAt_idx"
  ON "PresentationComment"("presentationId", "createdAt");

CREATE INDEX "PresentationVersion_presentationId_createdAt_idx"
  ON "PresentationVersion"("presentationId", "createdAt");

CREATE UNIQUE INDEX "PresentationVersion_presentationId_versionNumber_key"
  ON "PresentationVersion"("presentationId", "versionNumber");

ALTER TABLE "PresentationComment"
ADD CONSTRAINT "PresentationComment_presentationId_fkey"
FOREIGN KEY ("presentationId") REFERENCES "PresentationGeneration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PresentationVersion"
ADD CONSTRAINT "PresentationVersion_presentationId_fkey"
FOREIGN KEY ("presentationId") REFERENCES "PresentationGeneration"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

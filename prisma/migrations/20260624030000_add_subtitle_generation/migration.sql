-- CreateEnum
CREATE TYPE "SubtitleFormat" AS ENUM ('srt', 'vtt', 'captions');

-- CreateEnum
CREATE TYPE "SubtitleTone" AS ENUM ('verbatim', 'readable', 'engaging');

-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE IF NOT EXISTS 'SUBTITLE';

-- AlterEnum
ALTER TYPE "ModuleType" ADD VALUE IF NOT EXISTS 'BACKGROUND_MUSIC';

-- CreateTable
CREATE TABLE "SubtitleGeneration" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "format" "SubtitleFormat" NOT NULL,
    "tone" "SubtitleTone" NOT NULL,
    "sourceText" TEXT NOT NULL,
    "outputText" TEXT NOT NULL,
    "cueCount" INTEGER NOT NULL DEFAULT 0,
    "includeTimestamps" BOOLEAN NOT NULL DEFAULT true,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubtitleGeneration_userId_createdAt_idx" ON "SubtitleGeneration"("userId", "createdAt");

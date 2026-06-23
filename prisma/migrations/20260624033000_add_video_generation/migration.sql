-- CreateTable
CREATE TABLE "VideoGeneration" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 60,
    "prompt" TEXT NOT NULL,
    "outputText" TEXT NOT NULL,
    "sceneCount" INTEGER NOT NULL DEFAULT 0,
    "includeVoiceover" BOOLEAN NOT NULL DEFAULT true,
    "outputUrl" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoGeneration_userId_createdAt_idx" ON "VideoGeneration"("userId", "createdAt");

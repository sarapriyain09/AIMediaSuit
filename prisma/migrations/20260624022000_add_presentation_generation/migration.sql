DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GenerationStatus') THEN
    CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PresentationGoal') THEN
    CREATE TYPE "PresentationGoal" AS ENUM ('pitch', 'training', 'webinar', 'sales', 'report');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PresentationTone') THEN
    CREATE TYPE "PresentationTone" AS ENUM ('professional', 'persuasive', 'educational', 'storytelling');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PresentationLength') THEN
    CREATE TYPE "PresentationLength" AS ENUM ('short', 'medium', 'long');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "PresentationGeneration" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "goal" "PresentationGoal" NOT NULL,
  "tone" "PresentationTone" NOT NULL,
  "length" "PresentationLength" NOT NULL,
  "audience" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "outputText" TEXT NOT NULL,
  "slideCount" INTEGER NOT NULL DEFAULT 0,
  "includeSpeakerNotes" BOOLEAN NOT NULL DEFAULT true,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PresentationGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PresentationGeneration_userId_createdAt_idx" ON "PresentationGeneration"("userId", "createdAt");

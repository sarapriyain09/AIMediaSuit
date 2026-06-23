DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GenerationStatus') THEN
    CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PodcastFormat') THEN
    CREATE TYPE "PodcastFormat" AS ENUM ('interview', 'solo', 'panel', 'storytelling');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PodcastTone') THEN
    CREATE TYPE "PodcastTone" AS ENUM ('professional', 'conversational', 'energetic', 'educational');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PodcastLength') THEN
    CREATE TYPE "PodcastLength" AS ENUM ('short', 'medium', 'long');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "PodcastGeneration" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "format" "PodcastFormat" NOT NULL,
  "tone" "PodcastTone" NOT NULL,
  "length" "PodcastLength" NOT NULL,
  "hosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "outline" TEXT NOT NULL DEFAULT '',
  "prompt" TEXT NOT NULL,
  "script" TEXT NOT NULL,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PodcastGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PodcastGeneration_userId_createdAt_idx" ON "PodcastGeneration"("userId", "createdAt");

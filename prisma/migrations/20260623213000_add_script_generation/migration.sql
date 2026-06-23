DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScriptGoal') THEN
    CREATE TYPE "ScriptGoal" AS ENUM ('social', 'ad', 'youtube', 'email', 'sales');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScriptTone') THEN
    CREATE TYPE "ScriptTone" AS ENUM ('professional', 'friendly', 'bold', 'educational', 'storytelling');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScriptLength') THEN
    CREATE TYPE "ScriptLength" AS ENUM ('short', 'medium', 'long');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ScriptGeneration" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "outputText" TEXT NOT NULL,
  "goal" "ScriptGoal" NOT NULL,
  "tone" "ScriptTone" NOT NULL,
  "length" "ScriptLength" NOT NULL,
  "audience" TEXT NOT NULL,
  "callToAction" TEXT,
  "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScriptGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScriptGeneration_userId_createdAt_idx" ON "ScriptGeneration"("userId", "createdAt");

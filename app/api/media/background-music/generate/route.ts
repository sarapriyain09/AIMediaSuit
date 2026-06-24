import { GenerationStatus, ModuleType, VoiceType } from "@prisma/client";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { buildBackgroundMusicInputText } from "@/lib/background-music/metadata";
import { prisma } from "@/lib/db/prisma";
import { generateBackgroundMusicSchema } from "@/lib/schemas/background-music";
import { saveAudioFile } from "@/lib/storage/audio-storage";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const categoryFileMap = {
  corporate: "corporate.mp3",
  motivational: "motivational.mp3",
  ambient: "ambient.mp3",
  podcast: "podcast.mp3",
  cinematic: "cinematic.mp3",
  technology: "technology.mp3",
  happy: "happy.mp3",
} as const;

function runCommand(command: string, args: string[], cwd?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `${command} exited with code ${code}`));
      }
    });
  });
}

function runCommandWithStdout(command: string, args: string[], cwd?: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `${command} exited with code ${code}`));
      }
    });
  });
}

async function commandExists(command: string) {
  try {
    await runCommand(command, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function downloadAudio(url: string, targetPath: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch audio source: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, bytes);
}

async function detectDurationInSeconds(filePath: string) {
  try {
    const output = await runCommandWithStdout("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    const value = Number(output.trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function buildMusicFilter(input: {
  musicVolume: number;
  fadeInSec: number;
  fadeOutSec: number;
  targetDurationSec?: number;
}) {
  const parts = [`volume=${input.musicVolume / 100}`];
  if (input.fadeInSec > 0) {
    parts.push(`afade=t=in:st=0:d=${input.fadeInSec}`);
  }

  if (input.fadeOutSec > 0 && input.targetDurationSec && input.targetDurationSec > input.fadeOutSec) {
    parts.push(`afade=t=out:st=${input.targetDurationSec - input.fadeOutSec}:d=${input.fadeOutSec}`);
  }

  return parts.join(",");
}

export async function POST(request: NextRequest) {
  const hasFfmpeg = await commandExists("ffmpeg");
  if (!hasFfmpeg) {
    return jsonError("FFmpeg is not installed on the server.", 500);
  }

  try {
    const raw = await request.json();
    const input = generateBackgroundMusicSchema.parse(raw);
    const userId = await resolveUserId(request);

    const musicFileName = categoryFileMap[input.category];
    const musicSourcePath = join(process.cwd(), "storage", "music", musicFileName);

    try {
      await stat(musicSourcePath);
    } catch {
      return jsonError(
        `Music file not found for category '${input.category}'. Expected storage/music/${musicFileName}.`,
        404,
      );
    }

    const workDir = await mkdtemp(join(tmpdir(), "aimedia-music-"));

    try {
      const outFile = join(workDir, `mix-${randomUUID()}.mp3`);
      const hasVoiceTrack = Boolean(input.voiceAudioUrl.trim());
      const resolvedVoiceUrl = input.voiceAudioUrl.trim();

      if (hasVoiceTrack) {
        const voiceSourcePath = join(workDir, `voice-${randomUUID()}.mp3`);
        const voiceUrl = resolvedVoiceUrl.startsWith("/")
          ? new URL(resolvedVoiceUrl, request.nextUrl.origin).toString()
          : resolvedVoiceUrl;

        await downloadAudio(voiceUrl, voiceSourcePath);

        const filterComplex = [
          `[0:a]${buildMusicFilter({
            musicVolume: input.musicVolume,
            fadeInSec: input.fadeInSec,
            fadeOutSec: input.fadeOutSec,
          })}[m]`,
          `[1:a]volume=${input.voiceVolume / 100}[v]`,
          "[m][v]amix=inputs=2:duration=second:dropout_transition=2[aout]",
        ].join(";");

        const args = ["-y"];
        if (input.loopMusic) {
          args.push("-stream_loop", "-1");
        }

        args.push(
          "-i",
          musicSourcePath,
          "-i",
          voiceSourcePath,
          "-filter_complex",
          filterComplex,
          "-map",
          "[aout]",
          "-c:a",
          "libmp3lame",
          "-q:a",
          "2",
          "-shortest",
          outFile,
        );

        await runCommand("ffmpeg", args);
      } else {
        const musicFilter = buildMusicFilter({
          musicVolume: input.musicVolume,
          fadeInSec: input.fadeInSec,
          fadeOutSec: input.fadeOutSec,
        });

        await runCommand("ffmpeg", [
          "-y",
          "-i",
          musicSourcePath,
          "-filter:a",
          musicFilter,
          "-c:a",
          "libmp3lame",
          "-q:a",
          "2",
          outFile,
        ]);
      }

      const outputBuffer = await readFile(outFile);
      const durationSec = await detectDurationInSeconds(outFile);
      const saved = await saveAudioFile(outputBuffer);
      const resolvedTitle = input.title || `${input.category[0].toUpperCase()}${input.category.slice(1)} Mix`;

      if (process.env.DATABASE_URL) {
        try {
          const created = await prisma.mediaGeneration.create({
            data: {
              userId,
              moduleType: ModuleType.BACKGROUND_MUSIC,
              title: resolvedTitle,
              inputText: buildBackgroundMusicInputText({
                prompt: input.prompt,
                category: input.category,
                voiceAudioUrl: resolvedVoiceUrl,
                musicVolume: input.musicVolume,
                voiceVolume: input.voiceVolume,
                fadeInSec: input.fadeInSec,
                fadeOutSec: input.fadeOutSec,
                loopMusic: input.loopMusic,
                outputFormat: "mp3",
              }),
              voice: VoiceType.alloy,
              speed: 1,
              duration: durationSec ? Math.round(durationSec) : null,
              outputUrl: saved.urlPath,
              status: GenerationStatus.COMPLETED,
            },
          });

          return NextResponse.json({
            id: created.id,
            title: created.title,
            outputUrl: created.outputUrl,
            duration: created.duration,
            status: created.status,
            createdAt: created.createdAt.toISOString(),
            generatedAt: created.createdAt.toISOString(),
            meta: {
              prompt: input.prompt,
              category: input.category,
              voiceAudioUrl: resolvedVoiceUrl || null,
              musicVolume: input.musicVolume,
              voiceVolume: input.voiceVolume,
              fadeInSec: input.fadeInSec,
              fadeOutSec: input.fadeOutSec,
              loopMusic: input.loopMusic,
              outputFormat: "mp3",
              sourceTrack: basename(musicSourcePath),
            },
          });
        } catch {
          // Return generated output without persistence when database is unavailable.
        }
      }

      return NextResponse.json({
        id: randomUUID(),
        title: resolvedTitle,
        outputUrl: saved.urlPath,
        duration: durationSec ? Math.round(durationSec) : null,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        meta: {
          prompt: input.prompt,
          category: input.category,
          voiceAudioUrl: resolvedVoiceUrl || null,
          musicVolume: input.musicVolume,
          voiceVolume: input.voiceVolume,
          fadeInSec: input.fadeInSec,
          fadeOutSec: input.fadeOutSec,
          loopMusic: input.loopMusic,
          outputFormat: "mp3",
          sourceTrack: basename(musicSourcePath),
        },
      });
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate background music.";
    return jsonError(message, 400);
  }
}

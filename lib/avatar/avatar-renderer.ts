import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { saveVideoFile } from "@/lib/storage/video-storage";
import type { AvatarAspectRatio } from "@/types/media";

function runCommand(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
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

async function commandExists(command: string) {
  try {
    await runCommand(command, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

function getResolution(aspectRatio: AvatarAspectRatio) {
  if (aspectRatio === "9:16") {
    return { width: 1080, height: 1920 };
  }

  return { width: 1920, height: 1080 };
}

async function downloadToFile(url: string, targetPath: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch asset: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, bytes);
}

export async function renderAvatarPlaceholder(input: {
  script: string;
  aspectRatio: AvatarAspectRatio;
  voiceAudioUrl: string;
  backgroundImageUrl: string;
  requestOrigin: string;
}) {
  const hasFfmpeg = await commandExists("ffmpeg");
  if (!hasFfmpeg) {
    throw new Error("FFmpeg is not installed on the server.");
  }

  const workDir = await mkdtemp(join(tmpdir(), "aimedia-avatar-"));

  try {
    const outFile = join(workDir, `avatar-${randomUUID()}.mp4`);
    const imagePath = join(workDir, `bg-${randomUUID()}.img`);
    const voicePath = join(workDir, `voice-${randomUUID()}.mp3`);
    const estimatedDuration = Math.max(8, Math.round(input.script.trim().split(/\s+/).filter(Boolean).length / 2.4));
    const { width, height } = getResolution(input.aspectRatio);

    const hasBackground = Boolean(input.backgroundImageUrl.trim());
    const hasVoice = Boolean(input.voiceAudioUrl.trim());

    if (hasBackground) {
      const bgUrl = input.backgroundImageUrl.startsWith("/")
        ? new URL(input.backgroundImageUrl, input.requestOrigin).toString()
        : input.backgroundImageUrl;
      await downloadToFile(bgUrl, imagePath);
    }

    if (hasVoice) {
      const voiceUrl = input.voiceAudioUrl.startsWith("/")
        ? new URL(input.voiceAudioUrl, input.requestOrigin).toString()
        : input.voiceAudioUrl;
      await downloadToFile(voiceUrl, voicePath);
    }

    const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;

    if (hasBackground && hasVoice) {
      await runCommand("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-i",
        voicePath,
        "-vf",
        scaleFilter,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outFile,
      ]);
    } else if (hasBackground && !hasVoice) {
      await runCommand("ffmpeg", [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-vf",
        scaleFilter,
        "-t",
        String(estimatedDuration),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outFile,
      ]);
    } else if (!hasBackground && hasVoice) {
      await runCommand("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=#101727:s=${width}x${height}:d=${estimatedDuration}`,
        "-i",
        voicePath,
        "-vf",
        "format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outFile,
      ]);
    } else {
      await runCommand("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=#101727:s=${width}x${height}:d=${estimatedDuration}`,
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=44100:cl=stereo",
        "-vf",
        "format=yuv420p",
        "-t",
        String(estimatedDuration),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        outFile,
      ]);
    }

    const outputBuffer = await readFile(outFile);
    const saved = await saveVideoFile(outputBuffer);

    return {
      outputUrl: saved.urlPath,
      duration: estimatedDuration,
      engine: "ffmpeg-placeholder",
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

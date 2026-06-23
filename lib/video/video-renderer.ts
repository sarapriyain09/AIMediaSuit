import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { VoiceProviderFactory } from "@/lib/providers/voice-provider-factory";
import { saveVideoFile } from "@/lib/storage/video-storage";
import type { VoiceType } from "@/types/media";

export type RenderScene = {
  sceneNumber: number;
  duration: number;
  caption: string;
  voiceover: string;
  image: string;
  transition: "cut" | "fade";
};

export type RenderOptions = {
  scenes: RenderScene[];
  aspectRatio: "16:9" | "9:16" | "1:1";
  quality: "1080p" | "720p";
  voice: VoiceType;
  speed: number;
  includeSubtitles: boolean;
  musicTrack: "none" | "corporate" | "motivational" | "ambient" | "upbeat";
  voiceVolume: number;
  musicVolume: number;
};

const musicTrackFiles: Record<Exclude<RenderOptions["musicTrack"], "none">, string> = {
  corporate: "corporate.mp3",
  motivational: "motivational.mp3",
  ambient: "ambient.mp3",
  upbeat: "upbeat.mp3",
};

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

function getResolution(aspectRatio: RenderOptions["aspectRatio"], quality: RenderOptions["quality"]) {
  if (aspectRatio === "9:16") {
    return quality === "1080p" ? { width: 1080, height: 1920 } : { width: 720, height: 1280 };
  }

  if (aspectRatio === "1:1") {
    return quality === "1080p" ? { width: 1080, height: 1080 } : { width: 720, height: 720 };
  }

  return quality === "1080p" ? { width: 1920, height: 1080 } : { width: 1280, height: 720 };
}

async function writeSubtitlesFile(filePath: string, scenes: RenderScene[]) {
  let t = 0;
  const chunks: string[] = [];

  const toSrtTime = (seconds: number) => {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const hh = Math.floor(totalMs / 3600000)
      .toString()
      .padStart(2, "0");
    const mm = Math.floor((totalMs % 3600000) / 60000)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor((totalMs % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    const mmm = (totalMs % 1000).toString().padStart(3, "0");
    return `${hh}:${mm}:${ss},${mmm}`;
  };

  scenes.forEach((scene, index) => {
    const start = t;
    const end = t + Math.max(1, scene.duration);
    t = end;

    const line = scene.caption?.trim() || " ";
    chunks.push(`${index + 1}\n${toSrtTime(start)} --> ${toSrtTime(end)}\n${line}\n`);
  });

  await writeFile(filePath, chunks.join("\n"), "utf-8");
}

async function downloadIfUrl(input: string, outputPath: string) {
  if (!/^https?:\/\//i.test(input)) {
    return input;
  }

  const response = await fetch(input);
  if (!response.ok) {
    throw new Error(`Failed to fetch scene image: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
  return outputPath;
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function renderVideo(options: RenderOptions) {
  const hasFfmpeg = await runCommand("ffmpeg", ["-version"]).then(
    () => true,
    () => false,
  );

  if (!hasFfmpeg) {
    throw new Error("FFmpeg is not installed on the server.");
  }

  if (options.scenes.length === 0) {
    throw new Error("At least one scene is required.");
  }

  const workingDir = await mkdtemp(join(tmpdir(), "aimedia-video-"));

  try {
    const { width, height } = getResolution(options.aspectRatio, options.quality);
    const provider = VoiceProviderFactory.resolve();

    const sceneVideos: string[] = [];
    for (let i = 0; i < options.scenes.length; i += 1) {
      const scene = options.scenes[i];
      const sceneIndex = i + 1;

      const voicePath = join(workingDir, `scene-${sceneIndex}.mp3`);
      const imagePath = join(workingDir, `scene-${sceneIndex}.img`);
      const videoPath = join(workingDir, `scene-${sceneIndex}.mp4`);

      const voiceText = scene.voiceover?.trim() || scene.caption?.trim() || `Scene ${sceneIndex}`;
      const voiceMp3 = await provider.generateSpeechMp3(voiceText, options.voice, options.speed);
      await writeFile(voicePath, voiceMp3);

      const localImagePath = await downloadIfUrl(scene.image || "", imagePath).catch(() => "");
      const duration = Math.max(1, Math.round(scene.duration || 6));
      const fadeDuration = Math.min(0.4, Math.max(0, duration - 0.2));
      const shouldFade = scene.transition === "fade";
      const baseScaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;
      const sceneVideoFilter = shouldFade
        ? `${baseScaleFilter},fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration}`
        : baseScaleFilter;
      const sceneAudioFilter = shouldFade
        ? `afade=t=in:st=0:d=${fadeDuration},afade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration}`
        : "anull";

      if (localImagePath) {
        await runCommand("ffmpeg", [
          "-y",
          "-loop",
          "1",
          "-i",
          localImagePath,
          "-i",
          voicePath,
          "-vf",
          sceneVideoFilter,
          "-af",
          sceneAudioFilter,
          "-t",
          String(duration),
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
          videoPath,
        ]);
      } else {
        await runCommand("ffmpeg", [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=black:s=${width}x${height}:d=${duration}`,
          "-i",
          voicePath,
          "-vf",
          shouldFade
            ? `fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration},format=yuv420p`
            : "format=yuv420p",
          "-af",
          sceneAudioFilter,
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
          videoPath,
        ]);
      }

      sceneVideos.push(videoPath);
    }

    const concatPath = join(workingDir, "concat.txt");
    const concatContents = sceneVideos.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
    await writeFile(concatPath, concatContents, "utf-8");

    const joinedPath = join(workingDir, "joined.mp4");
    await runCommand("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
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
      joinedPath,
    ]);

    let currentPath = joinedPath;
    if (options.includeSubtitles) {
      const subtitlePath = join(workingDir, "output.srt");
      await writeSubtitlesFile(subtitlePath, options.scenes);
      const subtitledPath = join(workingDir, "subtitled.mp4");
      await runCommand("ffmpeg", [
        "-y",
        "-i",
        currentPath,
        "-vf",
        `subtitles=${subtitlePath}`,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "copy",
        subtitledPath,
      ]);
      currentPath = subtitledPath;
    }

    if (options.musicTrack !== "none") {
      const musicDir = join(process.cwd(), "storage", "music");
      await mkdir(musicDir, { recursive: true });
      const musicPath = join(musicDir, musicTrackFiles[options.musicTrack]);

      if (await exists(musicPath)) {
        const mixedPath = join(workingDir, "mixed.mp4");
        await runCommand("ffmpeg", [
          "-y",
          "-stream_loop",
          "-1",
          "-i",
          musicPath,
          "-i",
          currentPath,
          "-filter_complex",
          `[0:a]volume=${options.musicVolume / 100}[m];[1:a]volume=${options.voiceVolume / 100}[v];[m][v]amix=inputs=2:duration=second:dropout_transition=2[aout]`,
          "-map",
          "1:v:0",
          "-map",
          "[aout]",
          "-c:v",
          "copy",
          "-c:a",
          "aac",
          "-shortest",
          mixedPath,
        ]);
        currentPath = mixedPath;
      }
    }

    const finalBuffer = await readFile(currentPath);
    const { urlPath } = await saveVideoFile(finalBuffer);

    return {
      outputUrl: urlPath,
      sceneCount: options.scenes.length,
      totalDurationSec: options.scenes.reduce((sum, item) => sum + Math.max(1, item.duration), 0),
    };
  } finally {
    await rm(workingDir, { recursive: true, force: true });
  }
}

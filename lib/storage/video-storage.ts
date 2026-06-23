import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, normalize, sep } from "node:path";

const storageRoot = process.env.STORAGE_ROOT ?? join(process.cwd(), "storage");

function getDatePath(date: Date) {
  const yyyy = date.getUTCFullYear().toString();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return { yyyy, mm, dd };
}

export async function saveVideoFile(content: Buffer, now = new Date()) {
  const { yyyy, mm, dd } = getDatePath(now);
  const relativeFolder = join("video", yyyy, mm, dd);
  const absoluteFolder = join(storageRoot, relativeFolder);
  await mkdir(absoluteFolder, { recursive: true });

  const filename = `${crypto.randomUUID()}.mp4`;
  const absolutePath = join(absoluteFolder, filename);
  await writeFile(absolutePath, content);

  const urlPath = `/media/video/${yyyy}/${mm}/${dd}/${filename}`;
  return { absolutePath, urlPath };
}

export async function readVideoByPublicPath(pathSegments: string[]) {
  if (pathSegments.some((segment) => segment.includes(".."))) {
    throw new Error("Invalid file path");
  }

  const safePath = normalize(pathSegments.join(sep));
  const absolutePath = join(storageRoot, "video", safePath);
  const file = await readFile(absolutePath);
  const details = await stat(absolutePath);

  return { file, size: details.size };
}

export async function deleteVideoByPublicUrl(outputUrl: string) {
  const parsed = outputUrl.replace(/^https?:\/\/[^/]+/i, "");
  if (!parsed.startsWith("/media/video/")) {
    return;
  }

  const relative = parsed.replace("/media/video/", "");
  if (relative.includes("..")) {
    return;
  }

  const absolutePath = join(storageRoot, "video", normalize(relative));
  await rm(absolutePath, { force: true });
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  BackgroundMusicCategory,
  BackgroundMusicHistoryItem,
  BackgroundMusicStatistics,
} from "@/types/media";

type StudioTab = "create" | "templates" | "history";

type GenerateBackgroundMusicResponse = {
  id: string;
  title: string;
  outputUrl: string | null;
  duration: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  generatedAt: string;
  meta: {
    prompt: string;
    category: BackgroundMusicCategory;
    voiceAudioUrl: string | null;
    musicVolume: number;
    voiceVolume: number;
    fadeInSec: number;
    fadeOutSec: number;
    loopMusic: boolean;
    outputFormat: "mp3";
    sourceTrack: string;
  };
};

type Template = {
  id: string;
  title: string;
  category: BackgroundMusicCategory;
  prompt: string;
  musicVolume: number;
  voiceVolume: number;
  fadeInSec: number;
  fadeOutSec: number;
  loopMusic: boolean;
};

const templates: Template[] = [
  {
    id: "corp-tech",
    title: "Corporate Technology Underscore",
    category: "corporate",
    prompt: "Polished product demo voiceover with confident, modern energy.",
    musicVolume: 28,
    voiceVolume: 100,
    fadeInSec: 1,
    fadeOutSec: 2,
    loopMusic: true,
  },
  {
    id: "podcast-soft",
    title: "Podcast Intro Bed",
    category: "podcast",
    prompt: "Warm, subtle intro bed for conversational podcast opening.",
    musicVolume: 24,
    voiceVolume: 100,
    fadeInSec: 2,
    fadeOutSec: 2,
    loopMusic: true,
  },
  {
    id: "motivation-ad",
    title: "Motivational Promo Mix",
    category: "motivational",
    prompt: "Inspirational ad voiceover with uplifting pacing and CTA at end.",
    musicVolume: 34,
    voiceVolume: 100,
    fadeInSec: 1,
    fadeOutSec: 3,
    loopMusic: true,
  },
];

const categories: BackgroundMusicCategory[] = [
  "corporate",
  "motivational",
  "ambient",
  "podcast",
  "cinematic",
  "technology",
  "happy",
];

async function fetchJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    throw new Error(err.error ?? "Request failed");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function BackgroundMusicStudioClient() {
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<BackgroundMusicCategory>("corporate");
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(30);
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [fadeInSec, setFadeInSec] = useState(0);
  const [fadeOutSec, setFadeOutSec] = useState(0);
  const [loopMusic, setLoopMusic] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateBackgroundMusicResponse | null>(null);
  const [history, setHistory] = useState<BackgroundMusicHistoryItem[]>([]);
  const [stats, setStats] = useState<BackgroundMusicStatistics>({
    totalTracksGenerated: 0,
    mostUsedCategory: "N/A",
    recentTracks: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<BackgroundMusicHistoryItem[]>("/api/media/background-music/history"),
      fetchJson<BackgroundMusicStatistics>("/api/media/background-music/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll();
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return templates;
    }

    return templates.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return history;
    }

    return history.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q)
      );
    });
  }, [history, search]);

  const categoryDistribution = useMemo(() => {
    const counts = new Map<BackgroundMusicCategory, number>();
    history.forEach((item) => counts.set(item.category, (counts.get(item.category) ?? 0) + 1));

    return categories
      .map((name) => ({ name, count: counts.get(name) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setPrompt(template.prompt);
    setCategory(template.category);
    setMusicVolume(template.musicVolume);
    setVoiceVolume(template.voiceVolume);
    setFadeInSec(template.fadeInSec);
    setFadeOutSec(template.fadeOutSec);
    setLoopMusic(template.loopMusic);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const removeTrack = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/background-music/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Track deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const loadFromHistory = (item: BackgroundMusicHistoryItem) => {
    setTitle(item.title);
    setPrompt(item.prompt);
    setCategory(item.category);
    setVoiceAudioUrl(item.voiceAudioUrl ?? "");
    setMusicVolume(item.musicVolume);
    setVoiceVolume(item.voiceVolume);
    setFadeInSec(item.fadeInSec);
    setFadeOutSec(item.fadeOutSec);
    setLoopMusic(item.loopMusic);
    setResult({
      id: item.id,
      title: item.title,
      outputUrl: item.outputUrl,
      duration: item.duration,
      status: item.status,
      createdAt: item.createdAt,
      generatedAt: item.createdAt,
      meta: {
        prompt: item.prompt,
        category: item.category,
        voiceAudioUrl: item.voiceAudioUrl,
        musicVolume: item.musicVolume,
        voiceVolume: item.voiceVolume,
        fadeInSec: item.fadeInSec,
        fadeOutSec: item.fadeOutSec,
        loopMusic: item.loopMusic,
        outputFormat: item.outputFormat,
        sourceTrack: `${item.category}.mp3`,
      },
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt describing your mix context.");
      return;
    }

    setLoading(true);
    try {
      const generated = await fetchJson<GenerateBackgroundMusicResponse>("/api/media/background-music/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          prompt,
          category,
          voiceAudioUrl,
          musicVolume,
          voiceVolume,
          fadeInSec,
          fadeOutSec,
          loopMusic,
          outputFormat: "mp3",
        }),
      });

      setResult(generated);
      toast.success("Background music mix generated.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <section className="panel animate-float-in overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-xl">♫</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Background Music Studio</h1>
              <p className="text-sm text-blue-100/70">Mix voiceovers with curated royalty-free tracks</p>
            </div>
          </div>
          <div className="text-xs text-slate-300">Output: MP3</div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "templates", label: "Templates" },
            { key: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as StudioTab)}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === tab.key ? "bg-emerald-500/20 text-emerald-200" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto w-full max-w-xs">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates/history..."
              className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400/60"
            />
          </div>
        </div>

        {activeTab === "create" && (
          <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <label className="block text-sm text-slate-300">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Campaign hero mix"
                className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
              />

              <label className="block text-sm text-slate-300">Prompt / Context</label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Describe voiceover context so AI can recommend and mix properly."
                rows={4}
                className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
              />

              <label className="block text-sm text-slate-300">Voice Audio URL (optional)</label>
              <input
                value={voiceAudioUrl}
                onChange={(event) => setVoiceAudioUrl(event.target.value)}
                placeholder="/media/audio/2026/06/24/example.mp3"
                className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-300">Category</label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as BackgroundMusicCategory)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/60"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-end gap-2 rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
                  <input type="checkbox" checked={loopMusic} onChange={(event) => setLoopMusic(event.target.checked)} />
                  Loop music while mixing
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Music Volume: {musicVolume}%</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(event) => setMusicVolume(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Voice Volume: {voiceVolume}%</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={voiceVolume}
                    onChange={(event) => setVoiceVolume(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Fade In (sec)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={fadeInSec}
                    onChange={(event) => setFadeInSec(Number(event.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Fade Out (sec)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={fadeOutSec}
                    onChange={(event) => setFadeOutSec(Number(event.target.value))}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400/60"
                  />
                </div>
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Generating..." : "Generate Mix"}
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <h2 className="text-base font-semibold text-white">Current Output</h2>
              {!result?.outputUrl && <p className="text-sm text-slate-400">Generate a mix to preview and download output.</p>}

              {result?.outputUrl && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300">
                    <p className="font-medium text-white">{result.title}</p>
                    <p className="mt-1">Category: {result.meta.category}</p>
                    <p>Duration: {result.duration ? `${result.duration}s` : "N/A"}</p>
                    <p>Track: {result.meta.sourceTrack}</p>
                  </div>

                  <audio controls src={result.outputUrl} className="w-full" />

                  <a
                    href={result.outputUrl}
                    download
                    className="inline-flex rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                  >
                    Download MP3
                  </a>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-400">
                Tip: If you already generated speech in Voice Studio, paste its local media URL and this studio will auto-mix it with your selected music category.
              </div>
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition hover:border-emerald-400/50 hover:bg-slate-900/40"
              >
                <p className="text-sm font-semibold text-white">{template.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300/80">{template.category}</p>
                <p className="mt-2 text-sm text-slate-300">{template.prompt}</p>
              </button>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 px-5 pb-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Total tracks</p>
                <p className="text-2xl font-semibold text-white">{stats.totalTracksGenerated}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Most used category</p>
                <p className="text-2xl font-semibold text-white">{stats.mostUsedCategory}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Last 7 days</p>
                <p className="text-2xl font-semibold text-white">{stats.recentTracks}</p>
              </div>
            </div>

            {categoryDistribution.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Category Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {categoryDistribution.map((row) => (
                    <span key={row.name} className="rounded-full border border-white/15 px-2 py-1 text-xs">
                      {row.name}: {row.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filteredHistory.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/20 p-6 text-center text-sm text-slate-400">
                No background music tracks yet.
              </div>
            )}

            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-emerald-300/80">{item.category}</p>
                  <p className="mt-2 text-sm text-slate-300 line-clamp-2">{item.prompt}</p>
                  <p className="mt-2 text-xs text-slate-500">{format(new Date(item.createdAt), "PPpp")}</p>
                  {item.outputUrl && <audio controls src={item.outputUrl} className="mt-3 w-full max-w-xl" />}
                </div>

                <div className="flex items-start gap-2">
                  <button
                    onClick={() => loadFromHistory(item)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => void removeTrack(item.id)}
                    className="rounded-lg border border-red-300/25 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

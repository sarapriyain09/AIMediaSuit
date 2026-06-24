"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  AvatarAspectRatio,
  AvatarBackground,
  AvatarHistoryItem,
  AvatarLanguage,
  AvatarPreset,
  AvatarRenderMode,
  AvatarStatistics,
} from "@/types/media";

type StudioTab = "create" | "templates" | "history";

type GenerateAvatarResponse = AvatarHistoryItem & {
  generatedAt: string;
  meta: {
    phase: string;
    render: string;
  };
};

type Template = {
  id: string;
  title: string;
  script: string;
  preset: AvatarPreset;
  background: AvatarBackground;
  language: AvatarLanguage;
  aspectRatio: AvatarAspectRatio;
};

function getStatusBadgeClass(status: AvatarHistoryItem["status"]) {
  if (status === "COMPLETED") {
    return "border-emerald-300/30 bg-emerald-500/10 text-emerald-200";
  }

  if (status === "PROCESSING") {
    return "border-amber-300/30 bg-amber-500/10 text-amber-200";
  }

  if (status === "FAILED") {
    return "border-red-300/30 bg-red-500/10 text-red-200";
  }

  return "border-cyan-300/30 bg-cyan-500/10 text-cyan-200";
}

const presets: AvatarPreset[] = ["business-male", "business-female", "teacher", "trainer", "support"];
const backgrounds: AvatarBackground[] = ["office", "studio", "classroom", "home"];
const languages: AvatarLanguage[] = ["english", "tamil", "hindi", "spanish"];
const aspectRatios: AvatarAspectRatio[] = ["16:9", "9:16"];

const templates: Template[] = [
  {
    id: "biz-pitch",
    title: "Business Product Pitch",
    script:
      "Welcome to Velynxia AI Media Suite. Today I will walk you through how your team can generate campaign-ready media in minutes, not days.",
    preset: "business-female",
    background: "office",
    language: "english",
    aspectRatio: "16:9",
  },
  {
    id: "trainer-onboarding",
    title: "Onboarding Trainer",
    script:
      "In this session, we will complete account setup, workspace preferences, and your first AI-assisted content workflow in three easy steps.",
    preset: "trainer",
    background: "classroom",
    language: "english",
    aspectRatio: "16:9",
  },
  {
    id: "support-update",
    title: "Customer Support Update",
    script:
      "Hello and welcome. We have shipped performance improvements and new subtitle controls. Let us quickly cover what changed and what to try first.",
    preset: "support",
    background: "studio",
    language: "english",
    aspectRatio: "9:16",
  },
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

export function AvatarStudioClient() {
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [preset, setPreset] = useState<AvatarPreset>("business-male");
  const [background, setBackground] = useState<AvatarBackground>("studio");
  const [language, setLanguage] = useState<AvatarLanguage>("english");
  const [aspectRatio, setAspectRatio] = useState<AvatarAspectRatio>("16:9");
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [renderMode, setRenderMode] = useState<AvatarRenderMode>("sync");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateAvatarResponse | null>(null);
  const [history, setHistory] = useState<AvatarHistoryItem[]>([]);
  const [stats, setStats] = useState<AvatarStatistics>({
    totalAvatarsGenerated: 0,
    mostUsedPreset: "N/A",
    recentAvatars: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<AvatarHistoryItem[]>("/api/media/avatar/history"),
      fetchJson<AvatarStatistics>("/api/media/avatar/statistics"),
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
        item.preset.toLowerCase().includes(q) ||
        item.script.toLowerCase().includes(q)
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
        item.preset.toLowerCase().includes(q) ||
        item.script.toLowerCase().includes(q)
      );
    });
  }, [history, search]);

  const presetDistribution = useMemo(() => {
    const counts = new Map<AvatarPreset, number>();
    history.forEach((item) => counts.set(item.preset, (counts.get(item.preset) ?? 0) + 1));

    return presets
      .map((name) => ({ name, count: counts.get(name) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setScript(template.script);
    setPreset(template.preset);
    setBackground(template.background);
    setLanguage(template.language);
    setAspectRatio(template.aspectRatio);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const loadFromHistory = (item: AvatarHistoryItem) => {
    setTitle(item.title);
    setScript(item.script);
    setPreset(item.preset);
    setBackground(item.background);
    setLanguage(item.language);
    setAspectRatio(item.aspectRatio);
    setVoiceAudioUrl(item.voiceAudioUrl ?? "");
    setBackgroundImageUrl(item.backgroundImageUrl ?? "");
    setRenderMode(item.renderMode);
    setResult({
      ...item,
      generatedAt: item.createdAt,
      meta: {
        phase: "phase-2",
        render: item.outputUrl ? "ffmpeg-placeholder" : item.renderMode === "queue" ? "queued" : "failed",
      },
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  const removeItem = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/avatar/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Avatar item deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const enqueueItem = async (id: string) => {
    try {
      await fetchJson<GenerateAvatarResponse>(`/api/media/avatar/${id}/enqueue`, {
        method: "POST",
      });
      await refreshAll();
      toast.success("Avatar job queued.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Queue failed.");
    }
  };

  const processItem = async (id: string) => {
    try {
      const processed = await fetchJson<GenerateAvatarResponse>(`/api/media/avatar/${id}/process`, {
        method: "POST",
      });
      setResult(processed);
      await refreshAll();
      toast.success(processed.status === "COMPLETED" ? "Avatar job processed." : "Avatar processing finished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Process failed.");
    }
  };

  const generate = async () => {
    if (!script.trim()) {
      toast.error("Enter avatar script.");
      return;
    }

    setLoading(true);
    try {
      const generated = await fetchJson<GenerateAvatarResponse>("/api/media/avatar/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          script,
          preset,
          background,
          language,
          aspectRatio,
          voiceAudioUrl,
          backgroundImageUrl,
          renderMode,
        }),
      });

      setResult(generated);
      toast.success(renderMode === "queue" ? "Avatar job queued." : "Avatar video generated.");
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
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl">◉</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Avatar Studio</h1>
              <p className="text-sm text-blue-100/70">Create talking presenter jobs from scripts and voice handoff context</p>
            </div>
          </div>
          <div className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">Phase 2</div>
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
                activeTab === tab.key ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:bg-white/10"
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
              className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400/60"
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
                placeholder="Weekly update presenter"
                className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
              />

              <label className="block text-sm text-slate-300">Script</label>
              <textarea
                value={script}
                onChange={(event) => setScript(event.target.value)}
                rows={7}
                placeholder="Enter the full presenter script..."
                className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Avatar preset</label>
                  <select
                    value={preset}
                    onChange={(event) => setPreset(event.target.value as AvatarPreset)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                  >
                    {presets.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Background</label>
                  <select
                    value={background}
                    onChange={(event) => setBackground(event.target.value as AvatarBackground)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                  >
                    {backgrounds.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Language</label>
                  <select
                    value={language}
                    onChange={(event) => setLanguage(event.target.value as AvatarLanguage)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                  >
                    {languages.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-300">Aspect ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value as AvatarAspectRatio)}
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                  >
                    {aspectRatios.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Voice audio URL (optional)</label>
                  <input
                    value={voiceAudioUrl}
                    onChange={(event) => setVoiceAudioUrl(event.target.value)}
                    placeholder="/media/audio/2026/06/24/voice.mp3"
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Background image URL (optional)</label>
                  <input
                    value={backgroundImageUrl}
                    onChange={(event) => setBackgroundImageUrl(event.target.value)}
                    placeholder="https://example.com/background.jpg"
                    className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Render mode</label>
                <select
                  value={renderMode}
                  onChange={(event) => setRenderMode(event.target.value as AvatarRenderMode)}
                  className="w-full rounded-lg border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60"
                >
                  <option value="sync">Sync render (attempt MP4 now)</option>
                  <option value="queue">Queue only (worker-ready)</option>
                </select>
              </div>

              <button
                onClick={generate}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Generating..." : "Generate Avatar"}
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <h2 className="text-base font-semibold text-white">Current Output</h2>
              {!result && <p className="text-sm text-slate-400">Generate an avatar job to preview metadata and queue state.</p>}

              {result && (
                <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-300">
                  <p className="font-medium text-white">{result.title}</p>
                  <p>Preset: {result.preset}</p>
                  <p>Background: {result.background}</p>
                  <p>Language: {result.language}</p>
                  <p>Aspect ratio: {result.aspectRatio}</p>
                  <p>Render mode: {result.renderMode}</p>
                  <p>Estimated duration: {result.duration ?? "N/A"}s</p>
                  <p>
                    Status:{" "}
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide ${getStatusBadgeClass(result.status)}`}
                    >
                      {result.status}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Render engine: {result.meta.render}</p>
                  {result.outputUrl && <video controls src={result.outputUrl} className="w-full rounded-lg" />}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-xs text-slate-400">
                Phase 2 adds queue-ready jobs and FFmpeg placeholder output generation. Full lip-sync and animation engines are the next milestone.
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
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition hover:border-cyan-400/50 hover:bg-slate-900/40"
              >
                <p className="text-sm font-semibold text-white">{template.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-cyan-300/80">{template.preset}</p>
                <p className="mt-2 text-sm text-slate-300">{template.script}</p>
              </button>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 px-5 pb-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Total avatars</p>
                <p className="text-2xl font-semibold text-white">{stats.totalAvatarsGenerated}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Most used preset</p>
                <p className="text-2xl font-semibold text-white">{stats.mostUsedPreset}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                <p className="text-xs text-slate-400">Last 7 days</p>
                <p className="text-2xl font-semibold text-white">{stats.recentAvatars}</p>
              </div>
            </div>

            {presetDistribution.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-300">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Preset Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {presetDistribution.map((row) => (
                    <span key={row.name} className="rounded-full border border-white/15 px-2 py-1 text-xs">
                      {row.name}: {row.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filteredHistory.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/20 p-6 text-center text-sm text-slate-400">
                No avatar jobs yet.
              </div>
            )}

            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 lg:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-cyan-300/80">{item.preset}</p>
                  <p className="mt-1">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${getStatusBadgeClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </p>
                  <p className="mt-2 text-sm text-slate-300 line-clamp-3">{item.script}</p>
                  <p className="mt-2 text-xs text-slate-500">{format(new Date(item.createdAt), "PPpp")}</p>
                </div>

                <div className="flex items-start gap-2">
                  <button
                    onClick={() => void enqueueItem(item.id)}
                    disabled={item.status === "PROCESSING"}
                    className="rounded-lg border border-cyan-300/25 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Enqueue
                  </button>
                  <button
                    onClick={() => void processItem(item.id)}
                    disabled={item.status === "PROCESSING"}
                    className="rounded-lg border border-emerald-300/25 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Process
                  </button>
                  <button
                    onClick={() => loadFromHistory(item)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => void removeItem(item.id)}
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

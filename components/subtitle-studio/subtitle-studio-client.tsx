"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  SubtitleFormat,
  SubtitleHistoryItem,
  SubtitleStatistics,
  SubtitleTone,
} from "@/types/media";

type StudioTab = "create" | "my-subtitles" | "templates" | "history";
type HistoryFilter = "all" | "favorites";

type GenerateSubtitleResponse = {
  id: string;
  title: string;
  outputText: string;
  cueCount: number;
  includeTimestamps: boolean;
  isFavorite: boolean;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  generatedAt: string;
  meta: {
    topic: string;
    language: string;
    format: SubtitleFormat;
    tone: SubtitleTone;
  };
};

type Template = {
  id: string;
  title: string;
  topic: string;
  language: string;
  format: SubtitleFormat;
  tone: SubtitleTone;
  sourceText: string;
  includeTimestamps: boolean;
};

const templates: Template[] = [
  {
    id: "webinar-recap",
    title: "Webinar Recap SRT",
    topic: "Product webinar highlights",
    language: "English",
    format: "srt",
    tone: "readable",
    sourceText:
      "Welcome everyone to our product webinar. Today we will cover launch metrics, customer feedback, and next steps.",
    includeTimestamps: true,
  },
  {
    id: "social-vtt",
    title: "Social Clip VTT",
    topic: "Short-form promo clip",
    language: "English",
    format: "vtt",
    tone: "engaging",
    sourceText:
      "This week we shipped three major features. Stay tuned for a full walkthrough in our upcoming live session.",
    includeTimestamps: true,
  },
  {
    id: "training-captions",
    title: "Training Captions",
    topic: "Internal onboarding video",
    language: "English",
    format: "captions",
    tone: "verbatim",
    sourceText:
      "Step one is account setup. Step two is workspace configuration. Step three is testing your first workflow.",
    includeTimestamps: false,
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

export function SubtitleStudioClient() {
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  const [formatType, setFormatType] = useState<SubtitleFormat>("srt");
  const [tone, setTone] = useState<SubtitleTone>("readable");
  const [sourceText, setSourceText] = useState("");
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateSubtitleResponse | null>(null);
  const [editableSubtitle, setEditableSubtitle] = useState("");
  const [history, setHistory] = useState<SubtitleHistoryItem[]>([]);
  const [stats, setStats] = useState<SubtitleStatistics>({
    totalSubtitlesGenerated: 0,
    mostUsedFormat: "N/A",
    recentSubtitles: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<SubtitleHistoryItem[]>("/api/media/subtitle/history"),
      fetchJson<SubtitleStatistics>("/api/media/subtitle/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  useEffect(() => {
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
        item.format.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const formatGroups = useMemo(() => {
    const counts = new Map<SubtitleFormat, number>();
    history.forEach((item) => counts.set(item.format, (counts.get(item.format) ?? 0) + 1));

    return (["srt", "vtt", "captions"] as SubtitleFormat[])
      .map((name) => ({ name, count: counts.get(name) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const filteredHistory = useMemo(() => {
    const base = historyFilter === "favorites" ? history.filter((item) => item.isFavorite) : history;
    const q = search.trim().toLowerCase();
    if (!q) {
      return base;
    }

    return base.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q) ||
        item.outputText.toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, search]);

  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setTopic(template.topic);
    setLanguage(template.language);
    setFormatType(template.format);
    setTone(template.tone);
    setSourceText(template.sourceText);
    setIncludeTimestamps(template.includeTimestamps);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const removeSubtitle = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/subtitle/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Subtitle deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const duplicateSubtitle = async (id: string) => {
    try {
      await fetchJson<{ id: string }>(`/api/media/subtitle/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "duplicate" }),
      });
      await refreshAll();
      toast.success("Subtitle duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed.");
    }
  };

  const toggleFavorite = async (item: SubtitleHistoryItem) => {
    try {
      await fetchJson<{ id: string; isFavorite: boolean }>(`/api/media/subtitle/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      await refreshAll();
      toast.success(item.isFavorite ? "Removed from favorites." : "Marked as favorite.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const loadFromHistory = (item: SubtitleHistoryItem) => {
    setTitle(item.title);
    setTopic(item.topic);
    setLanguage(item.language);
    setFormatType(item.format);
    setTone(item.tone);
    setSourceText(item.sourceText);
    setIncludeTimestamps(item.includeTimestamps);
    setEditableSubtitle(item.outputText);
    setResult({
      id: item.id,
      title: item.title,
      outputText: item.outputText,
      cueCount: item.cueCount,
      includeTimestamps: item.includeTimestamps,
      isFavorite: item.isFavorite,
      status: item.status,
      createdAt: item.createdAt,
      generatedAt: item.createdAt,
      meta: {
        topic: item.topic,
        language: item.language,
        format: item.format,
        tone: item.tone,
      },
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Enter subtitle topic.");
      return;
    }

    if (!sourceText.trim()) {
      toast.error("Enter transcript/source text.");
      return;
    }

    setLoading(true);
    try {
      const generated = await fetchJson<GenerateSubtitleResponse>("/api/media/subtitle/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          topic,
          language,
          format: formatType,
          tone,
          sourceText,
          includeTimestamps,
        }),
      });

      setResult(generated);
      setEditableSubtitle(generated.outputText);
      toast.success("Subtitle generated successfully.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate subtitle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <section className="panel animate-float-in overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl">▦</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Subtitle Studio</h1>
              <p className="text-sm text-blue-100/70">Create AI-ready subtitle files for videos and clips</p>
            </div>
          </div>
          <button
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            onClick={() => {
              if (!editableSubtitle.trim()) {
                toast.error("No subtitle content to download.");
                return;
              }
              const extension = formatType === "vtt" ? "vtt" : formatType === "captions" ? "txt" : "srt";
              const blob = new Blob([editableSubtitle], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${(title || "subtitle").replace(/\s+/g, "-").toLowerCase()}.${extension}`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "my-subtitles", label: "My Subtitles" },
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
          <div className="ml-auto flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-1.5 text-sm outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        {activeTab === "create" && (
          <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold">Generate Subtitle</h2>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title (optional)"
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
              />
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Video/topic context"
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  placeholder="Language"
                  className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
                />
                <select
                  value={formatType}
                  onChange={(event) => setFormatType(event.target.value as SubtitleFormat)}
                  className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
                >
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                  <option value="captions">Captions</option>
                </select>
              </div>
              <select
                value={tone}
                onChange={(event) => setTone(event.target.value as SubtitleTone)}
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
              >
                <option value="verbatim">Verbatim</option>
                <option value="readable">Readable</option>
                <option value="engaging">Engaging</option>
              </select>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Paste transcript or source text"
                rows={9}
                className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-3 py-2 text-sm outline-none"
              />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(event) => setIncludeTimestamps(event.target.checked)}
                />
                Include timestamps
              </label>
              <button
                onClick={() => void generate()}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate Subtitle"}
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Output</h2>
                {result ? <span className="text-xs text-cyan-200">{result.cueCount} cues</span> : null}
              </div>
              <textarea
                value={editableSubtitle}
                onChange={(event) => setEditableSubtitle(event.target.value)}
                rows={18}
                placeholder="Generated subtitle text appears here"
                className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={async () => {
                  if (!editableSubtitle.trim()) {
                    toast.error("Nothing to copy.");
                    return;
                  }
                  await navigator.clipboard.writeText(editableSubtitle);
                  toast.success("Subtitle copied.");
                }}
                className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                Copy Output
              </button>
            </div>
          </div>
        )}

        {activeTab === "my-subtitles" && (
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Total Generated</p>
              <p className="mt-2 text-3xl font-semibold">{stats.totalSubtitlesGenerated}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Most Used Format</p>
              <p className="mt-2 text-3xl font-semibold uppercase">{stats.mostUsedFormat}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Recent (7d)</p>
              <p className="mt-2 text-3xl font-semibold">{stats.recentSubtitles}</p>
            </div>

            <div className="sm:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-200">Format Breakdown</h3>
              {formatGroups.length === 0 ? (
                <p className="text-sm text-slate-400">No subtitle records yet.</p>
              ) : (
                <div className="space-y-2">
                  {formatGroups.map((row) => (
                    <div key={row.name} className="flex items-center justify-between text-sm">
                      <span className="uppercase text-slate-300">{row.name}</span>
                      <span className="font-semibold text-white">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "templates" && (
          <div className="grid gap-3 px-5 pb-5 md:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-cyan-200/80">{template.format.toUpperCase()}</p>
                <h3 className="mt-1 text-lg font-semibold">{template.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{template.topic}</p>
                <button
                  onClick={() => applyTemplate(template)}
                  className="mt-4 w-full rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 px-5 pb-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHistoryFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  historyFilter === "all" ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryFilter("favorites")}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  historyFilter === "favorites"
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                Favorites
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No records found.</div>
            ) : (
              filteredHistory.map((item) => (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="text-xs text-slate-400">
                        {format(new Date(item.createdAt), "PP p")} • {item.format.toUpperCase()} • {item.cueCount} cues
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadFromHistory(item)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => void toggleFavorite(item)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                      >
                        {item.isFavorite ? "Unfavorite" : "Favorite"}
                      </button>
                      <button
                        onClick={() => void duplicateSubtitle(item.id)}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => void removeSubtitle(item.id)}
                        className="rounded-lg border border-rose-300/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/60 p-3 text-xs text-slate-200">
                    {item.outputText}
                  </pre>
                </article>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

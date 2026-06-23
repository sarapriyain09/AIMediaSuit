"use client";

import { format } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type {
  PodcastFormat,
  PodcastHistoryItem,
  PodcastLength,
  PodcastStatistics,
  PodcastTone,
} from "@/types/media";

type StudioTab = "create" | "my-episodes" | "templates" | "history";
type HistoryFilter = "all" | "favorites";

type GeneratePodcastResponse = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  format: PodcastFormat;
  tone: PodcastTone;
  length: PodcastLength;
  hosts: string[];
  outline: string;
  prompt: string;
  script: string;
  isFavorite: boolean;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  generatedAt: string;
};

type PodcastTemplate = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  format: PodcastFormat;
  tone: PodcastTone;
  length: PodcastLength;
  hosts: string[];
  outline: string;
  prompt: string;
};

const templates: PodcastTemplate[] = [
  {
    id: "founder-playbook",
    title: "Founder Growth Playbook",
    topic: "How startup founders can build repeatable growth loops",
    audience: "startup founders and growth leads",
    format: "interview",
    tone: "conversational",
    length: "medium",
    hosts: ["Host", "Guest"],
    outline: "1) Intro 2) Growth mistakes 3) Practical framework 4) Action checklist",
    prompt: "Create a practical episode script with examples and a strong ending summary.",
  },
  {
    id: "creator-economy",
    title: "Creator Economy Trends",
    topic: "How creators can diversify revenue in 2026",
    audience: "content creators and brand marketers",
    format: "panel",
    tone: "energetic",
    length: "long",
    hosts: ["Moderator", "Expert 1", "Expert 2"],
    outline: "1) Trend snapshot 2) Revenue channels 3) Tools stack 4) Predictions",
    prompt: "Write a dynamic panel script with speaker turns and concise transitions.",
  },
  {
    id: "solo-brand-story",
    title: "Solo Brand Story",
    topic: "Building trust on social media using storytelling",
    audience: "small business owners",
    format: "solo",
    tone: "educational",
    length: "short",
    hosts: ["Host"],
    outline: "1) Hook 2) Story framework 3) Real example 4) CTA",
    prompt: "Write a solo episode script that sounds confident and easy to follow.",
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

export function PodcastStudioClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [formatType, setFormatType] = useState<PodcastFormat>("interview");
  const [tone, setTone] = useState<PodcastTone>("conversational");
  const [length, setLength] = useState<PodcastLength>("medium");
  const [hostsText, setHostsText] = useState("Host, Guest");
  const [outline, setOutline] = useState("");
  const [prompt, setPrompt] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratePodcastResponse | null>(null);
  const [editableScript, setEditableScript] = useState("");
  const [history, setHistory] = useState<PodcastHistoryItem[]>([]);
  const [stats, setStats] = useState<PodcastStatistics>({
    totalEpisodesGenerated: 0,
    mostUsedFormat: "N/A",
    recentEpisodes: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<PodcastHistoryItem[]>("/api/media/podcast/history"),
      fetchJson<PodcastStatistics>("/api/media/podcast/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const templateItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return templates;
    }

    return templates.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const groupedEpisodes = useMemo(() => {
    const counts = new Map<PodcastFormat, number>();
    history.forEach((item) => counts.set(item.format, (counts.get(item.format) ?? 0) + 1));

    return (["interview", "solo", "panel", "storytelling"] as PodcastFormat[])
      .map((formatName) => ({ format: formatName, count: counts.get(formatName) ?? 0 }))
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
        item.topic.toLowerCase().includes(q) ||
        item.script.toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, search]);

  const applyTemplate = (template: PodcastTemplate) => {
    setTitle(template.title);
    setTopic(template.topic);
    setAudience(template.audience);
    setFormatType(template.format);
    setTone(template.tone);
    setLength(template.length);
    setHostsText(template.hosts.join(", "));
    setOutline(template.outline);
    setPrompt(template.prompt);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const loadFromHistory = (item: PodcastHistoryItem) => {
    setTitle(item.title);
    setTopic(item.topic);
    setAudience(item.audience);
    setFormatType(item.format);
    setTone(item.tone);
    setLength(item.length);
    setHostsText(item.hosts.join(", "));
    setOutline(item.outline);
    setPrompt(item.prompt);
    setEditableScript(item.script);
    setResult({
      id: item.id,
      title: item.title,
      topic: item.topic,
      audience: item.audience,
      format: item.format,
      tone: item.tone,
      length: item.length,
      hosts: item.hosts,
      outline: item.outline,
      prompt: item.prompt,
      script: item.script,
      isFavorite: item.isFavorite,
      status: item.status,
      createdAt: item.createdAt,
      generatedAt: item.createdAt,
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  const removeEpisode = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/podcast/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Episode deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const duplicateEpisode = async (id: string) => {
    try {
      await fetchJson<{ id: string }>(`/api/media/podcast/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "duplicate" }),
      });
      await refreshAll();
      toast.success("Episode duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed.");
    }
  };

  const toggleFavorite = async (item: PodcastHistoryItem) => {
    try {
      await fetchJson<{ id: string; isFavorite: boolean }>(`/api/media/podcast/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      await refreshAll();
      toast.success(item.isFavorite ? "Removed from favorites." : "Marked as favorite.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const handoffToVoiceStudio = () => {
    if (!editableScript.trim()) {
      toast.error("Generate an episode script first.");
      return;
    }

    const params = new URLSearchParams({
      prefill: editableScript,
      title: title || result?.title || "Podcast Episode Voiceover",
    });

    router.push(`/dashboard/voice-studio?${params.toString()}`);
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic.");
      return;
    }

    if (!audience.trim()) {
      toast.error("Enter target audience.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Enter a generation prompt.");
      return;
    }

    setLoading(true);

    try {
      const generated = await fetchJson<GeneratePodcastResponse>("/api/media/podcast/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          topic,
          audience,
          format: formatType,
          tone,
          length,
          hosts: hostsText,
          outline,
          prompt,
        }),
      });

      setResult(generated);
      setEditableScript(generated.script);
      toast.success("Podcast episode generated.");
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
          <div>
            <h1 className="display-font text-3xl font-semibold text-white">Podcast Studio</h1>
            <p className="text-sm text-blue-100/70">Plan, script, and prepare episodes for multi-platform social marketing</p>
          </div>
          <button className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10" onClick={handoffToVoiceStudio}>
            Send To Voice Studio
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "my-episodes", label: "My Episodes" },
            { key: "templates", label: "Templates" },
            { key: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as StudioTab)}
              className={`rounded-lg px-3 py-1.5 transition ${
                activeTab === tab.key ? "bg-blue-500/25 text-white" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto w-full max-w-md">
            <input
              className="w-full rounded-xl border border-white/15 bg-[#06132d] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-blue-300/40"
              placeholder="Search templates or history"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      {activeTab === "create" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
          <article className="panel animate-float-in rounded-2xl p-4">
            <h2 className="text-lg font-semibold text-white">Episode Inputs</h2>

            <label className="mt-3 block text-sm text-blue-100/75">Episode Title (Optional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Growth Decoded Episode 01"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm text-blue-100/75">Format</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={formatType} onChange={(event) => setFormatType(event.target.value as PodcastFormat)}>
                  <option value="interview">Interview</option>
                  <option value="solo">Solo</option>
                  <option value="panel">Panel</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-100/75">Tone</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={tone} onChange={(event) => setTone(event.target.value as PodcastTone)}>
                  <option value="professional">Professional</option>
                  <option value="conversational">Conversational</option>
                  <option value="energetic">Energetic</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-100/75">Length</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={length} onChange={(event) => setLength(event.target.value as PodcastLength)}>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>

            <label className="mt-3 block text-sm text-blue-100/75">Topic</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="How AI improves social media consistency"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={180}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Target Audience</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="B2B marketing teams"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              maxLength={140}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Hosts / Speakers</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Host, Guest"
              value={hostsText}
              onChange={(event) => setHostsText(event.target.value)}
              maxLength={250}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Episode Outline</label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Intro, key discussion points, closing summary"
              maxLength={2000}
              value={outline}
              onChange={(event) => setOutline(event.target.value)}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Generation Prompt</label>
            <textarea
              className="mt-2 min-h-40 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Describe what this episode should cover and the desired structure"
              maxLength={4000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={generate}
              disabled={loading}
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
              {loading ? "Generating..." : "Generate Episode Script"}
            </button>
          </article>

          <div className="space-y-4">
            <article className="panel animate-float-in rounded-2xl p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Templates</h2>
              <div className="space-y-2">
                {templateItems.map((item) => (
                  <button key={item.id} className="w-full rounded-xl border border-white/10 bg-[#071633] p-3 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.format} | {item.tone} | {item.length}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300">{item.topic}</p>
                  </button>
                ))}
                {templateItems.length === 0 ? <p className="text-sm text-slate-400">No templates found.</p> : null}
              </div>
            </article>

            <article className="panel animate-float-in rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Generated Episode Script</h2>
                {result ? <p className="text-xs text-slate-400">{format(new Date(result.generatedAt), "MMM d, h:mm a")}</p> : null}
              </div>

              <textarea
                className="min-h-64 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Your generated podcast script will appear here"
                value={editableScript}
                onChange={(event) => setEditableScript(event.target.value)}
              />

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <button
                  className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-slate-200 hover:bg-[#0b1d42]"
                  onClick={() => {
                    if (!editableScript.trim()) {
                      toast.error("No script to copy.");
                      return;
                    }
                    navigator.clipboard.writeText(editableScript);
                    toast.success("Script copied");
                  }}
                >
                  Copy Script
                </button>
                <button
                  className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-slate-200 hover:bg-[#0b1d42]"
                  onClick={() => {
                    if (!editableScript.trim()) {
                      toast.error("No script to download.");
                      return;
                    }
                    const blob = new Blob([editableScript], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${(title || "podcast-episode").replace(/\s+/g, "-").toLowerCase()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download TXT
                </button>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "my-episodes" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My Episodes</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={() => void refreshAll()}>Refresh</button>
          </div>

          {groupedEpisodes.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No episodes yet. Generate your first podcast script in Create.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {groupedEpisodes.map((item) => (
                <div key={item.format} className="rounded-xl border border-white/10 bg-[#071633] p-4">
                  <h3 className="text-base font-semibold capitalize text-white">{item.format}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.count} episodes</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "templates" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Templates</h2>
          {templateItems.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No templates found.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {templateItems.map((item) => (
                <button key={item.id} className="rounded-xl border border-white/10 bg-[#071633] p-4 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                  <p className="text-base font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.format} | {item.tone} | {item.length}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-300">{item.prompt}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Episode History</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={() => void refreshAll()}>Refresh</button>
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm">
            <button
              className={`rounded-lg px-3 py-1.5 transition ${
                historyFilter === "all" ? "bg-blue-500/25 text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              onClick={() => setHistoryFilter("all")}
            >
              All
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 transition ${
                historyFilter === "favorites" ? "bg-amber-500/25 text-amber-100" : "text-slate-300 hover:bg-white/10"
              }`}
              onClick={() => setHistoryFilter("favorites")}
            >
              Favorites
            </button>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No history found.</p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#071633] px-3 py-3 md:grid-cols-[1fr_120px_220px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.format} | {item.tone} | {item.length}</p>
                    <p className="text-xs text-slate-500">{format(new Date(item.createdAt), "MMM d, h:mm a")}</p>
                    {item.isFavorite ? <p className="text-xs text-amber-200">Favorite</p> : null}
                  </div>
                  <p className="text-xs text-slate-400">{item.status}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-500/20" onClick={() => void toggleFavorite(item)}>
                      {item.isFavorite ? "Unfavorite" : "Favorite"}
                    </button>
                    <button className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852]" onClick={() => loadFromHistory(item)}>
                      Load
                    </button>
                    <button className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852]" onClick={() => void duplicateEpisode(item.id)}>
                      Duplicate
                    </button>
                    <button className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20" onClick={() => void removeEpisode(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Episodes" value={stats.totalEpisodesGenerated.toString()} />
        <StatCard label="Most Used Format" value={stats.mostUsedFormat} />
        <StatCard label="Recent (7 days)" value={stats.recentEpisodes.toString()} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel animate-float-in rounded-2xl bg-gradient-to-r from-[#081733] to-[#0a1d40] p-4">
      <p className="text-[11px] uppercase tracking-[0.13em] text-blue-100/70">{label}</p>
      <p className="display-font mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

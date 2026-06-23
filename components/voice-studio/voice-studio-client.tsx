"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import type { VoiceHistoryItem, VoiceStatistics } from "@/types/media";
import { voiceList } from "@/types/media";

type Props = {
  initialHistory: VoiceHistoryItem[];
  initialStats: VoiceStatistics;
};

type StudioTab = "create" | "my-voices" | "templates" | "history";

type VoiceTemplate = {
  id: string;
  name: string;
  category: string;
  content: string;
  recommendedVoice: (typeof voiceList)[number];
  recommendedSpeed: number;
};

const voiceTemplates: VoiceTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Message",
    category: "Brand",
    content: "Welcome to Velynxia. We are delighted to have you here and excited to support your growth journey.",
    recommendedVoice: "alloy",
    recommendedSpeed: 1.0,
  },
  {
    id: "product",
    name: "Product Introduction",
    category: "Sales",
    content: "Meet our latest AI media suite, designed to speed up content creation and deliver professional quality voiceovers.",
    recommendedVoice: "echo",
    recommendedSpeed: 1.0,
  },
  {
    id: "announcement",
    name: "Event Announcement",
    category: "Marketing",
    content: "Join us this Friday at 6 PM for a live product showcase featuring demos, Q and A, and special launch offers.",
    recommendedVoice: "shimmer",
    recommendedSpeed: 1.1,
  },
  {
    id: "support",
    name: "Support Follow-up",
    category: "Support",
    content: "Thank you for reaching out. We have received your request and our team will get back to you shortly with an update.",
    recommendedVoice: "sage",
    recommendedSpeed: 0.9,
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

export function VoiceStudioClient({ initialHistory, initialStats }: Props) {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [voice, setVoice] = useState<(typeof voiceList)[number]>("alloy");
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState(initialHistory);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(initialHistory[0]?.outputUrl ?? null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const hasAppliedPrefill = useRef(false);

  const charsUsed = inputText.length;
  const speedLabel = useMemo(() => `${speed.toFixed(1)}x`, [speed]);
  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return history;
    }

    return history.filter((item) => item.title.toLowerCase().includes(q) || item.voice.toLowerCase().includes(q));
  }, [history, search]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return voiceTemplates;
    }

    return voiceTemplates.filter((template) => {
      return (
        template.name.toLowerCase().includes(q) ||
        template.category.toLowerCase().includes(q) ||
        template.content.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const myVoices = useMemo(() => {
    const byVoice = new Map<(typeof voiceList)[number], { count: number; totalDuration: number }>();

    history.forEach((item) => {
      const current = byVoice.get(item.voice) ?? { count: 0, totalDuration: 0 };
      byVoice.set(item.voice, {
        count: current.count + 1,
        totalDuration: current.totalDuration + (item.duration ?? 0),
      });
    });

    return voiceList
      .map((voiceName) => {
        const usage = byVoice.get(voiceName) ?? { count: 0, totalDuration: 0 };
        return {
          voice: voiceName,
          count: usage.count,
          avgDuration: usage.count > 0 ? Math.round(usage.totalDuration / usage.count) : 0,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const applyTemplate = (template: VoiceTemplate) => {
    setTitle(template.name);
    setInputText(template.content);
    setVoice(template.recommendedVoice);
    setSpeed(template.recommendedSpeed);
    setActiveTab("create");
    toast.success("Template loaded into Create.");
  };

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<VoiceHistoryItem[]>("/api/media/voice/history"),
      fetchJson<VoiceStatistics>("/api/media/voice/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  const generate = async () => {
    if (!inputText.trim()) {
      toast.error("Enter text to generate audio.");
      return;
    }

    if (charsUsed > 5000) {
      toast.error("Input exceeds 5000 characters.");
      return;
    }

    setLoading(true);
    try {
      const created = await fetchJson<VoiceHistoryItem>("/api/media/voice/generate", {
        method: "POST",
        body: JSON.stringify({ title, inputText, voice, speed }),
      });

      setActiveUrl(created.outputUrl ?? null);
      setInputText("");
      setTitle("");
      await refreshAll();
      toast.success("Audio generated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate audio.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetchJson<void>(`/api/media/voice/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Recording deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  useEffect(() => {
    if (hasAppliedPrefill.current) {
      return;
    }

    const prefill = searchParams.get("prefill");
    const prefillTitle = searchParams.get("title");
    if (!prefill) {
      return;
    }

    setInputText(prefill);
    if (prefillTitle) {
      setTitle(prefillTitle);
    }
    setActiveTab("create");
    hasAppliedPrefill.current = true;
  }, [searchParams]);

  return (
    <div className="space-y-4 text-slate-100">
      <section className="panel animate-float-in overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xl">🎙</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Voice Studio</h1>
              <p className="text-sm text-blue-100/70">Transform text into professional voiceovers with AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Upgrade</button>
            <button className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">Help</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "my-voices", label: "My Voices" },
            { key: "templates", label: "Templates" },
            { key: "history", label: "History" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
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
              placeholder="Search voices"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      {activeTab === "create" ? <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold">1</span>
            <h2 className="text-lg font-semibold text-white">Text to Speech</h2>
          </div>

          <label className="text-sm text-blue-100/75">Title (Optional)</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-[#05122a] px-3 py-2">
            <input
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="CRM Product Introduction"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
            />
            <span className="text-xs text-slate-400">{title.length}/100</span>
          </div>

          <label className="mt-3 block text-sm text-blue-100/75">Your Text</label>
          <textarea
            className="mt-2 min-h-44 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-300/35"
            placeholder="Welcome to Velynxia..."
            maxLength={5000}
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>{charsUsed} / 5000 characters</span>
            <button className="text-blue-300 hover:text-blue-200" onClick={() => setInputText("")}>Clear Text</button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-[#061733] p-3">
              <label className="text-sm text-blue-100/75">Voice</label>
              <select
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none"
                value={voice}
                onChange={(event) => setVoice(event.target.value as (typeof voiceList)[number])}
              >
                {voiceList.map((voiceName) => (
                  <option key={voiceName} value={voiceName}>
                    {voiceName}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#061733] p-3">
              <div className="flex items-center justify-between text-sm text-blue-100/75">
                <label>Speed</label>
                <span>{speedLabel}</span>
              </div>
              <input
                className="mt-2 w-full accent-blue-400"
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#061733] p-3">
              <label className="text-sm text-blue-100/75">Language</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none">
                <option>English (US)</option>
              </select>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#061733] p-3">
              <label className="text-sm text-blue-100/75">Emotion (AI)</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none">
                <option>Neutral</option>
              </select>
            </div>
          </div>

          <button
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
            {loading ? "Generating..." : "Generate Voice"}
          </button>
        </article>

        <div className="space-y-4">
          <article className="panel animate-float-in rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Preview</h2>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">MP3</span>
            </div>

            <div className="mb-4 flex h-20 items-end justify-center gap-1 rounded-xl border border-white/10 bg-[#050f26] px-4">
              {Array.from({ length: 50 }).map((_, index) => (
                <span
                  key={index}
                  className="inline-block w-1 rounded-full bg-gradient-to-b from-blue-400 to-violet-500"
                  style={{ height: `${10 + ((index * 13) % 48)}px` }}
                />
              ))}
            </div>

            {activeUrl ? <audio className="w-full" controls src={activeUrl} /> : <p className="text-sm text-slate-400">Generate audio to preview playback.</p>}

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <a className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-center text-slate-200 hover:bg-[#0b1d42]" href={activeUrl ?? "#"} download>
                Download
              </a>
              <button
                className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-slate-200 hover:bg-[#0b1d42]"
                onClick={() => {
                  if (!activeUrl) {
                    toast.error("Nothing to copy yet.");
                    return;
                  }
                  navigator.clipboard.writeText(new URL(activeUrl, window.location.origin).toString());
                  toast.success("URL copied");
                }}
              >
                Copy URL
              </button>
              <button
                className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-300 hover:bg-rose-500/20"
                onClick={() => {
                  const first = history[0];
                  if (!first) {
                    toast.error("No item to delete.");
                    return;
                  }
                  void remove(first.id);
                }}
              >
                Delete
              </button>
            </div>
          </article>

          <article className="panel animate-float-in rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recent Generations</h3>
              <button className="text-sm text-blue-300 hover:text-blue-200" onClick={refreshAll}>View All</button>
            </div>

            <div className="space-y-2">
              {filteredHistory.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#071633] px-3 py-2.5">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm text-white"
                    onClick={() => setActiveUrl(item.outputUrl)}
                    disabled={!item.outputUrl}
                  >
                    ▶
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.voice} • {formatDuration(item.duration)} • MP3</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">{format(new Date(item.createdAt), "MMM d")}</p>
                    <p className="text-xs text-slate-500">{format(new Date(item.createdAt), "h:mm a")}</p>
                  </div>

                  {item.outputUrl ? (
                    <a href={item.outputUrl} download className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10">
                      ↓
                    </a>
                  ) : null}
                </div>
              ))}

              {filteredHistory.length === 0 ? <p className="py-3 text-center text-sm text-slate-400">No generations yet.</p> : null}
            </div>
          </article>
        </div>
      </section>
      : null}

      {activeTab === "my-voices" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My Voices</h2>
            <p className="text-sm text-slate-300">Saved usage based on your generated clips</p>
          </div>

          {myVoices.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No voice usage yet. Generate audio in Create to build your voice library.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myVoices.map((item) => (
                <div key={item.voice} className="rounded-xl border border-white/10 bg-[#071633] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{item.voice}</h3>
                    <span className="rounded-full border border-blue-300/30 bg-blue-400/10 px-2 py-0.5 text-xs text-blue-200">{item.count} clips</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Average duration: {formatDuration(item.avgDuration)}</p>
                  <button
                    className="mt-3 w-full rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-2 text-sm text-slate-100 hover:bg-[#102852]"
                    onClick={() => {
                      setVoice(item.voice);
                      setActiveTab("create");
                    }}
                  >
                    Use This Voice
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "templates" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Templates</h2>
            <p className="text-sm text-slate-300">Start quickly with prebuilt copy blocks</p>
          </div>

          {filteredTemplates.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No templates match your search.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredTemplates.map((template) => (
                <article key={template.id} className="rounded-xl border border-white/10 bg-[#071633] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{template.name}</h3>
                    <span className="rounded-full border border-violet-300/30 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">{template.category}</span>
                  </div>
                  <p className="line-clamp-3 text-sm text-slate-300">{template.content}</p>
                  <p className="mt-2 text-xs text-slate-400">Voice: {template.recommendedVoice} • Speed: {template.recommendedSpeed.toFixed(1)}x</p>
                  <button className="mt-3 w-full rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-2 text-sm text-slate-100 hover:bg-[#102852]" onClick={() => applyTemplate(template)}>
                    Use Template
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Generation History</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={refreshAll}>Refresh</button>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No history found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#071633] px-3 py-3 md:grid-cols-[1.2fr_120px_120px_160px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.voice} • {formatDuration(item.duration)} • {format(new Date(item.createdAt), "MMM d, h:mm a")}</p>
                  </div>
                  <p className="text-xs text-slate-400">{item.status}</p>
                  <button
                    className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852] disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setActiveUrl(item.outputUrl)}
                    disabled={!item.outputUrl}
                  >
                    Play
                  </button>
                  <div className="flex items-center gap-2">
                    <a
                      className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852]"
                      href={item.outputUrl ?? "#"}
                      download
                    >
                      Download
                    </a>
                    <button className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20" onClick={() => void remove(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Audio Generated" value={stats.totalAudioGenerated.toString()} />
        <StatCard label="Total Minutes Generated" value={stats.totalMinutesGenerated.toString()} />
        <StatCard label="Most Used Voice" value={stats.mostUsedVoice} />
        <StatCard label="Avg Duration" value={stats.totalAudioGenerated ? `${Math.max(1, Math.round((stats.totalMinutesGenerated * 60) / stats.totalAudioGenerated))} sec` : "0 sec"} />
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

function formatDuration(duration: number | null) {
  if (!duration || duration <= 0) {
    return "0 sec";
  }

  if (duration < 60) {
    return `${duration} sec`;
  }

  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  PresentationGoal,
  PresentationHistoryItem,
  PresentationLength,
  PresentationStatistics,
  PresentationTone,
} from "@/types/media";

type StudioTab = "create" | "my-decks" | "templates" | "history";
type HistoryFilter = "all" | "favorites";

type GeneratePresentationResponse = {
  id: string;
  title: string;
  outputText: string;
  slideCount: number;
  includeSpeakerNotes: boolean;
  isFavorite: boolean;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  generatedAt: string;
  meta: {
    goal: PresentationGoal;
    tone: PresentationTone;
    length: PresentationLength;
    audience: string;
    topic: string;
  };
};

type Template = {
  id: string;
  title: string;
  goal: PresentationGoal;
  tone: PresentationTone;
  length: PresentationLength;
  audience: string;
  topic: string;
  prompt: string;
};

const templates: Template[] = [
  {
    id: "saas-pitch",
    title: "SaaS Investor Pitch",
    goal: "pitch",
    tone: "persuasive",
    length: "medium",
    audience: "seed investors",
    topic: "AI workflow automation platform",
    prompt: "Build a clear investor narrative with problem, solution, traction, and ask.",
  },
  {
    id: "training-onboarding",
    title: "Team Onboarding Training",
    goal: "training",
    tone: "educational",
    length: "short",
    audience: "new marketing hires",
    topic: "Brand playbook and execution workflow",
    prompt: "Create a practical onboarding deck with examples and checkpoints.",
  },
  {
    id: "quarterly-report",
    title: "Quarterly Strategy Report",
    goal: "report",
    tone: "professional",
    length: "long",
    audience: "executive leadership",
    topic: "Q2 campaign outcomes and Q3 plan",
    prompt: "Summarize performance data, insights, and strategic recommendations.",
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

export function PresentationStudioClient() {
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [search, setSearch] = useState("");

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<PresentationGoal>("pitch");
  const [tone, setTone] = useState<PresentationTone>("professional");
  const [length, setLength] = useState<PresentationLength>("medium");
  const [audience, setAudience] = useState("");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState("");
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratePresentationResponse | null>(null);
  const [editableDeck, setEditableDeck] = useState("");
  const [history, setHistory] = useState<PresentationHistoryItem[]>([]);
  const [stats, setStats] = useState<PresentationStatistics>({
    totalDecksGenerated: 0,
    mostUsedGoal: "N/A",
    recentDecks: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<PresentationHistoryItem[]>("/api/media/presentation/history"),
      fetchJson<PresentationStatistics>("/api/media/presentation/statistics"),
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
        item.goal.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const groupedDecks = useMemo(() => {
    const counts = new Map<PresentationGoal, number>();
    history.forEach((item) => counts.set(item.goal, (counts.get(item.goal) ?? 0) + 1));

    return (["pitch", "training", "webinar", "sales", "report"] as PresentationGoal[])
      .map((goalName) => ({ goal: goalName, count: counts.get(goalName) ?? 0 }))
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
        item.goal.toLowerCase().includes(q) ||
        item.outputText.toLowerCase().includes(q)
      );
    });
  }, [history, historyFilter, search]);

  const applyTemplate = (template: Template) => {
    setTitle(template.title);
    setGoal(template.goal);
    setTone(template.tone);
    setLength(template.length);
    setAudience(template.audience);
    setTopic(template.topic);
    setPrompt(template.prompt);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const removePresentation = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/presentation/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Presentation deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const duplicatePresentation = async (id: string) => {
    try {
      await fetchJson<{ id: string }>(`/api/media/presentation/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "duplicate" }),
      });
      await refreshAll();
      toast.success("Presentation duplicated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Duplicate failed.");
    }
  };

  const toggleFavorite = async (item: PresentationHistoryItem) => {
    try {
      await fetchJson<{ id: string; isFavorite: boolean }>(`/api/media/presentation/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      });
      await refreshAll();
      toast.success(item.isFavorite ? "Removed from favorites." : "Marked as favorite.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed.");
    }
  };

  const loadFromHistory = (item: PresentationHistoryItem) => {
    setTitle(item.title);
    setGoal(item.goal);
    setTone(item.tone);
    setLength(item.length);
    setAudience(item.audience);
    setTopic(item.topic);
    setPrompt(item.prompt);
    setIncludeSpeakerNotes(item.includeSpeakerNotes);
    setEditableDeck(item.outputText);
    setResult({
      id: item.id,
      title: item.title,
      outputText: item.outputText,
      slideCount: item.slideCount,
      includeSpeakerNotes: item.includeSpeakerNotes,
      isFavorite: item.isFavorite,
      status: item.status,
      createdAt: item.createdAt,
      generatedAt: item.createdAt,
      meta: {
        goal: item.goal,
        tone: item.tone,
        length: item.length,
        audience: item.audience,
        topic: item.topic,
      },
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Enter a presentation topic.");
      return;
    }

    if (!audience.trim()) {
      toast.error("Enter a target audience.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Enter your prompt.");
      return;
    }

    setLoading(true);
    try {
      const generated = await fetchJson<GeneratePresentationResponse>("/api/media/presentation/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          goal,
          tone,
          length,
          audience,
          topic,
          prompt,
          includeSpeakerNotes,
        }),
      });

      setResult(generated);
      setEditableDeck(generated.outputText);
      toast.success("Presentation generated successfully.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate presentation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <section className="panel animate-float-in overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl">▣</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Presentation Studio</h1>
              <p className="text-sm text-blue-100/70">Build slide-ready presentation decks in minutes</p>
            </div>
          </div>
          <button
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            onClick={() => {
              if (!editableDeck.trim()) {
                toast.error("No deck content to download.");
                return;
              }
              const blob = new Blob([editableDeck], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${(title || "presentation").replace(/\s+/g, "-").toLowerCase()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download Deck TXT
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "my-decks", label: "My Decks" },
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
            <h2 className="text-lg font-semibold text-white">Presentation Inputs</h2>

            <label className="mt-3 block text-sm text-blue-100/75">Title (Optional)</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Q3 Strategy Deck"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
            />

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm text-blue-100/75">Goal</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={goal} onChange={(event) => setGoal(event.target.value as PresentationGoal)}>
                  <option value="pitch">Pitch</option>
                  <option value="training">Training</option>
                  <option value="webinar">Webinar</option>
                  <option value="sales">Sales</option>
                  <option value="report">Report</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-100/75">Tone</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={tone} onChange={(event) => setTone(event.target.value as PresentationTone)}>
                  <option value="professional">Professional</option>
                  <option value="persuasive">Persuasive</option>
                  <option value="educational">Educational</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-blue-100/75">Length</label>
                <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={length} onChange={(event) => setLength(event.target.value as PresentationLength)}>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>

            <label className="mt-3 block text-sm text-blue-100/75">Audience</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Leadership team"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              maxLength={140}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Topic</label>
            <input
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="2026 product launch strategy"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={200}
            />

            <label className="mt-3 block text-sm text-blue-100/75">Prompt</label>
            <textarea
              className="mt-2 min-h-44 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Describe what this deck should communicate and the outcomes required..."
              maxLength={4000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />

            <label className="mt-3 flex items-center gap-2 text-sm text-blue-100/75">
              <input
                type="checkbox"
                checked={includeSpeakerNotes}
                onChange={(event) => setIncludeSpeakerNotes(event.target.checked)}
              />
              Include speaker notes
            </label>

            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={generate}
              disabled={loading}
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
              {loading ? "Generating..." : "Generate Deck"}
            </button>
          </article>

          <div className="space-y-4">
            <article className="panel animate-float-in rounded-2xl p-4">
              <h2 className="mb-3 text-lg font-semibold text-white">Templates</h2>
              <div className="space-y-2">
                {filteredTemplates.map((item) => (
                  <button key={item.id} className="w-full rounded-xl border border-white/10 bg-[#071633] p-3 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.goal} | {item.tone} | {item.length}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-300">{item.topic}</p>
                  </button>
                ))}
                {filteredTemplates.length === 0 ? <p className="text-sm text-slate-400">No templates found.</p> : null}
              </div>
            </article>

            <article className="panel animate-float-in rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Generated Deck</h2>
                {result ? <p className="text-xs text-slate-400">{format(new Date(result.generatedAt), "MMM d, h:mm a")}</p> : null}
              </div>

              <textarea
                className="min-h-64 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="Your generated deck content will appear here..."
                value={editableDeck}
                onChange={(event) => setEditableDeck(event.target.value)}
              />

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <button
                  className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-slate-200 hover:bg-[#0b1d42]"
                  onClick={() => {
                    if (!editableDeck.trim()) {
                      toast.error("No deck to copy.");
                      return;
                    }
                    navigator.clipboard.writeText(editableDeck);
                    toast.success("Deck copied");
                  }}
                >
                  Copy Deck
                </button>
                <button
                  className="rounded-lg border border-white/15 bg-[#071633] px-3 py-2 text-slate-200 hover:bg-[#0b1d42]"
                  onClick={() => setIncludeSpeakerNotes((prev) => !prev)}
                >
                  Toggle Notes
                </button>
              </div>

              {result ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/15 bg-[#071633] px-2 py-1">{result.meta.goal}</span>
                  <span className="rounded-full border border-white/15 bg-[#071633] px-2 py-1">{result.meta.tone}</span>
                  <span className="rounded-full border border-white/15 bg-[#071633] px-2 py-1">{result.meta.length}</span>
                  <span className="rounded-full border border-white/15 bg-[#071633] px-2 py-1">{result.slideCount} slides</span>
                </div>
              ) : null}
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "my-decks" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My Decks</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={() => void refreshAll()}>Refresh</button>
          </div>

          {groupedDecks.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No decks yet. Generate your first deck in Create.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupedDecks.map((item) => (
                <div key={item.goal} className="rounded-xl border border-white/10 bg-[#071633] p-4">
                  <h3 className="text-base font-semibold capitalize text-white">{item.goal}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.count} decks</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "templates" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <h2 className="mb-4 text-xl font-semibold text-white">Templates</h2>
          {filteredTemplates.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No templates found.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredTemplates.map((item) => (
                <button key={item.id} className="rounded-xl border border-white/10 bg-[#071633] p-4 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                  <p className="text-base font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.goal} | {item.tone} | {item.length}</p>
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
            <h2 className="text-xl font-semibold text-white">Deck History</h2>
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
                <div key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#071633] px-3 py-3 md:grid-cols-[1fr_120px_250px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.goal} | {item.tone} | {item.length}</p>
                    <p className="text-xs text-slate-500">{format(new Date(item.createdAt), "MMM d, h:mm a")} | {item.slideCount} slides</p>
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
                    <button className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852]" onClick={() => void duplicatePresentation(item.id)}>
                      Duplicate
                    </button>
                    <button className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20" onClick={() => void removePresentation(item.id)}>
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
        <StatCard label="Total Decks" value={stats.totalDecksGenerated.toString()} />
        <StatCard label="Most Used Goal" value={stats.mostUsedGoal} />
        <StatCard label="Recent (7 days)" value={stats.recentDecks.toString()} />
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

"use client";

import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import type { ScriptGoal, ScriptHistoryItem, ScriptLength, ScriptStatistics, ScriptTone } from "@/types/media";

type StudioTab = "create" | "my-scripts" | "templates" | "history";

type GenerateScriptResponse = {
  id: string;
  title: string;
  prompt: string;
  script: string;
  outputText: string;
  createdAt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  generatedAt: string;
  meta: {
    goal: ScriptGoal;
    tone: ScriptTone;
    length: ScriptLength;
    audience: string;
    callToAction: string | null;
  };
};

type ScriptTemplate = {
  id: string;
  title: string;
  goal: ScriptGoal;
  tone: ScriptTone;
  length: ScriptLength;
  audience: string;
  prompt: string;
  callToAction: string;
};

const templates: ScriptTemplate[] = [
  {
    id: "social-launch",
    title: "Social Product Launch",
    goal: "social",
    tone: "bold",
    length: "short",
    audience: "startup founders",
    prompt: "Announce our AI tool launch and highlight speed and quality improvements.",
    callToAction: "Try it free today",
  },
  {
    id: "sales-outreach",
    title: "Sales Outreach",
    goal: "sales",
    tone: "professional",
    length: "medium",
    audience: "SaaS decision makers",
    prompt: "Write a script that positions our platform as a workflow accelerator with measurable ROI.",
    callToAction: "Book a 15-minute demo",
  },
  {
    id: "youtube-intro",
    title: "YouTube Intro",
    goal: "youtube",
    tone: "friendly",
    length: "medium",
    audience: "small business owners",
    prompt: "Create an engaging intro script about improving content output with AI automation.",
    callToAction: "Subscribe for weekly playbooks",
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

  return (await response.json()) as T;
}

export function ScriptStudioClient() {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<ScriptGoal>("social");
  const [tone, setTone] = useState<ScriptTone>("professional");
  const [length, setLength] = useState<ScriptLength>("medium");
  const [audience, setAudience] = useState("");
  const [prompt, setPrompt] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<StudioTab>("create");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateScriptResponse | null>(null);
  const [editableScript, setEditableScript] = useState("");
  const [history, setHistory] = useState<ScriptHistoryItem[]>([]);
  const [stats, setStats] = useState<ScriptStatistics>({
    totalScriptsGenerated: 0,
    mostUsedGoal: "N/A",
    recentScripts: 0,
  });

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<ScriptHistoryItem[]>("/api/media/script/history"),
      fetchJson<ScriptStatistics>("/api/media/script/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return templates;
    }

    return templates.filter((item) => {
      return item.title.toLowerCase().includes(q) || item.goal.toLowerCase().includes(q) || item.prompt.toLowerCase().includes(q);
    });
  }, [search]);

  const charsUsed = prompt.length;

  const groupedScripts = useMemo(() => {
    const counts = new Map<ScriptGoal, number>();
    history.forEach((item) => counts.set(item.goal, (counts.get(item.goal) ?? 0) + 1));

    return (["social", "ad", "youtube", "email", "sales"] as ScriptGoal[])
      .map((goalName) => ({ goal: goalName, count: counts.get(goalName) ?? 0 }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [history]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return history;
    }

    return history.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.goal.toLowerCase().includes(q) ||
        item.outputText.toLowerCase().includes(q)
      );
    });
  }, [history, search]);

  const exportPdf = () => {
    if (!editableScript.trim()) {
      toast.error("No script to export.");
      return;
    }

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const titleText = result?.title || title || "Script";

    pdf.setFontSize(18);
    pdf.text(titleText, 40, 44);
    pdf.setFontSize(10);
    pdf.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 40, 62);

    const lines = pdf.splitTextToSize(editableScript, pageWidth - 80);
    const rows = lines.map((line: string, index: number) => [index + 1, line]);

    autoTable(pdf, {
      startY: 78,
      head: [["#", "Script"]],
      body: rows,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [20, 45, 95],
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: pageWidth - 120 },
      },
    });

    pdf.save(`${titleText.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    toast.success("PDF exported");
  };

  const applyTemplate = (template: ScriptTemplate) => {
    setTitle(template.title);
    setGoal(template.goal);
    setTone(template.tone);
    setLength(template.length);
    setAudience(template.audience);
    setPrompt(template.prompt);
    setCallToAction(template.callToAction);
    setActiveTab("create");
    toast.success("Template loaded.");
  };

  const removeScript = async (id: string) => {
    try {
      await fetchJson<null>(`/api/media/script/${id}`, { method: "DELETE" });
      await refreshAll();
      toast.success("Script deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    }
  };

  const loadFromHistory = (item: ScriptHistoryItem) => {
    setTitle(item.title);
    setGoal(item.goal);
    setTone(item.tone);
    setLength(item.length);
    setAudience(item.audience);
    setPrompt(item.prompt);
    setCallToAction(item.callToAction ?? "");
    setEditableScript(item.outputText);
    setResult({
      id: item.id,
      title: item.title,
      prompt: item.prompt,
      script: item.outputText,
      outputText: item.outputText,
      createdAt: item.createdAt,
      generatedAt: item.createdAt,
      status: item.status,
      meta: {
        goal: item.goal,
        tone: item.tone,
        length: item.length,
        audience: item.audience,
        callToAction: item.callToAction,
      },
    });
    setActiveTab("create");
    toast.success("Loaded from history.");
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Enter your script prompt.");
      return;
    }

    if (!audience.trim()) {
      toast.error("Enter your target audience.");
      return;
    }

    setLoading(true);
    try {
      const generated = await fetchJson<GenerateScriptResponse>("/api/media/script/generate", {
        method: "POST",
        body: JSON.stringify({
          title,
          goal,
          tone,
          length,
          audience,
          prompt,
          callToAction,
        }),
      });

      setResult(generated);
      setEditableScript(generated.script);
      toast.success("Script generated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate script.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <section className="panel animate-float-in overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xl">✍</div>
            <div>
              <h1 className="display-font text-3xl font-semibold text-white">Script Studio</h1>
              <p className="text-sm text-blue-100/70">Generate high-converting scripts for social, sales, and campaigns</p>
            </div>
          </div>
          <button className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10" onClick={exportPdf}>Export PDF</button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-sm">
          {[
            { key: "create", label: "Create" },
            { key: "my-scripts", label: "My Scripts" },
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

      {activeTab === "create" ? <section className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold">1</span>
            <h2 className="text-lg font-semibold text-white">Script Inputs</h2>
          </div>

          <label className="text-sm text-blue-100/75">Title (Optional)</label>
          <input
            className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Campaign Script"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
          />

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-blue-100/75">Goal</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={goal} onChange={(event) => setGoal(event.target.value as ScriptGoal)}>
                <option value="social">Social</option>
                <option value="ad">Ad</option>
                <option value="youtube">YouTube</option>
                <option value="email">Email</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Tone</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={tone} onChange={(event) => setTone(event.target.value as ScriptTone)}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="bold">Bold</option>
                <option value="educational">Educational</option>
                <option value="storytelling">Storytelling</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Length</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm text-slate-100 outline-none" value={length} onChange={(event) => setLength(event.target.value as ScriptLength)}>
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>

          <label className="mt-3 block text-sm text-blue-100/75">Target Audience</label>
          <input
            className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Ecommerce founders in US"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            maxLength={140}
          />

          <label className="mt-3 block text-sm text-blue-100/75">Prompt</label>
          <textarea
            className="mt-2 min-h-44 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Describe what this script should communicate..."
            maxLength={4000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
          <div className="mt-2 text-xs text-slate-400">{charsUsed} / 4000 characters</div>

          <label className="mt-3 block text-sm text-blue-100/75">Call To Action (Optional)</label>
          <input
            className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            placeholder="Book a demo"
            value={callToAction}
            onChange={(event) => setCallToAction(event.target.value)}
            maxLength={160}
          />

          <button
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={generate}
            disabled={loading}
          >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
            {loading ? "Generating..." : "Generate Script"}
          </button>
        </article>

        <div className="space-y-4">
          <article className="panel animate-float-in rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Templates</h2>
              <input
                className="w-full max-w-48 rounded-lg border border-white/15 bg-[#06132d] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 outline-none"
                placeholder="Search templates"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredTemplates.map((item) => (
                <button key={item.id} className="w-full rounded-xl border border-white/10 bg-[#071633] px-3 py-2 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.goal} • {item.tone} • {item.length}</p>
                </button>
              ))}
              {filteredTemplates.length === 0 ? <p className="text-sm text-slate-400">No templates found.</p> : null}
            </div>
          </article>

          <article className="panel animate-float-in rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Generated Script</h2>
              {result ? <p className="text-xs text-slate-400">{format(new Date(result.generatedAt), "MMM d, h:mm a")}</p> : null}
            </div>

            <textarea
              className="min-h-64 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500"
              placeholder="Your generated script will appear here..."
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
                  a.download = `${(title || "script").replace(/\s+/g, "-").toLowerCase()}.txt`;
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
      : null}

      {activeTab === "my-scripts" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">My Scripts</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={refreshAll}>Refresh</button>
          </div>

          {groupedScripts.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">
              No scripts yet. Generate your first script in Create.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupedScripts.map((item) => (
                <div key={item.goal} className="rounded-xl border border-white/10 bg-[#071633] p-4">
                  <h3 className="text-base font-semibold capitalize text-white">{item.goal}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.count} scripts</p>
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
            <p className="text-sm text-slate-300">Quick-start script frameworks</p>
          </div>

          {filteredTemplates.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No templates found.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredTemplates.map((item) => (
                <button key={item.id} className="rounded-xl border border-white/10 bg-[#071633] p-4 text-left hover:bg-[#0b1d42]" onClick={() => applyTemplate(item)}>
                  <p className="text-base font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.goal} • {item.tone} • {item.length}</p>
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
            <h2 className="text-xl font-semibold text-white">Script History</h2>
            <button className="text-sm text-blue-300 hover:text-blue-200" onClick={refreshAll}>Refresh</button>
          </div>

          {filteredHistory.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No history found.</p>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((item) => (
                <div key={item.id} className="grid gap-3 rounded-xl border border-white/10 bg-[#071633] px-3 py-3 md:grid-cols-[1fr_120px_220px] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.goal} • {item.tone} • {item.length}</p>
                    <p className="text-xs text-slate-500">{format(new Date(item.createdAt), "MMM d, h:mm a")}</p>
                  </div>
                  <p className="text-xs text-slate-400">{item.status}</p>
                  <div className="flex items-center gap-2">
                    <button className="rounded-lg border border-white/15 bg-[#0a1d40] px-3 py-1.5 text-sm text-slate-100 hover:bg-[#102852]" onClick={() => loadFromHistory(item)}>
                      Load
                    </button>
                    <button className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20" onClick={() => void removeScript(item.id)}>
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
        <StatCard label="Total Scripts" value={stats.totalScriptsGenerated.toString()} />
        <StatCard label="Most Used Goal" value={stats.mostUsedGoal} />
        <StatCard label="Recent (7 days)" value={stats.recentScripts.toString()} />
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
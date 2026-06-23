"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  PresentationGoal,
  PresentationComment,
  PresentationHistoryItem,
  PresentationImageItem,
  PresentationLength,
  PresentationStatistics,
  PresentationTone,
  PresentationVersion,
  VoiceType,
} from "@/types/media";

type StudioTab = "create" | "images" | "subtitles" | "voice-over" | "collab" | "my-decks" | "templates" | "history";
type HistoryFilter = "all" | "favorites";

type GeneratePresentationResponse = {
  id: string;
  title: string;
  outputText: string;
  slideCount: number;
  includeSpeakerNotes: boolean;
  visualStyle: string | null;
  imagePrompt: string | null;
  images: PresentationImageItem[];
  subtitleSourceLanguage: string | null;
  subtitleTargetLanguages: string[];
  subtitleCues: Array<{ startSec: number; endSec: number; text: string }>;
  subtitleTranslations: Record<string, string[]>;
  voiceoverText: string | null;
  voiceover: {
    voice: VoiceType;
    speed: number;
    outputUrl: string | null;
    durationSec: number;
    trimStartSec: number;
    trimEndSec: number;
    trimmedDurationSec: number;
  } | null;
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
  const [visualStyle, setVisualStyle] = useState("clean cinematic presentation style");
  const [imagePrompt, setImagePrompt] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("English");
  const [targetLanguagesInput, setTargetLanguagesInput] = useState("Spanish, French");
  const [voiceoverVoice, setVoiceoverVoice] = useState<VoiceType>("alloy");
  const [voiceoverSpeed, setVoiceoverSpeed] = useState(1);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(0);

  const [loading, setLoading] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [result, setResult] = useState<GeneratePresentationResponse | null>(null);
  const [editableDeck, setEditableDeck] = useState("");
  const [history, setHistory] = useState<PresentationHistoryItem[]>([]);
  const [images, setImages] = useState<PresentationImageItem[]>([]);
  const [subtitleCues, setSubtitleCues] = useState<Array<{ startSec: number; endSec: number; text: string }>>([]);
  const [subtitleTranslations, setSubtitleTranslations] = useState<Record<string, string[]>>({});
  const [voiceoverText, setVoiceoverText] = useState("");
  const [voiceoverMeta, setVoiceoverMeta] = useState<GeneratePresentationResponse["voiceover"]>(null);
  const [comments, setComments] = useState<PresentationComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [versions, setVersions] = useState<PresentationVersion[]>([]);
  const [versionNote, setVersionNote] = useState("");
  const [draggingCueIndex, setDraggingCueIndex] = useState<number | null>(null);

  const [stats, setStats] = useState<PresentationStatistics>({
    totalDecksGenerated: 0,
    mostUsedGoal: "N/A",
    recentDecks: 0,
  });

  const selectedPresentationId = result?.id ?? null;

  const targetLanguages = useMemo(
    () =>
      targetLanguagesInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [targetLanguagesInput],
  );

  const refreshAll = async () => {
    const [newHistory, newStats] = await Promise.all([
      fetchJson<PresentationHistoryItem[]>("/api/media/presentation/history"),
      fetchJson<PresentationStatistics>("/api/media/presentation/statistics"),
    ]);

    setHistory(newHistory);
    setStats(newStats);
  };

  const loadCommentsAndVersions = async (presentationId: string) => {
    try {
      const [loadedComments, loadedVersions] = await Promise.all([
        fetchJson<PresentationComment[]>(`/api/media/presentation/${presentationId}/comments`),
        fetchJson<PresentationVersion[]>(`/api/media/presentation/${presentationId}/versions`),
      ]);
      setComments(loadedComments);
      setVersions(loadedVersions);
    } catch {
      setComments([]);
      setVersions([]);
    }
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
    setVisualStyle(item.visualStyle || "clean cinematic presentation style");
    setImagePrompt(item.imagePrompt || "");
    setSourceLanguage(item.subtitleSourceLanguage || "English");
    setTargetLanguagesInput(item.subtitleTargetLanguages.join(", "));
    setImages(item.images || []);
    setSubtitleCues(item.subtitleCues || []);
    setSubtitleTranslations(item.subtitleTranslations || {});
    setVoiceoverText(item.voiceoverText || item.outputText);
    setVoiceoverMeta(item.voiceover || null);
    setEditableDeck(item.outputText);
    setResult({
      id: item.id,
      title: item.title,
      outputText: item.outputText,
      slideCount: item.slideCount,
      includeSpeakerNotes: item.includeSpeakerNotes,
      visualStyle: item.visualStyle,
      imagePrompt: item.imagePrompt,
      images: item.images,
      subtitleSourceLanguage: item.subtitleSourceLanguage,
      subtitleTargetLanguages: item.subtitleTargetLanguages,
      subtitleCues: item.subtitleCues,
      subtitleTranslations: item.subtitleTranslations,
      voiceoverText: item.voiceoverText,
      voiceover: item.voiceover,
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
    void loadCommentsAndVersions(item.id);
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
          visualStyle,
          imagePrompt,
          subtitleSourceLanguage: sourceLanguage,
          subtitleTargetLanguages: targetLanguages,
          voiceoverVoice,
          voiceoverSpeed,
        }),
      });

      setResult(generated);
      setEditableDeck(generated.outputText);
      setImages(generated.images || []);
      setSubtitleCues(generated.subtitleCues || []);
      setSubtitleTranslations(generated.subtitleTranslations || {});
      setVoiceoverText(generated.voiceoverText || generated.outputText);
      setVoiceoverMeta(generated.voiceover);
      toast.success("Presentation generated successfully.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate presentation.");
    } finally {
      setLoading(false);
    }
  };

  const generateImages = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Enter an image prompt.");
      return;
    }

    setAssetLoading(true);
    try {
      const res = await fetchJson<{ items: PresentationImageItem[] }>("/api/media/presentation/images/generate", {
        method: "POST",
        body: JSON.stringify({
          presentationId: selectedPresentationId,
          prompt: imagePrompt,
          visualStyle,
          count: 3,
          size: "1536x1024",
        }),
      });

      setImages((prev) => [...prev, ...res.items]);
      toast.success("Images generated.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate images.");
    } finally {
      setAssetLoading(false);
    }
  };

  const generateSubtitles = async () => {
    setAssetLoading(true);
    try {
      const res = await fetchJson<{
        transcript: string;
        sourceLanguage: string;
        cues: Array<{ startSec: number; endSec: number; text: string }>;
        translations: Record<string, string[]>;
      }>("/api/media/presentation/subtitles/generate", {
        method: "POST",
        body: JSON.stringify({
          presentationId: selectedPresentationId,
          voiceoverText: voiceoverText || editableDeck,
          sourceLanguage,
          targetLanguages,
        }),
      });

      setVoiceoverText(res.transcript);
      setSourceLanguage(res.sourceLanguage);
      setSubtitleCues(res.cues);
      setSubtitleTranslations(res.translations);
      toast.success("Subtitles generated.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate subtitles.");
    } finally {
      setAssetLoading(false);
    }
  };

  const generateVoiceover = async () => {
    if (!voiceoverText.trim()) {
      toast.error("Enter voice-over text first.");
      return;
    }

    setAssetLoading(true);
    try {
      const res = await fetchJson<GeneratePresentationResponse["voiceover"]>("/api/media/presentation/voiceover/generate", {
        method: "POST",
        body: JSON.stringify({
          presentationId: selectedPresentationId,
          text: voiceoverText,
          voice: voiceoverVoice,
          speed: voiceoverSpeed,
          trimStartSec,
          trimEndSec,
        }),
      });
      setVoiceoverMeta(res);
      toast.success("Voice-over generated.");
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate voice-over.");
    } finally {
      setAssetLoading(false);
    }
  };

  const addComment = async () => {
    if (!selectedPresentationId) {
      toast.error("Generate or load a presentation first.");
      return;
    }

    if (!commentDraft.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }

    try {
      await fetchJson<PresentationComment>(`/api/media/presentation/${selectedPresentationId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentDraft }),
      });
      setCommentDraft("");
      await loadCommentsAndVersions(selectedPresentationId);
      toast.success("Comment added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add comment.");
    }
  };

  const saveVersion = async () => {
    if (!selectedPresentationId) {
      toast.error("Generate or load a presentation first.");
      return;
    }

    if (!editableDeck.trim()) {
      toast.error("Deck content is empty.");
      return;
    }

    try {
      await fetchJson<PresentationVersion>(`/api/media/presentation/${selectedPresentationId}/versions`, {
        method: "POST",
        body: JSON.stringify({
          note: versionNote,
          snapshotText: editableDeck,
        }),
      });
      setVersionNote("");
      await loadCommentsAndVersions(selectedPresentationId);
      toast.success("Version saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save version.");
    }
  };

  const moveCue = (fromIndex: number, toIndex: number) => {
    setSubtitleCues((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) {
        return prev;
      }
      const clone = [...prev];
      const [moved] = clone.splice(fromIndex, 1);
      clone.splice(toIndex, 0, moved);
      return clone;
    });
  };

  const syncLoadedMetadata = async () => {
    if (!selectedPresentationId) {
      return;
    }
    await loadCommentsAndVersions(selectedPresentationId);
  };

  useEffect(() => {
    if (!selectedPresentationId) {
      setComments([]);
      setVersions([]);
      return;
    }
    void syncLoadedMetadata();
  }, [selectedPresentationId]);

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
            { key: "images", label: "Images" },
            { key: "subtitles", label: "Subtitles" },
            { key: "voice-over", label: "Voice Over" },
            { key: "collab", label: "Collab" },
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

      {activeTab === "images" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <h2 className="text-xl font-semibold text-white">AI Image Integration</h2>
          <p className="mt-1 text-sm text-slate-300">Generate on-brand slide visuals and keep them attached to this deck.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm text-blue-100/75">Visual style</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={visualStyle}
                onChange={(event) => setVisualStyle(event.target.value)}
                placeholder="minimal editorial style"
              />
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Image prompt</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={imagePrompt}
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="hero visual for product launch"
              />
            </div>
          </div>

          <button
            className="mt-4 rounded-lg border border-white/20 bg-[#0a1d40] px-4 py-2 text-sm text-slate-100 hover:bg-[#102852] disabled:opacity-50"
            onClick={() => void generateImages()}
            disabled={assetLoading}
            aria-label="Generate presentation images"
          >
            {assetLoading ? "Generating..." : "Generate Images"}
          </button>

          {images.length === 0 ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-[#071633] px-4 py-6 text-center text-sm text-slate-400">No images yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#071633]">
                  <img src={item.url} alt={item.prompt || "Generated presentation visual"} className="h-40 w-full object-cover" />
                  <figcaption className="p-2 text-xs text-slate-300">{item.prompt}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "subtitles" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <h2 className="text-xl font-semibold text-white">Subtitle Studio</h2>
          <p className="mt-1 text-sm text-slate-300">Generate, edit, translate, and reorder subtitle cues for presentations.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm text-blue-100/75">Source language</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
                placeholder="English"
              />
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Target languages (comma separated)</label>
              <input
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={targetLanguagesInput}
                onChange={(event) => setTargetLanguagesInput(event.target.value)}
                placeholder="Spanish, French"
              />
            </div>
          </div>

          <button
            className="mt-4 rounded-lg border border-white/20 bg-[#0a1d40] px-4 py-2 text-sm text-slate-100 hover:bg-[#102852] disabled:opacity-50"
            onClick={() => void generateSubtitles()}
            disabled={assetLoading}
            aria-label="Generate subtitles"
          >
            {assetLoading ? "Generating..." : "Generate Subtitles"}
          </button>

          <div className="mt-4 space-y-2">
            {subtitleCues.map((cue, index) => (
              <div
                key={`${cue.startSec}-${index}`}
                className="rounded-xl border border-white/10 bg-[#071633] p-3"
                draggable
                onDragStart={() => setDraggingCueIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingCueIndex !== null) {
                    moveCue(draggingCueIndex, index);
                  }
                  setDraggingCueIndex(null);
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    {cue.startSec.toFixed(2)}s - {cue.endSec.toFixed(2)}s
                  </span>
                  <div className="flex gap-2">
                    <button className="rounded border border-white/10 px-2 py-1" onClick={() => moveCue(index, index - 1)} aria-label="Move subtitle cue up">
                      Up
                    </button>
                    <button className="rounded border border-white/10 px-2 py-1" onClick={() => moveCue(index, index + 1)} aria-label="Move subtitle cue down">
                      Down
                    </button>
                  </div>
                </div>
                <textarea
                  className="min-h-16 w-full rounded-lg border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                  value={cue.text}
                  onChange={(event) =>
                    setSubtitleCues((prev) => prev.map((item, i) => (i === index ? { ...item, text: event.target.value } : item)))
                  }
                  aria-label={`Subtitle cue ${index + 1}`}
                />
              </div>
            ))}
            {subtitleCues.length === 0 ? <p className="text-sm text-slate-400">No subtitle cues yet.</p> : null}
          </div>

          {Object.keys(subtitleTranslations).length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Object.entries(subtitleTranslations).map(([language, lines]) => (
                <article key={language} className="rounded-xl border border-white/10 bg-[#071633] p-3">
                  <h3 className="text-sm font-semibold text-white">{language}</h3>
                  <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-300">{lines.join("\n")}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "voice-over" ? (
        <section className="panel animate-float-in rounded-2xl p-4">
          <h2 className="text-xl font-semibold text-white">Voice-Over Enhancement</h2>
          <p className="mt-1 text-sm text-slate-300">Draft narration, pick a voice, control speed, and generate downloadable voice-over audio.</p>

          <label className="mt-3 block text-sm text-blue-100/75">Narration text</label>
          <textarea
            className="mt-2 min-h-36 w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-3 text-sm text-slate-100"
            value={voiceoverText}
            onChange={(event) => setVoiceoverText(event.target.value)}
            placeholder="Paste narration script for your slides..."
          />

          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm text-blue-100/75">Voice</label>
              <select className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm" value={voiceoverVoice} onChange={(event) => setVoiceoverVoice(event.target.value as VoiceType)}>
                <option value="alloy">alloy</option>
                <option value="ash">ash</option>
                <option value="ballad">ballad</option>
                <option value="coral">coral</option>
                <option value="echo">echo</option>
                <option value="sage">sage</option>
                <option value="shimmer">shimmer</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Speed</label>
              <input
                type="number"
                step="0.1"
                min={0.5}
                max={2}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm"
                value={voiceoverSpeed}
                onChange={(event) => setVoiceoverSpeed(Number(event.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Trim start (sec)</label>
              <input
                type="number"
                min={0}
                max={120}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm"
                value={trimStartSec}
                onChange={(event) => setTrimStartSec(Number(event.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-sm text-blue-100/75">Trim end (sec)</label>
              <input
                type="number"
                min={0}
                max={120}
                className="mt-2 w-full rounded-lg border border-white/15 bg-[#050f26] px-3 py-2 text-sm"
                value={trimEndSec}
                onChange={(event) => setTrimEndSec(Number(event.target.value) || 0)}
              />
            </div>
          </div>

          <button
            className="mt-4 rounded-lg border border-white/20 bg-[#0a1d40] px-4 py-2 text-sm text-slate-100 hover:bg-[#102852] disabled:opacity-50"
            onClick={() => void generateVoiceover()}
            disabled={assetLoading}
            aria-label="Generate voice-over"
          >
            {assetLoading ? "Generating..." : "Generate Voice-Over"}
          </button>

          {voiceoverMeta ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#071633] p-3 text-sm text-slate-200">
              <p>Voice: {voiceoverMeta.voice}</p>
              <p>Speed: {voiceoverMeta.speed}</p>
              <p>Duration: {voiceoverMeta.durationSec}s (trimmed: {voiceoverMeta.trimmedDurationSec}s)</p>
              {voiceoverMeta.outputUrl ? (
                <audio className="mt-2 w-full" controls src={voiceoverMeta.outputUrl} aria-label="Generated voice-over preview" />
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "collab" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="panel animate-float-in rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-white">Comments</h2>
            <p className="mt-1 text-sm text-slate-300">Share feedback with teammates in real time when connected to DB.</p>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a comment"
                aria-label="Comment input"
              />
              <button className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" onClick={() => void addComment()}>
                Post
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {comments.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-[#071633] px-3 py-2">
                  <p className="text-xs text-slate-400">{item.author} | {format(new Date(item.createdAt), "MMM d, h:mm a")}</p>
                  <p className="text-sm text-slate-200">{item.content}</p>
                </div>
              ))}
              {comments.length === 0 ? <p className="text-sm text-slate-400">No comments yet.</p> : null}
            </div>
          </article>

          <article className="panel animate-float-in rounded-2xl p-4">
            <h2 className="text-xl font-semibold text-white">Version Control</h2>
            <p className="mt-1 text-sm text-slate-300">Snapshot deck revisions and restore any previous version.</p>
            <div className="mt-3 flex gap-2">
              <input
                className="w-full rounded-xl border border-white/15 bg-[#05122a] px-3 py-2 text-sm text-slate-100"
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                placeholder="Version note (optional)"
                aria-label="Version note"
              />
              <button className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10" onClick={() => void saveVersion()}>
                Save
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {versions.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-[#071633] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">v{item.versionNumber}</p>
                    <button
                      className="rounded border border-white/15 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                      onClick={() => {
                        setEditableDeck(item.snapshotText);
                        toast.success(`Loaded version ${item.versionNumber}.`);
                      }}
                    >
                      Restore
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{format(new Date(item.createdAt), "MMM d, h:mm a")}</p>
                  {item.note ? <p className="mt-1 text-xs text-slate-300">{item.note}</p> : null}
                </div>
              ))}
              {versions.length === 0 ? <p className="text-sm text-slate-400">No versions yet.</p> : null}
            </div>
          </article>
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

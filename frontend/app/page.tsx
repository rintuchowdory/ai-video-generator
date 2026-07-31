"use client";

import { useState } from "react";
import { createScript, generateVideos, checkStatus, Scene, SceneJob } from "@/lib/api";

type Stage = "idle" | "scripting" | "review" | "generating" | "done";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [sceneCount, setSceneCount] = useState(4);
  const [tone, setTone] = useState("professional");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [jobs, setJobs] = useState<SceneJob[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const t = language === "de"
    ? {
        heading: "Werkbank",
        sub: "Vom Thema zum fertigen Werbevideo — Storyboard per KI, Szenen per Videomodell.",
        topicLabel: "Thema oder Produkt",
        topicPlaceholder: "z. B. Eroeffnung unseres neuen Cafes in Aachen",
        scenes: "Szenen",
        toneLabel: "Ton",
        buildScript: "Storyboard erstellen",
        building: "Wird erstellt...",
        reviewHeading: "Fertigungsplan",
        editHint: "Pruefe und bearbeite jede Szene vor der Videogenerierung.",
        generate: "Videos generieren",
        generating: "Videos werden generiert...",
        narration: "Erzaehltext",
        visual: "Bildbeschreibung",
        duration: "Dauer (Sek.)",
        queued: "In Warteschlange",
        processing: "In Arbeit",
        completed: "Fertig",
        failed: "Fehlgeschlagen",
        startOver: "Neues Projekt",
      }
    : {
        heading: "Werkbank",
        sub: "From topic to finished ad video — storyboard by AI, scenes by video model.",
        topicLabel: "Topic or product",
        topicPlaceholder: "e.g. Launch of our new cafe in Aachen",
        scenes: "Scenes",
        toneLabel: "Tone",
        buildScript: "Build storyboard",
        building: "Building...",
        reviewHeading: "Production plan",
        editHint: "Review and edit every scene before generating video.",
        generate: "Generate videos",
        generating: "Generating videos...",
        narration: "Narration",
        visual: "Visual prompt",
        duration: "Duration (sec)",
        queued: "Queued",
        processing: "Processing",
        completed: "Done",
        failed: "Failed",
        startOver: "New project",
      };

  async function handleBuildScript() {
    setError(null);
    setStage("scripting");
    try {
      const res = await createScript({ topic, language, scene_count: sceneCount, tone });
      setScenes(res.scenes);
      setStage("review");
    } catch (e) {
      setError((e as Error).message);
      setStage("idle");
    }
  }

  function updateScene(index: number, field: keyof Scene, value: string | number) {
    setScenes((prev) =>
      prev.map((s) => (s.index === index ? { ...s, [field]: value } : s))
    );
  }

  async function handleGenerate() {
    setError(null);
    setStage("generating");
    try {
      const res = await generateVideos(scenes, "16:9");
      setJobs(res.jobs);
      pollAll(res.jobs);
    } catch (e) {
      setError((e as Error).message);
      setStage("review");
    }
  }

  function pollAll(initialJobs: SceneJob[]) {
    const interval = setInterval(async () => {
      const updated = await Promise.all(
        initialJobs.map(async (j) => {
          if (j.status === "completed" || j.status === "failed") return j;
          try {
            const s = await checkStatus(j.job_id);
            return { ...j, status: s.status, video_url: s.video_url, error: s.error };
          } catch {
            return j;
          }
        })
      );
      setJobs(updated);
      initialJobs = updated;
      if (updated.every((j) => j.status === "completed" || j.status === "failed")) {
        clearInterval(interval);
        setStage("done");
      }
    }, 4000);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <header className="mb-14 border-b border-line pb-8 flex items-end justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-brass uppercase mb-3">
            KI-Videoproduktion
          </p>
          <h1 className="font-display text-5xl font-bold tracking-tight">{t.heading}</h1>
          <p className="text-muted mt-3 max-w-md">{t.sub}</p>
        </div>
        <button
          onClick={() => setLanguage(language === "de" ? "en" : "de")}
          className="font-mono text-xs border border-line rounded px-3 py-1.5 text-muted hover:border-brass hover:text-brass transition-colors"
        >
          {language === "de" ? "EN" : "DE"}
        </button>
      </header>

      {stage === "idle" || stage === "scripting" ? (
        <section className="space-y-6">
          <div>
            <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">
              {t.topicLabel}
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t.topicPlaceholder}
              rows={3}
              className="w-full bg-panel border border-line rounded-md px-4 py-3 text-paper placeholder:text-muted/60 focus:border-brass outline-none resize-none"
            />
          </div>

          <div className="flex gap-6">
            <div>
              <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">
                {t.scenes}
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value))}
                className="w-24 bg-panel border border-line rounded-md px-3 py-2 text-paper focus:border-brass outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">
                {t.toneLabel}
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-panel border border-line rounded-md px-3 py-2 text-paper focus:border-brass outline-none"
              />
            </div>
          </div>

          {error && <p className="text-fail text-sm">{error}</p>}

          <button
            onClick={handleBuildScript}
            disabled={topic.trim().length < 3 || stage === "scripting"}
            className="bg-brass text-graphite font-display font-bold px-6 py-3 rounded-md hover:bg-brassDim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {stage === "scripting" ? t.building : t.buildScript}
          </button>
        </section>
      ) : (
        <section>
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold">{t.reviewHeading}</h2>
            <p className="text-muted text-sm mt-1">{t.editHint}</p>
          </div>

          <div className="space-y-4">
            {scenes.map((scene) => {
              const job = jobs.find((j) => j.scene_index === scene.index);
              return (
                <div
                  key={scene.index}
                  className="relative bg-panel border border-line rounded-lg p-5 pl-16"
                >
                  <div className="sprocket absolute left-0 top-0 bottom-0 w-8 rounded-l-lg" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-brass text-2xl font-bold">
                    {String(scene.index + 1).padStart(2, "0")}
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <label className="font-mono text-[10px] tracking-widest text-muted uppercase">
                        {t.narration}
                      </label>
                      <textarea
                        value={scene.narration}
                        onChange={(e) => updateScene(scene.index, "narration", e.target.value)}
                        rows={2}
                        disabled={stage !== "review"}
                        className="w-full bg-graphite border border-line rounded px-3 py-2 mt-1 text-sm text-paper focus:border-brass outline-none disabled:opacity-70 resize-none"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] tracking-widest text-muted uppercase">
                        {t.visual}
                      </label>
                      <textarea
                        value={scene.visual_prompt}
                        onChange={(e) => updateScene(scene.index, "visual_prompt", e.target.value)}
                        rows={2}
                        disabled={stage !== "review"}
                        className="w-full bg-graphite border border-line rounded px-3 py-2 mt-1 text-sm text-paper focus:border-brass outline-none disabled:opacity-70 resize-none"
                      />
                    </div>

                    {job && (
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded ${
                            job.status === "completed"
                              ? "bg-brass/20 text-brass"
                              : job.status === "failed"
                              ? "bg-fail/20 text-fail"
                              : "bg-line text-muted"
                          }`}
                        >
                          {job.status === "queued" && t.queued}
                          {job.status === "processing" && t.processing}
                          {job.status === "completed" && t.completed}
                          {job.status === "failed" && t.failed}
                        </span>
                        {job.video_url && (
                          <video
                            src={job.video_url}
                            controls
                            className="mt-2 rounded border border-line w-full max-w-sm"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-fail text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-8">
            {stage === "review" && (
              <button
                onClick={handleGenerate}
                className="bg-brass text-graphite font-display font-bold px-6 py-3 rounded-md hover:bg-brassDim transition-colors"
              >
                {t.generate}
              </button>
            )}
            {stage === "generating" && (
              <button
                disabled
                className="bg-line text-muted font-display font-bold px-6 py-3 rounded-md cursor-not-allowed"
              >
                {t.generating}
              </button>
            )}
            {(stage === "review" || stage === "done") && (
              <button
                onClick={() => {
                  setStage("idle");
                  setScenes([]);
                  setJobs([]);
                  setTopic("");
                }}
                className="border border-line text-muted px-6 py-3 rounded-md hover:border-brass hover:text-brass transition-colors"
              >
                {t.startOver}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

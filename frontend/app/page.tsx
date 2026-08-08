"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AspectRatio,
  checkStatus,
  createScript,
  generateImage,
  generateVideoFromImage,
  generateVideos,
  GenerationOptions,
  getCapabilities,
  ImageResolution,
  ProviderCapabilities,
  ProviderModelOption,
  Scene,
  SceneJob,
  uploadImage,
  UploadedImage,
} from "@/lib/api";

type Stage = "idle" | "scripting" | "review" | "generating" | "done";

const FALLBACK_VIDEO_MODELS: ProviderModelOption[] = [
  {
    id: "ltx-2.3",
    label: "LTX 2.3 — fast iteration",
    resolutions: ["480p", "720p", "1080p"],
    durations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30],
    supports_audio: true,
  },
  {
    id: "kling-3.0",
    label: "Kling 3.0 — cinematic quality",
    resolutions: ["720p", "1080p", "4k"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    supports_audio: true,
  },
];

const FALLBACK_IMAGE_MODELS: ProviderModelOption[] = [
  {
    id: "default",
    label: "Best available",
    resolutions: ["640px", "1k", "2k", "4k"],
    durations: [],
    supports_audio: false,
  },
  {
    id: "flux-schnell",
    label: "Flux Schnell — fast image draft",
    resolutions: ["640px", "1k", "2k"],
    durations: [],
    supports_audio: false,
  },
];

const FALLBACK_ASPECT_RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1"];
const FALLBACK_STYLE_TOOLS = ["general", "ai-photo-generator", "ai-illustration-generator", "movie-poster-generator"];

function isTerminal(job: SceneJob) {
  return job.status === "completed" || job.status === "failed";
}

function statusClass(status: SceneJob["status"]) {
  if (status === "completed") return "bg-brass/20 text-brass";
  if (status === "failed") return "bg-fail/20 text-fail";
  return "bg-line text-muted";
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [sceneCount, setSceneCount] = useState(4);
  const [tone, setTone] = useState("professional");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [jobs, setJobs] = useState<SceneJob[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ProviderCapabilities | null>(null);
  const [capabilitiesWarning, setCapabilitiesWarning] = useState<string | null>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    aspect_ratio: "16:9",
    model: "ltx-2.3",
    resolution: "480p",
    audio: false,
  });

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("default");
  const [imageResolution, setImageResolution] = useState<ImageResolution>("640px");
  const [imageStyle, setImageStyle] = useState("general");
  const [imageJob, setImageJob] = useState<SceneJob | null>(null);
  const [imageVideoJob, setImageVideoJob] = useState<SceneJob | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const timers = useRef<Set<number>>(new Set());

  const videoModels = capabilities?.video_models.length ? capabilities.video_models : FALLBACK_VIDEO_MODELS;
  const imageModels = capabilities?.image_models.length ? capabilities.image_models : FALLBACK_IMAGE_MODELS;
  const aspectRatios = capabilities?.aspect_ratios.length ? capabilities.aspect_ratios : FALLBACK_ASPECT_RATIOS;
  const imageStyleTools = capabilities?.image_style_tools.length ? capabilities.image_style_tools : FALLBACK_STYLE_TOOLS;

  const selectedVideoModel = useMemo(
    () => videoModels.find((model) => model.id === options.model) || videoModels[0],
    [options.model, videoModels],
  );
  const selectedImageModel = useMemo(
    () => imageModels.find((model) => model.id === imageModel) || imageModels[0],
    [imageModel, imageModels],
  );
  const supportedDurations = selectedVideoModel?.durations.length ? selectedVideoModel.durations : [3, 4, 5, 6, 8, 10, 15];

  const t = language === "de"
    ? {
        heading: "Werkbank",
        sub: "Vom Thema zum Werbevideo — Storyboard, Bildreferenz und Videogenerierung in einem Workflow.",
        topicLabel: "Thema oder Produkt",
        topicPlaceholder: "z. B. Eroeffnung unseres neuen Cafes in Aachen",
        scenes: "Szenen",
        toneLabel: "Ton",
        buildScript: "Storyboard erstellen",
        building: "Storyboard wird erstellt…",
        reviewHeading: "Storyboard und Produktion",
        editHint: "Pruefe die Szenen und waehle ein kompatibles Modell, Format und eine Aufloesung.",
        generate: "Storyboard-Videos generieren",
        generating: "Videos werden generiert…",
        narration: "Erzaehltext",
        visual: "Visueller Prompt",
        duration: "Dauer",
        queued: "Warteschlange",
        processing: "In Arbeit",
        completed: "Fertig",
        failed: "Fehlgeschlagen",
        startOver: "Neues Projekt",
        settings: "Videoeinstellungen",
        model: "Modell",
        resolution: "Aufloesung",
        ratio: "Seitenverhaeltnis",
        audio: "Audio generieren, wenn das Modell es unterstuetzt",
        reference: "Bildreferenz-Werkzeuge",
        referenceHint: "Erstelle erst ein Bild oder lade ein eigenes Bild hoch und animiere es anschliessend.",
        imagePrompt: "Bild-Prompt",
        imageStyle: "Bildstil",
        createImage: "Referenzbild erstellen",
        creatingImage: "Bild wird erstellt…",
        uploadImage: "Eigenes Bild hochladen",
        uploading: "Bild wird hochgeladen…",
        animate: "Als Video animieren",
        useScenePrompt: "Als Bild-Prompt verwenden",
        unavailableAudio: "Audio ist fuer dieses Modell nicht verfuegbar.",
        providerFallback: "Provider-Optionen konnten nicht geladen werden. Sichere Standardoptionen werden angezeigt.",
      }
    : {
        heading: "Werkbank",
        sub: "From topic to ad video — storyboard, image reference, and video generation in one workflow.",
        topicLabel: "Topic or product",
        topicPlaceholder: "e.g. Launch of our new cafe in Aachen",
        scenes: "Scenes",
        toneLabel: "Tone",
        buildScript: "Build storyboard",
        building: "Building storyboard…",
        reviewHeading: "Storyboard and production",
        editHint: "Review scenes and select a compatible model, format, and resolution.",
        generate: "Generate storyboard videos",
        generating: "Generating videos…",
        narration: "Narration",
        visual: "Visual prompt",
        duration: "Duration",
        queued: "Queued",
        processing: "Processing",
        completed: "Done",
        failed: "Failed",
        startOver: "New project",
        settings: "Video settings",
        model: "Model",
        resolution: "Resolution",
        ratio: "Aspect ratio",
        audio: "Generate audio when supported by the model",
        reference: "Image reference tools",
        referenceHint: "Create a reference image or upload your own, then animate it into a video.",
        imagePrompt: "Image prompt",
        imageStyle: "Image style",
        createImage: "Create reference image",
        creatingImage: "Creating image…",
        uploadImage: "Upload your own image",
        uploading: "Uploading image…",
        animate: "Animate as video",
        useScenePrompt: "Use as image prompt",
        unavailableAudio: "Audio is unavailable for this model.",
        providerFallback: "Provider options could not be loaded. Safe default options are shown.",
      };

  function clearPolling() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }

  function schedule(callback: () => void, delay = 3500) {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }

  useEffect(() => {
    let cancelled = false;
    void getCapabilities()
      .then((data) => {
        if (!cancelled) setCapabilities(data);
      })
      .catch(() => {
        if (!cancelled) setCapabilitiesWarning("Provider options unavailable");
      });
    return () => {
      cancelled = true;
      clearPolling();
    };
  }, []);

  useEffect(() => {
    if (!selectedVideoModel) return;
    setOptions((current) => {
      const resolution = selectedVideoModel.resolutions.includes(current.resolution)
        ? current.resolution
        : (selectedVideoModel.resolutions[0] as GenerationOptions["resolution"]);
      const audio = selectedVideoModel.supports_audio ? current.audio : false;
      if (current.model === selectedVideoModel.id && current.resolution === resolution && current.audio === audio) {
        return current;
      }
      return { ...current, model: selectedVideoModel.id, resolution, audio };
    });
    setScenes((current) => current.map((scene) => (
      supportedDurations.includes(scene.duration_seconds)
        ? scene
        : { ...scene, duration_seconds: supportedDurations[0] }
    )));
  }, [selectedVideoModel, supportedDurations]);

  useEffect(() => {
    if (!selectedImageModel) return;
    setImageModel(selectedImageModel.id);
    if (!selectedImageModel.resolutions.includes(imageResolution)) {
      setImageResolution(selectedImageModel.resolutions[0] as ImageResolution);
    }
  }, [selectedImageModel, imageResolution]);

  async function pollAll(currentJobs: SceneJob[], attempt = 0) {
    const updated = await Promise.all(
      currentJobs.map(async (job) => {
        if (isTerminal(job)) return job;
        try {
          const status = await checkStatus(job.job_id);
          return { ...job, ...status, scene_index: job.scene_index };
        } catch (pollError) {
          if (attempt >= 4) {
            return { ...job, status: "failed" as const, error: (pollError as Error).message };
          }
          return job;
        }
      }),
    );
    setJobs(updated);
    if (updated.every(isTerminal)) {
      setStage("done");
      return;
    }
    schedule(() => void pollAll(updated, attempt + 1));
  }

  function pollStandaloneJob(job: SceneJob, setJob: (next: SceneJob) => void, attempt = 0) {
    if (isTerminal(job)) return;
    void checkStatus(job.job_id)
      .then((status) => {
        const next = { ...job, ...status, scene_index: job.scene_index };
        setJob(next);
        if (!isTerminal(next)) schedule(() => pollStandaloneJob(next, setJob), 3500);
      })
      .catch((pollError) => {
        if (attempt >= 4) {
          setJob({ ...job, status: "failed", error: (pollError as Error).message });
          return;
        }
        schedule(() => pollStandaloneJob(job, setJob, attempt + 1), 3500);
      });
  }

  async function handleBuildScript() {
    setError(null);
    clearPolling();
    setStage("scripting");
    try {
      const response = await createScript({ topic, language, scene_count: sceneCount, tone });
      setScenes(response.scenes);
      setImagePrompt(response.scenes[0]?.visual_prompt || "");
      setJobs([]);
      setStage("review");
    } catch (requestError) {
      setError((requestError as Error).message);
      setStage("idle");
    }
  }

  function updateScene(index: number, field: keyof Scene, value: string | number) {
    setScenes((current) => current.map((scene) => (
      scene.index === index ? { ...scene, [field]: value } : scene
    )));
  }

  function selectVideoModel(modelId: string) {
    const model = videoModels.find((item) => item.id === modelId);
    if (!model) return;
    setOptions((current) => ({
      ...current,
      model: model.id,
      resolution: (model.resolutions.includes(current.resolution) ? current.resolution : model.resolutions[0]) as GenerationOptions["resolution"],
      audio: model.supports_audio ? current.audio : false,
    }));
  }

  async function handleGenerate() {
    setError(null);
    clearPolling();
    setStage("generating");
    try {
      const response = await generateVideos(scenes, options);
      setJobs(response.jobs);
      schedule(() => void pollAll(response.jobs), 2500);
    } catch (requestError) {
      setError((requestError as Error).message);
      setStage("review");
    }
  }

  async function handleGenerateImage() {
    setError(null);
    setImageBusy(true);
    try {
      const job = await generateImage({
        prompt: imagePrompt,
        name: "Werkbank reference image",
        aspect_ratio: options.aspect_ratio,
        model: imageModel,
        resolution: imageResolution,
        style_tool: imageStyle,
      });
      setImageJob(job);
      pollStandaloneJob(job, setImageJob);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploadBusy(true);
    try {
      const uploaded = await uploadImage(file);
      setUploadedImage(uploaded);
      setImageVideoJob(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleAnimate(source: "upload" | "generated") {
    setError(null);
    setImageBusy(true);
    try {
      const job = await generateVideoFromImage({
        ...(source === "upload" ? { asset_id: uploadedImage?.asset_id } : { image_project_id: imageJob?.job_id }),
        prompt: imagePrompt,
        name: "Werkbank image-to-video",
        options,
        duration_seconds: supportedDurations.includes(5) ? 5 : supportedDurations[0],
      });
      setImageVideoJob(job);
      pollStandaloneJob(job, setImageVideoJob);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  function resetProject() {
    clearPolling();
    setStage("idle");
    setScenes([]);
    setJobs([]);
    setTopic("");
    setImagePrompt("");
    setImageJob(null);
    setImageVideoJob(null);
    setUploadedImage(null);
    setError(null);
  }

  const statusText = (status: SceneJob["status"]) => ({
    queued: t.queued,
    processing: t.processing,
    completed: t.completed,
    failed: t.failed,
  })[status];

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <header className="mb-14 border-b border-line pb-8 flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-brass uppercase mb-3">AI Video Production</p>
          <h1 className="font-display text-5xl font-bold tracking-tight">{t.heading}</h1>
          <p className="text-muted mt-3 max-w-2xl">{t.sub}</p>
        </div>
        <button
          onClick={() => setLanguage(language === "de" ? "en" : "de")}
          className="font-mono text-xs border border-line rounded px-3 py-1.5 text-muted hover:border-brass hover:text-brass transition-colors"
        >
          {language === "de" ? "EN" : "DE"}
        </button>
      </header>

      {capabilitiesWarning && (
        <p className="mb-6 rounded border border-brass/30 bg-brass/10 px-4 py-3 text-sm text-brass">{t.providerFallback}</p>
      )}
      {error && <p className="mb-6 rounded border border-fail/30 bg-fail/10 px-4 py-3 text-sm text-fail">{error}</p>}

      {stage === "idle" || stage === "scripting" ? (
        <section className="max-w-2xl space-y-6">
          <div>
            <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">{t.topicLabel}</label>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder={t.topicPlaceholder}
              rows={3}
              className="w-full bg-panel border border-line rounded-md px-4 py-3 text-paper placeholder:text-muted/60 focus:border-brass outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">{t.scenes}</label>
              <input
                type="number"
                min={1}
                max={8}
                value={sceneCount}
                onChange={(event) => setSceneCount(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
                className="w-full bg-panel border border-line rounded-md px-3 py-2 text-paper focus:border-brass outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-xs tracking-widest text-muted uppercase block mb-2">{t.toneLabel}</label>
              <input
                type="text"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="w-full bg-panel border border-line rounded-md px-3 py-2 text-paper focus:border-brass outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleBuildScript}
            disabled={topic.trim().length < 3 || stage === "scripting"}
            className="bg-brass text-graphite font-display font-bold px-6 py-3 rounded-md hover:bg-brassDim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {stage === "scripting" ? t.building : t.buildScript}
          </button>
        </section>
      ) : (
        <section className="space-y-10">
          <div>
            <h2 className="font-display text-2xl font-bold">{t.reviewHeading}</h2>
            <p className="text-muted text-sm mt-1">{t.editHint}</p>
          </div>

          <section className="bg-panel border border-line rounded-lg p-5">
            <h3 className="font-display text-xl font-bold mb-4">{t.settings}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.model}</label>
                <select
                  value={options.model}
                  onChange={(event) => selectVideoModel(event.target.value)}
                  disabled={stage !== "review"}
                  className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none disabled:opacity-70"
                >
                  {videoModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.resolution}</label>
                <select
                  value={options.resolution}
                  onChange={(event) => setOptions((current) => ({ ...current, resolution: event.target.value as GenerationOptions["resolution"] }))}
                  disabled={stage !== "review"}
                  className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none disabled:opacity-70"
                >
                  {selectedVideoModel?.resolutions.map((resolution) => <option key={resolution} value={resolution}>{resolution}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.ratio}</label>
                <select
                  value={options.aspect_ratio}
                  onChange={(event) => setOptions((current) => ({ ...current, aspect_ratio: event.target.value as AspectRatio }))}
                  disabled={stage !== "review"}
                  className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none disabled:opacity-70"
                >
                  {aspectRatios.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={options.audio}
                disabled={stage !== "review" || !selectedVideoModel?.supports_audio}
                onChange={(event) => setOptions((current) => ({ ...current, audio: event.target.checked }))}
                className="mt-1 accent-brass"
              />
              <span>{selectedVideoModel?.supports_audio ? t.audio : t.unavailableAudio}</span>
            </label>
          </section>

          <div className="space-y-4">
            {scenes.map((scene) => {
              const job = jobs.find((item) => item.scene_index === scene.index);
              return (
                <article key={scene.index} className="relative bg-panel border border-line rounded-lg p-5 pl-16">
                  <div className="sprocket absolute left-0 top-0 bottom-0 w-8 rounded-l-lg" />
                  <div className="absolute left-3 top-7 font-mono text-brass text-2xl font-bold">{String(scene.index + 1).padStart(2, "0")}</div>
                  <div className="grid gap-3">
                    <div>
                      <label className="font-mono text-[10px] tracking-widest text-muted uppercase">{t.narration}</label>
                      <textarea
                        value={scene.narration}
                        onChange={(event) => updateScene(scene.index, "narration", event.target.value)}
                        rows={2}
                        disabled={stage !== "review"}
                        className="w-full bg-graphite border border-line rounded px-3 py-2 mt-1 text-sm text-paper focus:border-brass outline-none disabled:opacity-70 resize-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="font-mono text-[10px] tracking-widest text-muted uppercase">{t.visual}</label>
                        {stage === "review" && (
                          <button onClick={() => setImagePrompt(scene.visual_prompt)} className="text-xs text-brass hover:text-paper transition-colors">
                            {t.useScenePrompt}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={scene.visual_prompt}
                        onChange={(event) => updateScene(scene.index, "visual_prompt", event.target.value)}
                        rows={3}
                        disabled={stage !== "review"}
                        className="w-full bg-graphite border border-line rounded px-3 py-2 mt-1 text-sm text-paper focus:border-brass outline-none disabled:opacity-70 resize-none"
                      />
                    </div>
                    <div className="max-w-44">
                      <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-1">{t.duration}</label>
                      <select
                        value={scene.duration_seconds}
                        onChange={(event) => updateScene(scene.index, "duration_seconds", Number(event.target.value))}
                        disabled={stage !== "review"}
                        className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none disabled:opacity-70"
                      >
                        {supportedDurations.map((duration) => <option key={duration} value={duration}>{duration}s</option>)}
                      </select>
                    </div>
                    {job && (
                      <div className="mt-1 space-y-2">
                        <span className={`inline-block font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded ${statusClass(job.status)}`}>{statusText(job.status)}</span>
                        {job.error && <p className="text-fail text-sm">{job.error}</p>}
                        {job.video_url && <video src={job.video_url} controls className="rounded border border-line w-full max-w-lg" />}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <section className="bg-panel border border-line rounded-lg p-5 space-y-5">
            <div>
              <h3 className="font-display text-xl font-bold">{t.reference}</h3>
              <p className="text-muted text-sm mt-1">{t.referenceHint}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.imagePrompt}</label>
                <textarea
                  value={imagePrompt}
                  onChange={(event) => setImagePrompt(event.target.value)}
                  rows={5}
                  className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none resize-none"
                />
              </div>
              <div className="grid content-start gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.model}</label>
                    <select
                      value={imageModel}
                      onChange={(event) => setImageModel(event.target.value)}
                      className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none"
                    >
                      {imageModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.resolution}</label>
                    <select
                      value={imageResolution}
                      onChange={(event) => setImageResolution(event.target.value as ImageResolution)}
                      className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none"
                    >
                      {selectedImageModel?.resolutions.map((resolution) => <option key={resolution} value={resolution}>{resolution}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.imageStyle}</label>
                  <select
                    value={imageStyle}
                    onChange={(event) => setImageStyle(event.target.value)}
                    className="w-full bg-graphite border border-line rounded px-3 py-2 text-sm text-paper focus:border-brass outline-none"
                  >
                    {imageStyleTools.map((style) => <option key={style} value={style}>{style.replaceAll("-", " ")}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleGenerateImage}
                  disabled={imagePrompt.trim().length < 3 || imageBusy}
                  className="w-fit bg-brass text-graphite font-display font-bold px-5 py-2.5 rounded-md hover:bg-brassDim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {imageBusy ? t.creatingImage : t.createImage}
                </button>
              </div>
            </div>

            <div className="border-t border-line pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="font-mono text-[10px] tracking-widest text-muted uppercase block mb-2">{t.uploadImage}</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif,image/bmp,image/tiff,image/heic,image/heif"
                  onChange={(event) => void handleUpload(event.target.files?.[0])}
                  disabled={uploadBusy}
                  className="block w-full text-sm text-muted file:mr-3 file:border-0 file:bg-line file:px-3 file:py-2 file:text-paper file:rounded file:cursor-pointer"
                />
                <p className="text-muted text-xs mt-2">{uploadBusy ? t.uploading : uploadedImage ? uploadedImage.filename : "PNG, JPG, WebP, AVIF, BMP, TIFF, HEIC"}</p>
                {uploadedImage && (
                  <button onClick={() => void handleAnimate("upload")} disabled={imageBusy} className="mt-3 border border-brass text-brass px-4 py-2 rounded-md hover:bg-brass/10 disabled:opacity-40 transition-colors">
                    {t.animate}
                  </button>
                )}
              </div>
              <div>
                {imageJob && (
                  <div className="space-y-3">
                    <span className={`inline-block font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded ${statusClass(imageJob.status)}`}>{statusText(imageJob.status)}</span>
                    {imageJob.error && <p className="text-fail text-sm">{imageJob.error}</p>}
                    {imageJob.image_urls[0] && <img src={imageJob.image_urls[0]} alt="Generated reference" className="rounded border border-line max-h-72 object-contain" />}
                    {imageJob.status === "completed" && (
                      <button onClick={() => void handleAnimate("generated")} disabled={imageBusy} className="border border-brass text-brass px-4 py-2 rounded-md hover:bg-brass/10 disabled:opacity-40 transition-colors">
                        {t.animate}
                      </button>
                    )}
                  </div>
                )}
                {imageVideoJob && (
                  <div className="mt-4 space-y-2">
                    <span className={`inline-block font-mono text-[10px] tracking-widest uppercase px-2 py-1 rounded ${statusClass(imageVideoJob.status)}`}>{statusText(imageVideoJob.status)}</span>
                    {imageVideoJob.error && <p className="text-fail text-sm">{imageVideoJob.error}</p>}
                    {imageVideoJob.video_url && <video src={imageVideoJob.video_url} controls className="rounded border border-line w-full" />}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            {stage === "review" && (
              <button onClick={handleGenerate} className="bg-brass text-graphite font-display font-bold px-6 py-3 rounded-md hover:bg-brassDim transition-colors">
                {t.generate}
              </button>
            )}
            {stage === "generating" && (
              <button disabled className="bg-line text-muted font-display font-bold px-6 py-3 rounded-md cursor-not-allowed">{t.generating}</button>
            )}
            {(stage === "review" || stage === "done") && (
              <button onClick={resetProject} className="border border-line text-muted px-6 py-3 rounded-md hover:border-brass hover:text-brass transition-colors">{t.startOver}</button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

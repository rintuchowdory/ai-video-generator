import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Play, AlertCircle, CheckCircle2, Clock, Upload, ImagePlus } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useJobPolling } from "@/hooks/useJobPolling";
import { isSubmitShortcut } from "@/lib/dashboard";

type CapabilityModel = {
  id: string;
  name: string;
  type: "text-to-video" | "text-to-image" | "image-to-video";
  resolutions: string[];
  aspectRatios: string[];
  maxDurationSeconds: number;
  minDurationSeconds: number;
};

export default function ProjectDetail(props: any) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const projectId = Number(props.projectId);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de");

  const projectQuery = trpc.projects.get.useQuery({ projectId }, { enabled: !!user && Number.isFinite(projectId) });
  const scenesQuery = trpc.scenes.list.useQuery(
    { projectId },
    { enabled: !!user && !!projectQuery.data && Number.isFinite(projectId) },
  );
  const capabilitiesQuery = trpc.provider.capabilities.useQuery();

  const generateStoryboardMutation = trpc.storyboard.generate.useMutation({
    onSuccess: async () => {
      toast.success("Storyboard erstellt");
      setTopic("");
      await scenesQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Storyboard konnte nicht erstellt werden"),
  });

  if (projectQuery.isLoading) {
    return <LoadingState label="Projekt wird geladen ..." />;
  }

  if (projectQuery.error || !projectQuery.data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Projekt nicht verfügbar</AlertTitle>
          <AlertDescription>{projectQuery.error?.message || "Das Projekt wurde nicht gefunden."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const project = projectQuery.data;
  const scenes = scenesQuery.data ?? [];
  const capabilities = capabilitiesQuery.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zum Dashboard
        </Button>

        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Projektstudio</p>
          <h1 className="mt-2 text-3xl font-bold">{project.title}</h1>
          <p className="mt-2 text-muted-foreground">{project.description || "Storyboard und Medienproduktion"}</p>
        </div>

        {capabilitiesQuery.isLoading && (
          <Alert className="mb-6"><Clock className="h-4 w-4" /><AlertTitle>Provider wird geladen</AlertTitle><AlertDescription>Die verfügbaren Modelle und Einstellungen werden geladen.</AlertDescription></Alert>
        )}
        {capabilitiesQuery.error && (
          <Alert variant="destructive" className="mb-6"><AlertCircle className="h-4 w-4" /><AlertTitle>Provider-Einstellungen nicht verfügbar</AlertTitle><AlertDescription>{capabilitiesQuery.error.message}. Bitte laden Sie die Seite neu.</AlertDescription></Alert>
        )}

        {scenes.length === 0 ? (
          <StoryboardForm
            topic={topic}
            language={language}
            isPending={generateStoryboardMutation.isPending}
            onTopicChange={setTopic}
            onLanguageChange={setLanguage}
            onSubmit={() => generateStoryboardMutation.mutate({ projectId, topic, language })}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Storyboard</h2>
                <p className="text-sm text-muted-foreground">{scenes.length} Szenen · Änderungen werden pro Szene gespeichert.</p>
              </div>
              {scenesQuery.isFetching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            {scenesQuery.error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Szenen konnten nicht geladen werden</AlertTitle><AlertDescription>{scenesQuery.error.message}</AlertDescription></Alert>}
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                projectId={projectId}
                capabilities={capabilities?.models ?? []}
                imageStyles={capabilities?.imageStyles ?? []}
                capabilitiesError={capabilitiesQuery.error?.message}
                onUpdate={() => scenesQuery.refetch()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StoryboardForm({
  topic,
  language,
  isPending,
  onTopicChange,
  onLanguageChange,
  onSubmit,
}: {
  topic: string;
  language: "de" | "en";
  isPending: boolean;
  onTopicChange: (value: string) => void;
  onLanguageChange: (value: "de" | "en") => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storyboard generieren</CardTitle>
        <CardDescription>Beschreiben Sie die Idee. Groq erstellt daraus Szenen mit Narration und visuellen Prompts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="topic">Thema oder Kampagnenidee</Label>
          <Textarea id="topic" rows={5} value={topic} onChange={(event) => onTopicChange(event.target.value)} onKeyDown={(event) => { if (isSubmitShortcut(event)) { event.preventDefault(); onSubmit(); } }} placeholder="z. B. Eröffnung unseres neuen Cafés in Aachen ..." />
          <p className="mt-1 text-xs text-muted-foreground">Enter absenden · Shift+Enter für einen Zeilenumbruch</p>
        </div>
        <div>
          <Label htmlFor="storyboard-language">Ausgabesprache</Label>
          <Select value={language} onValueChange={(value) => onLanguageChange(value as "de" | "en")}>
            <SelectTrigger id="storyboard-language"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
          </Select>
        </div>
        <Button className="w-full" disabled={!topic.trim() || isPending} onClick={onSubmit}>
          {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Storyboard wird erstellt ...</> : "Storyboard generieren"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SceneCard({
  scene,
  projectId,
  capabilities,
  imageStyles,
  capabilitiesError,
  onUpdate,
}: {
  scene: any;
  projectId: number;
  capabilities: CapabilityModel[];
  imageStyles: string[];
  capabilitiesError?: string;
  onUpdate: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    narration: scene.narration,
    visualPrompt: scene.visualPrompt,
    durationSeconds: scene.durationSeconds,
    model: scene.model,
    resolution: scene.resolution,
    aspectRatio: scene.aspectRatio,
    generateAudio: scene.generateAudio,
  });
  const [imageModel, setImageModel] = useState("flux-schnell");
  const [imageResolution, setImageResolution] = useState("1k");
  const [imageStyle, setImageStyle] = useState(imageStyles[0] || "general");
  const [uploadedAsset, setUploadedAsset] = useState<{ assetId: number; url: string; filename: string } | null>(null);
  const [videoJobId, setVideoJobId] = useState<string | undefined>(scene.videoJobId ?? undefined);
  const [imageJobId, setImageJobId] = useState<string | undefined>(scene.imageJobId ?? undefined);
  const [videoStatus, setVideoStatus] = useState(scene.videoStatus || "pending");
  const [imageStatus, setImageStatus] = useState(scene.imageStatus || "pending");
  const [videoUrl, setVideoUrl] = useState<string | undefined>(scene.videoUrl ?? undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(scene.imageUrl ?? undefined);
  const [pollingError, setPollingError] = useState<string | undefined>();

  const videoPolling = useJobPolling({ jobId: videoJobId, type: "video", onStatusChange: setVideoStatus, onError: setPollingError });
  const imagePolling = useJobPolling({ jobId: imageJobId, type: "image", onStatusChange: setImageStatus, onError: setPollingError });

  useEffect(() => { if (videoPolling.result?.videoUrl) setVideoUrl(videoPolling.result.videoUrl); }, [videoPolling.result]);
  useEffect(() => { if (imagePolling.result?.imageUrl) setImageUrl(imagePolling.result.imageUrl); }, [imagePolling.result]);
  useEffect(() => {
    setVideoJobId(scene.videoJobId ?? undefined);
    setImageJobId(scene.imageJobId ?? undefined);
    setVideoStatus(scene.videoStatus || "pending");
    setImageStatus(scene.imageStatus || "pending");
    setVideoUrl(scene.videoUrl ?? undefined);
    setImageUrl(scene.imageUrl ?? undefined);
  }, [scene.videoJobId, scene.imageJobId, scene.videoStatus, scene.imageStatus, scene.videoUrl, scene.imageUrl]);

  const videoModels = capabilities.filter((model) => model.type === "text-to-video");
  const imageModels = capabilities.filter((model) => model.type === "text-to-image");
  const selectedVideoModel = videoModels.find((model) => model.id === formData.model) || videoModels[0];

  const updateSceneMutation = trpc.scenes.update.useMutation({ onSuccess: () => { toast.success("Szene aktualisiert"); setEditMode(false); onUpdate(); }, onError: (error) => toast.error(error.message || "Szene konnte nicht aktualisiert werden") });
  const generateVideoMutation = trpc.videos.generateTextToVideo.useMutation({ onSuccess: (data) => { setVideoJobId(data.jobId); setVideoStatus("processing"); setPollingError(undefined); toast.success("Video-Generierung gestartet"); onUpdate(); }, onError: (error) => { setVideoStatus("failed"); toast.error(error.message || "Video konnte nicht gestartet werden"); } });
  const generateImageMutation = trpc.images.generateTextToImage.useMutation({ onSuccess: (data) => { setImageJobId(data.jobId); setImageStatus("processing"); setPollingError(undefined); toast.success("Referenzbild-Generierung gestartet"); onUpdate(); }, onError: (error) => { setImageStatus("failed"); toast.error(error.message || "Bild konnte nicht gestartet werden"); } });
  const uploadAssetMutation = trpc.assets.upload.useMutation({ onSuccess: (data, variables) => { setUploadedAsset({ assetId: data.assetId, url: data.url, filename: variables.filename }); toast.success("Bild sicher hochgeladen"); }, onError: (error) => toast.error(error.message || "Upload fehlgeschlagen") });
  const animateImageMutation = trpc.images.generateImageToVideo.useMutation({ onSuccess: (data) => { setVideoJobId(data.jobId); setVideoStatus("processing"); setPollingError(undefined); toast.success("Bildanimation gestartet"); onUpdate(); }, onError: (error) => { setVideoStatus("failed"); toast.error(error.message || "Bildanimation konnte nicht gestartet werden"); } });

  const onFileSelected = (file?: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/avif"];
    if (!allowed.includes(file.type)) { toast.error("Erlaubt sind PNG, JPG, WebP und AVIF"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Das Bild darf höchstens 8 MB groß sein"); return; }
    const reader = new FileReader();
    reader.onload = () => uploadAssetMutation.mutate({ projectId, filename: file.name, mimeType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/avif", dataBase64: String(reader.result || "") });
    reader.onerror = () => toast.error("Die Bilddatei konnte nicht gelesen werden");
    reader.readAsDataURL(file);
  };

  const saveScene = () => updateSceneMutation.mutate({ sceneId: scene.id, projectId, ...formData });
  const generateVideo = () => generateVideoMutation.mutate({ sceneId: scene.id, projectId, prompt: formData.visualPrompt, model: formData.model, resolution: formData.resolution, aspectRatio: formData.aspectRatio, durationSeconds: formData.durationSeconds, generateAudio: formData.generateAudio });
  const generateImage = () => generateImageMutation.mutate({ sceneId: scene.id, projectId, prompt: formData.visualPrompt, model: imageModel, resolution: imageResolution, style: imageStyle });
  const animateUploadedImage = () => {
    if (!uploadedAsset) { toast.error("Bitte laden Sie zuerst ein Referenzbild hoch"); return; }
    animateImageMutation.mutate({ sceneId: scene.id, projectId, assetId: uploadedAsset.assetId, prompt: formData.visualPrompt, model: formData.model, resolution: formData.resolution, aspectRatio: formData.aspectRatio, durationSeconds: formData.durationSeconds, generateAudio: formData.generateAudio });
  };

  const statusPill = (label: string, status: string) => (
    <div className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
      {status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : status === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" /> : status === "failed" ? <AlertCircle className="h-3.5 w-3.5 text-red-600" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
      <span>{label}: {status === "completed" ? "Fertig" : status === "processing" ? "In Arbeit" : status === "failed" ? "Fehler" : "Ausstehend"}</span>
    </div>
  );

  return (
    <Card>
      <CardHeader className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle>Szene {scene.sceneNumber}</CardTitle><CardDescription className="mt-2 line-clamp-2">{scene.narration}</CardDescription></div>
          <div className="flex flex-wrap gap-2">{statusPill("Video", videoStatus)}{statusPill("Bild", imageStatus)}</div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-5">
          {pollingError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Job-Status konnte nicht aktualisiert werden</AlertTitle><AlertDescription>{pollingError}</AlertDescription></Alert>}
          {capabilitiesError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Provider-Optionen fehlen</AlertTitle><AlertDescription>{capabilitiesError}</AlertDescription></Alert>}
          <GenerationFeedback videoStatus={videoStatus} imageStatus={imageStatus} videoUrl={videoUrl} imageUrl={imageUrl} videoPending={generateVideoMutation.isPending || animateImageMutation.isPending} imagePending={generateImageMutation.isPending} />
          {editMode ? (
            <>
              <div><Label>Narration</Label><Textarea value={formData.narration} onChange={(event) => setFormData({ ...formData, narration: event.target.value })} onKeyDown={(event) => { if (isSubmitShortcut(event)) { event.preventDefault(); saveScene(); } }} /></div>
              <div><Label>Visueller Prompt</Label><Textarea value={formData.visualPrompt} onChange={(event) => setFormData({ ...formData, visualPrompt: event.target.value })} onKeyDown={(event) => { if (isSubmitShortcut(event)) { event.preventDefault(); saveScene(); } }} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Video-Modell</Label><Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{videoModels.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Auflösung</Label><Select value={formData.resolution} onValueChange={(value) => setFormData({ ...formData, resolution: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(selectedVideoModel?.resolutions || [formData.resolution]).map((resolution) => <SelectItem key={resolution} value={resolution}>{resolution}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Seitenverhältnis</Label><Select value={formData.aspectRatio} onValueChange={(value) => setFormData({ ...formData, aspectRatio: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(selectedVideoModel?.aspectRatios || [formData.aspectRatio]).map((ratio) => <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Dauer (Sekunden)</Label><Input type="number" min={selectedVideoModel?.minDurationSeconds || 1} max={selectedVideoModel?.maxDurationSeconds || 30} value={formData.durationSeconds} onChange={(event) => setFormData({ ...formData, durationSeconds: Number(event.target.value) })} onKeyDown={(event) => { if (isSubmitShortcut(event)) { event.preventDefault(); saveScene(); } }} /></div>
              </div>
              <div className="flex gap-2"><Button type="button" onClick={saveScene} disabled={updateSceneMutation.isPending} aria-busy={updateSceneMutation.isPending} className={updateSceneMutation.isPending ? "dashboard-action-loading" : ""}>{updateSceneMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Speichere ...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Speichern</>}</Button><Button type="button" variant="outline" onClick={() => setEditMode(false)}>Abbrechen</Button></div>
            </>
          ) : (
            <>
              <div><Label className="text-muted-foreground">Narration</Label><p className="mt-1">{scene.narration}</p></div>
              <div><Label className="text-muted-foreground">Visueller Prompt</Label><p className="mt-1">{scene.visualPrompt}</p></div>
              <div className="grid gap-2 text-sm md:grid-cols-4"><span><b>Modell:</b> {scene.model}</span><span><b>Auflösung:</b> {scene.resolution}</span><span><b>Format:</b> {scene.aspectRatio}</span><span><b>Dauer:</b> {scene.durationSeconds}s</span></div>
              {videoUrl && <div><Label className="text-muted-foreground">Video</Label><video src={videoUrl} controls className="mt-2 w-full rounded-lg" /></div>}
              {imageUrl && <div><Label className="text-muted-foreground">Referenzbild</Label><img src={imageUrl} alt={`Referenz für Szene ${scene.sceneNumber}`} className="mt-2 max-h-96 w-full rounded-lg object-contain" /></div>}
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setEditMode(true)}>Bearbeiten</Button><Button type="button" onClick={generateVideo} disabled={generateVideoMutation.isPending || !capabilities.length} aria-busy={generateVideoMutation.isPending} className={generateVideoMutation.isPending ? "dashboard-action-loading" : ""}><Play className="mr-2 h-4 w-4" />{generateVideoMutation.isPending ? "Video wird gestartet ..." : "Video generieren"}</Button></div>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-primary" /><h3 className="font-semibold">Bildreferenz und Animation</h3></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><Label>Bildmodell</Label><Select value={imageModel} onValueChange={setImageModel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{imageModels.map((model) => <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Bildauflösung</Label><Select value={imageResolution} onValueChange={setImageResolution}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(imageModels.find((model) => model.id === imageModel)?.resolutions || ["1k"]).map((resolution) => <SelectItem key={resolution} value={resolution}>{resolution}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Bildstil</Label><Select value={imageStyle} onValueChange={setImageStyle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(imageStyles.length ? imageStyles : ["general"]).map((style) => <SelectItem key={style} value={style}>{style}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={generateImage} disabled={generateImageMutation.isPending || !imageModels.length} aria-busy={generateImageMutation.isPending} className={generateImageMutation.isPending ? "dashboard-action-loading" : ""}><ImagePlus className="mr-2 h-4 w-4" />{generateImageMutation.isPending ? "Bild wird erstellt ..." : "Bild aus Prompt erstellen"}</Button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"><Upload className="mr-2 h-4 w-4" />{uploadAssetMutation.isPending ? "Lade hoch ..." : "Bild hochladen"}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => onFileSelected(event.target.files?.[0])} /></label>
                  <Button type="button" onClick={animateUploadedImage} disabled={animateImageMutation.isPending || !uploadedAsset} aria-busy={animateImageMutation.isPending} className={animateImageMutation.isPending ? "dashboard-action-loading" : ""}><Play className="mr-2 h-4 w-4" />{animateImageMutation.isPending ? "Bild wird animiert ..." : "Hochgeladenes Bild animieren"}</Button>
                </div>
                {uploadedAsset && <p className="mt-3 text-sm text-muted-foreground">Referenz bereit: <span className="font-medium text-foreground">{uploadedAsset.filename}</span></p>}
                {imageStatus === "failed" && <p className="mt-3 text-sm text-destructive">Die Bildgenerierung ist fehlgeschlagen. Bitte Einstellungen prüfen und erneut versuchen.</p>}
                {videoStatus === "failed" && <p className="mt-3 text-sm text-destructive">Die Videogenerierung ist fehlgeschlagen. Bitte Einstellungen prüfen und erneut versuchen.</p>}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function GenerationFeedback({ videoStatus, imageStatus, videoUrl, imageUrl, videoPending, imagePending }: { videoStatus: string; imageStatus: string; videoUrl?: string; imageUrl?: string; videoPending: boolean; imagePending: boolean }) {
  if (videoPending || imagePending || videoStatus === "processing" || imageStatus === "processing") {
    const label = videoPending || videoStatus === "processing" ? "Video wird vorbereitet" : "Bild wird vorbereitet";
    return <div className="dashboard-generation-feedback dashboard-generation-feedback-processing" role="status" aria-live="polite"><Loader2 className="h-4 w-4 animate-spin" /><span>{label} — der Provider arbeitet im Hintergrund. Du kannst weiterarbeiten.</span></div>;
  }

  if (videoStatus === "completed" && videoUrl) {
    return <div className="dashboard-generation-feedback dashboard-generation-feedback-success" role="status" aria-live="polite"><CheckCircle2 className="h-4 w-4" /><span>Video fertig — Vorschau und Export sind bereit.</span></div>;
  }

  if (imageStatus === "completed" && imageUrl) {
    return <div className="dashboard-generation-feedback dashboard-generation-feedback-success" role="status" aria-live="polite"><CheckCircle2 className="h-4 w-4" /><span>Referenzbild fertig — du kannst es jetzt animieren.</span></div>;
  }

  return null;
}

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" />{label}</div>;
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Play, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ProjectDetail(props: any) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const projectId = parseInt(props.projectId, 10);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<"de" | "en">("de" as const);

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { projectId },
    { enabled: !!user }
  );

  const { data: scenes, isLoading: scenesLoading, refetch: refetchScenes } = trpc.scenes.list.useQuery(
    { projectId },
    { enabled: !!user && !!project }
  );

  const { data: capabilities } = trpc.provider.capabilities.useQuery();

  const generateStoryboardMutation = trpc.storyboard.generate.useMutation({
    onSuccess: () => {
      toast.success("Storyboard erstellt!");
      setTopic("");
      refetchScenes();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Erstellen des Storyboards");
    },
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Projekt nicht gefunden</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zum Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>

        {!scenes || scenes.length === 0 ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Storyboard generieren</CardTitle>
              <CardDescription>Geben Sie ein Thema ein, um ein Storyboard zu generieren.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic">Thema</Label>
                  <Textarea
                    id="topic"
                    placeholder="z.B. Eröffnung unseres neuen Cafés in Aachen mit modernem Interieur und freundlichem Personal"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="language">Sprache</Label>
                  <Select value={language} onValueChange={(value) => setLanguage(value as "de" | "en")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() =>
                    generateStoryboardMutation.mutate({
                      projectId,
                      topic,
                      language,
                    })
                  }
                  disabled={!topic || generateStoryboardMutation.isPending}
                  className="w-full"
                >
                  {generateStoryboardMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generiere Storyboard...
                    </>
                  ) : (
                    "Storyboard generieren"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Szenen ({scenes.length})</h2>
            </div>

            {scenesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : (
              <div className="space-y-4">
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    projectId={projectId}
                    capabilities={capabilities}
                    onUpdate={() => refetchScenes()}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SceneCard({ scene, projectId, capabilities, onUpdate }: any) {
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

  const [videoStatus, setVideoStatus] = useState(scene.videoStatus);
  const [imageStatus, setImageStatus] = useState(scene.imageStatus);
  const [pollingActive, setPollingActive] = useState(false);

  const updateSceneMutation = trpc.scenes.update.useMutation({
    onSuccess: () => {
      toast.success("Szene aktualisiert!");
      setEditMode(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Aktualisieren der Szene");
    },
  });

  const generateVideoMutation = trpc.videos.generateTextToVideo.useMutation({
    onSuccess: (data) => {
      toast.success("Video-Generierung gestartet!");
      setVideoStatus("processing");
      setPollingActive(true);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Starten der Video-Generierung");
    },
  });

  const generateImageMutation = trpc.images.generateTextToImage.useMutation({
    onSuccess: () => {
      toast.success("Bild-Generierung gestartet!");
      setImageStatus("processing");
      setPollingActive(true);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Starten der Bild-Generierung");
    },
  });

  // Polling für Video-Status
  useEffect(() => {
    if (!scene.videoJobId || videoStatus === "completed" || videoStatus === "failed") {
      setPollingActive(false);
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        // Status wird über die Query abgerufen
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000); // Poll alle 3 Sekunden

    return () => clearInterval(pollInterval);
  }, [scene.videoJobId, videoStatus]);

  const handleSave = () => {
    updateSceneMutation.mutate({
      sceneId: scene.id,
      projectId,
      ...formData,
    });
  };

  const handleGenerateVideo = () => {
    generateVideoMutation.mutate({
      sceneId: scene.id,
      projectId,
      prompt: formData.visualPrompt,
      model: formData.model,
      resolution: formData.resolution,
      aspectRatio: formData.aspectRatio,
      durationSeconds: formData.durationSeconds,
      generateAudio: formData.generateAudio,
    });
  };

  const handleGenerateImage = () => {
    generateImageMutation.mutate({
      sceneId: scene.id,
      projectId,
      prompt: formData.visualPrompt,
      model: "flux-schnell",
      resolution: "1k",
      style: "general",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Fertig";
      case "processing":
        return "Wird generiert...";
      case "failed":
        return "Fehler";
      default:
        return "Ausstehend";
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle>Szene {scene.sceneNumber}</CardTitle>
            <CardDescription className="line-clamp-2 mt-2">{scene.narration}</CardDescription>
          </div>
          <div className="ml-4 flex gap-2">
            {videoStatus && (
              <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                {getStatusIcon(videoStatus)}
                <span>{getStatusLabel(videoStatus)}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {editMode ? (
            <>
              <div>
                <Label>Narration</Label>
                <Textarea
                  value={formData.narration}
                  onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                />
              </div>
              <div>
                <Label>Visueller Prompt</Label>
                <Textarea
                  value={formData.visualPrompt}
                  onChange={(e) => setFormData({ ...formData, visualPrompt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modell</Label>
                  <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.models
                        ?.filter((m: any) => m.type === "text-to-video")
                        .map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Auflösung</Label>
                  <Select value={formData.resolution} onValueChange={(value) => setFormData({ ...formData, resolution: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.models
                        ?.find((m: any) => m.id === formData.model)
                        ?.resolutions.map((r: string) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Seitenverhältnis</Label>
                  <Select value={formData.aspectRatio} onValueChange={(value) => setFormData({ ...formData, aspectRatio: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.models
                        ?.find((m: any) => m.id === formData.model)
                        ?.aspectRatios.map((ar: string) => (
                          <SelectItem key={ar} value={ar}>
                            {ar}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dauer (Sekunden)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={updateSceneMutation.isPending}>
                  {updateSceneMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)}>
                  Abbrechen
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-muted-foreground">Narration</Label>
                <p className="mt-1">{scene.narration}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Visueller Prompt</Label>
                <p className="mt-1">{scene.visualPrompt}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Modell:</span> {scene.model}
                </div>
                <div>
                  <span className="text-muted-foreground">Auflösung:</span> {scene.resolution}
                </div>
                <div>
                  <span className="text-muted-foreground">Seitenverhältnis:</span> {scene.aspectRatio}
                </div>
                <div>
                  <span className="text-muted-foreground">Dauer:</span> {scene.durationSeconds}s
                </div>
              </div>
              {scene.videoUrl && (
                <div>
                  <Label className="text-muted-foreground">Video</Label>
                  <video src={scene.videoUrl} controls className="w-full rounded mt-2" />
                </div>
              )}
              {scene.imageUrl && (
                <div>
                  <Label className="text-muted-foreground">Referenzbild</Label>
                  <img src={scene.imageUrl} alt="Reference" className="w-full rounded mt-2" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setEditMode(true)} variant="outline">
                  Bearbeiten
                </Button>
                <Button onClick={handleGenerateImage} disabled={generateImageMutation.isPending} variant="outline">
                  {generateImageMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "🎨"}
                  Bild generieren
                </Button>
                <Button onClick={handleGenerateVideo} disabled={generateVideoMutation.isPending}>
                  <Play className="w-4 h-4 mr-2" />
                  {generateVideoMutation.isPending ? "Generiere..." : "Video generieren"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

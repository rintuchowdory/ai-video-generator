import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  ArrowUpRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Film,
  Filter,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Play,
  PlayCircle,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Video,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { filterReelJobs, getGreeting, getInitials, type ReelFilter } from "@/lib/dashboard";
import { startLogin } from "@/const";

const HERO_ASSET = "/manus-storage/werkbank-dashboard-hero_c481c6f3.png";

const reelFilterOptions: Array<{ value: ReelFilter; label: string }> = [
  { value: "all", label: "Alle Clips" },
  { value: "completed", label: "Fertig" },
  { value: "in-progress", label: "In Arbeit" },
  { value: "failed", label: "Fehlgeschlagen" },
];

const statusConfig = {
  draft: { label: "Entwurf", className: "bg-amber-400/15 text-amber-200 border-amber-300/20", icon: Clock3 },
  generating: { label: "In Arbeit", className: "bg-cyan-400/15 text-cyan-200 border-cyan-300/20", icon: Loader2 },
  completed: { label: "Fertig", className: "bg-emerald-400/15 text-emerald-200 border-emerald-300/20", icon: CheckCircle2 },
  failed: { label: "Prüfen", className: "bg-rose-400/15 text-rose-200 border-rose-300/20", icon: Zap },
} as const;

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    language: "de" as "de" | "en",
  });

  const { data: projects, isLoading, refetch } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: reelJobs, isLoading: reelLoading, isFetching: reelFetching } = trpc.jobs.videoReel.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const [reelFilter, setReelFilter] = useState<ReelFilter>("all");

  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Projekt erstellt!");
      setFormData({ title: "", description: "", language: "de" });
      setIsOpen(false);
      refetch();
      navigate(`/project/${data.projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Erstellen des Projekts");
    },
  });

  if (authLoading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center">
        <div className="dashboard-loader" aria-label="Dashboard wird geladen">
          <Sparkles className="h-7 w-7 text-cyan-300" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center px-4">
        <Card className="dashboard-card w-full max-w-md border-white/10 bg-white/[0.06] text-white">
          <CardHeader>
            <CardTitle>Authentifizierung erforderlich</CardTitle>
            <CardDescription className="text-slate-300">Bitte melden Sie sich an, um fortzufahren.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => startLogin()} className="dashboard-primary-button w-full text-white">
              Anmelden und Dashboard öffnen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allProjects = projects ?? [];
  const completedCount = allProjects.filter((project) => project.status === "completed").length;
  const activeCount = allProjects.filter((project) => project.status === "generating").length;
  const draftCount = allProjects.filter((project) => project.status === "draft").length;
  const filteredReelJobs = filterReelJobs(reelJobs ?? [], reelFilter);
  const initials = getInitials(user.name);

  return (
    <div className="dashboard-shell min-h-screen overflow-hidden text-white">
      <div className="dashboard-ambient dashboard-ambient-one" />
      <div className="dashboard-ambient dashboard-ambient-two" />
      <div className="dashboard-grid" />

      <header className="dashboard-topbar relative z-10">
        <div className="container flex items-center justify-between py-4">
          <button className="group flex items-center gap-3" onClick={() => navigate("/")} aria-label="Zur Startseite">
            <span className="dashboard-logo-mark"><Film className="h-4 w-4" /></span>
            <span className="text-lg font-semibold tracking-tight">Werkbank</span>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200 sm:inline-flex">Studio</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-slate-300 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Kreativmodus aktiv
            </div>
            <div className="dashboard-avatar" title={user.name || "Ihr Konto"}>{initials}</div>
          </div>
        </div>
      </header>

      <main className="container relative z-10 space-y-8 pb-16 pt-8 lg:pt-12">
        <section className="dashboard-hero dashboard-fade-up">
          <div className="dashboard-hero-art" style={{ backgroundImage: `url(${HERO_ASSET})` }} aria-hidden="true" />
          <div className="dashboard-hero-shade" aria-hidden="true" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:p-10">
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                <WandSparkles className="h-3.5 w-3.5" />
                {getGreeting()}, {user.name?.split(" ")[0] || "Creator"}
              </div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">Gute Ideen brauchen Bewegung.</h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-200 sm:text-lg">Verwandle Themen in Storyboards, Bilder und kurze Videos — mit einem kreativen Flow, der sich leicht anfühlt.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button className="dashboard-primary-button h-11 rounded-xl px-5 text-sm font-semibold text-white">
                      <Plus className="mr-2 h-4 w-4" /> Neues Projekt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-border/80 bg-background">
                    <DialogHeader>
                      <DialogTitle>Neues Projekt erstellen</DialogTitle>
                      <DialogDescription>Geben Sie die Details für Ihr neues Video-Projekt ein.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Projekttitel</Label>
                        <Input id="title" placeholder="z.B. Café-Eröffnung" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea id="description" placeholder="Optionale Beschreibung des Projekts" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
                      </div>
                      <div>
                        <Label htmlFor="language">Sprache</Label>
                        <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value as "de" | "en" })}>
                          <SelectTrigger id="language"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => createProjectMutation.mutate({ title: formData.title, description: formData.description, language: formData.language })} disabled={!formData.title || createProjectMutation.isPending} className="w-full">
                        {createProjectMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Erstelle...</> : "Projekt erstellen"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" className="h-11 rounded-xl border-white/15 bg-white/[0.06] px-5 text-white hover:bg-white/10" onClick={() => document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })}>
                  Meine Projekte <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Groq-Storyboards</span>
                <span className="inline-flex items-center gap-2"><Video className="h-3.5 w-3.5 text-cyan-300" /> Magic Hour Videos</span>
                <span className="inline-flex items-center gap-2"><ImageIcon className="h-3.5 w-3.5 text-fuchsia-300" /> Bildideen inklusive</span>
              </div>
            </div>

            <div className="dashboard-hero-preview dashboard-float" aria-label="Animierte Vorschau der Werkbank">
              <div className="dashboard-preview-topline">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-300" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-emerald-300" /></span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Live canvas</span>
                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">SYNCED</span>
              </div>
              <div className="dashboard-motion-canvas">
                <div className="dashboard-motion-orbit dashboard-motion-orbit-one" />
                <div className="dashboard-motion-orbit dashboard-motion-orbit-two" />
                <div className="dashboard-motion-card dashboard-motion-card-one"><span className="dashboard-card-image bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-800"><Camera className="h-5 w-5" /></span><span><b>Scene 01</b><small>Visual prompt</small></span></div>
                <div className="dashboard-motion-card dashboard-motion-card-two"><span className="dashboard-card-image bg-gradient-to-br from-fuchsia-300 via-purple-500 to-indigo-800"><Play className="h-5 w-5" /></span><span><b>Scene 02</b><small>Video ready</small></span></div>
                <div className="dashboard-play-badge"><Play className="ml-0.5 h-6 w-6 fill-current" /></div>
                <div className="dashboard-waveform"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-300"><span className="inline-flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-cyan-300" /> 3 Ebenen im Flow</span><span className="font-medium text-white">00:12 / 00:30</span></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Grid3X3} label="Projekte gesamt" value={allProjects.length} accent="cyan" detail="Deine kreative Bibliothek" delay="0ms" />
          <StatCard icon={CheckCircle2} label="Fertiggestellt" value={completedCount} accent="emerald" detail="Bereit zum Teilen" delay="60ms" />
          <StatCard icon={Zap} label="In Produktion" value={activeCount} accent="amber" detail="Magie passiert gerade" delay="120ms" />
          <StatCard icon={BarChart3} label="Entwürfe" value={draftCount} accent="violet" detail="Ideen mit Potenzial" delay="180ms" />
        </section>

        <section id="projects" className="dashboard-fade-up" style={{ animationDelay: "220ms" }}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Dein Workspace</p>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Aktuelle Projekte</h2>
              <p className="mt-1 text-sm text-slate-400">Alles, was gerade im kreativen Ofen ist.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400"><Palette className="h-4 w-4 text-fuchsia-300" /> Storyboard · Bild · Video</div>
          </div>

          {isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"><ProjectSkeleton /><ProjectSkeleton /><ProjectSkeleton /></div>
          ) : allProjects.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {allProjects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} onOpen={() => navigate(`/project/${project.id}`)} />)}
            </div>
          ) : (
            <EmptyProjectCard onCreate={() => setIsOpen(true)} />
          )}
        </section>

        <VideoReelSection
          jobs={filteredReelJobs}
          allJobs={reelJobs ?? []}
          totalJobs={reelJobs?.length ?? 0}
          filter={reelFilter}
          loading={reelLoading}
          fetching={reelFetching}
          onFilterChange={setReelFilter}
          onOpenProject={(projectId) => navigate(`/project/${projectId}`)}
        />

        <section className="dashboard-tools-grid dashboard-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="dashboard-tool-card dashboard-tool-card-blue"><div className="dashboard-tool-icon"><Sparkles className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-white">Storyboard starten</p><p className="mt-1 text-xs leading-5 text-blue-100/70">Aus einer Idee wird eine Szene nach der anderen.</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-blue-100/70" /></div>
          <div className="dashboard-tool-card dashboard-tool-card-pink"><div className="dashboard-tool-icon"><ImageIcon className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-white">Bildwelt bauen</p><p className="mt-1 text-xs leading-5 text-pink-100/70">Referenzen, Stile und Motion in einem Flow.</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-pink-100/70" /></div>
          <div className="dashboard-tool-card dashboard-tool-card-gold"><div className="dashboard-tool-icon"><Video className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-white">Video exportieren</p><p className="mt-1 text-xs leading-5 text-amber-100/70">Deine Clips sind bereit für den nächsten Kanal.</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-amber-100/70" /></div>
        </section>
      </main>
    </div>
  );
}

type ReelJob = {
  id: number;
  jobId: string;
  projectId: number;
  projectTitle: string;
  sceneId: number | null;
  sceneNumber: number | null;
  type: string;
  status: string;
  resultUrl: string | null;
  errorMessage: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

function getReelStatusMeta(status: string) {
  if (status === "completed") return { label: "Fertig", className: "dashboard-reel-status-completed", icon: CheckCircle2 };
  if (status === "failed") return { label: "Fehlgeschlagen", className: "dashboard-reel-status-failed", icon: Zap };
  if (status === "processing") return { label: "In Arbeit", className: "dashboard-reel-status-processing", icon: Loader2 };
  return { label: "Wartend", className: "dashboard-reel-status-pending", icon: Clock3 };
}

function VideoReelSection({
  jobs,
  allJobs,
  totalJobs,
  filter,
  loading,
  fetching,
  onFilterChange,
  onOpenProject,
}: {
  jobs: ReelJob[];
  allJobs: ReelJob[];
  totalJobs: number;
  filter: ReelFilter;
  loading: boolean;
  fetching: boolean;
  onFilterChange: (filter: ReelFilter) => void;
  onOpenProject: (projectId: number) => void;
}) {
  const counts = {
    all: totalJobs,
    completed: allJobs.filter((job) => job.status === "completed").length,
    "in-progress": allJobs.filter((job) => job.status === "pending" || job.status === "processing").length,
    failed: allJobs.filter((job) => job.status === "failed").length,
  };

  return (
    <section className="dashboard-reel-section dashboard-fade-up" style={{ animationDelay: "260ms" }}>
      <div className="dashboard-reel-header">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300"><PlayCircle className="h-4 w-4" /> Video-Reel</div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Deine Clips in Bewegung</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">Behalte jede Generierung im Blick und springe direkt in das zugehörige Projekt.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />}
          <span>{totalJobs} Videojobs</span>
        </div>
      </div>

      <div className="dashboard-reel-toolbar">
        <div className="dashboard-reel-filters" role="tablist" aria-label="Videojobs nach Status filtern">
          <span className="mr-1 hidden items-center gap-2 text-xs text-slate-500 sm:inline-flex"><SlidersHorizontal className="h-3.5 w-3.5" /> Status</span>
          {reelFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              className={`dashboard-reel-filter ${filter === option.value ? "dashboard-reel-filter-active" : ""}`}
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}<span className="dashboard-reel-filter-count">{counts[option.value]}</span>
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex"><Filter className="h-3.5 w-3.5" /> Automatisch aktualisiert</div>
      </div>

      {loading ? (
        <div className="dashboard-reel-grid"><ReelSkeleton /><ReelSkeleton /><ReelSkeleton /></div>
      ) : totalJobs === 0 ? (
        <div className="dashboard-reel-empty"><span className="dashboard-reel-empty-icon"><Video className="h-6 w-6" /></span><div><p className="font-semibold text-white">Noch keine Videojobs</p><p className="mt-1 text-sm text-slate-400">Generiere ein Video in einem Projekt — der Clip erscheint hier automatisch.</p></div></div>
      ) : jobs.length === 0 ? (
        <div className="dashboard-reel-empty"><span className="dashboard-reel-empty-icon"><Filter className="h-6 w-6" /></span><div><p className="font-semibold text-white">Keine Clips in diesem Filter</p><p className="mt-1 text-sm text-slate-400">Wähle einen anderen Status, um weitere Videojobs zu sehen.</p></div></div>
      ) : (
        <div className="dashboard-reel-grid">
          {jobs.map((job, index) => <VideoReelCard key={job.id} job={job} index={index} onOpen={() => onOpenProject(job.projectId)} />)}
        </div>
      )}
    </section>
  );
}

function HoverVideo({ src, poster, label, onError }: { src: string; poster: string; label: string; onError?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => undefined);
  };
  const stopPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  };

  return <video ref={videoRef} className="h-full w-full object-cover" src={src} poster={poster} muted loop playsInline preload="metadata" tabIndex={0} aria-label={label} onMouseEnter={startPlayback} onMouseLeave={stopPlayback} onFocus={startPlayback} onBlur={stopPlayback} onError={onError} />;
}

function VideoReelCard({ job, index, onOpen }: { job: ReelJob; index: number; onOpen: () => void }) {
  const [mediaError, setMediaError] = useState(false);
  const mediaUrl = job.videoUrl || job.resultUrl;
  const meta = getReelStatusMeta(job.status);
  const StatusIcon = meta.icon;
  const accentClass = ["dashboard-reel-cyan", "dashboard-reel-pink", "dashboard-reel-amber"][index % 3];

  return (
    <article className={`dashboard-reel-card ${accentClass} dashboard-fade-up`} style={{ animationDelay: `${index * 60}ms` }} onClick={onOpen}>
      <div className="dashboard-reel-media">
        {mediaUrl && !mediaError ? <HoverVideo src={mediaUrl} poster={job.imageUrl || HERO_ASSET} label={`Videojob ${job.projectTitle}`} onError={() => setMediaError(true)} /> : job.imageUrl && !mediaError ? <img className="h-full w-full object-cover" src={job.imageUrl} alt={`Vorschaubild für ${job.projectTitle}`} onError={() => setMediaError(true)} /> : <div className="dashboard-reel-placeholder"><div className="dashboard-reel-placeholder-glow" /><Play className="relative z-10 h-7 w-7 text-white/90" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/80 backdrop-blur"><Video className="h-3 w-3" /> Hover zum Abspielen</div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55">Szene {job.sceneNumber ?? "—"}</p><h3 className="mt-1 line-clamp-1 text-base font-semibold text-white">{job.projectTitle}</h3></div><span className="dashboard-open-button"><ArrowUpRight className="h-4 w-4" /></span></div>
      </div>
      <div className="space-y-3 p-4"><div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.className}`}><StatusIcon className={`h-3.5 w-3.5 ${job.status === "processing" ? "animate-spin" : ""}`} />{meta.label}</span><span className="text-[11px] text-slate-500">{job.type === "image-to-video" ? "Bild → Video" : "Text → Video"}</span></div>{job.status === "failed" && job.errorMessage && <p className="line-clamp-1 text-xs text-rose-200/75">{job.errorMessage}</p>}{job.status !== "failed" && <p className="text-xs text-slate-500">{job.status === "completed" ? "Bereit für die Vorschau" : "Status wird automatisch aktualisiert"}</p>}</div>
    </article>
  );
}

function ReelSkeleton() {
  return <div className="dashboard-reel-card h-[295px] animate-pulse bg-white/[0.04]"><div className="h-44 bg-white/[0.06]" /><div className="space-y-3 p-4"><div className="h-4 w-2/3 rounded bg-white/10" /><div className="h-3 w-1/2 rounded bg-white/10" /></div></div>;
}

function StatCard({ icon: Icon, label, value, detail, accent, delay }: { icon: typeof Grid3X3; label: string; value: number; detail: string; accent: "cyan" | "emerald" | "amber" | "violet"; delay: string }) {
  return (
    <div className={`dashboard-stat-card dashboard-stat-${accent} dashboard-fade-up`} style={{ animationDelay: delay }}>
      <div className="flex items-start justify-between"><span className="dashboard-stat-icon"><Icon className="h-4 w-4" /></span><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45">Werkbank</span></div>
      <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-3xl font-semibold tracking-tight text-white">{value}</p><p className="mt-1 text-sm font-medium text-white/80">{label}</p></div><div className="dashboard-mini-sparkline"><i /><i /><i /><i /><i /><i /></div></div>
      <p className="mt-3 text-xs text-white/50">{detail}</p>
    </div>
  );
}

function ProjectCard({ project, index, onOpen }: { project: any; index: number; onOpen: () => void }) {
  const scenesQuery = trpc.scenes.list.useQuery({ projectId: project.id });
  const [mediaError, setMediaError] = useState(false);
  const scene = scenesQuery.data?.find((item) => item.videoUrl || item.imageUrl);
  const config = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = config.icon;
  const accentClasses = ["dashboard-project-cyan", "dashboard-project-pink", "dashboard-project-amber"][index % 3];

  return (
    <Card className={`dashboard-project-card ${accentClasses} dashboard-fade-up`} style={{ animationDelay: `${index * 70}ms` }} onClick={onOpen}>
      <div className="dashboard-project-media">
        {scene?.videoUrl && !mediaError ? (
          <HoverVideo src={scene.videoUrl} poster={scene.imageUrl || HERO_ASSET} label={`Videovorschau für ${project.title}`} onError={() => setMediaError(true)} />
        ) : scene?.imageUrl && !mediaError ? (
          <img className="h-full w-full object-cover" src={scene.imageUrl} alt={`Vorschau für ${project.title}`} onError={() => setMediaError(true)} />
        ) : (
          <div className="dashboard-project-fallback"><div className="dashboard-fallback-shape" /><div className="dashboard-fallback-lines"><i /><i /><i /></div><Play className="relative z-10 h-7 w-7 text-white/90" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 backdrop-blur">{scene?.videoUrl ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />} {scene?.videoUrl ? "Video" : "Creative"}</div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Projekt {String(project.id).padStart(2, "0")}</p><h3 className="mt-1 line-clamp-1 text-lg font-semibold text-white">{project.title}</h3></div><span className="dashboard-open-button"><ArrowUpRight className="h-4 w-4" /></span></div>
      </div>
      <CardContent className="space-y-4 p-5">
        <p className="line-clamp-2 min-h-10 text-sm leading-6 text-slate-300">{project.description || "Storyboard und Medienproduktion für deine nächste Idee."}</p>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${config.className}`}><StatusIcon className={`h-3.5 w-3.5 ${project.status === "generating" ? "animate-spin" : ""}`} />{config.label}</span><span>{new Date(project.createdAt).toLocaleDateString("de-DE")}</span></div>
      </CardContent>
    </Card>
  );
}

function ProjectSkeleton() {
  return <div className="dashboard-project-card h-[340px] animate-pulse bg-white/[0.04]"><div className="h-52 bg-white/[0.06]" /><div className="space-y-3 p-5"><div className="h-4 w-3/4 rounded bg-white/10" /><div className="h-3 w-full rounded bg-white/10" /><div className="h-3 w-1/2 rounded bg-white/10" /></div></div>;
}

function EmptyProjectCard({ onCreate }: { onCreate: () => void }) {
  return <button onClick={onCreate} className="dashboard-empty-card group w-full text-left"><span className="dashboard-empty-orb"><Plus className="h-6 w-6" /></span><span><strong className="block text-lg font-semibold text-white">Der erste Frame gehört dir.</strong><span className="mt-1 block text-sm text-slate-400">Lege ein Projekt an und bringe deine Idee ins Rollen.</span></span><ChevronRight className="ml-auto h-5 w-5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-200" /></button>;
}

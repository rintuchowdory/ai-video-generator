export type DashboardStatus = "draft" | "generating" | "completed" | "failed";
export type ReelFilter = "all" | "completed" | "in-progress" | "failed";
export type ReelPlatformFilter = "all" | "reels" | "youtube" | "feed" | "story";
export type AudioSyncMode = "auto" | "manual";

export const SOCIAL_FORMAT_PRESETS = [
  { id: "reels", label: "Reels / TikTok", ratio: "9:16", detail: "Hochformat" },
  { id: "youtube", label: "YouTube", ratio: "16:9", detail: "Querformat" },
  { id: "feed", label: "Feed / Square", ratio: "1:1", detail: "Quadrat" },
] as const;

export const REEL_PLATFORM_FILTERS = [
  { value: "all", label: "Alle Formate" },
  { value: "reels", label: "Reels / TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "feed", label: "Square Feed" },
  { value: "story", label: "Stories" },
] as const satisfies ReadonlyArray<{ value: ReelPlatformFilter; label: string }>;

export function isSubmitShortcut(event: { key: string; shiftKey?: boolean }) {
  return event.key === "Enter" && !event.shiftKey;
}

export function getVideoShareUrl(job: { videoUrl?: string | null; resultUrl?: string | null }) {
  return job.videoUrl || job.resultUrl || null;
}

export function getVideoShareText(projectTitle: string, sceneNumber?: number | null) {
  return sceneNumber ? `${projectTitle} · Szene ${sceneNumber} — erstellt mit Werkbank` : `${projectTitle} — erstellt mit Werkbank`;
}

export function getVideoExportName(projectTitle: string, sceneNumber?: number | null) {
  const safeTitle = projectTitle.toLowerCase().replace(/[^\wäöüßéèêàáâ]+/gi, "-").replace(/^-|-$/g, "") || "werkbank-video";
  return `${safeTitle}${sceneNumber ? `-szene-${sceneNumber}` : ""}.mp4`;
}

export function getInitials(name?: string | null) {
  if (!name) return "W";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getGreeting(hour = new Date().getHours()) {
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export function filterReelJobs<T extends { status: string }>(jobs: T[], filter: ReelFilter) {
  if (filter === "all") return jobs;
  if (filter === "in-progress") return jobs.filter((job) => job.status === "pending" || job.status === "processing");
  return jobs.filter((job) => job.status === filter);
}

export function getPlatformForAspectRatio(aspectRatio?: string | null): Exclude<ReelPlatformFilter, "all"> {
  if (aspectRatio === "9:16") return "reels";
  if (aspectRatio === "1:1") return "feed";
  if (aspectRatio === "4:5") return "feed";
  if (aspectRatio === "9:16-story") return "story";
  return "youtube";
}

export function getPlatformLabel(aspectRatio?: string | null) {
  const platform = getPlatformForAspectRatio(aspectRatio);
  return REEL_PLATFORM_FILTERS.find((item) => item.value === platform)?.label || "YouTube";
}

export function filterReelJobsByPlatform<T extends { aspectRatio?: string | null }>(jobs: T[], filter: ReelPlatformFilter) {
  if (filter === "all") return jobs;
  return jobs.filter((job) => getPlatformForAspectRatio(job.aspectRatio) === filter);
}

export function calculateAudioSyncWindow(
  sceneIndex: number,
  sceneDurations: number[],
  offsetSeconds = 0,
  transitionSeconds = 0.25,
) {
  const safeIndex = Math.max(0, Math.min(sceneIndex, Math.max(0, sceneDurations.length - 1)));
  const safeDurations = sceneDurations.map((duration) => Math.max(0.1, Number(duration) || 0.1));
  const sceneStartSeconds = safeDurations.slice(0, safeIndex).reduce((total, duration) => total + duration, 0);
  const sceneDurationSeconds = safeDurations[safeIndex] ?? 0.1;
  const sceneEndSeconds = sceneStartSeconds + sceneDurationSeconds;
  const safeOffset = Math.max(0, Number(offsetSeconds) || 0);
  const safeTransition = Math.max(0, Math.min(2, Number(transitionSeconds) || 0));
  const startSeconds = Math.max(0, sceneStartSeconds + safeOffset - safeTransition);
  const endSeconds = sceneEndSeconds + safeOffset + safeTransition;

  return {
    sceneStartSeconds,
    sceneEndSeconds,
    startSeconds,
    endSeconds: Math.max(startSeconds, endSeconds),
    durationSeconds: Math.max(0.1, endSeconds - startSeconds),
    transitionSeconds: safeTransition,
  };
}

export function formatTimelineSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds * 10) / 10);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = (safeSeconds - minutes * 60).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
}

export function getStatusLabel(status: DashboardStatus) {
  return {
    draft: "Entwurf",
    generating: "In Arbeit",
    completed: "Fertig",
    failed: "Prüfen",
  }[status];
}

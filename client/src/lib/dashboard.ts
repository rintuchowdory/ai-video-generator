export type DashboardStatus = "draft" | "generating" | "completed" | "failed";
export type ReelFilter = "all" | "completed" | "in-progress" | "failed";

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

export function getStatusLabel(status: DashboardStatus) {
  return {
    draft: "Entwurf",
    generating: "In Arbeit",
    completed: "Fertig",
    failed: "Prüfen",
  }[status];
}

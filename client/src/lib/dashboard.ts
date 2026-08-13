export type DashboardStatus = "draft" | "generating" | "completed" | "failed";
export type ReelFilter = "all" | "completed" | "in-progress" | "failed";

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

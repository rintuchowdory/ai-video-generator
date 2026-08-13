export type DashboardStatus = "draft" | "generating" | "completed" | "failed";

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

export function getStatusLabel(status: DashboardStatus) {
  return {
    draft: "Entwurf",
    generating: "In Arbeit",
    completed: "Fertig",
    failed: "Prüfen",
  }[status];
}

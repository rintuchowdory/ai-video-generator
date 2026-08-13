import { describe, expect, it } from "vitest";
import { filterReelJobs, getGreeting, getInitials, getStatusLabel, getVideoExportName, getVideoShareText, getVideoShareUrl, isSubmitShortcut } from "../client/src/lib/dashboard";

describe("dashboard visual helpers", () => {
  it("creates compact initials for account avatars", () => {
    expect(getInitials("Rintu Chowdory")).toBe("RC");
    expect(getInitials("Werkbank")).toBe("W");
    expect(getInitials(null)).toBe("W");
  });

  it("uses the correct German greeting by time of day", () => {
    expect(getGreeting(9)).toBe("Guten Morgen");
    expect(getGreeting(14)).toBe("Guten Tag");
    expect(getGreeting(20)).toBe("Guten Abend");
  });

  it("filters video jobs by completed, in-progress, and failed status", () => {
    const jobs = [{ status: "completed" }, { status: "processing" }, { status: "pending" }, { status: "failed" }];
    expect(filterReelJobs(jobs, "completed")).toHaveLength(1);
    expect(filterReelJobs(jobs, "in-progress")).toHaveLength(2);
    expect(filterReelJobs(jobs, "failed")).toHaveLength(1);
    expect(filterReelJobs(jobs, "all")).toHaveLength(4);
  });

  it("keeps project status labels human-readable", () => {
    expect(getStatusLabel("draft")).toBe("Entwurf");
    expect(getStatusLabel("generating")).toBe("In Arbeit");
    expect(getStatusLabel("completed")).toBe("Fertig");
    expect(getStatusLabel("failed")).toBe("Prüfen");
  });

  it("recognizes Enter as a submit shortcut without hijacking Shift+Enter", () => {
    expect(isSubmitShortcut({ key: "Enter" })).toBe(true);
    expect(isSubmitShortcut({ key: "Enter", shiftKey: true })).toBe(false);
    expect(isSubmitShortcut({ key: "Escape" })).toBe(false);
  });

  it("builds safe video export and sharing metadata", () => {
    const job = { videoUrl: "https://cdn.example/video.mp4", resultUrl: "https://fallback.example/video.mp4" };
    expect(getVideoShareUrl(job)).toBe("https://cdn.example/video.mp4");
    expect(getVideoShareText("Café-Eröffnung", 2)).toContain("Szene 2");
    expect(getVideoExportName("Café-Eröffnung", 2)).toBe("café-eröffnung-szene-2.mp4");
  });
});

import { describe, expect, it } from "vitest";
import { calculateAudioSyncWindow, filterReelJobs, filterReelJobsByPlatform, formatTimelineSeconds, getGreeting, getInitials, getPlatformForAspectRatio, getStatusLabel, getVideoExportName, getVideoShareText, getVideoShareUrl, isSubmitShortcut, SOCIAL_FORMAT_PRESETS } from "../client/src/lib/dashboard";

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

  it("exposes supported social-first aspect ratios", () => {
    expect(SOCIAL_FORMAT_PRESETS.map((preset) => preset.ratio)).toEqual(["9:16", "16:9", "1:1"]);
    expect(SOCIAL_FORMAT_PRESETS[0].label).toContain("TikTok");
  });

  it("filters reel jobs by platform-specific aspect ratio", () => {
    const jobs = [{ aspectRatio: "9:16" }, { aspectRatio: "16:9" }, { aspectRatio: "1:1" }, { aspectRatio: "4:5" }];
    expect(filterReelJobsByPlatform(jobs, "reels")).toHaveLength(1);
    expect(filterReelJobsByPlatform(jobs, "youtube")).toHaveLength(1);
    expect(filterReelJobsByPlatform(jobs, "feed")).toHaveLength(2);
    expect(filterReelJobsByPlatform(jobs, "all")).toHaveLength(4);
    expect(getPlatformForAspectRatio("9:16")).toBe("reels");
  });

  it("calculates deterministic audio windows across scene transitions", () => {
    const window = calculateAudioSyncWindow(1, [3, 5, 2], 0, 0.25);
    expect(window.sceneStartSeconds).toBe(3);
    expect(window.sceneEndSeconds).toBe(8);
    expect(window.startSeconds).toBe(2.75);
    expect(window.endSeconds).toBe(8.25);
    expect(window.durationSeconds).toBe(5.5);
    expect(formatTimelineSeconds(window.startSeconds)).toBe("00:02.8");
  });
});

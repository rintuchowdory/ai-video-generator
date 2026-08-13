import { describe, expect, it } from "vitest";
import { getGreeting, getInitials, getStatusLabel } from "../client/src/lib/dashboard";

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

  it("keeps project status labels human-readable", () => {
    expect(getStatusLabel("draft")).toBe("Entwurf");
    expect(getStatusLabel("generating")).toBe("In Arbeit");
    expect(getStatusLabel("completed")).toBe("Fertig");
    expect(getStatusLabel("failed")).toBe("Prüfen");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getOrCreateGuestUser: vi.fn(),
}));

import * as db from "./db";
import { createContext, GUEST_COOKIE_NAME } from "./_core/context";

const guestUser = {
  id: 17,
  openId: "guest:00000000-0000-4000-8000-000000000001",
  name: "Guest creator",
  email: null,
  loginMethod: "guest-workspace",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("anonymous workspace context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getOrCreateGuestUser).mockResolvedValue(guestUser as any);
  });

  it("issues an HTTP-only guest workspace cookie without OAuth", async () => {
    const cookie = vi.fn();
    const context = await createContext({
      req: { headers: {} },
      res: { cookie },
    } as any);

    expect(context.user).toEqual(guestUser);
    expect(db.getOrCreateGuestUser).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9-]{36}$/));
    expect(cookie).toHaveBeenCalledWith(
      GUEST_COOKIE_NAME,
      expect.stringMatching(/^[a-f0-9-]{36}$/),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("reuses a valid guest workspace cookie", async () => {
    const guestId = "00000000-0000-4000-8000-000000000001";
    const cookie = vi.fn();
    await createContext({
      req: { headers: { cookie: `${GUEST_COOKIE_NAME}=${guestId}` } },
      res: { cookie },
    } as any);

    expect(db.getOrCreateGuestUser).toHaveBeenCalledWith(guestId);
    expect(cookie).not.toHaveBeenCalled();
  });
});

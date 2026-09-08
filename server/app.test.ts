import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";

vi.mock("./db", () => ({
  getOrCreateGuestUser: vi.fn(),
}));
vi.mock("./magic_hour_client", () => ({
  magicHourClient: {
    getCapabilities: vi.fn(),
  },
}));

import * as db from "./db";
import { magicHourClient } from "./magic_hour_client";
import { createApp } from "./_core/app";

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

function listen(server: Server) {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine test server port"));
        return;
      }
      resolve(address.port);
    });
  });
}

describe("API HTTP transport", () => {
  let server: Server | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getOrCreateGuestUser).mockResolvedValue(guestUser as any);
    vi.mocked(magicHourClient.getCapabilities).mockResolvedValue({
      models: [],
      imageStyles: [],
    });
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>(resolve => server?.close(() => resolve()));
      server = undefined;
    }
  });

  it("returns JSON and issues a guest workspace cookie at /api/trpc", async () => {
    server = createServer(createApp());
    const port = await listen(server);
    const response = await fetch(
      `http://127.0.0.1:${port}/api/trpc/provider.capabilities?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("set-cookie")).toContain("werkbank_guest_id=");
    await expect(response.json()).resolves.toEqual([
      { result: { data: { json: { models: [], imageStyles: [] } } } },
    ]);
  });
});

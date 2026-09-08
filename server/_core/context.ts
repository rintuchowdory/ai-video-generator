import { randomUUID } from "node:crypto";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getOrCreateGuestUser } from "../db";

export const GUEST_COOKIE_NAME = "werkbank_guest_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const guestIdPattern = /^[a-f0-9-]{36}$/i;

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix))
    ?.slice(prefix.length);
}

/**
 * Scopes projects, generation jobs, and uploads to one browser without creating
 * an account. The random, HTTP-only cookie is an anonymous workspace key.
 */
function getOrIssueGuestId(opts: CreateExpressContextOptions) {
  const existing = getCookieValue(opts.req.headers.cookie, GUEST_COOKIE_NAME);
  if (existing && guestIdPattern.test(existing)) return existing;

  const guestId = randomUUID();
  opts.res.cookie(GUEST_COOKIE_NAME, guestId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_MS,
  });
  return guestId;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const guestId = getOrIssueGuestId(opts);

  // The guest user record only exists with a working database. When the
  // database is unreachable, degrade gracefully instead of failing every
  // request: public procedures (provider capabilities, system health) keep
  // working, while workspace procedures reject with a clean UNAUTHORIZED
  // error via the requireWorkspace middleware.
  let user: User | null = null;
  try {
    user = await getOrCreateGuestUser(guestId);
  } catch (error) {
    console.warn(
      "[Context] Guest workspace unavailable:",
      error instanceof Error ? error.message : error
    );
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

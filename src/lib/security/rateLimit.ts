import { NextResponse } from "next/server";

/**
 * In-memory sliding-window rate limit for the public endpoints. Per process,
 * which matches how the app runs (one instance over a file store). Keys are
 * client IPs from getClientKey (src/lib/admin/loginRateLimit.ts).
 */
export type RateLimiter = {
  /** Counts one request; `allowed: false` once `limit` is reached within the window. */
  hit(key: string, now?: number): { allowed: boolean; retryAfterSeconds: number };
  reset(): void;
};

/** Upper bound on tracked keys, so a flood of random IPs cannot grow memory forever. */
const MAX_KEYS = 10_000;

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000))
        };
      }

      if (!hits.has(key) && hits.size >= MAX_KEYS) {
        // Drop the oldest entry (Map keeps insertion order).
        hits.delete(hits.keys().next().value as string);
      }
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    }
  };
}

/** The 429 answer shared by the public routes. */
export const tooManyRequestsResponse = (retryAfterSeconds: number) =>
  NextResponse.json(
    {
      success: false,
      code: "too_many_requests",
      error: "Too many requests",
      message: "Too many requests"
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );

/** Booking requests: a real client sends one or two. */
export const bookingRateLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

/** Slot lookups: every click on a day or a service is one request. */
export const availabilityRateLimiter = createRateLimiter({ limit: 60, windowMs: 60 * 1000 });

import type { NextRequest } from "next/server";

/**
 * In-memory brute-force guard for the admin login route.
 *
 * The admin password lives in an environment variable and is typically short,
 * so an unthrottled login endpoint is guessable in seconds. State is per
 * process, which is fine here: the app runs as a single instance on top of a
 * file-based store anyway.
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Failure timestamps per client key, newest last. */
const failuresByKey = new Map<string, number[]>();

const prune = (timestamps: number[], now: number) =>
  timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);

export function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const clientIp = forwardedFor.split(",")[0]?.trim();
    if (clientIp) {
      return clientIp;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkLoginAllowed(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const timestamps = prune(failuresByKey.get(key) ?? [], now);

  if (timestamps.length) {
    failuresByKey.set(key, timestamps);
  } else {
    failuresByKey.delete(key);
  }

  if (timestamps.length < MAX_FAILURES) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const oldest = timestamps[0];
  const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000));

  return { allowed: false, retryAfterSeconds };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const timestamps = prune(failuresByKey.get(key) ?? [], now);
  timestamps.push(now);
  failuresByKey.set(key, timestamps);
}

export function clearLoginFailures(key: string) {
  failuresByKey.delete(key);
}

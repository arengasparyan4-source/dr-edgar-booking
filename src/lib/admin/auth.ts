import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { adminSessionStore } from "@/lib/admin/sessionStore";
import { timingSafeEqualStrings } from "@/lib/security/timingSafeCompare";

const cookieName = "dr_edgar_admin";

/** Password of the demo mode; published in the README and on the login page. */
export const DEMO_ADMIN_PASSWORD = "demo-edgar";

const configuredPassword = () => (process.env.ADMIN_PASSWORD ?? "").trim();

/** Telegram, Google Calendar or a non-mock SMS provider is configured. */
const hasRealIntegrations = () =>
  Boolean((process.env.TELEGRAM_BOT_TOKEN ?? "").trim()) ||
  (process.env.GOOGLE_CALENDAR_ENABLED ?? "").trim() === "true" ||
  !["", "mock"].includes((process.env.SMS_PROVIDER ?? "").trim());

/**
 * Demo mode: a fresh clone without .env.local. The admin then opens with the
 * published DEMO_ADMIN_PASSWORD. It is off as soon as ADMIN_PASSWORD or any
 * real integration is configured (or DEMO_MODE=false), so a real deployment
 * never falls back to a well-known password - the old "admin" default outside
 * production was exactly that problem.
 */
export const isDemoMode = () =>
  !configuredPassword() &&
  !hasRealIntegrations() &&
  (process.env.DEMO_MODE ?? "").trim() !== "false";

/** The admin password, or an empty string when the admin is disabled. */
export const getAdminPassword = () =>
  configuredPassword() || (isDemoMode() ? DEMO_ADMIN_PASSWORD : "");

export const isAdminPasswordConfigured = () => getAdminPassword().length > 0;

export function verifyAdminPassword(candidate: unknown): boolean {
  const password = getAdminPassword();

  if (!password || typeof candidate !== "string" || !candidate) {
    return false;
  }

  return timingSafeEqualStrings(candidate, password);
}

export async function createAdminSession() {
  const password = getAdminPassword();

  if (!password) {
    throw new Error("Unauthorized");
  }

  const { token, expiresAt } = await adminSessionStore.createSession(password);
  const cookieStore = await cookies();

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (token) {
    await adminSessionStore.revokeSession(token);
  }

  cookieStore.delete(cookieName);
}

export async function isAdminAuthenticated(request?: NextRequest) {
  const password = getAdminPassword();

  if (!password) {
    return false;
  }

  const token = request
    ? request.cookies.get(cookieName)?.value
    : (await cookies()).get(cookieName)?.value;

  if (!token) {
    return false;
  }

  return adminSessionStore.isValidToken(token, password);
}

export async function requireAdmin(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    throw new Error("Unauthorized");
  }
}

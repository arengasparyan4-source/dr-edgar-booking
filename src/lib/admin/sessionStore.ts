import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Server-side store for admin sessions.
 *
 * The cookie carries a random 32-byte token and nothing else. Only an HMAC of
 * that token is persisted, so a leaked session file cannot be replayed as a
 * login. Sessions expire after SESSION_TTL_MS and are removed on logout, which
 * the previous design could not do: its cookie value was a fixed
 * sha256(password:secret) that was identical for every login and impossible to
 * revoke without changing the password.
 */

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Keeps the file small if sessions are created from many devices. */
const MAX_SESSIONS = 50;

const storageDirectory = path.join(process.cwd(), "storage");
const sessionsPath = path.join(storageDirectory, "admin-sessions.json");

type StoredSession = {
  tokenHash: string;
  /**
   * HMAC of the admin password at the time of login. Changing ADMIN_PASSWORD
   * therefore invalidates every existing session, which is what the old
   * password-derived token did implicitly and what an admin expects after
   * rotating a leaked password.
   */
  passwordFingerprint: string;
  createdAt: string;
  expiresAt: string;
};

let processSecret: string | null = null;

/**
 * The HMAC key protecting stored session hashes. When ADMIN_SESSION_SECRET is
 * absent we generate a per-process random key rather than falling back to a
 * hardcoded constant: sessions then simply do not survive a restart, which is
 * safe, whereas a constant baked into the source would not be.
 */
const getSessionSecret = () => {
  const configured = (process.env.ADMIN_SESSION_SECRET ?? "").trim();

  if (configured) {
    return configured;
  }

  if (!processSecret) {
    processSecret = randomBytes(32).toString("hex");
    console.warn(
      "[admin/auth] ADMIN_SESSION_SECRET is not set - falling back to a random per-process key. " +
        "Admin sessions will be dropped on every restart. Set ADMIN_SESSION_SECRET in the environment."
    );
  }

  return processSecret;
};

const hmac = (value: string) =>
  createHmac("sha256", getSessionSecret()).update(value, "utf8").digest("hex");

const constantTimeMatch = (a: string, b: string) => {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

const isActive = (session: StoredSession, now: number) =>
  Date.parse(session.expiresAt) > now;

let writeQueue: Promise<unknown> = Promise.resolve();

async function readSessions(): Promise<StoredSession[]> {
  try {
    const raw = await readFile(sessionsPath, "utf-8");
    const parsed = JSON.parse(raw) as { sessions?: StoredSession[] };
    const now = Date.now();

    return (parsed.sessions ?? []).filter(
      (session) => session?.tokenHash && isActive(session, now)
    );
  } catch {
    return [];
  }
}

async function writeSessions(sessions: StoredSession[]) {
  await mkdir(storageDirectory, { recursive: true });
  const tempPath = path.join(storageDirectory, `admin-sessions.${randomBytes(8).toString("hex")}.tmp`);
  await writeFile(tempPath, JSON.stringify({ sessions }, null, 2), "utf-8");
  await rename(tempPath, sessionsPath);
}

/** Serializes read-modify-write cycles so concurrent logins cannot clobber each other. */
function update<T>(updater: (sessions: StoredSession[]) => Promise<[StoredSession[], T]>): Promise<T> {
  const run = async (): Promise<T> => {
    const current = await readSessions();
    const [next, result] = await updater(current);
    await writeSessions(next.slice(-MAX_SESSIONS));
    return result;
  };

  const result = writeQueue.then(run, run);
  writeQueue = result.catch(() => undefined);

  return result;
}

export const adminSessionStore = {
  async createSession(password: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await update(async (sessions) => [
      [
        ...sessions,
        {
          tokenHash: hmac(token),
          passwordFingerprint: hmac(password),
          createdAt: new Date().toISOString(),
          expiresAt
        }
      ],
      null
    ]);

    return { token, expiresAt };
  },

  async isValidToken(token: string, password: string) {
    if (!token) {
      return false;
    }

    const tokenHash = hmac(token);
    const passwordFingerprint = hmac(password);
    const now = Date.now();
    const sessions = await readSessions();

    return sessions.some(
      (session) =>
        isActive(session, now) &&
        constantTimeMatch(session.tokenHash, tokenHash) &&
        constantTimeMatch(session.passwordFingerprint, passwordFingerprint)
    );
  },

  async revokeSession(token: string) {
    if (!token) {
      return;
    }

    const tokenHash = hmac(token);

    await update(async (sessions) => [
      sessions.filter((session) => !constantTimeMatch(session.tokenHash, tokenHash)),
      null
    ]);
  }
};

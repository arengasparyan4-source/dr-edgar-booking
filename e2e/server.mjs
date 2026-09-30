/**
 * Starts the built app (`next build` must have run) for the Playwright tests
 * on a THROWAWAY copy of the data - never on storage/ of this project.
 *
 * A temporary directory gets: synthetic seed data (no real clients),
 * public/images, an empty uploads folder, and links to .next and
 * node_modules. `next start` runs there, so every file the app writes
 * (storage/*.json, uploaded photos) stays in the temp directory.
 * Telegram, Google Calendar and SMS are forced into mock/offline mode.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_ADMIN_PASSWORD, E2E_PORT, buildSeedData } from "./seed.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = "edgar-e2e-";
const linkedNames = [".next", "node_modules"];

/**
 * Deletes a temp work dir. The links to the project's .next and node_modules
 * are removed first and on their own; if one cannot be removed, nothing is
 * deleted, so a recursive delete can never reach the real folders.
 */
const removeWorkDir = (dir) => {
  for (const name of linkedNames) {
    const linkPath = path.join(dir, name);
    let stat;
    try {
      stat = fs.lstatSync(linkPath);
    } catch {
      continue;
    }
    if (!stat.isSymbolicLink()) {
      return;
    }
    try {
      fs.unlinkSync(linkPath);
    } catch {
      try {
        fs.rmdirSync(linkPath);
      } catch {
        return;
      }
    }
    if (fs.existsSync(linkPath)) {
      return;
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
};

// Remove leftovers of earlier runs (Windows cannot clean up on kill).
for (const entry of fs.readdirSync(os.tmpdir())) {
  if (entry.startsWith(prefix)) {
    try {
      removeWorkDir(path.join(os.tmpdir(), entry));
    } catch {
      // Still in use by a running server; ignore.
    }
  }
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const link = (name) =>
  fs.symlinkSync(path.join(projectRoot, name), path.join(workDir, name), "junction");

if (!fs.existsSync(path.join(projectRoot, ".next", "BUILD_ID"))) {
  console.error("[e2e] No production build found. Run `npm run build` first.");
  process.exit(1);
}

for (const file of ["package.json", "next.config.mjs"]) {
  fs.copyFileSync(path.join(projectRoot, file), path.join(workDir, file));
}
link(".next");
link("node_modules");
fs.cpSync(path.join(projectRoot, "public", "images"), path.join(workDir, "public", "images"), {
  recursive: true
});
fs.mkdirSync(path.join(workDir, "public", "uploads", "portfolio"), { recursive: true });
fs.mkdirSync(path.join(workDir, "storage"), { recursive: true });
fs.writeFileSync(
  path.join(workDir, "storage", "app-data.json"),
  JSON.stringify(buildSeedData(new Date()), null, 2)
);

const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(TELEGRAM_|GOOGLE_|SMS_|ADMIN_|NEXT_PUBLIC_)/.test(key)
  )
);
Object.assign(env, {
  NODE_ENV: "production",
  ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
  ADMIN_SESSION_SECRET: "e2e-session-secret",
  CLINIC_TIMEZONE: "Asia/Yerevan",
  GOOGLE_CALENDAR_ENABLED: "false",
  SMS_PROVIDER: "mock",
  SMS_AUTO_SEND_ENABLED: "false"
});

console.log(`[e2e] data copy: ${workDir}`);
const child = spawn(
  process.execPath,
  [path.join(workDir, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(E2E_PORT)],
  { cwd: workDir, env, stdio: "inherit" }
);

const stop = () => {
  child.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => {
  try {
    removeWorkDir(workDir);
  } catch {
    // Cleaned up on the next run.
  }
  process.exit(code ?? 0);
});

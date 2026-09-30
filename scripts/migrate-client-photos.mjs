/**
 * One-off migration: move client photos out of the public web root.
 *
 * Before: files lived in public/uploads/clients/ and were served by Next.js as
 * static assets, i.e. downloadable by anyone who knew the URL. These are
 * medical before/after photos.
 *
 * After: files live in storage/client-photos/ (never served statically) and each
 * ClientPhoto.url points at the admin-only streaming route
 * /api/admin/clients/<clientId>/photos/<photoId>/file.
 *
 * The script is idempotent, verifies every copied file before deleting the
 * original, and writes app-data.json atomically after taking a backup.
 *
 * Usage:
 *   node scripts/migrate-client-photos.mjs                     # dry run
 *   node scripts/migrate-client-photos.mjs --confirm           # apply
 *   node scripts/migrate-client-photos.mjs --confirm --strip-metadata
 *
 * --strip-metadata additionally removes EXIF/XMP from the already-stored legacy
 * files. New uploads are stripped automatically; this only affects old ones.
 */
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const confirmed = process.argv.includes("--confirm");
const stripMetadata = process.argv.includes("--strip-metadata");

const projectRoot = process.cwd();
const dataPath = path.join(projectRoot, "storage", "app-data.json");
const legacyDirectory = path.join(projectRoot, "public", "uploads", "clients");
const targetDirectory = path.join(projectRoot, "storage", "client-photos");

const photoUrl = (clientId, photoId) =>
  `/api/admin/clients/${encodeURIComponent(clientId)}/photos/${encodeURIComponent(photoId)}/file`;

const exists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const hasValidImageSignature = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(png)) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
};

async function loadStripper() {
  if (!stripMetadata) {
    return null;
  }

  const moduleUrl = new URL("../src/lib/images/stripImageMetadata.ts", import.meta.url);
  try {
    const stripperModule = await import(moduleUrl.href);
    return stripperModule.stripImageMetadata;
  } catch (error) {
    console.error(
      "--strip-metadata needs Node with TypeScript support. Re-run as:\n" +
        "  node --experimental-strip-types scripts/migrate-client-photos.mjs --confirm --strip-metadata"
    );
    throw error;
  }
}

async function main() {
  if (!(await exists(dataPath))) {
    console.error(`No data file at ${dataPath}. Nothing to migrate.`);
    process.exit(1);
  }

  const raw = await readFile(dataPath, "utf-8");
  const data = JSON.parse(raw);
  const photos = Array.isArray(data.clientPhotos) ? data.clientPhotos : [];

  console.log(`Data file : ${dataPath}`);
  console.log(`Legacy dir: ${legacyDirectory}`);
  console.log(`Target dir: ${targetDirectory}`);
  console.log(`Photos in database: ${photos.length}`);
  console.log(stripMetadata ? "Mode: move + strip metadata" : "Mode: move (byte-identical copy)");
  console.log("");

  const stripper = await loadStripper();

  const plan = [];
  const problems = [];

  for (const photo of photos) {
    const expectedUrl = photoUrl(photo.clientId, photo.id);
    const legacyPath = path.join(legacyDirectory, path.basename(photo.fileName ?? ""));
    const targetPath = path.join(targetDirectory, path.basename(photo.fileName ?? ""));

    if (!photo.fileName) {
      problems.push(`${photo.id}: record has no fileName`);
      continue;
    }

    const inTarget = await exists(targetPath);
    const inLegacy = await exists(legacyPath);

    plan.push({
      photo,
      expectedUrl,
      legacyPath,
      targetPath,
      needsCopy: !inTarget && inLegacy,
      needsUrlUpdate: photo.url !== expectedUrl,
      missingFile: !inTarget && !inLegacy
    });

    if (!inTarget && !inLegacy) {
      problems.push(`${photo.id}: file "${photo.fileName}" not found in either directory`);
    }
  }

  const toCopy = plan.filter((item) => item.needsCopy);
  const toUpdate = plan.filter((item) => item.needsUrlUpdate);

  console.log(`Files to copy      : ${toCopy.length}`);
  console.log(`URLs to rewrite    : ${toUpdate.length}`);
  console.log(`Records with issues: ${problems.length}`);
  for (const problem of problems) {
    console.log(`  ! ${problem}`);
  }

  // Files present on disk but not referenced by any record.
  let orphans = [];
  if (await exists(legacyDirectory)) {
    const known = new Set(photos.map((photo) => path.basename(photo.fileName ?? "")));
    orphans = (await readdir(legacyDirectory)).filter(
      (name) => name !== ".gitkeep" && !known.has(name)
    );
  }
  if (orphans.length) {
    console.log(`Unreferenced files in legacy dir: ${orphans.length}`);
    for (const name of orphans) {
      console.log(`  ? ${name} (will be left in place)`);
    }
  }

  if (!confirmed) {
    console.log("\nDry run. Re-run with --confirm to apply.");
    return;
  }

  if (!toCopy.length && !toUpdate.length) {
    console.log("\nNothing to do - already migrated.");
    return;
  }

  await mkdir(targetDirectory, { recursive: true });

  // --- copy + verify ------------------------------------------------------
  const copied = [];
  for (const item of toCopy) {
    const source = await readFile(item.legacyPath);
    const detected = hasValidImageSignature(source);

    if (!detected) {
      throw new Error(`${item.photo.id}: "${item.photo.fileName}" is not a valid image - aborting`);
    }

    let payload = source;
    if (stripper) {
      const stripped = stripper(item.photo.mimeType || detected, source);
      if (hasValidImageSignature(stripped)) {
        payload = stripped;
      } else {
        console.log(`  ~ ${item.photo.fileName}: strip produced an invalid image, copying as-is`);
      }
    }

    if (payload === source) {
      await copyFile(item.legacyPath, item.targetPath);
    } else {
      await writeFile(item.targetPath, payload);
    }

    // Verify the destination really is readable and matches what we intended.
    const written = await readFile(item.targetPath);
    const writtenStat = await stat(item.targetPath);

    if (!hasValidImageSignature(written)) {
      throw new Error(`${item.photo.fileName}: copy is not a readable image - aborting`);
    }
    if (writtenStat.size !== payload.length || sha256(written) !== sha256(payload)) {
      throw new Error(`${item.photo.fileName}: copy does not match the source - aborting`);
    }

    copied.push(item);
    const note = payload === source ? "identical" : `stripped, -${source.length - payload.length} B`;
    console.log(`  + ${item.photo.fileName} -> storage/client-photos/ (${note})`);

    if (payload !== source) {
      item.photo.size = payload.length;
    }
  }

  // --- rewrite urls -------------------------------------------------------
  for (const item of toUpdate) {
    item.photo.url = item.expectedUrl;
  }

  // --- persist ------------------------------------------------------------
  const backupPath = `${dataPath}.before-photo-migration-${Date.now()}.bak`;
  await writeFile(backupPath, raw, "utf-8");
  console.log(`\nBacked up data file to ${path.basename(backupPath)}`);

  const tempPath = `${dataPath}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
  await rename(tempPath, dataPath);
  console.log("Data file updated.");

  // --- remove originals only after everything above succeeded -------------
  for (const item of copied) {
    await unlink(item.legacyPath);
  }

  if (!orphans.length && (await exists(legacyDirectory))) {
    await rm(legacyDirectory, { recursive: true, force: true });
    console.log("Removed public/uploads/clients/ - client photos are no longer served statically.");
  } else if (orphans.length) {
    console.log(
      "Kept public/uploads/clients/ because it still holds unreferenced files. " +
        "Review and delete them manually."
    );
  }

  console.log(`\nDone. Copied ${copied.length} file(s), rewrote ${toUpdate.length} url(s).`);
}

main().catch((error) => {
  console.error("\nMigration failed:", error.message);
  console.error("No originals were deleted. Fix the problem and re-run.");
  process.exit(1);
});

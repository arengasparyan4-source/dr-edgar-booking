/**
 * npm run demo:setup
 *
 * Replaces clients, bookings, notes, procedures, client photos and the message
 * queue/log in storage/ with the made-up demo data from src/lib/demo/demoData.ts.
 * Services, working hours, portfolio, settings and SMS templates are kept.
 * Safe to run again: every run first copies the current storage/app-data.json
 * and storage/client-photos to storage/snapshots/before-demo-<time>/.
 *
 * Stop the app first: a running server keeps the data in memory and would
 * overwrite the file on its next write.
 *
 * Nothing is sent anywhere (no Telegram, Google Calendar or SMS).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { createDefaultAppData } from "@/lib/data/defaultData";
import { buildDemoData, type DemoPhotoFile } from "@/lib/demo/demoData";
import type { AppData } from "@/types/domain";

const storageDir = path.resolve(process.env.DEMO_STORAGE_DIR ?? path.join(process.cwd(), "storage"));
const dataPath = path.join(storageDir, "app-data.json");
const photosDir = path.join(storageDir, "client-photos");

const pad = (value: number) => String(value).padStart(2, "0");
const started = new Date();
const stamp = `${started.getFullYear()}${pad(started.getMonth() + 1)}${pad(started.getDate())}-${pad(started.getHours())}${pad(started.getMinutes())}${pad(started.getSeconds())}`;

mkdirSync(storageDir, { recursive: true });

// 1. Snapshot whatever is there now.
let base: AppData = createDefaultAppData();
if (existsSync(dataPath)) {
  const snapshotDir = path.join(storageDir, "snapshots", `before-demo-${stamp}`);
  mkdirSync(snapshotDir, { recursive: true });
  cpSync(dataPath, path.join(snapshotDir, "app-data.json"));
  if (existsSync(photosDir)) {
    cpSync(photosDir, path.join(snapshotDir, "client-photos"), { recursive: true });
  }
  console.log(`Snapshot: ${path.relative(process.cwd(), snapshotDir)}`);

  const current = JSON.parse(readFileSync(dataPath, "utf-8")) as Partial<AppData>;
  const defaults = createDefaultAppData();
  base = {
    ...defaults,
    ...current,
    services: current.services?.length ? current.services : defaults.services,
    workingHours: current.workingHours?.length ? current.workingHours : defaults.workingHours,
    portfolio: current.portfolio?.length ? current.portfolio : defaults.portfolio,
    smsTemplates: current.smsTemplates?.length ? current.smsTemplates : defaults.smsTemplates,
    settings: { ...defaults.settings, ...(current.settings ?? {}) },
    blockedTimes: current.blockedTimes ?? []
  };
}

// 2. Build the demo data.
const { data, photoFiles } = buildDemoData(base, new Date());

// 3. Client photos: remove the old files, write neutral generated pictures.
rmSync(photosDir, { recursive: true, force: true });
mkdirSync(photosDir, { recursive: true });
const sizes = new Map<string, number>();
for (const file of photoFiles) {
  const png = renderDemoPicture(file);
  writeFileSync(path.join(photosDir, file.fileName), png);
  sizes.set(file.fileName, png.length);
}
data.clientPhotos = data.clientPhotos.map((photo) => ({ ...photo, size: sizes.get(photo.fileName) ?? 0 }));

// 4. Write atomically.
const tempPath = path.join(storageDir, `app-data.demo-${stamp}.tmp`);
writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf-8");
renameSync(tempPath, dataPath);

const count = (status: string) => data.bookings.filter((booking) => booking.status === status).length;
console.log(
  [
    `Demo data written to ${path.relative(process.cwd(), dataPath) || dataPath}`,
    `  clients:    ${data.clients.length}`,
    `  bookings:   ${data.bookings.length} (completed ${count("completed")}, confirmed ${count("confirmed")}, pending ${count("pending")}, reschedule ${count("reschedule_requested")}, cancelled ${count("cancelled")}, no-show ${count("no_show")})`,
    `  procedures: ${data.clientProcedureRecords.length}, notes: ${data.clientNotes.length}, photos: ${data.clientPhotos.length}`,
    `  messages:   queue ${data.smsQueue.length}, log ${data.smsLogs.length}`,
    `Files in ${path.relative(process.cwd(), photosDir)}: ${readdirSync(photosDir).length}`
  ].join("\n")
);

// ---------------------------------------------------------------------------
// Neutral pictures: soft abstract gradients (no faces, no people) and a
// document-like page. Encoded as PNG with node:zlib, no image library needed.

function renderDemoPicture(file: DemoPhotoFile): Buffer {
  const width = 640;
  const height = 480;
  const pixels = Buffer.alloc(width * height * 3);
  const palettes: Array<[number[], number[], number[]]> = [
    [[244, 227, 214], [214, 180, 160], [196, 208, 196]],
    [[238, 224, 229], [205, 170, 178], [226, 212, 190]],
    [[232, 226, 214], [190, 176, 150], [210, 222, 226]],
    [[246, 236, 222], [220, 190, 170], [200, 190, 214]]
  ];
  const [light, warm, cool] = palettes[file.seed % palettes.length];
  const blobs = Array.from({ length: 4 }, (_, index) => ({
    x: ((file.seed * 97 + index * 181) % width),
    y: ((file.seed * 53 + index * 127) % height),
    r: 120 + ((file.seed * 31 + index * 43) % 140),
    color: index % 2 === 0 ? warm : cool
  }));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let rgb: number[];
      if (file.kind === "document") {
        const onLine = y > 60 && y < 440 && (y - 60) % 28 < 6 && x > 60 && x < (y > 400 ? 360 : 580);
        const title = y > 24 && y < 44 && x > 60 && x < 300;
        rgb = title ? [120, 110, 105] : onLine ? [205, 200, 195] : [250, 248, 245];
      } else {
        rgb = light.map((channel, i) => channel - (y / height) * 12 + (i === 2 ? (x / width) * 6 : 0));
        for (const blob of blobs) {
          const distance = Math.hypot(x - blob.x, y - blob.y);
          const weight = Math.max(0, 1 - distance / blob.r) ** 2 * 0.55;
          rgb = rgb.map((channel, i) => channel * (1 - weight) + blob.color[i] * weight);
        }
        // Fine grain so it reads as a texture, not a flat gradient.
        const grain = (((x * 73856093) ^ (y * 19349663) ^ file.seed) & 7) - 3.5;
        rgb = rgb.map((channel) => channel + grain);
      }
      const offset = (y * width + x) * 3;
      pixels[offset] = clampByte(rgb[0]);
      pixels[offset + 1] = clampByte(rgb[1]);
      pixels[offset + 2] = clampByte(rgb[2]);
    }
  }

  return encodePng(width, height, pixels);
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type: string, body: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typeAndBody = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndBody));
  return Buffer.concat([length, typeAndBody, crc]);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

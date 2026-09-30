/**
 * One-off migration for message channels (task D.1):
 *  - every client without preferredChannel gets "sms";
 *  - every SMS queue item and log entry without channel gets "sms".
 * Idempotent. A snapshot of the file is written next to it before any change.
 *
 * Usage: node scripts/migrate-preferred-channel.mjs [path/to/app-data.json]
 * (default: storage/app-data.json). Stop the server first.
 */
import fs from "node:fs";
import path from "node:path";

const file = path.resolve(process.argv[2] ?? "storage/app-data.json");
const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);
const counts = { clients: 0, queue: 0, logs: 0 };

for (const client of data.clients ?? []) {
  if (!client.preferredChannel) {
    client.preferredChannel = "sms";
    counts.clients += 1;
  }
}
for (const item of data.smsQueue ?? []) {
  if (!item.channel) {
    item.channel = "sms";
    counts.queue += 1;
  }
}
for (const log of data.smsLogs ?? []) {
  if (!log.channel) {
    log.channel = "sms";
    counts.logs += 1;
  }
}

if (!counts.clients && !counts.queue && !counts.logs) {
  console.log("Nothing to migrate:", file);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
const backup = `${file}.before-channels-${stamp}.bak`;
fs.writeFileSync(backup, raw);
const tmp = `${file}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
fs.renameSync(tmp, file);
console.log("Snapshot:", backup);
console.log("Migrated:", counts);

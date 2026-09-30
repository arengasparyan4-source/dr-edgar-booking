import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredEnv = [
  "GOOGLE_CALENDAR_ENABLED",
  "GOOGLE_CALENDAR_ID",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY"
];
const calendarScope = "https://www.googleapis.com/auth/calendar";
const calendarBaseUrl = "https://www.googleapis.com/calendar/v3";
const timeZone = "Asia/Yerevan";

function parseEnvFile(filePath) {
  const env = {};
  let text = "";

  try {
    text = readFileSync(resolve(filePath), "utf8");
  } catch {
    return env;
  }

  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    if (!match || line.trim().startsWith("#")) {
      continue;
    }

    const [, key] = match;
    let value = match[2] ?? "";
    const quote = value[0];

    if ((quote === "\"" || quote === "'") && !value.endsWith(quote)) {
      const chunks = [value.slice(1)];

      while (index + 1 < lines.length) {
        index += 1;
        const nextLine = lines[index];

        if (nextLine.endsWith(quote)) {
          chunks.push(nextLine.slice(0, -1));
          break;
        }

        chunks.push(nextLine);
      }

      value = chunks.join("\n");
    } else if (
      (quote === "\"" && value.endsWith("\"")) ||
      (quote === "'" && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnv() {
  return {
    ...process.env,
    ...parseEnvFile(".env"),
    ...parseEnvFile(".env.local")
  };
}

function exists(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sanitizeError(error, env) {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const sensitiveValues = [
    env.GOOGLE_PRIVATE_KEY,
    env.GOOGLE_CLIENT_EMAIL,
    env.GOOGLE_CALENDAR_ID
  ].filter(exists);

  return sensitiveValues.reduce(
    (message, value) => message.split(value).join("[redacted]"),
    raw
  );
}

function buildReason(errorMessage, status) {
  const message = errorMessage.toLowerCase();

  if (message.includes("private") || message.includes("pem")) {
    return "private key formatting problem";
  }

  if (message.includes("calendar api has not been used") || message.includes("access_not_configured")) {
    return "Calendar API not enabled";
  }

  if (status === 404 || message.includes("not found")) {
    return "wrong Calendar ID or service account has no access to this calendar";
  }

  if (status === 401 || message.includes("invalid_grant") || message.includes("invalid_client")) {
    return "service account credentials failed authentication";
  }

  if (status === 403 || message.includes("forbidden")) {
    return "service account has no access to this calendar or Calendar API is not enabled";
  }

  return "unknown Google Calendar error";
}

async function getAccessToken(env) {
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: env.GOOGLE_CLIENT_EMAIL,
      scope: calendarScope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Google auth failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function googleFetch(env, accessToken, path, init = {}) {
  const response = await fetch(`${calendarBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(
      new Error(`Google Calendar request failed (${response.status}): ${body}`),
      { status: response.status }
    );
  }

  return response;
}

function getTestEventTimes() {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setUTCHours(8, 0, 0, 0);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

async function main() {
  const env = loadEnv();

  for (const key of requiredEnv) {
    console.log(`${key}: ${exists(env[key]) ? "exists" : "missing"}`);
  }

  const enabled = String(env.GOOGLE_CALENDAR_ENABLED ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
  console.log(`GOOGLE_CALENDAR_ENABLED_IS_TRUE: ${enabled === "true" ? "yes" : "no"}`);

  const missing = requiredEnv.filter((key) => !exists(env[key]));

  if (missing.length > 0) {
    console.log("read calendar: failed");
    console.log("create event: failed");
    console.log("delete event: failed");
    console.log("reason: missing env variable");
    process.exit(1);
  }

  if (enabled !== "true") {
    console.log("read calendar: failed");
    console.log("create event: failed");
    console.log("delete event: failed");
    console.log("reason: GOOGLE_CALENDAR_ENABLED is not true");
    process.exit(1);
  }

  let accessToken;

  try {
    accessToken = await getAccessToken(env);
  } catch (error) {
    const message = sanitizeError(error, env);
    console.log("read calendar: failed");
    console.log("create event: failed");
    console.log("delete event: failed");
    console.log(`reason: ${buildReason(message)}`);
    console.log(`details: ${message}`);
    process.exit(1);
  }

  let eventId;

  try {
    const timeMin = encodeURIComponent(new Date().toISOString());
    const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID);
    await googleFetch(
      env,
      accessToken,
      `/calendars/${calendarId}/events?singleEvents=true&orderBy=startTime&maxResults=5&timeMin=${timeMin}`
    );
    console.log("read calendar: success");
  } catch (error) {
    const message = sanitizeError(error, env);
    console.log("read calendar: failed");
    console.log("create event: failed");
    console.log("delete event: failed");
    console.log(`reason: ${buildReason(message, error.status)}`);
    console.log(`details: ${message}`);
    process.exit(1);
  }

  try {
    const times = getTestEventTimes();
    const response = await googleFetch(
      env,
      accessToken,
      `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          summary: "TEST Dr Edgar Booking Integration",
          description: "Temporary integration test event. It should be deleted automatically.",
          start: { dateTime: times.start, timeZone },
          end: { dateTime: times.end, timeZone }
        })
      }
    );
    const data = await response.json();
    eventId = data.id;
    console.log("create event: success");
  } catch (error) {
    const message = sanitizeError(error, env);
    console.log("create event: failed");
    console.log("delete event: failed");
    console.log(`reason: ${buildReason(message, error.status)}`);
    console.log(`details: ${message}`);
    process.exit(1);
  }

  try {
    await googleFetch(
      env,
      accessToken,
      `/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" }
    );
    console.log("delete event: success");
  } catch (error) {
    const message = sanitizeError(error, env);
    console.log("delete event: failed");
    console.log(`reason: ${buildReason(message, error.status)}`);
    console.log(`details: ${message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const message = sanitizeError(error, loadEnv());

  console.log("read calendar: failed");
  console.log("create event: failed");
  console.log("delete event: failed");
  console.log(`reason: ${buildReason(message, error.status)}`);
  console.log(`details: ${message}`);
  process.exit(1);
});

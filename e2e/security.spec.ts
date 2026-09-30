import { expect, test } from "@playwright/test";

// Runs last (files run in name order with one worker): it uses up the
// availability rate limit for a minute.
test.describe("security", () => {
  test("security headers on pages and the API", async ({ request }) => {
    const page = await request.get("/");
    const headers = page.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-powered-by"]).toBeUndefined();

    const api = await request.get("/api/site-data");
    expect(api.headers()["cache-control"]).toContain("no-store");
    expect(api.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("public site data shows blocked time but never its reason", async ({ request }) => {
    const response = await request.get("/api/site-data");
    const text = await response.text();
    const data = JSON.parse(text) as { blockedTimes: Array<Record<string, unknown>> };

    expect(data.blockedTimes.length).toBeGreaterThan(0);
    expect(data.blockedTimes.every((item) => !("reason" in item))).toBe(true);
    expect(text).not.toContain("Private e2e reason");
  });

  test("unknown errors get a generic text", async ({ request }) => {
    const response = await request.post("/api/availability", {
      headers: { "Content-Type": "application/json" },
      data: Buffer.from("{not json")
    });
    const body = await response.json();
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(body.message).toBe("Request failed");
    expect(JSON.stringify(body)).not.toMatch(/JSON|position|token/i);
  });

  test("availability is rate limited per client", async ({ request }) => {
    const statuses: number[] = [];
    for (let index = 0; index < 70; index += 1) {
      const response = await request.post("/api/availability", {
        headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.7" },
        data: {}
      });
      statuses.push(response.status());
      if (response.status() === 429) {
        expect(Number(response.headers()["retry-after"])).toBeGreaterThan(0);
        expect((await response.json()).code).toBe("too_many_requests");
        break;
      }
    }
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.length).toBe(61);
  });
});

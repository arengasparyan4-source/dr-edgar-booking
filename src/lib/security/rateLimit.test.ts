import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/security/rateLimit";
import { errorResponse } from "@/lib/api/responses";

describe("createRateLimiter", () => {
  it("allows `limit` requests per window and per key, then answers with the wait time", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    const start = 1_000_000;

    expect([0, 1, 2].map((offset) => limiter.hit("a", start + offset).allowed)).toEqual([true, true, true]);
    expect(limiter.hit("a", start + 10_000)).toEqual({ allowed: false, retryAfterSeconds: 50 });
    expect(limiter.hit("b", start + 10_000).allowed).toBe(true);
  });

  it("frees the slot once the oldest request leaves the window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
    limiter.hit("a", 0);
    limiter.hit("a", 500);
    expect(limiter.hit("a", 900).allowed).toBe(false);
    expect(limiter.hit("a", 1_001).allowed).toBe(true);
  });
});

describe("errorResponse", () => {
  it("keeps known errors and their codes", async () => {
    const response = errorResponse(new Error("Slot is taken"));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "slot_taken", message: "Slot is taken" });
  });

  it("hides the text of unknown errors behind one generic message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = errorResponse(new Error("ENOENT: no such file C:\secret\path"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ code: "request_failed", message: "Request failed", error: "Request failed" });
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(log).toHaveBeenCalled();
    // Prototype names are not "known" messages either.
    expect((await errorResponse(new Error("constructor")).json()).message).toBe("Request failed");
    log.mockRestore();
  });
});

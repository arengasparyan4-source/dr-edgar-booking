import { afterEach, describe, expect, it, vi } from "vitest";

describe("adminFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const setup = (status: number) => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { origin: "http://localhost:3000", replace } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status })));
    return replace;
  };

  it("returns every non-401 response unchanged", async () => {
    const replace = setup(500);
    const { adminFetch } = await import("@/lib/admin/adminFetch");
    const response = await adminFetch("/api/admin/clients");

    expect(response.status).toBe(500);
    expect(replace).not.toHaveBeenCalled();
  });

  it("on 401 goes to the login page once and never settles", async () => {
    const replace = setup(401);
    const { adminFetch } = await import("@/lib/admin/adminFetch");
    let settled = false;
    void adminFetch("/api/admin/clients").then(() => (settled = true));
    void adminFetch("/api/admin/bookings").then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(settled).toBe(false);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("http://localhost:3000/admin/login");
  });
});

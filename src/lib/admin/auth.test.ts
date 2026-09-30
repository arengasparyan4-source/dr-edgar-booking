import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_ADMIN_PASSWORD, getAdminPassword, isDemoMode, verifyAdminPassword } from "@/lib/admin/auth";

const clean = {
  ADMIN_PASSWORD: "",
  TELEGRAM_BOT_TOKEN: "",
  GOOGLE_CALENDAR_ENABLED: "",
  SMS_PROVIDER: "",
  DEMO_MODE: ""
};

describe("admin demo mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("a fresh clone without configuration opens with the demo password", () => {
    Object.entries(clean).forEach(([key, value]) => vi.stubEnv(key, value));
    expect(isDemoMode()).toBe(true);
    expect(verifyAdminPassword(DEMO_ADMIN_PASSWORD)).toBe(true);
    expect(verifyAdminPassword("admin")).toBe(false);
  });

  it("a configured ADMIN_PASSWORD replaces the demo password", () => {
    Object.entries({ ...clean, ADMIN_PASSWORD: "real-secret" }).forEach(([key, value]) => vi.stubEnv(key, value));
    expect(isDemoMode()).toBe(false);
    expect(verifyAdminPassword(DEMO_ADMIN_PASSWORD)).toBe(false);
    expect(verifyAdminPassword("real-secret")).toBe(true);
  });

  it.each([
    ["TELEGRAM_BOT_TOKEN", "123:abc"],
    ["GOOGLE_CALENDAR_ENABLED", "true"],
    ["SMS_PROVIDER", "gsm"],
    ["DEMO_MODE", "false"]
  ])("is off when %s is set: the admin stays locked without a password", (key, value) => {
    Object.entries({ ...clean, [key]: value }).forEach(([name, env]) => vi.stubEnv(name, env));
    expect(isDemoMode()).toBe(false);
    expect(getAdminPassword()).toBe("");
    expect(verifyAdminPassword(DEMO_ADMIN_PASSWORD)).toBe(false);
  });
});

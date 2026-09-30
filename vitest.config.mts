import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit tests (`npm run test`). Browser tests live in e2e/ and run with Playwright. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: { CLINIC_TIMEZONE: "Asia/Yerevan" }
  }
});

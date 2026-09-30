import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "e2e/**/*.d.mts",
      "test-results/**",
      "playwright-report/**",
      // Local-only backups and runtime data (git-ignored).
      ".codex-backups/**",
      "storage/**"
    ]
  }
];

export default eslintConfig;

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function AdminLoginPage() {
  const router = useRouter();
  const { language, languageOptions, setLanguage, t } = useLanguage();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [demoPassword, setDemoPassword] = useState("");

  useEffect(() => {
    fetch("/api/admin/login")
      .then((response) => response.json())
      .then((data) => setDemoPassword(data.demoMode ? data.demoPassword : ""))
      .catch(() => setDemoPassword(""));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      setError(
        response.status === 429 ? t.login.tooManyAttempts : t.login.invalidPassword
      );
      return;
    }

    router.replace("/admin/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F3EF] px-4 text-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-champagne/60 bg-white/86 p-6 shadow-premium"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex rounded-2xl bg-pearl p-1">
            {languageOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setLanguage(option.code)}
                className={`min-h-10 rounded-xl px-3 text-xs font-semibold ${
                  language === option.code ? "bg-ink text-white" : "text-graphite/70"
                }`}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </div>
        <h1 className="text-3xl font-semibold">{t.common.admin}</h1>
        <p className="mt-2 text-sm leading-6 text-graphite/70">
          {t.login.hint}
        </p>
        {demoPassword ? (
          <p
            className="mt-4 rounded-2xl border border-sage/30 bg-sage/10 p-3 text-sm text-ink"
            data-testid="demo-login-hint"
          >
            {t.login.demoHint}{" "}
            <button
              type="button"
              onClick={() => setPassword(demoPassword)}
              className="rounded-lg bg-white px-2 py-0.5 font-mono font-semibold"
            >
              {demoPassword}
            </button>
          </p>
        ) : null}
        <label className="mt-6 block">
          <span className="field-label">
            {t.login.passwordLabel}
          </span>
          <input
            className="field-control min-h-12"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="mt-4 rounded-2xl bg-blush/20 p-3 text-sm font-semibold text-ink">
            {error}
          </p>
        ) : null}
        <button type="submit" className="mt-6 min-h-12 w-full rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white">
          {t.login.submit}
        </button>
      </form>
    </main>
  );
}

"use client";

import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { adminFetch, redirectToLogin } from "@/lib/admin/adminFetch";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function AdminHeader() {
  const { language, languageOptions, setLanguage, t } = useLanguage();

  const logout = async () => {
    await adminFetch("/api/admin/logout", { method: "POST" });
    redirectToLogin();
  };

  return (
    <header className="flex flex-col gap-3 rounded-3xl border border-champagne/60 bg-white/84 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-graphite/50">
          {t.common.language}
        </span>
        <div className="flex rounded-2xl bg-pearl p-1">
          {languageOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              className={`min-h-10 rounded-xl px-3 text-xs font-semibold transition ${
                language === option.code
                  ? "bg-ink text-white shadow-sm"
                  : "text-graphite/70 hover:bg-white"
              }`}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold text-ink"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t.nav.openSite}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t.nav.logout}
        </button>
      </div>
    </header>
  );
}

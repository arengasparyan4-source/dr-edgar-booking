"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { defaultSettings } from "@/lib/data/defaultData";
import type { Settings } from "@/types/domain";

export default function AdminSettingsPage() {
  const { languageOptions, t } = useLanguage();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    adminFetch("/api/admin/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.settings ?? defaultSettings))
      .catch(() => setSettings(defaultSettings));
  }, []);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setSettings(data.settings ?? settings);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  return (
    <AdminShell title={t.settings.title} subtitle={t.settings.subtitle}>
      <form
        onSubmit={saveSettings}
        className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">{t.settings.address}</span>
            <input
              className="field-control min-h-12"
              value={settings.address}
              onChange={(event) =>
                setSettings({ ...settings, address: event.target.value })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.phone}</span>
            <input
              className="field-control min-h-12"
              value={settings.phone}
              onChange={(event) =>
                setSettings({ ...settings, phone: event.target.value })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.instagram}</span>
            <input
              className="field-control min-h-12"
              value={settings.instagramUrl}
              onChange={(event) =>
                setSettings({ ...settings, instagramUrl: event.target.value })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.bookingHorizonDays}</span>
            <input
              className="field-control min-h-12"
              type="number"
              min={7}
              max={60}
              value={settings.bookingHorizonDays}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  bookingHorizonDays: Number(event.target.value)
                })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.minBookingLeadMinutes}</span>
            <input
              className="field-control min-h-12"
              type="number"
              min={0}
              max={1440}
              step={15}
              value={settings.minBookingLeadMinutes ?? 60}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  minBookingLeadMinutes: Number(event.target.value)
                })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.telegramChatId}</span>
            <input
              className="field-control min-h-12"
              value={settings.telegramChatId ?? ""}
              onChange={(event) =>
                setSettings({ ...settings, telegramChatId: event.target.value })
              }
            />
          </label>
          <label>
            <span className="field-label">{t.settings.googleCalendarId}</span>
            <input
              className="field-control min-h-12"
              value={settings.googleCalendarId ?? ""}
              onChange={(event) =>
                setSettings({ ...settings, googleCalendarId: event.target.value })
              }
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl bg-pearl p-4">
          <input
            type="checkbox"
            checked={settings.googleCalendarEnabled}
            onChange={(event) =>
              setSettings({
                ...settings,
                googleCalendarEnabled: event.target.checked
              })
            }
          />
          <span className="text-sm font-semibold">{t.settings.googleCalendarEnabled}</span>
        </label>

        <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          {t.settings.integrationWarning}
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {languageOptions.map((option) => (
            <label key={option.code}>
              <span className="field-label">
                {t.settings.doctorAbout} ({option.shortLabel})
              </span>
              <textarea
                className="field-control min-h-32"
                value={settings.aboutDoctor[option.code]}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    aboutDoctor: {
                      ...settings.aboutDoctor,
                      [option.code]: event.target.value
                    }
                  })
                }
              />
            </label>
          ))}
        </div>

        {notice ? (
          <p className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}>
            {notice.text}
          </p>
        ) : null}
        <button className="mt-5 min-h-12 rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t.settings.saveSettings}
        </button>
      </form>
    </AdminShell>
  );
}

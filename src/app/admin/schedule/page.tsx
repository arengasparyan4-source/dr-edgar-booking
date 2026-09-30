"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { BlockedTime, WorkingHours } from "@/types/domain";
import { formatDate } from "@/lib/i18n/formatDate";

export default function AdminSchedulePage() {
  const { language, t } = useLanguage();
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [blockedDraft, setBlockedDraft] = useState<BlockedTime>({
    id: "",
    date: "",
    startTime: "10:00",
    endTime: "11:00",
    reason: ""
  });
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadSchedule = () => {
    adminFetch("/api/admin/schedule")
      .then((response) => response.json())
      .then((data) => {
        setWorkingHours(data.workingHours ?? []);
        setBlockedTimes(data.blockedTimes ?? []);
      })
      .catch(() => {
        setWorkingHours([]);
        setBlockedTimes([]);
      });
  };

  useEffect(loadSchedule, []);

  const saveSchedule = async (nextBlockedTimes = blockedTimes) => {
    setNotice(null);
    try {
      const response = await adminFetch("/api/admin/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours, blockedTimes: nextBlockedTimes })
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setWorkingHours(data.workingHours ?? workingHours);
      setBlockedTimes(data.blockedTimes ?? nextBlockedTimes);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const updateDay = (index: number, patch: Partial<WorkingHours>) => {
    setWorkingHours((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const addBreak = (index: number) => {
    setWorkingHours((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              breaks: [...item.breaks, { startTime: "13:00", endTime: "14:00" }]
            }
          : item
      )
    );
  };

  const updateBreak = (
    dayIndex: number,
    breakIndex: number,
    patch: { startTime?: string; endTime?: string }
  ) => {
    setWorkingHours((current) =>
      current.map((item, itemIndex) =>
        itemIndex === dayIndex
          ? {
              ...item,
              breaks: item.breaks.map((breakTime, currentBreakIndex) =>
                currentBreakIndex === breakIndex
                  ? { ...breakTime, ...patch }
                  : breakTime
              )
            }
          : item
      )
    );
  };

  const removeBreak = (dayIndex: number, breakIndex: number) => {
    setWorkingHours((current) =>
      current.map((item, itemIndex) =>
        itemIndex === dayIndex
          ? {
              ...item,
              breaks: item.breaks.filter((_, currentBreakIndex) => currentBreakIndex !== breakIndex)
            }
          : item
      )
    );
  };

  const addBlockedTime = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = [
      ...blockedTimes,
      {
        ...blockedDraft,
        id: blockedDraft.id || `blocked_${globalThis.crypto.randomUUID()}`
      }
    ];
    setBlockedTimes(next);
    setBlockedDraft({
      id: "",
      date: "",
      startTime: "10:00",
      endTime: "11:00",
      reason: ""
    });
    await saveSchedule(next);
  };

  return (
    <AdminShell title={t.schedule.title} subtitle={t.schedule.subtitle}>
      <section className="grid gap-4 lg:grid-cols-2">
        {workingHours.map((day, index) => (
          <article
            key={day.dayOfWeek}
            className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t.weekdays[day.dayOfWeek]}</h2>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(event) => updateDay(index, { enabled: event.target.checked })}
                />
                {day.enabled ? t.common.enabled : t.schedule.dayOff}
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label>
                <span className="field-label">{t.schedule.start}</span>
                <input
                  className="field-control min-h-12"
                  type="time"
                  value={day.startTime}
                  onChange={(event) => updateDay(index, { startTime: event.target.value })}
                />
              </label>
              <label>
                <span className="field-label">{t.schedule.end}</span>
                <input
                  className="field-control min-h-12"
                  type="time"
                  value={day.endTime}
                  onChange={(event) => updateDay(index, { endTime: event.target.value })}
                />
              </label>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-graphite">{t.schedule.breaks}</p>
                <button
                  type="button"
                  onClick={() => addBreak(index)}
                  className="min-h-10 rounded-2xl bg-pearl px-3 text-xs font-semibold"
                >
                  {t.common.add}
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {day.breaks.length ? (
                  day.breaks.map((breakTime, breakIndex) => (
                    <div key={`${day.dayOfWeek}-${breakIndex}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        className="field-control min-h-11"
                        type="time"
                        value={breakTime.startTime}
                        onChange={(event) =>
                          updateBreak(index, breakIndex, { startTime: event.target.value })
                        }
                      />
                      <input
                        className="field-control min-h-11"
                        type="time"
                        value={breakTime.endTime}
                        onChange={(event) =>
                          updateBreak(index, breakIndex, { endTime: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeBreak(index, breakIndex)}
                        className="min-h-11 rounded-2xl bg-white px-3 text-xs font-semibold"
                      >
                        {t.common.remove}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-pearl p-3 text-sm text-graphite/65">
                    {t.schedule.noBreaks}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>

      <button
        onClick={() => saveSchedule()}
        className="min-h-12 rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white"
      >
        {t.schedule.saveWorkingHours}
      </button>

      {notice ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {notice.text}
        </p>
      ) : null}

      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft">
        <h2 className="text-xl font-semibold">{t.schedule.blockedTime}</h2>
        <form onSubmit={addBlockedTime} className="mt-5 grid gap-3 md:grid-cols-5">
          <input
            className="field-control min-h-12"
            type="date"
            value={blockedDraft.date}
            onChange={(event) =>
              setBlockedDraft({ ...blockedDraft, date: event.target.value })
            }
            required
          />
          <input
            className="field-control min-h-12"
            type="time"
            value={blockedDraft.startTime}
            onChange={(event) =>
              setBlockedDraft({ ...blockedDraft, startTime: event.target.value })
            }
          />
          <input
            className="field-control min-h-12"
            type="time"
            value={blockedDraft.endTime}
            onChange={(event) =>
              setBlockedDraft({ ...blockedDraft, endTime: event.target.value })
            }
          />
          <input
            className="field-control min-h-12"
            placeholder={t.schedule.reason}
            value={blockedDraft.reason}
            onChange={(event) =>
              setBlockedDraft({ ...blockedDraft, reason: event.target.value })
            }
          />
          <button className="min-h-12 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white">
            {t.schedule.addBlockedTime}
          </button>
        </form>
        <div className="mt-5 grid gap-3">
          {blockedTimes.map((blocked) => (
            <div
              key={blocked.id}
              className="flex flex-col gap-3 rounded-2xl bg-pearl p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-semibold">
                {formatDate(blocked.date, language)} · {blocked.startTime}-{blocked.endTime} ·{" "}
                {blocked.reason || t.schedule.blockedTime}
              </p>
              <button
                onClick={() =>
                  saveSchedule(blockedTimes.filter((item) => item.id !== blocked.id))
                }
                className="min-h-11 rounded-2xl bg-white px-4 py-2 text-sm font-semibold"
              >
                {t.common.remove}
              </button>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

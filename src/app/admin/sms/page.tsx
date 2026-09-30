"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  X
} from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { SmsLog, SmsQueueItem, SmsStatus, SmsTemplate, SmsType } from "@/types/sms";
import type { MessageChannel } from "@/types/domain";
import { ChannelBadge } from "@/components/ChannelIcon";
import { CHANNEL_LABELS, MESSAGE_CHANNELS } from "@/lib/messaging/channels";
import { formatDateTime as formatInstant } from "@/lib/i18n/formatDate";

type Runtime = {
  provider: string;
  isMock: boolean;
  /** No provider can really deliver: nothing is sent to clients. */
  demoMode: boolean;
  autoSendEnv: boolean;
  senderPhone: string;
  defaultCountry: string;
  defaultCountryCode: string;
  channels?: Array<{ channel: MessageChannel; provider: string; connected: boolean }>;
};
type SmsSettings = {
  smsAutoSendEnabled: boolean;
  smsReminderEnabled: boolean;
  smsReminderOffsets: number[];
  smsBirthdayAutoSendEnabled: boolean;
};
type QueueItem = SmsQueueItem & { clientName: string };
type LogItem = SmsLog & { clientName: string };
type SmsClient = {
  id: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  status: string;
  isVip: boolean;
  isBlacklisted: boolean;
  birthDate: string;
  lastVisitDate: string;
  nextBookingDate: string;
  createdAt: string;
};
type SmsBooking = {
  id: string;
  clientId: string;
  phone: string;
  date: string;
  status: string;
};

type Bootstrap = {
  runtime: Runtime;
  settings: SmsSettings;
  templates: SmsTemplate[];
  queue: QueueItem[];
  logs: LogItem[];
  clients: SmsClient[];
  bookings: SmsBooking[];
};

type Tab = "scheduled" | "archive" | "templates" | "manual" | "settings";
type ClientFilter =
  | "all"
  | "vip"
  | "active"
  | "sleeping"
  | "upcoming"
  | "birthdayWeek"
  | "birthdayMonth";
type ManualType = Extract<SmsType, "birthday" | "loyalty" | "custom">;

const todayIso = () => new Date().toISOString().slice(0, 10);


// Client-side mirror of renderTemplateBody for live preview.
const renderPreview = (body: string, vars: Record<string, string>) =>
  body
    .replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_m, name: string) => vars[name] ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const monthDay = (value: string) => {
  if (!value || value.length < 5) {
    return "";
  }
  // Accept YYYY-MM-DD or MM-DD.
  return value.length >= 10 ? value.slice(5, 10) : value.slice(0, 5);
};

const upcomingBookingStatuses = new Set(["pending", "confirmed", "reschedule_requested"]);

export default function AdminSmsPage() {
  const { t, language } = useLanguage();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Manual send state
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [manualType, setManualType] = useState<ManualType>("loyalty");
  const [templateId, setTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [discount, setDiscount] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Template editing state
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});

  const load = () => {
    adminFetch("/api/admin/sms")
      .then((response) => response.json())
      .then((payload: Bootstrap) => {
        setData(payload);
        const drafts: Record<string, string> = {};
        payload.templates?.forEach((template) => {
          drafts[template.id] = template.body;
        });
        setTemplateDrafts(drafts);
      })
      .catch(() => setNotice({ type: "error", text: t.clients.somethingWentWrong }))
      .finally(() => setLoading(false));
  };

  const refresh = () => {
    setLoading(true);
    load();
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeLabel = (type: SmsType) => {
    const map: Record<SmsType, string> = {
      booking_confirmation: t.sms.typeConfirmation,
      booking_reminder: t.sms.typeReminder,
      booking_cancelled: t.sms.typeCancelled,
      booking_rescheduled: t.sms.typeRescheduled,
      birthday: t.sms.typeBirthday,
      loyalty: t.sms.typeLoyalty,
      custom: t.sms.typeCustom
    };
    return map[type];
  };

  const statusLabel = (status: SmsStatus) => {
    const map: Record<SmsStatus, string> = {
      scheduled: t.sms.statusScheduled,
      sent: t.sms.statusSent,
      failed: t.sms.statusFailed,
      cancelled: t.sms.statusCancelled,
      skipped: t.sms.statusSkipped
    };
    return map[status];
  };

  const statusClass = (status: SmsStatus) => {
    const map: Record<SmsStatus, string> = {
      scheduled: "border-sky-200 bg-sky-50 text-sky-700",
      sent: "border-emerald-200 bg-emerald-50 text-emerald-700",
      failed: "border-red-200 bg-red-50 text-red-700",
      cancelled: "border-slate-300 bg-slate-100 text-slate-700",
      skipped: "border-amber-200 bg-amber-50 text-amber-800"
    };
    return map[status];
  };

  const runAction = async (body: Record<string, unknown>, successText?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await adminFetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || payload.success !== true) {
        throw new Error(translateApiError(payload, t));
      }
      if (successText) {
        setNotice({ type: "success", text: successText });
      }
      load();
      return payload;
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const filteredLogs = useMemo(
    () =>
      (data?.logs ?? []).filter(
        (log) => channelFilter === "all" || (log.channel ?? "sms") === channelFilter
      ),
    [channelFilter, data]
  );

  const scheduledItems = useMemo(
    () =>
      (data?.queue ?? []).filter(
        (item) =>
          item.status === "scheduled" &&
          (channelFilter === "all" || (item.channel ?? "sms") === channelFilter)
      ),
    [channelFilter, data]
  );

  const bookingClientIdsWithUpcoming = useMemo(() => {
    const ids = new Set<string>();
    const today = todayIso();
    (data?.bookings ?? []).forEach((booking) => {
      if (upcomingBookingStatuses.has(booking.status) && booking.date >= today) {
        if (booking.clientId) {
          ids.add(booking.clientId);
        }
      }
    });
    return ids;
  }, [data]);

  const filteredClients = useMemo(() => {
    const clients = data?.clients ?? [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    const normalizedSearch = search.trim().toLocaleLowerCase();

    return clients.filter((client) => {
      if (client.isBlacklisted) {
        return false;
      }

      if (normalizedSearch) {
        const haystack = `${client.fullName} ${client.phone} ${client.normalizedPhone}`.toLocaleLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      switch (filter) {
        case "vip":
          return client.isVip;
        case "active":
          return client.status === "active";
        case "sleeping":
          return client.status === "sleeping";
        case "upcoming":
          return (
            bookingClientIdsWithUpcoming.has(client.id) ||
            (client.nextBookingDate && client.nextBookingDate >= todayIso())
          );
        case "birthdayWeek": {
          const md = monthDay(client.birthDate);
          if (!md) {
            return false;
          }
          // Compare month-day across the next 7 days.
          for (let offset = 0; offset <= 7; offset += 1) {
            const day = new Date(today);
            day.setDate(today.getDate() + offset);
            const pad = (n: number) => String(n).padStart(2, "0");
            if (`${pad(day.getMonth() + 1)}-${pad(day.getDate())}` === md) {
              return true;
            }
          }
          return false;
        }
        case "birthdayMonth": {
          const md = monthDay(client.birthDate);
          return Boolean(md) && Number(md.slice(0, 2)) === currentMonth;
        }
        default:
          return true;
      }
    });
  }, [data, filter, search, bookingClientIdsWithUpcoming]);

  const selectedClients = useMemo(
    () => (data?.clients ?? []).filter((client) => selected.has(client.id)),
    [data, selected]
  );

  const activeTemplate = useMemo(() => {
    if (!data) {
      return undefined;
    }
    if (templateId) {
      return data.templates.find((template) => template.id === templateId);
    }
    return data.templates.find(
      (template) => template.type === manualType && template.enabled
    );
  }, [data, templateId, manualType]);

  const previewText = useMemo(() => {
    const sample = selectedClients[0];
    const vars: Record<string, string> = {
      clientName: sample?.fullName ?? "{{clientName}}",
      phone: sample?.normalizedPhone ?? sample?.phone ?? "",
      doctorName: "Dr. Edgar",
      clinicName: "Dr. Edgar",
      discount,
      customMessage
    };
    if (activeTemplate) {
      return renderPreview(activeTemplate.body, vars);
    }
    return customMessage.trim();
  }, [activeTemplate, selectedClients, discount, customMessage]);

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((current) => {
      const next = new Set(current);
      filteredClients.forEach((client) => next.add(client.id));
      return next;
    });
  };

  const submitManualSend = async () => {
    setConfirmOpen(false);
    const payload = await runAction(
      {
        action: "manualSend",
        clientIds: Array.from(selected),
        type: manualType,
        templateId: activeTemplate?.id,
        customMessage,
        discount
      },
      t.common.saved
    );
    if (payload?.result) {
      const r = payload.result;
      setNotice({
        type: "success",
        text: `${t.sms.resultTotal}: ${r.total} · ${t.sms.resultDispatched}: ${r.dispatched} · ${t.sms.resultScheduled}: ${r.scheduled} · ${t.sms.resultSkipped}: ${r.skipped} · ${t.sms.resultDuplicates}: ${r.duplicates}`
      });
    }
  };

  const runtime = data?.runtime;
  const settings = data?.settings;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "scheduled", label: t.sms.tabScheduled },
    { key: "archive", label: t.sms.tabArchive },
    { key: "templates", label: t.sms.tabTemplates },
    { key: "manual", label: t.sms.tabManual },
    { key: "settings", label: t.sms.tabSettings }
  ];

  return (
    <AdminShell title={t.sms.title} subtitle={t.sms.subtitle}>
      {/* Safety / runtime banner */}
      <section
        className={`rounded-3xl border p-4 shadow-soft ${
          runtime?.isMock || runtime?.demoMode
            ? "border-sky-200 bg-sky-50"
            : settings?.smsAutoSendEnabled && runtime?.autoSendEnv
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-ink" aria-hidden="true" />
          <span className="text-sm font-semibold">
            {runtime?.isMock
              ? `${t.sms.provider}: ${t.sms.statusMock}`
              : `${t.sms.provider}: ${runtime?.provider ?? "-"} `}
            {runtime?.isMock
              ? ""
              : runtime?.demoMode
                ? `· ${t.sms.statusDemo}`
                : `· ${t.sms.statusReal}`}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
            {t.sms.autoSend}:{" "}
            {settings?.smsAutoSendEnabled && runtime?.autoSendEnv
              ? t.sms.autoSendOn
              : t.sms.autoSendOff}
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
            {t.sms.senderPhone}: {runtime?.senderPhone || t.sms.notConfigured}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="ml-auto inline-flex min-h-9 items-center gap-2 rounded-2xl border border-champagne/70 bg-white px-3 text-sm font-semibold text-ink"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t.sms.refresh}
          </button>
        </div>
        <p className="mt-2 text-sm text-graphite/75">
          {runtime?.isMock
            ? t.sms.safetyMockNote
            : runtime?.demoMode
              ? t.sms.demoModeNote
              : settings?.smsAutoSendEnabled && runtime?.autoSendEnv
              ? ""
              : t.sms.safetyRealOffNote}
        </p>
      </section>

      <section
        className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft"
        data-testid="sms-channel-status"
      >
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-graphite/55">
          {t.channels.statusTitle}
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(runtime?.channels ?? MESSAGE_CHANNELS.map((channel) => ({ channel, provider: "", connected: false }))).map(
            (item) => (
              <div key={item.channel} className="rounded-2xl bg-pearl p-3">
                <ChannelBadge channel={item.channel} />
                <p
                  className={`mt-2 text-xs font-semibold ${item.connected ? "text-emerald-700" : "text-graphite/65"}`}
                  data-testid={`sms-channel-status-${item.channel}`}
                >
                  {item.connected ? t.channels.connected : t.channels.notConnected}
                </p>
              </div>
            )
          )}
        </div>
        <p className="mt-3 text-xs text-graphite/65">{t.channels.demoExplanation}</p>
      </section>

      {notice ? (
        <p
          className={`rounded-3xl border p-4 text-sm font-semibold shadow-soft ${
            notice.type === "success"
              ? "border-sage/30 bg-sage/10 text-sage"
              : "border-[#B85C55]/40 bg-[#B85C55]/10 text-[#7A342F]"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      {/* Tabs */}
      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-2 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key ? "bg-ink text-white" : "bg-pearl text-graphite hover:bg-champagne/40"
              }`}
            >
              {item.key === "manual" ? <Send className="h-4 w-4" aria-hidden="true" /> : null}
              {item.key === "scheduled" ? <BellRing className="h-4 w-4" aria-hidden="true" /> : null}
              {item.key === "archive" ? <MessageSquare className="h-4 w-4" aria-hidden="true" /> : null}
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="rounded-3xl border border-champagne/60 bg-white/86 p-5 text-sm font-semibold shadow-soft">
          {t.common.loading}
        </p>
      ) : null}

      {/* SCHEDULED */}
      {!loading && tab === "scheduled" ? (
        <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t.sms.tabScheduled}</h2>
            <select
              className="field-control min-h-11 w-auto"
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value as MessageChannel | "all")}
              aria-label={t.channels.title}
              data-testid="sms-channel-filter-scheduled"
            >
              <option value="all">{t.channels.filterAll}</option>
              {MESSAGE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction({ action: "generateReminders" }, t.sms.remindersGenerated)}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              <BellRing className="h-4 w-4" aria-hidden="true" />
              {t.sms.generateReminders}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-pearl text-xs uppercase tracking-[0.12em] text-graphite/55">
                <tr>
                  <th className="px-3 py-3">{t.sms.client}</th>
                  <th className="px-3 py-3">{t.sms.phone}</th>
                  <th className="px-3 py-3">{t.channels.column}</th>
                  <th className="px-3 py-3">{t.sms.type}</th>
                  <th className="px-3 py-3">{t.sms.scheduledAt}</th>
                  <th className="px-3 py-3">{t.sms.status}</th>
                  <th className="px-3 py-3">{t.sms.message}</th>
                  <th className="px-3 py-3">{t.sms.actions}</th>
                </tr>
              </thead>
              <tbody>
                {scheduledItems.map((item) => (
                  <tr key={item.id} className="border-t border-champagne/50 align-top">
                    <td className="px-3 py-3 font-semibold">{item.clientName || "-"}</td>
                    <td className="px-3 py-3">{item.phone}</td>
                    <td className="px-3 py-3"><ChannelBadge channel={item.channel ?? "sms"} /></td>
                    <td className="px-3 py-3">{typeLabel(item.type)}</td>
                    <td className="px-3 py-3">{formatInstant(item.scheduledAt, language)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="max-w-sm whitespace-pre-wrap text-graphite/75">{item.message}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction(
                              { action: "queueAction", id: item.id, queueAction: "sendNow" },
                              runtime?.demoMode && !runtime.isMock ? t.sms.demoNotSent : undefined
                            )
                          }
                          className="inline-flex min-h-9 items-center rounded-xl bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {t.sms.sendNow}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            runAction({ action: "queueAction", id: item.id, queueAction: "cancel" })
                          }
                          className="inline-flex min-h-9 items-center rounded-xl border border-[#B85C55]/40 px-3 text-xs font-semibold text-[#7A342F] disabled:opacity-50"
                        >
                          {t.sms.cancelSms}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scheduledItems.length === 0 ? (
            <p className="border-t border-champagne/50 p-5 text-sm text-graphite/65">
              {t.sms.noScheduled}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ARCHIVE / LOGS */}
      {!loading && tab === "archive" ? (
        <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t.sms.tabArchive}</h2>
            <select
              className="field-control min-h-11 w-auto"
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value as MessageChannel | "all")}
              aria-label={t.channels.title}
              data-testid="sms-channel-filter-archive"
            >
              <option value="all">{t.channels.filterAll}</option>
              {MESSAGE_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {CHANNEL_LABELS[channel]}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead className="bg-pearl text-xs uppercase tracking-[0.12em] text-graphite/55">
                <tr>
                  <th className="px-3 py-3">{t.sms.createdAt}</th>
                  <th className="px-3 py-3">{t.sms.client}</th>
                  <th className="px-3 py-3">{t.sms.phone}</th>
                  <th className="px-3 py-3">{t.channels.column}</th>
                  <th className="px-3 py-3">{t.sms.type}</th>
                  <th className="px-3 py-3">{t.sms.status}</th>
                  <th className="px-3 py-3">{t.sms.providerColumn}</th>
                  <th className="px-3 py-3">{t.sms.message}</th>
                  <th className="px-3 py-3">{t.sms.error}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-champagne/50 align-top">
                    <td className="px-3 py-3 whitespace-nowrap">{formatInstant(log.createdAt, language)}</td>
                    <td className="px-3 py-3 font-semibold">{log.clientName || "-"}</td>
                    <td className="px-3 py-3">{log.phone || "-"}</td>
                    <td className="px-3 py-3"><ChannelBadge channel={log.channel ?? "sms"} /></td>
                    <td className="px-3 py-3">{typeLabel(log.type)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(log.status)}`}>
                        {statusLabel(log.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3">{log.provider}</td>
                    <td className="px-3 py-3">
                      <p className="max-w-xs whitespace-pre-wrap text-graphite/75">{log.message}</p>
                    </td>
                    <td className="px-3 py-3 text-[#7A342F]">{log.error ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 ? (
            <p className="border-t border-champagne/50 p-5 text-sm text-graphite/65">
              {t.sms.noLogs}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* TEMPLATES */}
      {!loading && tab === "templates" ? (
        <section className="grid gap-4">
          {(data?.templates ?? []).map((template) => (
            <article
              key={template.id}
              className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{template.name}</p>
                  <p className="text-xs text-graphite/55">{typeLabel(template.type)}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={template.enabled}
                    onChange={(event) =>
                      runAction(
                        {
                          action: "updateTemplate",
                          id: template.id,
                          enabled: event.target.checked
                        },
                        t.common.saved
                      )
                    }
                  />
                  {template.enabled ? t.common.enabled : t.common.disabled}
                </label>
              </div>
              <textarea
                className="field-control mt-3 min-h-28"
                value={templateDrafts[template.id] ?? template.body}
                onChange={(event) =>
                  setTemplateDrafts((current) => ({
                    ...current,
                    [template.id]: event.target.value
                  }))
                }
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-graphite/55">
                  {t.sms.availableVariables}: {"{{clientName}} {{date}} {{time}} {{services}} {{discount}} {{customMessage}}"}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    runAction(
                      {
                        action: "updateTemplate",
                        id: template.id,
                        body: templateDrafts[template.id] ?? template.body
                      },
                      t.common.saved
                    )
                  }
                  className="inline-flex min-h-10 items-center rounded-2xl bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t.common.save}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {/* MANUAL SEND */}
      {!loading && tab === "manual" ? (
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="field-control min-h-11 w-auto"
                value={filter}
                onChange={(event) => setFilter(event.target.value as ClientFilter)}
                aria-label={t.sms.filterLabel}
              >
                <option value="all">{t.sms.filterAll}</option>
                <option value="vip">{t.sms.filterVip}</option>
                <option value="active">{t.sms.filterActive}</option>
                <option value="sleeping">{t.sms.filterSleeping}</option>
                <option value="upcoming">{t.sms.filterUpcoming}</option>
                <option value="birthdayWeek">{t.sms.filterBirthdayWeek}</option>
                <option value="birthdayMonth">{t.sms.filterBirthdayMonth}</option>
              </select>
              <input
                className="field-control min-h-11 flex-1"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.clients.searchPlaceholder}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="inline-flex min-h-9 items-center rounded-xl border border-champagne/70 bg-white px-3 text-xs font-semibold text-ink"
              >
                {t.sms.selectAll}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="inline-flex min-h-9 items-center rounded-xl border border-champagne/70 bg-white px-3 text-xs font-semibold text-ink"
              >
                {t.sms.deselectAll}
              </button>
              <span className="inline-flex min-h-9 items-center rounded-xl bg-pearl px-3 text-xs font-semibold text-graphite/70">
                {t.sms.selectedCount}: {selected.size}
              </span>
            </div>
            <div className="mt-3 max-h-[26rem] overflow-y-auto rounded-2xl border border-champagne/50">
              <table className="w-full border-collapse text-left text-sm">
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-champagne/40 first:border-t-0">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(client.id)}
                          onChange={() => toggleSelect(client.id)}
                          aria-label={client.fullName}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold">{client.fullName}</td>
                      <td className="px-3 py-2 text-graphite/70">{client.normalizedPhone}</td>
                      <td className="px-3 py-2">
                        {client.isVip ? (
                          <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-xs font-semibold text-fuchsia-700">
                            VIP
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
            <p className="text-sm text-graphite/70">{t.sms.manualSubtitle}</p>
            <label className="mt-3 block">
              <span className="field-label">{t.sms.chooseType}</span>
              <select
                className="field-control min-h-11"
                value={manualType}
                onChange={(event) => {
                  setManualType(event.target.value as ManualType);
                  setTemplateId("");
                }}
              >
                <option value="loyalty">{t.sms.typeLoyalty}</option>
                <option value="birthday">{t.sms.typeBirthday}</option>
                <option value="custom">{t.sms.typeCustom}</option>
              </select>
            </label>
            <label className="mt-3 block">
              <span className="field-label">{t.sms.chooseTemplate}</span>
              <select
                className="field-control min-h-11"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">{t.sms.typeCustom}</option>
                {(data?.templates ?? []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            {manualType === "birthday" ? (
              <label className="mt-3 block">
                <span className="field-label">{t.sms.discount}</span>
                <input
                  className="field-control min-h-11"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  placeholder="10%"
                />
              </label>
            ) : null}
            <label className="mt-3 block">
              <span className="field-label">{t.sms.customMessage}</span>
              <textarea
                className="field-control min-h-24"
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
                placeholder={t.sms.customMessageHint}
              />
            </label>

            <div className="mt-3 rounded-2xl bg-pearl p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/55">
                {t.sms.preview}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-graphite/80">
                {previewText || t.sms.previewEmpty}
              </p>
            </div>

            {!runtime?.isMock && !(settings?.smsAutoSendEnabled && runtime?.autoSendEnv) ? (
              <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t.sms.sendDisabledReal}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy || selected.size === 0 || !previewText}
              onClick={() => setConfirmOpen(true)}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t.sms.send} ({selected.size})
            </button>
            {selected.size === 0 ? (
              <p className="mt-2 text-xs text-graphite/55">{t.sms.selectClientsHint}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* SETTINGS */}
      {!loading && tab === "settings" && settings ? (
        <section className="grid gap-4 rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft">
          <label className="flex items-start gap-3 rounded-2xl bg-pearl p-4">
            <input
              type="checkbox"
              className="mt-1"
              // In demo mode there is nothing to switch on: no provider can deliver.
              disabled={Boolean(runtime?.demoMode && !runtime.isMock)}
              checked={settings.smsAutoSendEnabled}
              onChange={(event) =>
                runAction(
                  { action: "updateSettings", smsAutoSendEnabled: event.target.checked },
                  t.common.saved
                )
              }
            />
            <span>
              <span className="block text-sm font-semibold">{t.sms.autoSendEnabled}</span>
              <span className="mt-1 block text-xs text-graphite/60">
                {runtime?.demoMode && !runtime.isMock
                  ? t.sms.demoModeNote
                  : t.sms.autoSendEnabledHint}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl bg-pearl p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.smsReminderEnabled}
              onChange={(event) =>
                runAction(
                  { action: "updateSettings", smsReminderEnabled: event.target.checked },
                  t.common.saved
                )
              }
            />
            <span className="text-sm font-semibold">{t.sms.reminderEnabled}</span>
          </label>

          <div className="rounded-2xl bg-pearl p-4">
            <p className="text-sm font-semibold">{t.sms.reminderOffsets}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {[
                { value: 0, label: t.sms.offsetSameDay },
                { value: 1, label: t.sms.offset1 },
                { value: 2, label: t.sms.offset2 },
                { value: 3, label: t.sms.offset3 }
              ].map((offset) => {
                const active = settings.smsReminderOffsets.includes(offset.value);
                return (
                  <label key={offset.value} className="inline-flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...settings.smsReminderOffsets, offset.value]
                          : settings.smsReminderOffsets.filter((v) => v !== offset.value);
                        runAction(
                          {
                            action: "updateSettings",
                            smsReminderOffsets: Array.from(new Set(next)).sort((a, b) => a - b)
                          },
                          t.common.saved
                        );
                      }}
                    />
                    {offset.label}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-pearl p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.smsBirthdayAutoSendEnabled}
              onChange={(event) =>
                runAction(
                  { action: "updateSettings", smsBirthdayAutoSendEnabled: event.target.checked },
                  t.common.saved
                )
              }
            />
            <span>
              <span className="block text-sm font-semibold">{t.sms.birthdayAutoEnabled}</span>
              <span className="mt-1 block text-xs text-graphite/60">{t.sms.birthdayAutoHint}</span>
            </span>
          </label>
        </section>
      ) : null}

      {/* Confirm modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-6 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl border border-champagne/60 bg-[#F8F3EF] p-6 shadow-premium">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-ink" aria-hidden="true" />
                <h2 className="text-xl font-semibold">{t.sms.confirmTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-champagne/70 bg-white text-ink"
                aria-label={t.common.close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-4 text-sm text-graphite/75">{t.sms.confirmText}</p>
            <p className="mt-2 text-sm font-semibold">
              {t.sms.recipients}: {selected.size}
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm text-graphite/80">
              {previewText}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-champagne/70 bg-white text-sm font-semibold text-ink"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitManualSend}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t.sms.send}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

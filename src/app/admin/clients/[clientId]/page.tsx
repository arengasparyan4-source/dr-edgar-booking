"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Download,
  FileArchive,
  Mail,
  MapPin,
  Pencil,
  Pin,
  Phone,
  Plus,
  Star,
  Trash2
} from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import BookingDetailsDrawer, {
  type BookingDetailsAction
} from "@/components/admin/BookingDetailsDrawer";
import BookingStatusBadge from "@/components/admin/BookingStatusBadge";
import ClientEditorModal from "@/components/admin/ClientEditorModal";
import ClientPhotosGallery from "@/components/admin/ClientPhotosGallery";
import ClientProcedureTable from "@/components/admin/ClientProcedureTable";
import ClientStatusBadge from "@/components/admin/ClientStatusBadge";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { ChannelBadge } from "@/components/ChannelIcon";
import type {
  Booking,
  Client,
  ClientNote,
  ClientPhoto,
  ClientProcedureRecord,
  Service
} from "@/types/domain";
import { formatDate, formatDateTime as formatInstant, formatNumber } from "@/lib/i18n/formatDate";

type TabKey =
  | "overview"
  | "history"
  | "preparations"
  | "notes"
  | "photos"
  | "bookings";

type ApiPayload<T> = T & {
  code?: string;
  error?: string;
  message?: string;
  success?: boolean;
};

const tabs: TabKey[] = [
  "bookings",
  "history",
  "preparations",
  "notes",
  "photos",
  "overview"
];

const displayValue = (value?: string | number) =>
  value === undefined || value === "" ? "-" : String(value);

const formatMoney = (value: number | undefined, amd: string) =>
  value === undefined ? "-" : `${formatNumber(value)} ${amd}`;

const clientExportHref = (
  clientId: string,
  format: "excel" | "access",
  range = "all"
) => `/api/admin/clients/${clientId}/export/${format}?range=${range}`;

const readApiJson = async <T,>(response: Response): Promise<ApiPayload<T>> => {
  try {
    return (await response.json()) as ApiPayload<T>;
  } catch {
    return {} as ApiPayload<T>;
  }
};

export default function AdminClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { language, t } = useLanguage();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [records, setRecords] = useState<ClientProcedureRecord[]>([]);
  const [photos, setPhotos] = useState<ClientPhoto[]>([]);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("bookings");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loadingAction, setLoadingAction] = useState("");
  const [notes, setNotes] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [notePinned, setNotePinned] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const clientIdParam = params.clientId;
  const clientId = Array.isArray(clientIdParam) ? clientIdParam[0] : clientIdParam;

  const loadData = useCallback(async () => {
    if (!clientId) {
      return;
    }

    setLoading(true);
    try {
      const [
        clientResponse,
        bookingsResponse,
        recordsResponse,
        photosResponse,
        notesResponse,
        servicesResponse
      ] =
        await Promise.all([
          adminFetch(`/api/admin/clients/${clientId}`),
          adminFetch("/api/admin/bookings"),
          adminFetch(`/api/admin/clients/${clientId}/procedures`),
          adminFetch(`/api/admin/clients/${clientId}/photos`),
          adminFetch(`/api/admin/clients/${clientId}/notes`),
          adminFetch("/api/admin/services")
        ]);

      const clientData = await readApiJson<{ client?: Client }>(clientResponse);

      if (clientResponse.status === 404 && clientData.code === "client_not_found") {
        setClient(null);
        setBookings([]);
        setRecords([]);
        setPhotos([]);
        setClientNotes([]);
        setServices([]);
        return;
      }

      if (!clientResponse.ok || !clientData.client) {
        throw new Error(translateApiError(clientData, t));
      }

      const [
        bookingsData,
        recordsData,
        photosData,
        notesData,
        servicesData
      ] =
        await Promise.all([
          readApiJson<{ bookings?: Booking[] }>(bookingsResponse),
          readApiJson<{ records?: ClientProcedureRecord[] }>(recordsResponse),
          readApiJson<{ photos?: ClientPhoto[] }>(photosResponse),
          readApiJson<{ notes?: ClientNote[] }>(notesResponse),
          readApiJson<{ services?: Service[] }>(servicesResponse)
        ]);
      setClient(clientData.client ?? null);
      setNotes(clientData.client?.notes ?? "");
      setBookings(bookingsResponse.ok ? bookingsData.bookings ?? [] : []);
      setRecords(recordsResponse.ok ? recordsData.records ?? [] : []);
      setPhotos(photosResponse.ok ? photosData.photos ?? [] : []);
      setClientNotes(notesResponse.ok ? notesData.notes ?? [] : []);
      setServices(servicesResponse.ok ? servicesData.services ?? [] : []);
    } catch {
      setClient(null);
      setBookings([]);
      setRecords([]);
      setPhotos([]);
      setClientNotes([]);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const linkedBookings = useMemo(() => {
    if (!client) {
      return [];
    }

    return bookings
      .filter(
        (booking) =>
          booking.clientId === client.id ||
          booking.phone === client.normalizedPhone ||
          booking.phone === client.phone
      )
      .sort((a, b) =>
        `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
      );
  }, [bookings, client]);

  const preparations = useMemo(
    () =>
      records
        .filter((record) => record.preparationName)
        .sort((a, b) => `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`)),
    [records]
  );

  const tabLabels: Record<TabKey, string> = {
    overview: t.clients.overview,
    history: t.clients.history,
    preparations: t.clients.preparations,
    notes: t.clients.notes,
    photos: t.clients.photos,
    bookings: t.clients.bookings
  };

  const saveNotes = async () => {
    if (!client) {
      return;
    }

    setNotesSaving(true);
    setNotice(null);
    try {
      const response = await adminFetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      setClient(data.client);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    } finally {
      setNotesSaving(false);
    }
  };

  const addStructuredNote = async () => {
    if (!client || !noteDraft.trim()) {
      return;
    }

    setNotesSaving(true);
    setNotice(null);
    try {
      const response = await adminFetch(`/api/admin/clients/${client.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteDraft, pinned: notePinned })
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setClientNotes((current) => [data.note, ...current]);
      setNoteDraft("");
      setNotePinned(false);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    } finally {
      setNotesSaving(false);
    }
  };

  const updateStructuredNote = async (
    note: ClientNote,
    patch: Partial<Pick<ClientNote, "text" | "pinned">>
  ) => {
    if (!client) {
      return;
    }

    setNotice(null);
    try {
      const response = await adminFetch(
        `/api/admin/clients/${client.id}/notes/${note.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        }
      );
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setClientNotes((current) =>
        current
          .map((item) => (item.id === data.note.id ? data.note : item))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) {
              return a.pinned ? -1 : 1;
            }

            return `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`);
          })
      );
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const editStructuredNote = (note: ClientNote) => {
    const nextText = window.prompt(t.clients.notes, note.text);
    if (nextText === null || !nextText.trim()) {
      return;
    }

    void updateStructuredNote(note, { text: nextText });
  };

  const deleteStructuredNote = async (note: ClientNote) => {
    if (!client || !window.confirm(t.clients.confirmDelete)) {
      return;
    }

    setNotice(null);
    try {
      const response = await adminFetch(
        `/api/admin/clients/${client.id}/notes/${note.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setClientNotes((current) => current.filter((item) => item.id !== note.id));
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const runBookingAction = async (
    bookingId: string,
    action: BookingDetailsAction,
    extra = {}
  ) => {
    setLoadingAction(`${bookingId}:${action}`);
    setNotice(null);
    try {
      const response = await adminFetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, ...extra })
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      if (data.booking) {
        setBookings((current) =>
          current.map((booking) =>
            booking.id === data.booking.id ? data.booking : booking
          )
        );
        setSelectedBooking(data.booking);
      }

      setNotice({
        type: data.warnings?.length ? "error" : "success",
        text: data.warnings?.length ? data.warnings.join(", ") : t.common.saved
      });
      await loadData();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    } finally {
      setLoadingAction("");
    }
  };

  const createHistoryFromBooking = async (booking: Booking) => {
    if (!client) {
      return;
    }

    setNotice(null);
    try {
      const response = await adminFetch(
        `/api/admin/clients/${client.id}/procedures/from-booking`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id })
        }
      );
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setRecords(data.records ?? []);
      setActiveTab("history");
      setSelectedBooking(null);
      setNotice({ type: "success", text: t.clients.procedureSaved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  return (
    <AdminShell title={t.clients.clientProfile} subtitle={client?.fullName}>
      <button type="button" onClick={() => router.push("/admin/clients")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 text-sm font-semibold text-ink shadow-soft transition hover:bg-pearl">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t.clients.backToClients}
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

      {loading ? (
        <section className="rounded-3xl border border-champagne/60 bg-white/86 p-8 text-sm text-graphite shadow-soft">{t.common.loading}</section>
      ) : !client ? (
        <section className="rounded-3xl border border-champagne/60 bg-white/86 p-8 text-sm text-graphite shadow-soft">{t.clients.noClients}</section>
      ) : (
        <>
          <section className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ClientStatusBadge client={client} />
                  {client.isVip ? <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700"><Star className="h-3.5 w-3.5" />{t.clients.vip}</span> : null}
                  {client.isBlacklisted ? <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800"><Ban className="h-3.5 w-3.5" />{t.clients.blacklist}</span> : null}
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-ink">{client.fullName}</h1>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-graphite">
                  <a href={`tel:${client.normalizedPhone}`} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-champagne/70 bg-pearl px-3 font-semibold text-ink"><Phone className="h-4 w-4" />{client.phone}</a>
                  <span className="inline-flex min-h-10 items-center gap-2" title={t.channels.title} data-testid="client-header-channel"><ChannelBadge channel={client.preferredChannel ?? "sms"} /></span>
                  {client.email ? <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-champagne/70 bg-pearl px-3"><Mail className="h-4 w-4" />{client.email}</span> : null}
                  {client.address ? <span className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-champagne/70 bg-pearl px-3"><MapPin className="h-4 w-4" />{client.address}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => router.push(`/admin/calendar?clientId=${client.id}`)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-white"><CalendarDays className="h-4 w-4" />{t.clients.addBooking}</button>
                <a href={clientExportHref(client.id, "excel")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800"><Download className="h-4 w-4" />{t.clients.exportExcel}</a>
                <a href={clientExportHref(client.id, "access")} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 text-sm font-semibold text-ink"><FileArchive className="h-4 w-4" />{t.clients.exportAccess}</a>
                <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-champagne/70 bg-white px-4 text-sm font-semibold text-ink"><Pencil className="h-4 w-4" />{t.clients.editClientCard}</button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              [t.clients.bookings, linkedBookings.length],
              [t.clients.visitsCount, client.visitsCount ?? records.length],
              [t.clients.balance, formatMoney(client.balance, t.common.amd)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/60">{label}</span>
                <strong className="mt-3 block text-3xl font-semibold text-ink">{value}</strong>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-champagne/60 bg-white/86 p-4 shadow-soft">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button type="button" key={tab} onClick={() => setActiveTab(tab)} className={`min-h-11 shrink-0 rounded-2xl px-4 text-sm font-semibold transition ${activeTab === tab ? "bg-ink text-white" : "border border-champagne/70 bg-white text-graphite hover:bg-pearl"}`}>
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {activeTab === "overview" ? (
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-champagne/55 bg-pearl/45 p-4" data-testid="client-channel">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/55">{t.channels.title}</span>
                      <span className="mt-2 block"><ChannelBadge channel={client.preferredChannel ?? "sms"} /></span>
                    </div>
                    {[
                      [t.clients.phone, client.phone],
                      [t.clients.email, client.email],
                      [t.clients.birthDate, client.birthDate ? formatDate(client.birthDate, language) : undefined],
                      [t.clients.address, client.address],
                      [t.clients.balance, formatMoney(client.balance, t.common.amd)],
                      [t.clients.discount, client.discount],
                      [t.clients.source, client.source],
                      [t.clients.createdAt, formatInstant(client.createdAt, language)],
                      [t.clients.updatedAt, formatInstant(client.updatedAt, language)]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-champagne/55 bg-pearl/45 p-4">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/55">{label}</span>
                        <strong className="mt-2 block break-words text-sm font-semibold text-ink">{displayValue(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-champagne/55 bg-pearl/45 p-4">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-graphite/55">{t.clients.comment}</span>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-graphite">{displayValue(client.comment)}</p>
                  </div>
                </div>
              ) : null}

              {activeTab === "history" ? (
                <ClientProcedureTable clientId={client.id} services={services} records={records} onChange={setRecords} />
              ) : null}

              {activeTab === "preparations" ? (
                preparations.length ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {preparations.map((record) => (
                      <article key={record.id} className="rounded-2xl border border-champagne/70 bg-pearl/45 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-graphite/55">{formatDate(record.date, language)}</p>
                            <h3 className="mt-1 font-semibold">{record.preparationName}</h3>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                            {record.amount || "-"} {record.unit || ""}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-1 text-sm text-graphite/75">
                          <span>{t.clients.area}: {record.area || "-"}</span>
                          <span>{t.clients.procedures}: {record.serviceName}</span>
                          <span>{t.bookings.bookingId}: {record.bookingId || "-"}</span>
                          <span>{t.clients.comment}: {record.comment || record.doctorNotes || "-"}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : <p className="rounded-2xl border border-dashed border-champagne/80 bg-pearl/45 p-6 text-center text-sm text-graphite">{t.clients.emptyTab}</p>
              ) : null}

              {activeTab === "notes" ? (
                <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                  <section className="rounded-2xl border border-champagne/70 bg-pearl/45 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/55">
                      {t.clients.notes}
                    </p>
                    <textarea className="field-control mt-3 min-h-36" value={notes} onChange={(event) => setNotes(event.target.value)} />
                    <button type="button" onClick={() => void saveNotes()} disabled={notesSaving} className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
                      {notesSaving ? t.common.loading : t.common.save}
                    </button>
                  </section>

                  <section className="rounded-2xl border border-champagne/70 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-graphite/55">
                          {t.clients.crmNotesTitle}
                        </p>
                        <p className="mt-1 text-sm text-graphite/70">
                          {t.clients.crmNotesSubtitle}
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 rounded-2xl border border-champagne/70 bg-pearl px-3 py-2 text-sm font-semibold text-ink">
                        <input type="checkbox" checked={notePinned} onChange={(event) => setNotePinned(event.target.checked)} />
                        {t.clients.importantFlag}
                      </label>
                    </div>

                    <textarea
                      className="field-control mt-4 min-h-24"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={t.clients.addNote}
                    />
                    <button
                      type="button"
                      onClick={() => void addStructuredNote()}
                      disabled={notesSaving || !noteDraft.trim()}
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      {t.clients.addNote}
                    </button>

                    <div className="mt-5 grid gap-3">
                      {clientNotes.length ? (
                        clientNotes.map((note) => (
                          <article key={note.id} className="rounded-2xl border border-champagne/70 bg-pearl/45 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {note.pinned ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                                      <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                                      {t.clients.importantFlag}
                                    </span>
                                  ) : null}
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-graphite/70">
                                    {formatDate(note.date, language)}
                                  </span>
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-graphite/70">
                                    {note.author || "admin"}
                                  </span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-graphite">{note.text}</p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button type="button" onClick={() => void updateStructuredNote(note, { pinned: !note.pinned })} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-champagne/70 bg-white" aria-label={t.clients.pinNote}>
                                  <Pin className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => editStructuredNote(note)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-champagne/70 bg-white" aria-label={t.common.edit}>
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => void deleteStructuredNote(note)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700" aria-label={t.common.delete}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-champagne/80 bg-pearl/45 p-6 text-center text-sm text-graphite">{t.clients.emptyTab}</p>
                      )}
                    </div>
                  </section>
                </div>
              ) : null}

              {activeTab === "photos" ? (
                <ClientPhotosGallery
                  clientId={client.id}
                  photos={photos}
                  onChange={setPhotos}
                />
              ) : null}

              {activeTab === "bookings" ? (
                linkedBookings.length ? (
                  <div className="space-y-3">
                    {linkedBookings.map((booking) => (
                      <button
                        key={booking.id}
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="w-full rounded-2xl border border-champagne/60 bg-pearl/45 p-4 text-left transition hover:border-sage/40 hover:bg-white"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <BookingStatusBadge status={booking.status} />
                              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-champagne/70 bg-white px-3 py-1 text-xs font-semibold text-ink"><CalendarDays className="h-3.5 w-3.5" />{formatDate(booking.date, language)} {booking.startTime} - {booking.endTime}</span>
                              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-champagne/70 bg-white px-3 py-1 text-xs font-semibold text-ink">{booking.totalDurationMinutes} {t.common.minutes}</span>
                              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-champagne/70 bg-white px-3 py-1 text-xs font-semibold text-ink"><Phone className="h-3.5 w-3.5" />{booking.phone}</span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-ink">{booking.servicesSnapshot.map((service) => service.name[language]).join(", ")}</p>
                            {booking.comment ? (
                              <p className="mt-2 text-sm leading-6 text-graphite/70">{booking.comment}</p>
                            ) : null}
                          </div>
                          <div className="text-sm font-semibold text-ink">{formatNumber(booking.totalPrice)} {t.common.amd}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : <p className="rounded-2xl border border-dashed border-champagne/80 bg-pearl/45 p-6 text-center text-sm text-graphite">{t.clients.emptyTab}</p>
              ) : null}
            </div>
          </section>
        </>
      )}

      <BookingDetailsDrawer
        booking={selectedBooking}
        loadingAction={loadingAction}
        services={services}
        onClose={() => setSelectedBooking(null)}
        onRunAction={runBookingAction}
        onCreateHistory={(booking) => void createHistoryFromBooking(booking)}
      />

      {client ? <ClientEditorModal client={client} open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={(updated) => { setClient(updated); setNotes(updated.notes ?? ""); setNotice({ type: "success", text: t.clients.clientSaved }); }} /> : null}
    </AdminShell>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { CheckCircle2, Search, UserRound, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { findClientByPhone, searchClients } from "@/lib/clients/clientSearch";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { clinicToday } from "@/lib/time/clinicTime";
import type { Booking, Client, MessageChannel, Service } from "@/types/domain";
import { ChannelPicker } from "@/components/ChannelIcon";
import { formatNumber } from "@/lib/i18n/formatDate";

type ManualBookingModalProps = {
  open: boolean;
  initialClientId?: string;
  initialDate?: string;
  initialStartTime?: string;
  onClose: () => void;
  onSaved: (booking: Booking) => void;
};

const addMinutes = (time: string, minutes: number) => {
  const [hours, minute] = time.split(":").map(Number);
  const total = hours * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

export default function ManualBookingModal({
  open,
  initialClientId,
  initialDate,
  initialStartTime,
  onClose,
  onSaved
}: ManualBookingModalProps) {
  const { language, t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [matchedByPhone, setMatchedByPhone] = useState(false);
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(initialDate ?? clinicToday());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("10:30");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"pending" | "confirmed">("pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
      setClientId("");
      setFullName("");
      setPhone("");
      setClientQuery("");
      setSuggestionsOpen(false);
      setMatchedByPhone(false);
      setChannel("sms");
      setSelectedServiceIds([]);
      setDate(initialDate ?? clinicToday());
      setStartTime(initialStartTime ?? "10:00");
      setEndTime(addMinutes(initialStartTime ?? "10:00", 30));
      setComment("");
      setStatus("pending");
      void Promise.all([
        adminFetch("/api/admin/clients").then(async (response) => {
          if (!response.ok) {
            throw new Error(t.clients.somethingWentWrong);
          }
          return response.json();
        }),
        adminFetch("/api/admin/services").then(async (response) => {
          if (!response.ok) {
            throw new Error(t.clients.somethingWentWrong);
          }
          return response.json();
        })
      ]).then(([clientsData, servicesData]) => {
        const loadedClients = (clientsData.clients ?? []) as Client[];
        setClients(loadedClients);
        setServices((servicesData.services ?? []).filter((service: Service) => service.active));

        if (initialClientId) {
          const initialClient = loadedClients.find((client) => client.id === initialClientId);
          if (initialClient) {
            setClientId(initialClient.id);
            setFullName(initialClient.fullName);
            setPhone(initialClient.phone);
            setChannel(initialClient.preferredChannel ?? "sms");
          }
        }
      }).catch((error) => {
        setError(error instanceof Error ? error.message : t.clients.somethingWentWrong);
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialClientId, initialDate, initialStartTime, open, t.clients.somethingWentWrong]);

  const durationMinutes = useMemo(
    () =>
      services
        .filter((service) => selectedServiceIds.includes(service.id))
        .reduce((sum, service) => sum + service.durationMinutes, 0),
    [selectedServiceIds, services]
  );

  if (!open) {
    return null;
  }

  const selectedClient = clients.find((client) => client.id === clientId) ?? null;
  const suggestions = clientQuery.trim() ? searchClients(clients, clientQuery) : [];

  const selectClient = (client: Client, byPhone = false) => {
    setClientId(client.id);
    setFullName(client.fullName);
    setPhone(client.phone || client.normalizedPhone);
    setClientQuery("");
    setSuggestionsOpen(false);
    setMatchedByPhone(byPhone);
    setChannel(client.preferredChannel ?? "sms");
  };

  const clearClient = () => {
    setClientId("");
    setFullName("");
    setPhone("");
    setMatchedByPhone(false);
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  // Typing a phone that already belongs to a client picks that client, so a
  // manual booking never creates a second card for the same number.
  const changePhone = (value: string) => {
    setPhone(value);
    const existing = findClientByPhone(clients, value);

    if (existing && existing.id !== clientId) {
      selectClient(existing, true);
      setPhone(value);
    } else if (!existing && clientId) {
      setClientId("");
      setMatchedByPhone(false);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSuggestionsOpen(true);
      setHighlightedIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectClient(suggestions[Math.min(highlightedIndex, suggestions.length - 1)]);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
    }
  };

  const toggleService = (serviceId: string) => {
    const next = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];
    const nextDuration = services
      .filter((service) => next.includes(service.id))
      .reduce((sum, service) => sum + service.durationMinutes, 0);
    setSelectedServiceIds(next);
    setEndTime(addMinutes(startTime, nextDuration || 30));
  };

  const saveBooking = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await adminFetch("/api/admin/bookings/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          fullName,
          phone,
          selectedServiceIds,
          date,
          startTime,
          endTime,
          comment,
          status,
          preferredChannel: channel
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onSaved(data.booking);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.clients.somethingWentWrong
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-champagne/60 bg-[#F8F3EF] p-5 shadow-premium sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">{t.calendar.addBooking}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-champagne/70 bg-white" aria-label={t.common.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {selectedClient ? (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl border border-champagne/70 bg-white p-3"
                data-testid="manual-booking-selected-client"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pearl">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-graphite/60">{t.calendar.selectedClient}</p>
                    <p className="truncate font-semibold">{selectedClient.fullName}</p>
                    <p className="text-xs text-graphite/60">
                      {selectedClient.normalizedPhone}
                      {selectedClient.visitsCount ? ` · ${selectedClient.visitsCount} ${t.calendar.visits}` : ""}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={clearClient} className="min-h-10 shrink-0 rounded-2xl border border-champagne/70 bg-white px-3 text-sm font-semibold">
                  {t.calendar.changeClient}
                </button>
              </div>
            ) : (
              <div className="relative">
                <label>
                  <span className="field-label">{t.calendar.searchClient}</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite/50" aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      className="field-control pl-9"
                      value={clientQuery}
                      placeholder={t.calendar.searchClientPlaceholder}
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={suggestionsOpen && clientQuery.trim().length > 0}
                      aria-controls="manual-booking-client-suggestions"
                      data-testid="manual-booking-client-search"
                      onChange={(event) => {
                        setClientQuery(event.target.value);
                        setSuggestionsOpen(true);
                        setHighlightedIndex(0);
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
                      onKeyDown={onSearchKeyDown}
                    />
                  </span>
                </label>
                {suggestionsOpen && clientQuery.trim() ? (
                  <ul
                    id="manual-booking-client-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-champagne/70 bg-white p-1 shadow-premium"
                  >
                    {suggestions.length ? (
                      suggestions.map((client, index) => (
                        <li key={client.id} role="option" aria-selected={index === highlightedIndex}>
                          <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectClient(client)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`flex min-h-11 w-full flex-col rounded-xl px-3 py-2 text-left text-sm ${
                              index === highlightedIndex ? "bg-pearl" : ""
                            }`}
                          >
                            <span className="font-semibold">{client.fullName}</span>
                            <span className="text-xs text-graphite/60">{client.normalizedPhone}</span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-sm text-graphite/70">{t.calendar.noClientsFound}</li>
                    )}
                  </ul>
                ) : null}
                <p className="mt-2 text-xs text-graphite/60">{t.calendar.newClientHint}</p>
              </div>
            )}
            {matchedByPhone && selectedClient ? (
              <p className="mt-2 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700" data-testid="manual-booking-phone-match">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.calendar.clientFoundByPhone}
              </p>
            ) : null}
          </div>
          {selectedClient ? null : (
            <>
          <label>
            <span className="field-label">{t.clients.fullName}</span>
            <input className="field-control" value={fullName} onChange={(event) => setFullName(event.target.value)} data-testid="manual-booking-full-name" />
          </label>
          <label>
            <span className="field-label">{t.clients.phone}</span>
            <input className="field-control" type="tel" inputMode="tel" value={phone} onChange={(event) => changePhone(event.target.value)} data-testid="manual-booking-phone" />
          </label>
            </>
          )}
          <label>
            <span className="field-label">{t.calendar.date}</span>
            <input type="date" className="field-control" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="field-label">{t.calendar.time}</span>
              <input type="time" className="field-control" value={startTime} onChange={(event) => {
                setStartTime(event.target.value);
                setEndTime(addMinutes(event.target.value, durationMinutes || 30));
              }} />
            </label>
            <label>
              <span className="field-label">{t.calendar.endTime}</span>
              <input type="time" className="field-control" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="field-label">{t.calendar.service}</legend>
            <div className="grid gap-2 rounded-2xl border border-champagne/70 bg-white p-3 sm:grid-cols-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-start gap-2 rounded-xl px-2 py-2 text-sm hover:bg-pearl">
                  <input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={() => toggleService(service.id)} />
                  <span>
                    <strong className="block">{service.name[language]}</strong>
                    <span className="text-xs text-graphite/60">{service.durationMinutes} {t.common.minutes} / {formatNumber(service.price)} {t.common.amd}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="sm:col-span-2" data-testid="manual-booking-channel">
            <legend className="field-label">{t.channels.title}</legend>
            <p className="-mt-1 mb-2 text-xs text-graphite/60">{t.channels.hint}</p>
            <ChannelPicker value={channel} onChange={setChannel} name="manual-channel" />
          </fieldset>
          <label className="sm:col-span-2">
            <span className="field-label">{t.clients.comment}</span>
            <textarea className="field-control min-h-20" value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.status}</span>
            <select className="field-control" value={status} onChange={(event) => setStatus(event.target.value as "pending" | "confirmed")}>
              <option value="pending">{t.calendar.pendingConfirmation}</option>
              <option value="confirmed">{t.calendar.confirmed}</option>
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-[#9E433D]">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-champagne/70 bg-white px-5 text-sm font-semibold">
            {t.common.cancel}
          </button>
          <button type="button" disabled={saving} onClick={saveBooking} className="min-h-11 rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </section>
    </div>
  );
}

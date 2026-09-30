"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { Client, ClientStatus, MessageChannel } from "@/types/domain";
import { ChannelPicker } from "@/components/ChannelIcon";

type ClientEditorModalProps = {
  client?: Client | null;
  open: boolean;
  onClose: () => void;
  onSaved: (client: Client) => void;
};

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  address: "",
  comment: "",
  notes: "",
  balance: "",
  discount: "",
  status: "active" as ClientStatus,
  isVip: false,
  isBlacklisted: false,
  preferredChannel: "sms" as MessageChannel
};

export default function ClientEditorModal({
  client,
  open,
  onClose,
  onSaved
}: ClientEditorModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
      setForm(
        client
          ? {
            fullName: client.fullName,
            phone: client.phone,
            email: client.email ?? "",
            birthDate: client.birthDate ?? "",
            address: client.address ?? "",
            comment: client.comment ?? "",
            notes: client.notes ?? "",
            balance: client.balance?.toString() ?? "",
            discount: client.discount?.toString() ?? "",
            status: client.status,
            isVip: client.isVip,
            isBlacklisted: client.isBlacklisted,
            preferredChannel: client.preferredChannel ?? "sms"
          }
          : emptyForm
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [client, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, saving]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const saveClient = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await adminFetch(
        client ? `/api/admin/clients/${client.id}` : "/api/admin/clients",
        {
          method: client ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onSaved(data.client);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t.clients.somethingWentWrong
      );
    } finally {
      setSaving(false);
    }
  };

  const update = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end bg-ink/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={client ? t.clients.editClientCard : t.clients.addClient}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-champagne/60 bg-[#F8F3EF] p-5 shadow-premium sm:max-w-3xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">
            {client ? t.clients.editClientCard : t.clients.addClient}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-champagne/70 bg-white"
            aria-label={t.common.close}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">{t.clients.fullName}</span>
            <input className="field-control" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.phone}</span>
            <input className="field-control" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.email}</span>
            <input className="field-control" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.birthDate}</span>
            <input type="date" className="field-control" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.address}</span>
            <input className="field-control" value={form.address} onChange={(event) => update("address", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.status}</span>
            <select className="field-control" value={form.status} onChange={(event) => update("status", event.target.value as ClientStatus)}>
              {([
                ["active", t.clients.active],
                ["sleeping", t.clients.sleeping],
                ["lost", t.clients.lost],
                ["new", t.clients.newClient],
                ["vip", t.clients.vip],
                ["blacklist", t.clients.blacklist],
                ["inactive", t.clients.inactive]
              ] as [ClientStatus, string][]).map(([status, label]) => (
                <option key={status} value={status}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t.clients.balance}</span>
            <input type="number" className="field-control" value={form.balance} onChange={(event) => update("balance", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.discount}</span>
            <input type="number" className="field-control" value={form.discount} onChange={(event) => update("discount", event.target.value)} />
          </label>
          <fieldset className="sm:col-span-2" data-testid="client-editor-channel">
            <legend className="field-label">{t.channels.title}</legend>
            <p className="-mt-1 mb-2 text-xs text-graphite/60">{t.channels.hint}</p>
            <ChannelPicker
              value={form.preferredChannel}
              onChange={(channel) => update("preferredChannel", channel)}
              name="client-channel"
            />
          </fieldset>
          <label className="sm:col-span-2">
            <span className="field-label">{t.clients.comment}</span>
            <textarea className="field-control min-h-24" value={form.comment} onChange={(event) => update("comment", event.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">{t.clients.notes}</span>
            <textarea className="field-control min-h-24" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isVip} onChange={(event) => update("isVip", event.target.checked)} />
            {t.clients.vip}
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isBlacklisted} onChange={(event) => update("isBlacklisted", event.target.checked)} />
            {t.clients.blacklist}
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-[#9E433D]">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-champagne/70 bg-white px-5 text-sm font-semibold">
            {t.common.cancel}
          </button>
          <button type="button" disabled={saving} onClick={saveClient} className="min-h-11 rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}

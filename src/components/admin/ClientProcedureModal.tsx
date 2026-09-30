"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { adminFetch } from "@/lib/admin/adminFetch";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import {
  findServiceForProcedure,
  getLocalizedServiceName
} from "@/lib/services/serviceName";
import type {
  ClientProcedureRecord,
  ClientProcedureUnit,
  Service
} from "@/types/domain";

type ClientProcedureModalProps = {
  clientId: string;
  open: boolean;
  services: Service[];
  record?: ClientProcedureRecord | null;
  onClose: () => void;
  onSaved: (record: ClientProcedureRecord) => void;
};

const createEmptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  serviceId: "",
  serviceName: "",
  preparationName: "",
  amount: "",
  unit: "ml" as ClientProcedureUnit,
  area: "",
  price: "",
  comment: "",
  doctorNotes: "",
  bookingId: ""
});

export default function ClientProcedureModal({
  clientId,
  open,
  services,
  record,
  onClose,
  onSaved
}: ClientProcedureModalProps) {
  const { language, t } = useLanguage();
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const selectedService = record
        ? findServiceForProcedure(
          services,
          record.serviceId,
          record.serviceName,
          language
        )
        : null;

      setError("");
      setForm(
        record
          ? {
            date: record.date,
            serviceId: selectedService?.id ?? "",
            serviceName: selectedService
              ? getLocalizedServiceName(selectedService, language)
              : record.serviceName,
            preparationName: record.preparationName ?? "",
            amount: record.amount ?? "",
            unit: record.unit ?? "ml",
            area: record.area ?? "",
            price: record.price?.toString() ?? "",
            comment: record.comment ?? "",
            doctorNotes: record.doctorNotes ?? "",
            bookingId: record.bookingId ?? ""
            }
          : createEmptyForm()
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [language, open, record, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId) ?? null,
    [form.serviceId, services]
  );
  const serviceOptions = useMemo(() => {
    const activeServices = services.filter((service) => service.active);

    if (!selectedService || selectedService.active) {
      return activeServices;
    }

    return [
      selectedService,
      ...activeServices.filter((service) => service.id !== selectedService.id)
    ];
  }, [selectedService, services]);
  const noServicesMessage = t.clients.noServicesFound;
  const selectServiceMessage = t.clients.selectService;

  if (!open) {
    return null;
  }

  const update = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateService = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);

    setForm((current) => ({
      ...current,
      serviceId,
      serviceName: service ? getLocalizedServiceName(service, language) : ""
    }));
  };

  const saveRecord = async () => {
    const service = services.find((item) => item.id === form.serviceId);

    if (!service) {
      setError(serviceOptions.length ? selectServiceMessage : noServicesMessage);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = record
        ? `/api/admin/clients/${clientId}/procedures/${record.id}`
        : `/api/admin/clients/${clientId}/procedures`;
      const response = await adminFetch(url, {
        method: record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceId: service.id,
          serviceName: getLocalizedServiceName(service, language)
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(translateApiError(data, t));
      }

      onSaved(data.record);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save procedure"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-champagne/60 bg-[#F8F3EF] p-5 shadow-premium sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold">{t.clients.addProcedure}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-champagne/70 bg-white" aria-label={t.common.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">{t.clients.date}</span>
            <input type="date" className="field-control" value={form.date} onChange={(event) => update("date", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.bookings.services}</span>
            <select className="field-control" value={form.serviceId} disabled={!serviceOptions.length} onChange={(event) => updateService(event.target.value)}>
              <option value="">{serviceOptions.length ? selectServiceMessage : noServicesMessage}</option>
              {serviceOptions.map((service) => (
                <option key={service.id} value={service.id}>
                  {getLocalizedServiceName(service, language)}
                </option>
              ))}
            </select>
            {!serviceOptions.length ? (
              <p className="mt-2 text-sm font-semibold text-[#9E433D]">{noServicesMessage}</p>
            ) : null}
          </label>
          <label>
            <span className="field-label">{t.clients.preparation}</span>
            <input className="field-control" value={form.preparationName} onChange={(event) => update("preparationName", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.area}</span>
            <input className="field-control" value={form.area} onChange={(event) => update("area", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.amount}</span>
            <input className="field-control" value={form.amount} onChange={(event) => update("amount", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.clients.unit}</span>
            <select className="field-control" value={form.unit} onChange={(event) => update("unit", event.target.value as ClientProcedureUnit)}>
              {(["ml", "g", "unit", "other"] as ClientProcedureUnit[]).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t.clients.price}</span>
            <input type="number" className="field-control" value={form.price} onChange={(event) => update("price", event.target.value)} />
          </label>
          <label>
            <span className="field-label">{t.bookings.bookingId}</span>
            <input className="field-control" value={form.bookingId} onChange={(event) => update("bookingId", event.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">{t.clients.comment}</span>
            <textarea className="field-control min-h-20" value={form.comment} onChange={(event) => update("comment", event.target.value)} />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">{t.clients.doctorNotes}</span>
            <textarea className="field-control min-h-20" value={form.doctorNotes} onChange={(event) => update("doctorNotes", event.target.value)} />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-semibold text-[#9E433D]">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-2xl border border-champagne/70 bg-white px-5 text-sm font-semibold">
            {t.common.cancel}
          </button>
          <button type="button" disabled={saving || !selectedService} onClick={saveRecord} className="min-h-11 rounded-2xl bg-ink px-5 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </section>
    </div>
  );
}

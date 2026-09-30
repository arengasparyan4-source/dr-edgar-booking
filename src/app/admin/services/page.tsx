"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import ServiceCategoryBadge, { SERVICE_CATEGORY_COLORS } from "@/components/admin/ServiceCategoryBadge";
import { translateApiError } from "@/lib/i18n/apiError";
import { useLanguage } from "@/lib/i18n/useLanguage";
import type { Service } from "@/types/domain";
import { formatNumber } from "@/lib/i18n/formatDate";

const emptyService: Service = {
  id: "",
  category: "consultation",
  name: { hy: "", ru: "", en: "" },
  description: { hy: "", ru: "", en: "" },
  durationMinutes: 30,
  price: 0,
  active: true
};

export default function AdminServicesPage() {
  const { language, languageOptions, t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [draft, setDraft] = useState<Service>(emptyService);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadServices = () => {
    adminFetch("/api/admin/services")
      .then((response) => response.json())
      .then((data) => setServices(data.services ?? []))
      .catch(() => setServices([]));
  };

  useEffect(loadServices, []);

  const saveService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    try {
      const response = await adminFetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setDraft(emptyService);
      setServices(data.services ?? []);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    setNotice(null);
    try {
      const response = await adminFetch(`/api/admin/services?id=${encodeURIComponent(serviceId)}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok || data.success !== true) {
        throw new Error(translateApiError(data, t));
      }

      setServices(data.services ?? []);
      setNotice({ type: "success", text: t.common.saved });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : t.clients.somethingWentWrong
      });
    }
  };

  return (
    <AdminShell title={t.services.title} subtitle={t.services.subtitle}>
      <form
        onSubmit={saveService}
        className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
      >
        <h2 className="text-xl font-semibold">
          {draft.id ? t.services.editService : t.services.addService}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">{t.services.category}</span>
            <select
              className="field-control min-h-12"
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
              required
            >
              {Object.keys(SERVICE_CATEGORY_COLORS).map((category) => (
                <option key={category} value={category}>
                  {t.categories[category as keyof typeof SERVICE_CATEGORY_COLORS]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">{t.services.durationMinutes}</span>
            <input
              className="field-control min-h-12"
              type="number"
              value={draft.durationMinutes}
              onChange={(event) =>
                setDraft({ ...draft, durationMinutes: Number(event.target.value) })
              }
              required
            />
          </label>
          <label>
            <span className="field-label">{t.services.priceAmd}</span>
            <input
              className="field-control min-h-12"
              type="number"
              value={draft.price}
              onChange={(event) =>
                setDraft({ ...draft, price: Number(event.target.value) })
              }
              required
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl bg-pearl p-4">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(event) =>
                setDraft({ ...draft, active: event.target.checked })
              }
            />
            <span className="text-sm font-semibold">{t.services.active}</span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {languageOptions.map((option) => (
            <div key={option.code} className="rounded-2xl bg-pearl p-4">
              <label>
                <span className="field-label">
                  {t.services.name} ({option.shortLabel})
                </span>
                <input
                  className="field-control min-h-12"
                  value={draft.name[option.code]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      name: { ...draft.name, [option.code]: event.target.value }
                    })
                  }
                  required
                />
              </label>
              <label className="mt-3 block">
                <span className="field-label">
                  {t.services.description} ({option.shortLabel})
                </span>
                <textarea
                  className="field-control min-h-24"
                  value={draft.description[option.code]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      description: {
                        ...draft.description,
                        [option.code]: event.target.value
                      }
                    })
                  }
                  required
                />
              </label>
            </div>
          ))}
        </div>

        <button className="mt-5 min-h-12 rounded-2xl bg-ink px-6 py-3 text-sm font-semibold text-white">
          {t.services.save}
        </button>
      </form>

      {notice ? (
        <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {notice.text}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{service.name[language]}</p>
                <div className="mt-2">
                  <ServiceCategoryBadge category={service.category} />
                </div>
              </div>
              <span className="rounded-full bg-pearl px-3 py-1 text-xs font-semibold">
                {service.active ? t.common.active : t.common.inactive}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-graphite/75">
              {service.description[language]}
            </p>
            <p className="mt-3 text-sm font-semibold">
              {service.durationMinutes} {t.common.minutes} · {formatNumber(service.price)} {t.common.amd}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft(service)}
                className="min-h-11 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                {t.common.edit}
              </button>
              <button
                type="button"
                onClick={() => void deleteService(service.id)}
                className="min-h-11 rounded-2xl border border-champagne/70 bg-white px-4 py-2 text-sm font-semibold"
              >
                {t.common.delete}
              </button>
            </div>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

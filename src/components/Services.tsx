"use client";

import { CheckCircle2, Clock, Search, Sparkles } from "lucide-react";
import {
  categoryKeys,
  type CategoryKey,
  type Language,
  translations
} from "@/data/translations";
import type { Service } from "@/types/domain";
import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/i18n/formatDate";

type ServicesProps = {
  language: Language;
  services: Service[];
  selectedServiceIds: string[];
  isFindingSlots: boolean;
  onToggleService: (serviceId: string) => void;
  onFindSlots: () => void;
};

const formatPrice = formatNumber;

export default function Services({
  language,
  services,
  selectedServiceIds,
  isFindingSlots,
  onToggleService,
  onFindSlots
}: ServicesProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const t = translations[language];

  const activeServices = useMemo(
    () => services.filter((service) => service.active),
    [services]
  );
  const filteredServices = useMemo(
    () =>
      activeCategory === "all"
        ? activeServices
        : activeServices.filter((service) => service.category === activeCategory),
    [activeCategory, activeServices]
  );
  const selectedServices = useMemo(
    () =>
      activeServices.filter((service) => selectedServiceIds.includes(service.id)),
    [activeServices, selectedServiceIds]
  );
  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  );
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );

  return (
    <section id="services" className="section-shell">
      <div className="mb-7 max-w-2xl">
        <p className="text-sm font-semibold text-sage">{t.services.title}</p>
        <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
          {t.services.title}
        </h2>
        <p className="mt-3 text-base leading-7 text-graphite/80">
          {t.services.subtitle}
        </p>
      </div>

      <div className="-mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {categoryKeys.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-ink bg-ink text-white shadow-soft"
                  : "border-champagne/70 bg-white/72 text-graphite hover:border-ink/30 hover:bg-white"
              }`}
            >
              {t.services.categories[category]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => {
          const isSelected = selectedServiceIds.includes(service.id);

          return (
            <article
              key={service.id}
              className={`rounded-2xl border bg-white/82 p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-premium ${
                isSelected
                  ? "border-ink ring-4 ring-blush/20"
                  : "border-champagne/55"
              }`}
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <span className="rounded-full bg-pearl px-3 py-1 text-xs font-semibold text-graphite">
                  {t.services.categories[service.category as CategoryKey] ??
                    service.category}
                </span>
                <Sparkles className="h-5 w-5 text-blush" aria-hidden="true" />
              </div>
              <h3 className="min-h-14 text-xl font-semibold leading-tight text-ink">
                {service.name[language]}
              </h3>
              <p className="mt-3 min-h-16 text-sm leading-6 text-graphite/75">
                {service.description[language]}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3 text-sm text-graphite">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {service.durationMinutes} {t.common.minutes}
                </span>
                <span className="font-semibold text-ink">
                  {formatPrice(service.price)} {t.common.amd}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleService(service.id)}
                data-testid={`service-toggle-${service.id}`}
                className={`mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-sage text-white"
                    : "bg-ink text-white hover:bg-clinic"
                }`}
              >
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                ) : null}
                {isSelected ? t.common.selected : t.common.select}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-champagne/60 bg-premium-surface p-5 shadow-premium sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-sage">
              {t.services.selectedTitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedServices.length ? (
                selectedServices.map((service) => (
                  <span
                    key={service.id}
                    className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm"
                  >
                    {service.name[language]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-graphite/70">
                  {t.services.emptySelection}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-80">
            <div className="rounded-2xl bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-graphite/55">
                {t.common.duration}
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {totalDuration} {t.common.minutes}
              </p>
            </div>
            <div className="rounded-2xl bg-white/76 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-graphite/55">
                {t.common.price}
              </p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {formatPrice(totalPrice)} {t.common.amd}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onFindSlots}
          disabled={!selectedServiceIds.length || isFindingSlots}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-4 text-sm font-semibold text-white shadow-soft transition hover:bg-clinic disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          {isFindingSlots ? t.services.findingSlots : t.services.findSlots}
        </button>
      </div>
    </section>
  );
}

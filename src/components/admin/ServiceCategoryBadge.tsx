"use client";

import type { Service } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";

export const SERVICE_CATEGORY_COLORS = {
  consultation: {
    color: "gray",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
    cardClass: "border-l-slate-400"
  },
  fillers: {
    color: "rose",
    dotClass: "bg-rose-400",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    cardClass: "border-l-rose-400"
  },
  lips: {
    color: "pink",
    dotClass: "bg-pink-400",
    badgeClass: "border-pink-200 bg-pink-50 text-pink-700",
    cardClass: "border-l-pink-400"
  },
  botox: {
    color: "sky",
    dotClass: "bg-sky-400",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    cardClass: "border-l-sky-400"
  },
  biorevitalization: {
    color: "violet",
    dotClass: "bg-violet-400",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    cardClass: "border-l-violet-400"
  },
  collagen: {
    color: "amber",
    dotClass: "bg-amber-400",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
    cardClass: "border-l-amber-400"
  },
  ultraformer: {
    color: "yellow",
    dotClass: "bg-yellow-400",
    badgeClass: "border-yellow-200 bg-yellow-50 text-yellow-800",
    cardClass: "border-l-yellow-400"
  },
  mesotherapy: {
    color: "emerald",
    dotClass: "bg-emerald-400",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    cardClass: "border-l-emerald-400"
  },
  skincare: {
    color: "green",
    dotClass: "bg-green-400",
    badgeClass: "border-green-200 bg-green-50 text-green-700",
    cardClass: "border-l-green-400"
  }
} as const;

export type ServiceCategoryKey = keyof typeof SERVICE_CATEGORY_COLORS;

export const getCategoryMeta = (category?: string) =>
  SERVICE_CATEGORY_COLORS[category as ServiceCategoryKey] ??
  SERVICE_CATEGORY_COLORS.consultation;

export const getPrimaryService = (services: Service[]) => services[0] ?? null;

export default function ServiceCategoryBadge({ category }: { category?: string }) {
  const { t } = useLanguage();
  const meta = getCategoryMeta(category);
  const categoryKey = (typeof category === "string" && category in SERVICE_CATEGORY_COLORS
    ? category
    : "consultation") as ServiceCategoryKey;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {t.categories[categoryKey]}
    </span>
  );
}

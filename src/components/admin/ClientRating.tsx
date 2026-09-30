"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import type { ActivitySegment, RankedClient } from "@/lib/clients/clientSegments";
import { formatDate, formatNumber } from "@/lib/i18n/formatDate";
import { useLanguage } from "@/lib/i18n/useLanguage";

const segmentStyles: Record<ActivitySegment, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  sleeping: "border-amber-200 bg-amber-50 text-amber-800",
  lost: "border-red-200 bg-red-50 text-red-700",
  new: "border-sky-200 bg-sky-50 text-sky-700"
};

const segmentDots: Record<ActivitySegment, string> = {
  active: "bg-emerald-500",
  sleeping: "bg-amber-400",
  lost: "bg-red-500",
  new: "bg-sky-500"
};

/** Computed activity segment of a client: Active / Sleeping / Lost / New. */
export function SegmentBadge({ segment }: { segment: ActivitySegment }) {
  const { t } = useLanguage();
  const labels: Record<ActivitySegment, string> = {
    active: t.rating.activeBadge,
    sleeping: t.rating.segmentSleeping,
    lost: t.rating.segmentLost,
    new: t.rating.segmentNew
  };

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${segmentStyles[segment]}`}
      title={segment === "active" ? t.rating.activeHint : undefined}
      data-testid={`segment-${segment}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${segmentDots[segment]}`} aria-hidden="true" />
      {labels[segment]}
    </span>
  );
}

/** "#1" chip for clients in the top of the activity rating. */
export function RankBadge({ rank }: { rank: number }) {
  const { t } = useLanguage();
  const medal = rank <= 3 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-champagne/80 bg-pearl text-ink";

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${medal}`}
      title={t.rating.topHint}
      data-testid="client-rank"
    >
      <Trophy className="h-3.5 w-3.5" aria-hidden="true" />#{rank}
    </span>
  );
}

/** Top clients by visits and total spent; used on the dashboard and the client list. */
export default function ClientRating({
  ranked,
  limit = 10,
  footer
}: {
  ranked: RankedClient[];
  limit?: number;
  footer?: ReactNode;
}) {
  const { language, t } = useLanguage();
  const top = ranked.slice(0, limit);

  return (
    <section
      className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
      data-testid="client-rating"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">{t.rating.title}</h2>
          <p className="mt-1 text-sm text-graphite/65">{t.rating.subtitle}</p>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="mt-4 text-sm text-graphite/65">{t.rating.empty}</p>
      ) : (
        <ol className="mt-4 grid gap-2">
          {top.map(({ client, stats, rank }) => (
            <li key={client.id}>
              <Link
                href={`/admin/clients/${client.id}`}
                className="grid min-h-12 grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl border border-champagne/50 bg-white px-3 py-2 transition hover:bg-pearl sm:grid-cols-[2.5rem_1fr_5rem_8rem_auto]"
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    rank <= 3 ? "bg-amber-100 text-amber-800" : "bg-pearl text-ink"
                  }`}
                  aria-label={`${t.rating.rank} ${rank}`}
                >
                  {rank}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{client.fullName}</span>
                  <span className="block text-xs text-graphite/60">
                    {t.rating.lastVisit}: {stats.lastVisitDate ? formatDate(stats.lastVisitDate, language) : "-"}
                    <span className="sm:hidden">
                      {" · "}
                      {stats.visits} · {formatNumber(stats.totalSpent)} {t.common.amd}
                    </span>
                  </span>
                </span>
                <span className="hidden text-right text-sm sm:block">
                  <span className="block font-semibold text-ink">{stats.visits}</span>
                  <span className="block text-xs text-graphite/55">{t.rating.visits}</span>
                </span>
                <span className="hidden text-right text-sm sm:block">
                  <span className="block font-semibold text-ink">
                    {formatNumber(stats.totalSpent)} {t.common.amd}
                  </span>
                  <span className="block text-xs text-graphite/55">{t.rating.spent}</span>
                </span>
                <SegmentBadge segment={stats.segment} />
              </Link>
            </li>
          ))}
        </ol>
      )}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}

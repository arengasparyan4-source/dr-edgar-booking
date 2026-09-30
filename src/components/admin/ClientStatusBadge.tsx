"use client";

import type { Client } from "@/types/domain";
import { useLanguage } from "@/lib/i18n/useLanguage";

const statusStyles: Record<
  Client["status"],
  { dotClass: string; badgeClass: string }
> = {
  active: {
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700"
  },
  sleeping: {
    dotClass: "bg-amber-400",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800"
  },
  lost: {
    dotClass: "bg-red-500",
    badgeClass: "border-red-200 bg-red-50 text-red-700"
  },
  new: {
    dotClass: "bg-sky-500",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700"
  },
  vip: {
    dotClass: "bg-violet-500",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700"
  },
  blacklist: {
    dotClass: "bg-slate-800",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-800"
  },
  inactive: {
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-700"
  }
};

export default function ClientStatusBadge({ client }: { client: Client }) {
  const { t } = useLanguage();
  const style = statusStyles[client.status] ?? statusStyles.active;
  const labels: Record<Client["status"], string> = {
    active: t.clients.active,
    sleeping: t.clients.sleeping,
    lost: t.clients.lost,
    new: t.clients.newClient,
    vip: t.clients.vip,
    blacklist: t.clients.blacklist,
    inactive: t.clients.inactive
  };

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${style.badgeClass}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`} aria-hidden="true" />
      {labels[client.status]}
    </span>
  );
}

"use client";

import Link from "next/link";
import { CalendarDays, CalendarPlus, Settings, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminShell from "@/components/admin/AdminShell";
import BookingStatusBadge from "@/components/admin/BookingStatusBadge";
import ClientRating from "@/components/admin/ClientRating";
import { getDashboardStats } from "@/lib/bookings/bookingStats";
import { groupBookingsByClient, rankClients } from "@/lib/clients/clientSegments";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { clinicToday } from "@/lib/time/clinicTime";
import type { Booking, Client } from "@/types/domain";
import { formatDate, formatNumber } from "@/lib/i18n/formatDate";

export default function AdminDashboardPage() {
  const { language, t } = useLanguage();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const load = (url: string) =>
      adminFetch(url).then((response) => response.json());

    load("/api/admin/bookings")
      .then((data) => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]));
    load("/api/admin/clients")
      .then((data) => setClients(data.clients ?? []))
      .catch(() => setClients([]));
  }, []);

  const stats = useMemo(() => {
    const counters = getDashboardStats(bookings, clinicToday());

    return [
      { label: t.dashboard.newRequests, value: String(counters.newRequests) },
      { label: t.dashboard.todayBookings, value: String(counters.today) },
      { label: t.dashboard.upcomingBookings, value: String(counters.upcoming) },
      { label: t.dashboard.monthVisits, value: String(counters.monthVisits) },
      {
        label: t.dashboard.monthRevenue,
        value: `${formatNumber(counters.monthRevenue)} ${t.common.amd}`
      },
      { label: t.dashboard.cancelledBookings, value: String(counters.cancelled) },
      { label: t.dashboard.noShowBookings, value: String(counters.noShow) }
    ];
  }, [bookings, t.common.amd, t.dashboard]);

  const rankedClients = useMemo(
    () => rankClients(clients, groupBookingsByClient(clients, bookings), clinicToday()),
    [bookings, clients]
  );

  const quickActions = [
    { href: "/admin/calendar", label: t.nav.calendar, icon: CalendarDays },
    { href: "/admin/bookings", label: t.nav.bookings, icon: CalendarPlus },
    { href: "/admin/services", label: t.nav.services, icon: SlidersHorizontal },
    { href: "/admin/settings", label: t.nav.settings, icon: Settings }
  ];

  return (
    <AdminShell title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <p className="text-sm font-semibold text-graphite/65">{stat.label}</p>
            <p className="mt-3 whitespace-nowrap text-3xl font-semibold text-ink">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-graphite/50">
              {t.dashboard.quickActions}
            </p>
            <p className="mt-1 text-sm text-graphite/65">{t.dashboard.sameLogic}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2 text-sm font-semibold text-white"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <ClientRating ranked={rankedClients} limit={5} />

      <section className="grid gap-4 lg:grid-cols-2">
        {bookings.slice(0, 6).map((booking) => (
          <article
            key={booking.id}
            className="rounded-3xl border border-champagne/60 bg-white/86 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">
                  {booking.firstName} {booking.lastName}
                </p>
                <p className="mt-1 text-sm text-graphite/70">{booking.phone}</p>
              </div>
              <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-4 text-sm font-semibold">
              {formatDate(booking.date, language)} · {booking.startTime}-{booking.endTime}
            </p>
            <p className="mt-2 text-sm text-graphite/72">
              {booking.servicesSnapshot.map((service) => service.name[language]).join(", ")}
            </p>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}

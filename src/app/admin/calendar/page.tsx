"use client";

import AdminShell from "@/components/admin/AdminShell";
import AdminCalendar from "@/components/admin/AdminCalendar";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function AdminCalendarPage() {
  const { t } = useLanguage();

  return (
    <AdminShell title={t.calendar.title} subtitle={t.calendar.subtitle}>
      <AdminCalendar />
    </AdminShell>
  );
}

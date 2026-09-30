"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  CalendarDays,
  Images,
  LayoutDashboard,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  UsersRound
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/useLanguage";

export const adminNavItems = [
  { href: "/admin/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", key: "calendar", icon: CalendarDays },
  { href: "/admin/bookings", key: "bookings", icon: CalendarCheck },
  { href: "/admin/clients", key: "clients", icon: UsersRound },
  { href: "/admin/services", key: "services", icon: SlidersHorizontal },
  { href: "/admin/schedule", key: "schedule", icon: CalendarDays },
  { href: "/admin/portfolio", key: "portfolio", icon: Images },
  { href: "/admin/sms", key: "sms", icon: MessageSquare },
  { href: "/admin/settings", key: "settings", icon: Settings }
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-champagne/60 bg-porcelain/92 p-5 shadow-soft backdrop-blur-xl lg:block">
      <Link href="/admin/dashboard" className="block rounded-3xl bg-ink p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-champagne">
          {t.common.admin}
        </p>
        <p className="mt-3 text-2xl font-semibold">Dr. Edgar</p>
      </Link>

      <nav className="mt-6 grid gap-2">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-ink text-white shadow-soft"
                  : "bg-white/76 text-graphite hover:bg-pearl"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t.nav[item.key]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNavItems } from "./AdminSidebar";
import { useLanguage } from "@/lib/i18n/useLanguage";

export default function AdminMobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-champagne/70 bg-porcelain/96 px-2 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(32,28,26,0.12)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-8">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold transition ${
                active ? "bg-ink text-white" : "text-graphite/70"
              }`}
              aria-label={t.nav[item.key]}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{t.nav[item.key]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

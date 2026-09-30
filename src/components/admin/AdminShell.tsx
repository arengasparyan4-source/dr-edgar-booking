"use client";

import AdminHeader from "./AdminHeader";
import AdminMobileNav from "./AdminMobileNav";
import AdminPageTitle from "./AdminPageTitle";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F8F3EF] text-ink">
      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
            <AdminHeader />
            <section className="rounded-3xl border border-champagne/60 bg-premium-surface p-5 shadow-premium sm:p-7">
              <AdminPageTitle title={title} subtitle={subtitle} />
            </section>
            {children}
          </div>
        </div>
      </div>
      <AdminMobileNav />
    </main>
  );
}

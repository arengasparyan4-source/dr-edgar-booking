"use client";

import { useLanguage } from "@/lib/i18n/useLanguage";

export default function AdminPageTitle({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  const { t } = useLanguage();

  return (
    <div>
      <p className="text-sm font-semibold text-sage">{t.common.admin}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-graphite/70">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { CalendarCheck2, Instagram, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import { type Language, translations } from "@/data/translations";
import type { PublicSettings } from "@/types/domain";
import LanguageSwitcher from "./LanguageSwitcher";

type HeroProps = {
  language: Language;
  settings: PublicSettings;
  onBookClick: () => void;
  onLanguageChange: (language: Language) => void;
};

export default function Hero({
  language,
  settings,
  onBookClick,
  onLanguageChange
}: HeroProps) {
  const t = translations[language];

  return (
    <section className="relative min-h-[94svh] overflow-hidden bg-ink text-white">
      <Image
        src="/images/doctor.jpg"
        alt="Dr. Edgar"
        fill
        priority
        unoptimized
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover object-[52%_top]"
      />
      <div className="absolute inset-0 bg-hero-shade" />
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <div className="rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold shadow-soft backdrop-blur-xl">
          Dr. Edgar
        </div>
        <LanguageSwitcher
          language={language}
          onLanguageChange={onLanguageChange}
        />
      </div>

      <div className="relative z-10 flex min-h-[94svh] items-end">
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-20">
          <div className="max-w-3xl animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/22 bg-white/12 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {settings.address || t.common.address}
            </p>
            <h1 className="text-5xl font-semibold leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              {t.hero.name}
            </h1>
            <p className="mt-3 text-lg font-semibold text-white/86">
              {t.hero.handle}
            </p>
            <p className="mt-4 text-xl font-medium text-champagne sm:text-2xl">
              {t.hero.specialization}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/84 sm:text-lg">
              {t.hero.bio}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onBookClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-ink shadow-premium transition hover:-translate-y-0.5 hover:bg-porcelain"
              >
                <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
                {t.common.book}
              </button>
              <a
                href={settings.instagramUrl || "https://www.instagram.com/dr.edgar__/"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/26 bg-white/12 px-6 py-4 text-sm font-semibold text-white shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/18"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
                {t.common.instagram}
              </a>
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/26 bg-white/12 px-6 py-4 text-sm font-semibold text-white shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/18"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                {t.common.call}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

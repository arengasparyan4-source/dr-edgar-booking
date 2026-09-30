import { CalendarCheck2, Instagram, MapPin } from "lucide-react";
import { type Language, translations } from "@/data/translations";
import type { PublicSettings } from "@/types/domain";

type FooterProps = {
  language: Language;
  settings: PublicSettings;
  onBookClick: () => void;
};

export default function Footer({ language, settings, onBookClick }: FooterProps) {
  const t = translations[language];

  return (
    <footer className="border-t border-champagne/50 bg-ink px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xl font-semibold">{t.footer.title}</p>
          <p className="mt-2 text-sm text-white/64">{t.footer.subtitle}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/78">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {settings.address || t.common.address}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBookClick}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-porcelain"
          >
            <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
            {t.common.book}
          </button>
          <a
            href={settings.instagramUrl || "https://www.instagram.com/dr.edgar__/"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/18 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Instagram className="h-5 w-5" aria-hidden="true" />
            {t.common.instagram}
          </a>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-white/48">
        © {new Date().getFullYear()} {t.footer.rights}
      </p>
    </footer>
  );
}

import { Award, HeartPulse, ShieldCheck, Sparkles } from "lucide-react";
import { type Language, translations } from "@/data/translations";
import type { PublicSettings } from "@/types/domain";

type AboutDoctorProps = {
  language: Language;
  settings: PublicSettings;
};

const statIcons = [Award, HeartPulse, ShieldCheck, Sparkles];

export default function AboutDoctor({ language, settings }: AboutDoctorProps) {
  const t = translations[language].about;

  return (
    <section className="section-shell">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
        <div className="rounded-2xl bg-ink p-7 text-white shadow-premium sm:p-9">
          <p className="text-sm font-semibold text-champagne">{t.title}</p>
          <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
            {settings.aboutDoctor?.[language] || t.lead}
          </h2>
          <div className="mt-8 h-px bg-white/16" />
          <p className="mt-7 text-base leading-7 text-white/72">{t.body}</p>
          <p className="mt-7 rounded-2xl border border-white/14 bg-white/8 p-5 text-base leading-7 text-white/86">
            {t.note}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {t.stats.map((stat, index) => {
            const Icon = statIcons[index] ?? Sparkles;

            return (
              <div
                key={stat}
                className="group rounded-2xl border border-champagne/50 bg-premium-surface p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
              >
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white transition group-hover:bg-clinic">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-2xl font-semibold leading-tight text-ink">
                  {stat}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

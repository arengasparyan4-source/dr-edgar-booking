"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { type Language, translations } from "@/data/translations";
import type { PortfolioItem } from "@/types/domain";

type PortfolioProps = {
  language: Language;
  items: PortfolioItem[];
};

export default function Portfolio({ language, items }: PortfolioProps) {
  const t = translations[language].portfolio;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const portfolioItems = items.filter((item) => item.active).sort((a, b) => a.order - b.order);
  const activeItem = activeIndex === null ? null : portfolioItems[activeIndex];

  return (
    <section className="section-shell pt-0">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sage">{t.subtitle}</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
            {t.title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {portfolioItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-2xl bg-champagne-glow text-left shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
          >
            <Image
              src={item.imageUrl}
              alt={item.title[language]}
              fill
              unoptimized
              sizes="(min-width: 640px) 33vw, 50vw"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/78 via-ink/14 to-transparent" />
            <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold leading-5 text-white sm:text-base">
              {item.title[language]}
            </span>
          </button>
        ))}
      </div>

      {activeItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/82 px-4 py-8 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-porcelain shadow-premium">
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-ink shadow-soft transition hover:scale-105"
              aria-label={t.close}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="relative aspect-[4/5] bg-champagne-glow">
              <Image
                src={activeItem.imageUrl}
                alt={activeItem.title[language]}
                fill
                unoptimized
                sizes="(min-width: 768px) 672px, 100vw"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
            <div className="p-5">
              <p className="text-lg font-semibold text-ink">
                {activeItem.title[language]}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

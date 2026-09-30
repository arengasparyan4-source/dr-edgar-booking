"use client";

import { languageOptions, type Language } from "@/data/translations";

type LanguageSwitcherProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export default function LanguageSwitcher({
  language,
  onLanguageChange
}: LanguageSwitcherProps) {
  return (
    <div className="flex rounded-full border border-white/24 bg-white/14 p-1 shadow-soft backdrop-blur-xl">
      {languageOptions.map((option) => {
        const isActive = option.code === language;

        return (
          <button
            key={option.code}
            type="button"
            onClick={() => onLanguageChange(option.code)}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 ${
              isActive
                ? "bg-white text-ink shadow-sm"
                : "text-white/86 hover:bg-white/14 hover:text-white"
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

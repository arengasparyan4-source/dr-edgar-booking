"use client";

import { useMemo } from "react";
import { adminTranslations } from "./adminTranslations";
import { useStoredLanguage } from "./languageStore";
import { languageOptions } from "./translations";

const storageKey = "dr_edgar_admin_language";

/** Admin interface language: remembered, Armenian by default, shared by all admin components. */
export function useLanguage() {
  const [language, setLanguage] = useStoredLanguage(storageKey);

  return useMemo(
    () => ({
      language,
      languageOptions,
      setLanguage,
      t: adminTranslations[language]
    }),
    [language, setLanguage]
  );
}

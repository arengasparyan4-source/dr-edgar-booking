"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { defaultLanguage, type Language } from "@/data/translations";

const isLanguage = (value: unknown): value is Language =>
  value === "hy" || value === "ru" || value === "en";

const changeEvent = "dr-edgar-language-change";
// Used only when localStorage is unavailable (private mode): the choice then
// lasts until the page is reloaded.
const memoryFallback = new Map<string, Language>();

const read = (storageKey: string): Language => {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isLanguage(stored) ? stored : defaultLanguage;
  } catch {
    return memoryFallback.get(storageKey) ?? defaultLanguage;
  }
};

/**
 * The chosen interface language, remembered in localStorage under
 * `storageKey` and shared by every component that uses the same key: a
 * switch in the header re-renders the whole page at once.
 *
 * useSyncExternalStore renders the server snapshot (Armenian, the default)
 * during hydration and switches to the stored language right after, so a
 * remembered Russian/English choice no longer causes a hydration mismatch.
 */
export function useStoredLanguage(storageKey: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === storageKey) onChange();
      };
      const onLocal = (event: Event) => {
        if ((event as CustomEvent<string>).detail === storageKey) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(changeEvent, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(changeEvent, onLocal);
      };
    },
    [storageKey]
  );

  const language = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => defaultLanguage
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: Language) => {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        memoryFallback.set(storageKey, next);
      }
      window.dispatchEvent(new CustomEvent(changeEvent, { detail: storageKey }));
    },
    [storageKey]
  );

  return [language, setLanguage] as const;
}
